import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { makeId } from "./fingerprint.js";
import { matchFingerprint, computePhashBuckets } from "./matcher.js";
import { requirePool } from "./db.js";
import { createProofRepository } from "./repositories/proof-repository.js";
import { createVerificationRepository } from "./repositories/verification-repository.js";
import { createLicenseRepository } from "./repositories/license-repository.js";
import { createDisputeRepository } from "./repositories/dispute-repository.js";
import { fail, ok } from "./response.js";
import {
  fingerprintSchema,
  registerProofSchema,
  createLicenseSchema,
  licenseTermsSchema,
  fileDisputeSchema,
  respondDisputeSchema,
  resolveDisputeSchema
} from "./schemas.js";
import { registerAuthRoutes } from "./routes/auth-routes.js";
import { uploadToIpfs } from "./ipfs.js";
import { getTransaction, isMockSignature, getBalanceLamports, requestDevnetAirdrop, getReceivedLamports } from "./solana.js";
import { config } from "./config.js";
import { buildNftMetadata } from "./nft-metadata.js";
import { scoreFromCounts } from "./reputation.js";
import type { ReputationScore } from "./reputation.js";
import { verifyAccessToken } from "./auth.js";
import { extractApiKey, verifyApiKey, checkMonthlyQuota } from "./api-keys.js";
import type { ApiKey } from "./api-keys.js";

const verifyBodySchema = z.object({ fingerprint: fingerprintSchema });
const airdropBodySchema = z.object({ address: z.string().min(32).max(44) });

const AIRDROP_THRESHOLD_LAMPORTS = 50_000_000; // 0.05 SOL
const DISPUTE_FILING_FEE_LAMPORTS = 10_000_000; // 0.01 SOL

// ── Auth helpers ─────────────────────────────────────────────────────────────

function getBearerToken(request: Parameters<typeof fail>[1]) {
  const header = (request as { headers: Record<string, string | undefined> }).headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length);
}

function isAdmin(walletAddress: string | null): boolean {
  if (!walletAddress) return false;
  return config.vidchainAdminWallets.includes(walletAddress);
}

// ── API key helpers ───────────────────────────────────────────────────────────

async function tryAuthenticateApiKey(request: Parameters<typeof fail>[1]): Promise<ApiKey | null> {
  const raw = extractApiKey(request as Parameters<typeof extractApiKey>[0]);
  if (!raw) return null;
  try {
    return await verifyApiKey(requirePool(), raw);
  } catch {
    return null;
  }
}

async function enforceQuota(
  pool: ReturnType<typeof requirePool>,
  apiKey: ApiKey,
  reply: Parameters<typeof fail>[0],
  request: Parameters<typeof fail>[1]
): Promise<boolean> {
  const quota = await checkMonthlyQuota(pool, apiKey.id);
  if (!quota.ok) {
    await fail(reply, request, 429, "QUOTA_EXCEEDED", `Monthly quota of ${quota.quota} requests exceeded (${quota.used} used).`);
    return false;
  }
  return true;
}

// ── On-chain TX helpers ──────────────────────────────────────────────────────

type TxCheckResult =
  | { ok: true; tx: NonNullable<Awaited<ReturnType<typeof getTransaction>>> }
  | { ok: false; code: string; message: string; status: number };

async function verifyTx(signature: string): Promise<TxCheckResult> {
  const tx = await getTransaction(signature);
  if (!tx) {
    return { ok: false, code: "TX_NOT_FOUND_ON_CHAIN", message: "Solana transaction not found on chain.", status: 400 };
  }
  if (tx.meta?.err) {
    return { ok: false, code: "TX_FAILED_ON_CHAIN", message: "Solana transaction was found but it failed on chain.", status: 400 };
  }
  return { ok: true, tx };
}

// ── Route registration ───────────────────────────────────────────────────────

export async function registerRoutes(app: FastifyInstance) {
  app.get("/health", async () => ({ status: "ok", timestamp: new Date().toISOString() }));

  await registerAuthRoutes(app);

  // ── Proofs ──────────────────────────────────────────────────────────────────

  app.post("/api/proofs", {
    config: { rateLimit: { max: 30, timeWindow: "1 minute" } }
  }, async (request, reply) => {
    const parsed = registerProofSchema.safeParse(request.body);
    if (!parsed.success) {
      return fail(reply, request, 400, "INVALID_PROOF_PAYLOAD", parsed.error.issues[0]?.message ?? "Invalid proof payload.");
    }

    const { solanaSignature } = parsed.data;

    if (!isMockSignature(solanaSignature) && !config.skipTxVerify) {
      try {
        const check = await verifyTx(solanaSignature);
        if (!check.ok) return fail(reply, request, check.status, check.code, check.message);
      } catch (err) {
        app.log.warn({ err, solanaSignature }, "TX verification failed — allowing through");
      }
    }

    try {
      const proof = await createProofRepository(requirePool()).create(parsed.data);
      return reply.status(201).send(ok(request, proof));
    } catch (error) {
      return handleDbError(reply, request, error, "Failed to save proof.");
    }
  });

  app.get<{ Params: { id: string } }>("/api/proofs/:id", {
    config: {
      rateLimit: {
        max: async (req) => {
          const raw = extractApiKey(req as Parameters<typeof extractApiKey>[0]);
          if (raw) {
            try {
              const key = await verifyApiKey(requirePool(), raw);
              if (key) { (req as { __apiKey?: ApiKey }).__apiKey = key; return 600; }
            } catch { /* fall through */ }
          }
          return 30;
        },
        timeWindow: "1 minute"
      }
    }
  }, async (request, reply) => {
    try {
      const pool = requirePool();
      const apiKey = (request as { __apiKey?: ApiKey }).__apiKey ?? null;
      if (apiKey) {
        const ok2 = await enforceQuota(pool, apiKey, reply, request);
        if (!ok2) return;
      }
      const proof = await createProofRepository(pool).findById(request.params.id);
      if (!proof) return fail(reply, request, 404, "PROOF_NOT_FOUND", "Proof certificate was not found.");
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
      if (!creatorWallet) return fail(reply, request, 400, "MISSING_WALLET", "creatorWallet query param is required.");
      try {
        const page = await createProofRepository(requirePool()).findByCreatorWallet(creatorWallet, {
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
    config: {
      rateLimit: {
        max: async (req) => {
          const raw = extractApiKey(req as Parameters<typeof extractApiKey>[0]);
          if (raw) {
            try {
              const key = await verifyApiKey(requirePool(), raw);
              if (key) { (req as { __apiKey?: ApiKey }).__apiKey = key; return 600; }
            } catch { /* fall through */ }
          }
          return 30;
        },
        timeWindow: "1 minute"
      }
    }
  }, async (request, reply) => {
    const parsed = verifyBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return fail(reply, request, 400, "INVALID_VERIFY_PAYLOAD", parsed.error.issues[0]?.message ?? "Invalid fingerprint payload.");
    }

    const { fingerprint } = parsed.data;

    try {
      const pool = requirePool();
      const apiKey = (request as { __apiKey?: ApiKey }).__apiKey ?? null;
      if (apiKey) {
        const ok2 = await enforceQuota(pool, apiKey, reply, request);
        if (!ok2) return;
      }
      const proofRepo = createProofRepository(pool);
      const verifyRepo = createVerificationRepository(pool);

      const exact = await proofRepo.findBySha256(fingerprint.sha256);
      let result;

      if (exact) {
        result = {
          matchType: "exact" as const,
          confidence: 1,
          matchedProofId: exact.id,
          certificateUrl: `/certificate/${exact.id}`
        };
      } else {
        const buckets = computePhashBuckets(fingerprint.frameHashes);
        const candidates = await proofRepo.findCandidatesByBuckets(buckets);
        result = matchFingerprint(fingerprint, candidates);
      }

      await verifyRepo.create({
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
      const proof = await createProofRepository(pool).findById(request.params.id);
      if (!proof) return fail(reply, request, 404, "PROOF_NOT_FOUND", "Proof certificate was not found.");
      const verifications = await createVerificationRepository(pool).findByProofId(request.params.id);
      return ok(request, { proof, verifications });
    } catch (error) {
      return handleDbError(reply, request, error, "Failed to retrieve report.");
    }
  });

  // Phase A.5 — NFT metadata generator
  app.post<{ Params: { id: string } }>("/api/proofs/:id/nft-metadata", {
    config: { rateLimit: { max: 10, timeWindow: "1 minute" } }
  }, async (request, reply) => {
    try {
      const proofRepo = createProofRepository(requirePool());
      const proof = await proofRepo.findById(request.params.id);
      if (!proof) return fail(reply, request, 404, "PROOF_NOT_FOUND", "Proof not found.");

      const metadata = buildNftMetadata({
        proofId: proof.id,
        title: proof.title,
        description: proof.description,
        creatorWallet: proof.creatorWallet,
        sha256: proof.sha256,
        fingerprintRoot: proof.fingerprintRoot,
        ipfsVideoUri: proof.ipfsVideoUri,
        ipfsThumbnailUri: proof.ipfsThumbnailUri,
        registeredAt: proof.registeredAt
      });

      const buffer = Buffer.from(JSON.stringify(metadata));
      const { ipfsUrl, gatewayUrl } = await uploadToIpfs(buffer, `${proof.id}.json`, "application/json");

      await proofRepo.updateMetadataUri(proof.id, ipfsUrl);

      return ok(request, { metadataUri: ipfsUrl, gatewayUrl, metadata });
    } catch (error) {
      return handleDbError(reply, request, error, "Failed to generate NFT metadata.");
    }
  });

  // Phase B — License terms update
  app.patch<{ Params: { id: string } }>("/api/proofs/:id/license-terms", {
    config: { rateLimit: { max: 20, timeWindow: "1 minute" } }
  }, async (request, reply) => {
    const auth = getBearerToken(request);
    if (!auth) return fail(reply, request, 401, "AUTH_REQUIRED", "Bearer token is required.");

    const parsed = licenseTermsSchema.safeParse(request.body);
    if (!parsed.success) {
      return fail(reply, request, 400, "INVALID_LICENSE_TERMS", parsed.error.issues[0]?.message ?? "Invalid license terms.");
    }

    try {
      const payload = verifyAccessToken(auth);
      const pool = requirePool();
      const proofRepo = createProofRepository(pool);

      const proof = await proofRepo.findById(request.params.id);
      if (!proof) return fail(reply, request, 404, "PROOF_NOT_FOUND", "Proof not found.");

      const user = await import("./repositories/auth-repository.js").then((m) =>
        m.createAuthRepository(pool).findById(String(payload.sub))
      );
      if (!user?.walletAddress || user.walletAddress !== proof.creatorWallet) {
        return fail(reply, request, 403, "NOT_PROOF_OWNER", "Only the proof creator can update license terms.");
      }

      const updated = await proofRepo.updateLicenseTerms(proof.id, {
        licenseFeeLamports: parsed.data.feeLamports,
        licenseModel: parsed.data.licenseModel,
        licenseSplit: parsed.data.splitConfig ?? null
      });

      return ok(request, updated);
    } catch (error) {
      return handleDbError(reply, request, error, "Failed to update license terms.");
    }
  });

  // ── Licenses ────────────────────────────────────────────────────────────────

  app.post("/api/licenses", {
    config: { rateLimit: { max: 30, timeWindow: "1 minute" } }
  }, async (request, reply) => {
    const parsed = createLicenseSchema.safeParse(request.body);
    if (!parsed.success) {
      return fail(reply, request, 400, "INVALID_LICENSE_PAYLOAD", parsed.error.issues[0]?.message ?? "Invalid license payload.");
    }

    try {
      const pool = requirePool();
      const licenseRepo = createLicenseRepository(pool);
      const proofRepo = createProofRepository(pool);

      const existing = await licenseRepo.findBySignature(parsed.data.solanaSignature);
      if (existing) return fail(reply, request, 409, "LICENSE_DUPLICATE", "A license with this transaction signature already exists.");

      const proof = await proofRepo.findById(parsed.data.proofId);
      if (!proof) return fail(reply, request, 404, "PROOF_NOT_FOUND", "Proof not found.");

      if (!isMockSignature(parsed.data.solanaSignature) && !config.skipTxVerify) {
        const check = await verifyTx(parsed.data.solanaSignature);
        if (!check.ok) return fail(reply, request, check.status, check.code, check.message);

        if (config.vidchainProgramId) {
          // Program-id check would require parsing compiled instructions — log only for now
          app.log.info({ programId: config.vidchainProgramId }, "license: program-id verification skipped (instruction parsing not implemented)");
        }

        const delta = getReceivedLamports(check.tx, proof.creatorWallet);
        if (delta < parsed.data.feeLamports) {
          return fail(reply, request, 400, "TX_AMOUNT_MISMATCH",
            `Transaction transferred ${delta} lamports to creator but ${parsed.data.feeLamports} were declared.`);
        }
      }

      const terms = {
        licenseModel: proof.licenseModel,
        feeLamports: parsed.data.feeLamports,
        splitConfig: proof.licenseSplit ?? undefined
      };

      const license = await licenseRepo.create(parsed.data, proof.creatorWallet, terms);
      return reply.status(201).send(ok(request, license));
    } catch (error) {
      return handleDbError(reply, request, error, "Failed to create license.");
    }
  });

  app.get<{ Params: { id: string } }>("/api/licenses/:id", async (request, reply) => {
    try {
      const license = await createLicenseRepository(requirePool()).findById(request.params.id);
      if (!license) return fail(reply, request, 404, "LICENSE_NOT_FOUND", "License not found.");
      void reply.header("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
      return ok(request, license);
    } catch (error) {
      return handleDbError(reply, request, error, "Failed to retrieve license.");
    }
  });

  app.get<{ Querystring: { buyerWallet?: string; cursor?: string; limit?: string } }>(
    "/api/licenses",
    async (request, reply) => {
      const { buyerWallet, cursor, limit } = request.query;
      if (!buyerWallet) return fail(reply, request, 400, "MISSING_WALLET", "buyerWallet query param is required.");
      try {
        const page = await createLicenseRepository(requirePool()).findByBuyer(buyerWallet, {
          cursor,
          limit: Math.min(Number(limit ?? 20), 50)
        });
        return ok(request, page);
      } catch (error) {
        return handleDbError(reply, request, error, "Failed to list licenses.");
      }
    }
  );

  app.get<{ Params: { id: string } }>("/api/proofs/:id/licenses", async (request, reply) => {
    try {
      const licenses = await createLicenseRepository(requirePool()).findByProof(request.params.id);
      return ok(request, { licenses });
    } catch (error) {
      return handleDbError(reply, request, error, "Failed to list proof licenses.");
    }
  });

  // ── Disputes ────────────────────────────────────────────────────────────────

  app.post("/api/disputes", {
    config: { rateLimit: { max: 5, timeWindow: "1 minute" } }
  }, async (request, reply) => {
    const auth = getBearerToken(request);
    if (!auth) return fail(reply, request, 401, "AUTH_REQUIRED", "Bearer token is required.");

    const parsed = fileDisputeSchema.safeParse(request.body);
    if (!parsed.success) {
      return fail(reply, request, 400, "INVALID_DISPUTE_PAYLOAD", parsed.error.issues[0]?.message ?? "Invalid dispute payload.");
    }

    try {
      const payload = verifyAccessToken(auth);
      const pool = requirePool();
      const disputeRepo = createDisputeRepository(pool);
      const proofRepo = createProofRepository(pool);

      const user = await import("./repositories/auth-repository.js").then((m) =>
        m.createAuthRepository(pool).findById(String(payload.sub))
      );
      const claimantWallet = user?.walletAddress;
      if (!claimantWallet) return fail(reply, request, 401, "AUTH_INVALID", "User wallet not found.");

      const proof = await proofRepo.findById(parsed.data.proofId);
      if (!proof) return fail(reply, request, 404, "PROOF_NOT_FOUND", "Proof not found.");

      if (claimantWallet !== proof.creatorWallet) {
        return fail(reply, request, 403, "NOT_PROOF_OWNER", "Only the proof owner can file a dispute.");
      }

      if (parsed.data.accusedWallet === claimantWallet) {
        return fail(reply, request, 400, "SELF_DISPUTE", "Cannot file a dispute against yourself.");
      }

      const dupe = await disputeRepo.findBySignature(parsed.data.filingSignature);
      if (dupe) return fail(reply, request, 409, "DISPUTE_DUPLICATE", "A dispute with this signature already exists.");

      if (!isMockSignature(parsed.data.filingSignature) && !config.skipTxVerify) {
        const check = await verifyTx(parsed.data.filingSignature);
        if (!check.ok) return fail(reply, request, check.status, check.code, check.message);

        if (config.vidchainPlatformWallet) {
          const delta = getReceivedLamports(check.tx, config.vidchainPlatformWallet);
          if (delta < DISPUTE_FILING_FEE_LAMPORTS) {
            return fail(reply, request, 400, "TX_AMOUNT_MISMATCH",
              `Filing fee ${delta} lamports < required ${DISPUTE_FILING_FEE_LAMPORTS}.`);
          }
        } else {
          app.log.warn("VIDCHAIN_PLATFORM_WALLET not set — skipping dispute fee verification");
        }
      }

      const dispute = await disputeRepo.create(parsed.data, claimantWallet);
      return reply.status(201).send(ok(request, dispute));
    } catch (error) {
      return handleDbError(reply, request, error, "Failed to file dispute.");
    }
  });

  app.post<{ Params: { id: string } }>("/api/disputes/:id/respond", {
    config: { rateLimit: { max: 5, timeWindow: "1 minute" } }
  }, async (request, reply) => {
    const auth = getBearerToken(request);
    if (!auth) return fail(reply, request, 401, "AUTH_REQUIRED", "Bearer token is required.");

    const parsed = respondDisputeSchema.safeParse(request.body);
    if (!parsed.success) {
      return fail(reply, request, 400, "INVALID_RESPONSE_PAYLOAD", parsed.error.issues[0]?.message ?? "Invalid response payload.");
    }

    try {
      const payload = verifyAccessToken(auth);
      const pool = requirePool();
      const disputeRepo = createDisputeRepository(pool);

      const user = await import("./repositories/auth-repository.js").then((m) =>
        m.createAuthRepository(pool).findById(String(payload.sub))
      );
      const callerWallet = user?.walletAddress;

      const dispute = await disputeRepo.findById(request.params.id);
      if (!dispute) return fail(reply, request, 404, "DISPUTE_NOT_FOUND", "Dispute not found.");
      if (callerWallet !== dispute.accusedWallet) return fail(reply, request, 403, "NOT_ACCUSED", "Only the accused can respond.");
      if (dispute.status !== "open") return fail(reply, request, 400, "DISPUTE_CLOSED", "Dispute is not open for response.");
      if (new Date() > new Date(dispute.responseDeadline)) return fail(reply, request, 400, "DEADLINE_PASSED", "Response deadline has passed.");

      if (!isMockSignature(parsed.data.responseSignature) && !config.skipTxVerify) {
        const check = await verifyTx(parsed.data.responseSignature);
        if (!check.ok) return fail(reply, request, check.status, check.code, check.message);
      }

      const updated = await disputeRepo.recordResponse(dispute.id, dispute.accusedWallet, parsed.data);
      return ok(request, updated);
    } catch (error) {
      return handleDbError(reply, request, error, "Failed to record dispute response.");
    }
  });

  app.post<{ Params: { id: string } }>("/api/disputes/:id/resolve", {
    config: { rateLimit: { max: 10, timeWindow: "1 minute" } }
  }, async (request, reply) => {
    const auth = getBearerToken(request);
    if (!auth) return fail(reply, request, 401, "AUTH_REQUIRED", "Bearer token is required.");

    const parsed = resolveDisputeSchema.safeParse(request.body);
    if (!parsed.success) {
      return fail(reply, request, 400, "INVALID_RESOLVE_PAYLOAD", parsed.error.issues[0]?.message ?? "Invalid resolution payload.");
    }

    try {
      const payload = verifyAccessToken(auth);
      const pool = requirePool();

      const user = await import("./repositories/auth-repository.js").then((m) =>
        m.createAuthRepository(pool).findById(String(payload.sub))
      );
      if (!isAdmin(user?.walletAddress ?? null)) {
        return fail(reply, request, 403, "ADMIN_REQUIRED", "Only admins can resolve disputes.");
      }

      const disputeRepo = createDisputeRepository(pool);
      const dispute = await disputeRepo.findById(request.params.id);
      if (!dispute) return fail(reply, request, 404, "DISPUTE_NOT_FOUND", "Dispute not found.");

      const closedStatuses = ["resolved", "dismissed", "escalated"] as const;
      if (closedStatuses.includes(dispute.status as typeof closedStatuses[number])) {
        return fail(reply, request, 400, "ALREADY_RESOLVED", "Dispute is already resolved.");
      }

      if (!isMockSignature(parsed.data.resolutionSignature) && !config.skipTxVerify) {
        const check = await verifyTx(parsed.data.resolutionSignature);
        if (!check.ok) return fail(reply, request, check.status, check.code, check.message);
      }

      const updated = await disputeRepo.recordResolution(dispute.id, parsed.data);
      return ok(request, updated);
    } catch (error) {
      return handleDbError(reply, request, error, "Failed to resolve dispute.");
    }
  });

  app.get<{ Params: { id: string } }>("/api/disputes/:id", async (request, reply) => {
    try {
      const dispute = await createDisputeRepository(requirePool()).findById(request.params.id);
      if (!dispute) return fail(reply, request, 404, "DISPUTE_NOT_FOUND", "Dispute not found.");
      void reply.header("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
      return ok(request, dispute);
    } catch (error) {
      return handleDbError(reply, request, error, "Failed to retrieve dispute.");
    }
  });

  app.get<{
    Querystring: { proofId?: string; wallet?: string; role?: string; cursor?: string; limit?: string };
  }>("/api/disputes", async (request, reply) => {
    const { proofId, wallet, role, cursor, limit } = request.query;
    if (!proofId && !wallet) {
      return fail(reply, request, 400, "MISSING_FILTER", "At least one of proofId or wallet is required.");
    }
    try {
      const repo = createDisputeRepository(requirePool());
      const limitNum = Math.min(Number(limit ?? 20), 50);

      if (proofId) {
        const disputes = await repo.findByProof(proofId);
        return ok(request, { disputes, nextCursor: null });
      }

      const validRole = (["claimant", "accused", "any"] as const).includes(role as "claimant" | "accused" | "any")
        ? (role as "claimant" | "accused" | "any")
        : "any";

      const page = await repo.findByWallet(wallet!, validRole, { cursor, limit: limitNum });
      return ok(request, page);
    } catch (error) {
      return handleDbError(reply, request, error, "Failed to list disputes.");
    }
  });

  // ── Reputation ──────────────────────────────────────────────────────────────

  app.get<{ Params: { wallet: string } }>("/api/reputation/:wallet", {
    config: {
      rateLimit: {
        max: async (req) => {
          const raw = extractApiKey(req as Parameters<typeof extractApiKey>[0]);
          if (raw) {
            try {
              const key = await verifyApiKey(requirePool(), raw);
              if (key) { (req as { __apiKey?: ApiKey }).__apiKey = key; return 600; }
            } catch { /* fall through */ }
          }
          return 30;
        },
        timeWindow: "1 minute"
      }
    }
  }, async (request, reply) => {
    try {
      const { wallet } = request.params;
      const pool = requirePool();
      const apiKey = (request as { __apiKey?: ApiKey }).__apiKey ?? null;
      if (apiKey) {
        const ok2 = await enforceQuota(pool, apiKey, reply, request);
        if (!ok2) return;
      }
      const [counts, registeredProofs] = await Promise.all([
        createDisputeRepository(pool).countsForWallet(wallet),
        createProofRepository(pool).countByCreator(wallet)
      ]);

      const { score, label } = scoreFromCounts({
        totalDisputesAsAccused: counts.totalAsAccused,
        unresolvedDisputesAsAccused: counts.unresolvedAsAccused,
        resolvedAgainst: counts.resolvedAgainst,
        dismissed: counts.dismissed,
        registeredProofs
      });

      const result: ReputationScore = {
        wallet,
        label,
        score,
        totalDisputesAsAccused: counts.totalAsAccused,
        unresolvedDisputesAsAccused: counts.unresolvedAsAccused,
        resolvedAgainst: counts.resolvedAgainst,
        dismissed: counts.dismissed,
        totalDisputesAsClaimant: counts.totalAsClaimant,
        registeredProofs,
        asOf: new Date().toISOString()
      };

      void reply.header("Cache-Control", "s-maxage=30, stale-while-revalidate=120");
      return ok(request, result);
    } catch (error) {
      return handleDbError(reply, request, error, "Failed to compute reputation.");
    }
  });

  app.get<{
    Params: { wallet: string };
    Querystring: { cursor?: string; limit?: string };
  }>("/api/reputation/:wallet/history", async (request, reply) => {
    try {
      const page = await createDisputeRepository(requirePool()).findByWallet(
        request.params.wallet,
        "any",
        { cursor: request.query.cursor, limit: Math.min(Number(request.query.limit ?? 20), 50) }
      );
      return ok(request, page);
    } catch (error) {
      return handleDbError(reply, request, error, "Failed to retrieve dispute history.");
    }
  });

  // ── IPFS upload ─────────────────────────────────────────────────────────────

  app.post("/api/upload", {
    config: { rateLimit: { max: 10, timeWindow: "1 minute" } }
  }, async (request, reply) => {
    const file = await request.file();
    if (!file) return fail(reply, request, 400, "FILE_REQUIRED", "Upload a video file using multipart/form-data.");

    const allowedTypes = [
      "video/mp4", "video/webm", "video/quicktime", "video/x-matroska",
      "image/jpeg", "image/png", "image/gif", "image/webp",
      "application/json"
    ];
    if (!allowedTypes.includes(file.mimetype)) {
      return fail(reply, request, 400, "INVALID_FILE_TYPE",
        `File type '${file.mimetype}' is not allowed. Accepted: mp4, webm, mov, mkv, json.`);
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

  // ── Airdrop (devnet only) ───────────────────────────────────────────────────

  app.post("/api/airdrop", {
    config: { rateLimit: { max: 5, timeWindow: "1 minute" } }
  }, async (request, reply) => {
    const parsed = airdropBodySchema.safeParse(request.body);
    if (!parsed.success) return fail(reply, request, 400, "INVALID_ADDRESS", "Valid Solana wallet address is required.");

    if (config.solanaCluster !== "devnet") {
      return fail(reply, request, 400, "MAINNET_AIRDROP_FORBIDDEN", "Airdrop is only available on devnet.");
    }

    try {
      const balanceLamports = await getBalanceLamports(parsed.data.address);
      if (balanceLamports >= AIRDROP_THRESHOLD_LAMPORTS) {
        return ok(request, { airdropped: false, reason: "Balance is sufficient", balanceSol: balanceLamports / 1e9 });
      }
      const signature = await requestDevnetAirdrop(parsed.data.address);
      return ok(request, { airdropped: true, signature, balanceSol: balanceLamports / 1e9, amountSol: 0.1 });
    } catch (err) {
      app.log.error({ err }, "Airdrop failed");
      const message = err instanceof Error ? err.message : "Airdrop request failed.";
      return fail(reply, request, 502, "AIRDROP_FAILED", message);
    }
  });
}

// ── Shared helpers ───────────────────────────────────────────────────────────

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
