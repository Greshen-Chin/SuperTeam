import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { makeId } from "./fingerprint.js";
import { matchFingerprint } from "./matcher.js";
import { requirePool } from "./db.js";
import { createProofRepository } from "./repositories/proof-repository.js";
import { createVerificationRepository } from "./repositories/verification-repository.js";
import { fail, ok } from "./response.js";
import { fingerprintSchema, registerProofSchema } from "./schemas.js";
import { registerAuthRoutes } from "./routes/auth-routes.js";
import { uploadToIpfs } from "./ipfs.js";
import { getBalanceLamports, getTransaction, isMockSignature, requestDevnetAirdrop } from "./solana.js";
import { config } from "./config.js";

const verifyBodySchema = z.object({
  fingerprint: fingerprintSchema
});

const airdropBodySchema = z.object({
  address: z.string().min(32).max(44)
});

const AIRDROP_THRESHOLD_LAMPORTS = 50_000_000; // 0.05 SOL

export async function registerRoutes(app: FastifyInstance) {
  app.get("/health", async () => ({ status: "ok", timestamp: new Date().toISOString() }));

  await registerAuthRoutes(app);

  // ── Proof routes ──────────────────────────────────────────────────────────

  app.post("/api/proofs", {
    config: { rateLimit: { max: 30, timeWindow: "1 minute" } }
  }, async (request, reply) => {
    const parsed = registerProofSchema.safeParse(request.body);
    if (!parsed.success) {
      return fail(reply, request, 400, "INVALID_PROOF_PAYLOAD", parsed.error.issues[0]?.message ?? "Invalid proof payload.");
    }

    const { solanaSignature } = parsed.data;

    // Verify the transaction exists on-chain (skip for mock/demo signatures)
    if (!isMockSignature(solanaSignature) && !config.skipTxVerify) {
      try {
        const tx = await getTransaction(solanaSignature);
        if (!tx) {
          return fail(reply, request, 400, "TX_NOT_FOUND_ON_CHAIN",
            "Solana transaction not found on chain. Wait for confirmation and retry.");
        }
        if (tx.meta?.err) {
          return fail(reply, request, 400, "TX_FAILED_ON_CHAIN",
            "Solana transaction was found but it failed on chain.");
        }
      } catch (err) {
        app.log.warn({ err, solanaSignature }, "TX verification failed — allowing through");
      }
    }

    try {
      const proofRepository = createProofRepository(requirePool());
      const proof = await proofRepository.create(parsed.data);
      return reply.status(201).send(ok(request, proof));
    } catch (error) {
      return handleDbError(reply, request, error, "Failed to save proof.");
    }
  });

  app.get<{ Params: { id: string } }>("/api/proofs/:id", async (request, reply) => {
    try {
      const proofRepository = createProofRepository(requirePool());
      const proof = await proofRepository.findById(request.params.id);
      if (!proof) {
        return fail(reply, request, 404, "PROOF_NOT_FOUND", "Proof certificate was not found.");
      }
      void reply.header("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
      return ok(request, proof);
    } catch (error) {
      return handleDbError(reply, request, error, "Failed to retrieve proof.");
    }
  });

  app.get<{ Querystring: { creatorWallet?: string; cursor?: string; limit?: string } }>(
    "/api/proofs",
    async (request, reply) => {
      const { creatorWallet, cursor, limit } = request.query;
      if (!creatorWallet) {
        return fail(reply, request, 400, "MISSING_WALLET", "creatorWallet query param is required.");
      }
      try {
        const proofRepository = createProofRepository(requirePool());
        const page = await proofRepository.findByCreatorWallet(creatorWallet, {
          cursor,
          limit: Math.min(Number(limit ?? 20), 50)
        });
        return ok(request, page);
      } catch (error) {
        return handleDbError(reply, request, error, "Failed to list proofs.");
      }
    }
  );

  app.post("/api/proofs/verify", {
    config: { rateLimit: { max: 30, timeWindow: "1 minute" } }
  }, async (request, reply) => {
    const parsed = verifyBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return fail(reply, request, 400, "INVALID_VERIFY_PAYLOAD", parsed.error.issues[0]?.message ?? "Invalid fingerprint payload.");
    }

    const { fingerprint } = parsed.data;

    try {
      const pool = requirePool();
      const proofRepository = createProofRepository(pool);
      const verificationRepository = createVerificationRepository(pool);

      const exact = await proofRepository.findBySha256(fingerprint.sha256);
      let result;

      if (exact) {
        result = {
          matchType: "exact" as const,
          confidence: 1,
          matchedProofId: exact.id,
          certificateUrl: `/certificate/${exact.id}`
        };
      } else {
        const candidates = await proofRepository.findCandidates();
        result = matchFingerprint(fingerprint, candidates);
      }

      await verificationRepository.create({
        id: makeId("ver"),
        uploadedSha256: fingerprint.sha256,
        uploadedFingerprintRoot: fingerprint.fingerprintRoot,
        ...result
      });

      return ok(request, result);
    } catch (error) {
      return handleDbError(reply, request, error, "Failed to verify fingerprint.");
    }
  });

  app.get<{ Params: { id: string } }>("/api/proofs/:id/report", async (request, reply) => {
    try {
      const pool = requirePool();
      const proofRepository = createProofRepository(pool);
      const verificationRepository = createVerificationRepository(pool);

      const proof = await proofRepository.findById(request.params.id);
      if (!proof) {
        return fail(reply, request, 404, "PROOF_NOT_FOUND", "Proof certificate was not found.");
      }

      const verifications = await verificationRepository.findByProofId(request.params.id);
      return ok(request, { proof, verifications });
    } catch (error) {
      return handleDbError(reply, request, error, "Failed to retrieve report.");
    }
  });

  // ── IPFS upload ───────────────────────────────────────────────────────────

  app.post("/api/upload", {
    config: { rateLimit: { max: 10, timeWindow: "1 minute" } }
  }, async (request, reply) => {
    const file = await request.file();
    if (!file) {
      return fail(reply, request, 400, "FILE_REQUIRED", "Upload a video file using multipart/form-data.");
    }

    const allowedTypes = ["video/mp4", "video/webm", "video/quicktime", "video/x-matroska"];
    if (!allowedTypes.includes(file.mimetype)) {
      return fail(reply, request, 400, "INVALID_FILE_TYPE",
        `File type '${file.mimetype}' is not allowed. Accepted: mp4, webm, mov, mkv.`);
    }

    try {
      const buffer = await file.toBuffer();
      const result = await uploadToIpfs(buffer, file.filename, file.mimetype);
      return ok(request, result);
    } catch (err) {
      app.log.error({ err }, "IPFS upload failed");
      const message = err instanceof Error ? err.message : "IPFS upload failed.";
      return fail(reply, request, 502, "IPFS_UPLOAD_FAILED", message);
    }
  });

  // ── Airdrop (devnet only) ─────────────────────────────────────────────────

  app.post("/api/airdrop", {
    config: { rateLimit: { max: 5, timeWindow: "1 minute" } }
  }, async (request, reply) => {
    const parsed = airdropBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return fail(reply, request, 400, "INVALID_ADDRESS", "Valid Solana wallet address is required.");
    }

    if (config.solanaCluster !== "devnet") {
      return fail(reply, request, 400, "MAINNET_AIRDROP_FORBIDDEN",
        "Airdrop is only available on devnet.");
    }

    try {
      const balanceLamports = await getBalanceLamports(parsed.data.address);

      if (balanceLamports >= AIRDROP_THRESHOLD_LAMPORTS) {
        return ok(request, {
          airdropped: false,
          reason: "Balance is sufficient",
          balanceSol: balanceLamports / 1_000_000_000
        });
      }

      const signature = await requestDevnetAirdrop(parsed.data.address);
      return ok(request, {
        airdropped: true,
        signature,
        balanceSol: balanceLamports / 1_000_000_000,
        amountSol: 0.1
      });
    } catch (err) {
      app.log.error({ err }, "Airdrop failed");
      const message = err instanceof Error ? err.message : "Airdrop request failed.";
      return fail(reply, request, 502, "AIRDROP_FAILED", message);
    }
  });
}

function handleDbError(
  reply: Parameters<typeof fail>[0],
  request: Parameters<typeof fail>[1],
  error: unknown,
  fallback: string
) {
  if (isDatabaseError(error)) {
    return fail(reply, request, 503, "DATABASE_UNAVAILABLE",
      "Database is not reachable. Set DATABASE_URL in backend/.env and restart.");
  }
  return fail(reply, request, 500, "INTERNAL", error instanceof Error ? error.message : fallback);
}

function isDatabaseError(error: unknown) {
  if (!(error instanceof Error)) return false;
  const code = "code" in error ? String((error as { code?: unknown }).code) : "";
  return ["ENOTFOUND", "ENETUNREACH", "ECONNREFUSED", "ETIMEDOUT", "XX000", "28P01", "3D000"].includes(code);
}
