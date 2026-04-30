import type { FastifyInstance } from "fastify";
import { fingerprintFromMultipart, makeId } from "./fingerprint.js";
import { matchFingerprint } from "./matcher.js";
import { pool } from "./db.js";
import { createProofRepository } from "./repositories/proof-repository.js";
import { createVerificationRepository } from "./repositories/verification-repository.js";
import { fail, ok } from "./response.js";
import { registerProofSchema } from "./schemas.js";
import { registerAuthRoutes } from "./routes/auth-routes.js";
import { verifyAccessToken } from "./auth.js";

const proofRepository = createProofRepository(pool);
const verificationRepository = createVerificationRepository(pool);

export async function registerRoutes(app: FastifyInstance) {
  app.get("/health", async (request) => ok(request, { status: "ok" }));
  await registerAuthRoutes(app);

  app.post("/api/fingerprints", async (request, reply) => {
    const file = await request.file();
    if (!file) {
      return fail(reply, request, 400, "FILE_REQUIRED", "Upload a video file using multipart/form-data.");
    }

    const fingerprint = await fingerprintFromMultipart(file);
    return ok(request, fingerprint);
  });

  app.post("/api/proofs", async (request, reply) => {
    if (!hasValidBearerToken(request.headers.authorization)) {
      return fail(reply, request, 401, "AUTH_REQUIRED", "Bearer token is required to register a proof.");
    }

    const parsed = registerProofSchema.safeParse(request.body);
    if (!parsed.success) {
      return fail(reply, request, 400, "INVALID_PROOF_PAYLOAD", parsed.error.issues[0]?.message ?? "Invalid proof payload.");
    }

    const proof = await proofRepository.create(parsed.data);
    return reply.status(201).send(ok(request, proof));
  });

  app.get<{ Params: { id: string } }>("/api/proofs/:id", async (request, reply) => {
    const proof = await proofRepository.findById(request.params.id);
    if (!proof) {
      return fail(reply, request, 404, "PROOF_NOT_FOUND", "Proof certificate was not found.");
    }

    return ok(request, proof);
  });

  app.post("/api/proofs/verify", async (request, reply) => {
    const file = await request.file();
    if (!file) {
      return fail(reply, request, 400, "FILE_REQUIRED", "Upload a video file using multipart/form-data.");
    }

    const fingerprint = await fingerprintFromMultipart(file);
    const candidates = await proofRepository.findCandidates();
    const result = matchFingerprint(fingerprint, candidates);

    await verificationRepository.create({
      id: makeId("ver"),
      uploadedSha256: fingerprint.sha256,
      uploadedFingerprintRoot: fingerprint.fingerprintRoot,
      ...result
    });

    return ok(request, result);
  });

  app.get<{ Params: { id: string } }>("/api/proofs/:id/report", async (request, reply) => {
    const proof = await proofRepository.findById(request.params.id);
    if (!proof) {
      return fail(reply, request, 404, "PROOF_NOT_FOUND", "Proof certificate was not found.");
    }

    const verifications = await verificationRepository.findByProofId(request.params.id);
    return ok(request, { proof, verifications });
  });
}

function hasValidBearerToken(header?: string) {
  if (!header?.startsWith("Bearer ")) return false;

  try {
    verifyAccessToken(header.slice("Bearer ".length));
    return true;
  } catch {
    return false;
  }
}
