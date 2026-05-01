import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { requirePool } from "../db.js";
import { makeId } from "../fingerprint.js";
import { fail, ok } from "../response.js";
import { createAuthRepository } from "../repositories/auth-repository.js";
import { createNonce, hashPassword, signAccessToken, verifyAccessToken, verifyGoogleToken, verifyPassword, verifyWalletSignature } from "../auth.js";

const getAuthRepo = () => createAuthRepository(requirePool());

const googleLoginSchema = z.object({
  token: z.string().min(1)
});

const passwordAuthSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

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

  app.post("/auth/register", async (request, reply) => {
    const parsed = passwordAuthSchema.safeParse(request.body);
    if (!parsed.success) {
      return fail(reply, request, 400, "INVALID_REGISTER_PAYLOAD", "Valid email and password with at least 8 characters are required.");
    }

    try {
      const existing = await getAuthRepo().findByEmail(parsed.data.email);
      if (existing) {
        return fail(reply, request, 409, "EMAIL_ALREADY_REGISTERED", "This email is already registered.");
      }

      const user = await getAuthRepo().createPasswordUser({
        id: makeId("user"),
        email: parsed.data.email,
        passwordHash: await hashPassword(parsed.data.password)
      });

      return reply.status(201).send(ok(request, { access_token: signAccessToken(user), user }));
    } catch (error) {
      return handleAuthError(reply, request, error, "REGISTER_FAILED", "Could not register user.");
    }
  });

  app.post("/auth/login", async (request, reply) => {
    const parsed = passwordAuthSchema.safeParse(request.body);
    if (!parsed.success) {
      return fail(reply, request, 400, "INVALID_LOGIN_PAYLOAD", "Valid email and password are required.");
    }

    try {
      const user = await getAuthRepo().findByEmail(parsed.data.email);
      if (!user?.passwordHash || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
        return fail(reply, request, 401, "INVALID_CREDENTIALS", "Email or password is incorrect.");
      }

      return ok(request, { access_token: signAccessToken(user), user });
    } catch (error) {
      return handleAuthError(reply, request, error, "LOGIN_FAILED", "Could not login user.");
    }
  });

  app.post("/auth/google", async (request, reply) => {
    const parsed = googleLoginSchema.safeParse(request.body);
    if (!parsed.success) {
      return fail(reply, request, 400, "INVALID_GOOGLE_TOKEN", "Google token is required.");
    }

    try {
      const googleUser = await verifyGoogleToken(parsed.data.token);
      const user = await getAuthRepo().upsertGoogleUser({
        id: makeId("user"),
        email: googleUser.email,
        googleSub: googleUser.sub
      });

      return ok(request, { access_token: signAccessToken(user), user });
    } catch (error) {
      return handleAuthError(reply, request, error, "GOOGLE_AUTH_FAILED", error instanceof Error ? error.message : "Google login failed.", 401);
    }
  });

  app.post("/auth/link-google", async (request, reply) => {
    const auth = getBearerToken(request);
    if (!auth) {
      return fail(reply, request, 401, "AUTH_REQUIRED", "Bearer token is required.");
    }

    const parsed = googleLoginSchema.safeParse(request.body);
    if (!parsed.success) {
      return fail(reply, request, 400, "INVALID_GOOGLE_TOKEN", "Google token is required.");
    }

    try {
      const payload = verifyAccessToken(auth);
      const googleUser = await verifyGoogleToken(parsed.data.token);
      const user = await getAuthRepo().linkGoogle({
        userId: String(payload.sub),
        email: googleUser.email,
        googleSub: googleUser.sub
      });

      return ok(request, { access_token: signAccessToken(user), user });
    } catch (error) {
      return handleAuthError(reply, request, error, "GOOGLE_LINK_FAILED", error instanceof Error ? error.message : "Could not link Google account.", 401);
    }
  });

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
