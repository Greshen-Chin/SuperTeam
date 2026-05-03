import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { requirePool } from "../db.js";
import { makeId } from "../fingerprint.js";
import { fail, ok } from "../response.js";
import { createAuthRepository } from "../repositories/auth-repository.js";
import { createNonce, signAccessToken, verifyAccessToken, verifyWalletSignature } from "../auth.js";

const getAuthRepo = () => createAuthRepository(requirePool());

const walletLoginSchema = z.object({
  address: z.string().min(1),
  signature: z.string().min(1),
  nonce: z.string().min(1)
});

export async function registerAuthRoutes(app: FastifyInstance) {
  app.get("/auth/me", async (request, reply) => {
    const auth = getBearerToken(request);
    if (!auth) {
      return fail(reply, request, 401, "AUTH_REQUIRED", "Bearer token is required.");
    }

    try {
      const payload = verifyAccessToken(auth);
      const user = await getAuthRepo().findById(String(payload.sub));
      if (!user) {
        return fail(reply, request, 404, "USER_NOT_FOUND", "User was not found.");
      }

      return ok(request, { user });
    } catch (error) {
      return handleAuthError(reply, request, error, "AUTH_INVALID", "Bearer token is invalid or expired.");
    }
  });

  app.get("/users", async (request, reply) => {
    const auth = getBearerToken(request);
    if (!auth) {
      return fail(reply, request, 401, "AUTH_REQUIRED", "Bearer token is required.");
    }

    try {
      verifyAccessToken(auth);
      const users = await getAuthRepo().listUsers();
      return ok(request, { users });
    } catch (error) {
      return handleAuthError(reply, request, error, "AUTH_INVALID", "Bearer token is invalid or expired.");
    }
  });

  // Step 1: frontend requests a one-time nonce for a wallet address
  app.get<{ Querystring: { address?: string } }>("/auth/nonce", async (request, reply) => {
    const address = request.query.address;
    if (!address) {
      return fail(reply, request, 400, "ADDRESS_REQUIRED", "Wallet address is required.");
    }

    try {
      const nonce = createNonce();
      await getAuthRepo().saveNonce({
        address,
        nonce,
        expiredAt: new Date(Date.now() + 5 * 60 * 1000)
      });

      return ok(request, { nonce });
    } catch (error) {
      return handleAuthError(reply, request, error, "NONCE_FAILED", "Could not create wallet login nonce.");
    }
  });

  // Step 2: frontend signs the nonce and exchanges it for a JWT
  app.post("/auth/wallet", async (request, reply) => {
    const parsed = walletLoginSchema.safeParse(request.body);
    if (!parsed.success) {
      return fail(reply, request, 400, "INVALID_WALLET_PAYLOAD", "Address, signature, and nonce are required.");
    }

    try {
      const validNonce = await getAuthRepo().consumeNonce(parsed.data);
      if (!validNonce) {
        return fail(reply, request, 401, "NONCE_INVALID", "Nonce is invalid, expired, or already used.");
      }

      if (!verifyWalletSignature(parsed.data)) {
        return fail(reply, request, 401, "SIGNATURE_INVALID", "Wallet signature is invalid.");
      }

      const user = await getAuthRepo().upsertWalletUser({
        id: makeId("user"),
        walletAddress: parsed.data.address
      });

      return ok(request, { access_token: signAccessToken(user), user });
    } catch (error) {
      return handleAuthError(reply, request, error, "WALLET_AUTH_FAILED", "Could not login with wallet.");
    }
  });

  app.post("/auth/link-wallet", async (request, reply) => {
    const auth = getBearerToken(request);
    if (!auth) {
      return fail(reply, request, 401, "AUTH_REQUIRED", "Bearer token is required.");
    }

    const parsed = walletLoginSchema.safeParse(request.body);
    if (!parsed.success) {
      return fail(reply, request, 400, "INVALID_WALLET_PAYLOAD", "Address, signature, and nonce are required.");
    }

    try {
      const payload = verifyAccessToken(auth);
      const validNonce = await getAuthRepo().consumeNonce(parsed.data);
      if (!validNonce) {
        return fail(reply, request, 401, "NONCE_INVALID", "Nonce is invalid, expired, or already used.");
      }

      if (!verifyWalletSignature(parsed.data)) {
        return fail(reply, request, 401, "SIGNATURE_INVALID", "Wallet signature is invalid.");
      }

      const user = await getAuthRepo().linkWallet({
        userId: String(payload.sub),
        walletAddress: parsed.data.address
      });

      return ok(request, { access_token: signAccessToken(user), user });
    } catch (error) {
      return handleAuthError(reply, request, error, "AUTH_INVALID", "Bearer token is invalid or expired.");
    }
  });
}

function getBearerToken(request: FastifyRequest) {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length);
}

function handleAuthError(
  reply: Parameters<typeof fail>[0],
  request: FastifyRequest,
  error: unknown,
  code: string,
  message: string,
  statusCode = 500
) {
  if (isDatabaseError(error)) {
    return fail(
      reply,
      request,
      503,
      "DATABASE_UNAVAILABLE",
      "Database is not reachable. Check backend DATABASE_URL and Supabase connection, then try again."
    );
  }

  return fail(reply, request, statusCode, code, error instanceof Error ? error.message : message);
}

function isDatabaseError(error: unknown) {
  if (!(error instanceof Error)) return false;
  const maybeCode = "code" in error ? String((error as { code?: unknown }).code) : "";
  return ["ENOTFOUND", "ENETUNREACH", "ECONNREFUSED", "ETIMEDOUT", "XX000", "28P01", "3D000"].includes(maybeCode);
}
