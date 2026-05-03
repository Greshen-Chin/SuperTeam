import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requirePool } from "../db.js";
import { verifyAccessToken } from "../auth.js";
import { createApiKey, verifyApiKey } from "../api-keys.js";
import { fail, ok } from "../response.js";
import { createAuthRepository } from "../repositories/auth-repository.js";

const createKeySchema = z.object({
  label: z.string().min(1).max(100).optional(),
  monthlyQuota: z.number().int().positive().max(1_000_000).optional()
});

function getBearerToken(request: { headers: Record<string, string | undefined> }): string | null {
  const h = request.headers.authorization;
  if (!h?.startsWith("Bearer ")) return null;
  return h.slice("Bearer ".length);
}

async function getCallerWallet(
  pool: ReturnType<typeof requirePool>,
  token: string
): Promise<string | null> {
  const payload = verifyAccessToken(token);
  const user = await createAuthRepository(pool).findById(String(payload.sub));
  return user?.walletAddress ?? null;
}

export async function registerApiKeyRoutes(app: FastifyInstance) {
  app.post("/api/api-keys", {
    config: { rateLimit: { max: 10, timeWindow: "1 minute" } }
  }, async (request, reply) => {
    const token = getBearerToken(request as unknown as { headers: Record<string, string | undefined> });
    if (!token) return fail(reply, request, 401, "AUTH_REQUIRED", "Bearer token is required.");

    const parsed = createKeySchema.safeParse(request.body);
    if (!parsed.success) {
      return fail(reply, request, 400, "INVALID_PAYLOAD", parsed.error.issues[0]?.message ?? "Invalid payload.");
    }

    try {
      const pool = requirePool();
      const ownerWallet = await getCallerWallet(pool, token);
      if (!ownerWallet) return fail(reply, request, 401, "AUTH_INVALID", "User wallet not found.");

      const key = await createApiKey(pool, {
        ownerWallet,
        label: parsed.data.label,
        monthlyQuota: parsed.data.monthlyQuota
      });

      return reply.status(201).send(ok(request, {
        id: key.id,
        rawKey: key.raw,
        label: key.label,
        monthlyQuota: key.monthlyQuota,
        status: key.status,
        createdAt: key.createdAt
      }));
    } catch (error) {
      return fail(reply, request, 500, "INTERNAL", error instanceof Error ? error.message : "Failed to create API key.");
    }
  });

  app.get("/api/api-keys", async (request, reply) => {
    const token = getBearerToken(request as unknown as { headers: Record<string, string | undefined> });
    if (!token) return fail(reply, request, 401, "AUTH_REQUIRED", "Bearer token is required.");

    try {
      const pool = requirePool();
      const ownerWallet = await getCallerWallet(pool, token);
      if (!ownerWallet) return fail(reply, request, 401, "AUTH_INVALID", "User wallet not found.");

      const { rows } = await pool.query<{
        id: string;
        label: string | null;
        monthly_quota: number;
        status: string;
        created_at: string;
        last_used_at: string | null;
      }>(
        `select id, label, monthly_quota, status, created_at, last_used_at
         from api_keys where owner_wallet = $1 order by created_at desc`,
        [ownerWallet]
      );

      const keys = rows.map((r) => ({
        id: r.id,
        label: r.label,
        monthlyQuota: r.monthly_quota,
        status: r.status,
        createdAt: r.created_at,
        lastUsedAt: r.last_used_at
      }));

      return ok(request, { keys });
    } catch (error) {
      return fail(reply, request, 500, "INTERNAL", error instanceof Error ? error.message : "Failed to list API keys.");
    }
  });

  app.delete<{ Params: { id: string } }>("/api/api-keys/:id", async (request, reply) => {
    const token = getBearerToken(request as unknown as { headers: Record<string, string | undefined> });
    if (!token) return fail(reply, request, 401, "AUTH_REQUIRED", "Bearer token is required.");

    try {
      const pool = requirePool();
      const ownerWallet = await getCallerWallet(pool, token);
      if (!ownerWallet) return fail(reply, request, 401, "AUTH_INVALID", "User wallet not found.");

      const { rowCount } = await pool.query(
        `update api_keys set status = 'revoked'
         where id = $1 and owner_wallet = $2 and status = 'active'`,
        [request.params.id, ownerWallet]
      );

      if (!rowCount) {
        return fail(reply, request, 404, "KEY_NOT_FOUND", "API key not found or already revoked.");
      }

      return ok(request, { revoked: true, id: request.params.id });
    } catch (error) {
      return fail(reply, request, 500, "INTERNAL", error instanceof Error ? error.message : "Failed to revoke API key.");
    }
  });

  app.get<{
    Params: { id: string };
    Querystring: { from?: string; to?: string };
  }>("/api/api-keys/:id/usage", async (request, reply) => {
    const token = getBearerToken(request as unknown as { headers: Record<string, string | undefined> });
    if (!token) return fail(reply, request, 401, "AUTH_REQUIRED", "Bearer token is required.");

    try {
      const pool = requirePool();
      const ownerWallet = await getCallerWallet(pool, token);
      if (!ownerWallet) return fail(reply, request, 401, "AUTH_INVALID", "User wallet not found.");

      const { rows: keyRows } = await pool.query(
        `select id from api_keys where id = $1 and owner_wallet = $2`,
        [request.params.id, ownerWallet]
      );
      if (!keyRows[0]) return fail(reply, request, 404, "KEY_NOT_FOUND", "API key not found.");

      const from = request.query.from ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const to = request.query.to ?? new Date().toISOString();

      const { rows } = await pool.query<{ day: string; route: string; count: string }>(
        `select to_char(occurred_at, 'YYYY-MM-DD') as day, route, count(*) as count
         from api_usage
         where api_key_id = $1 and occurred_at >= $2 and occurred_at <= $3
         group by day, route
         order by day desc, count desc`,
        [request.params.id, from, to]
      );

      const total = rows.reduce((sum, r) => sum + Number(r.count), 0);
      const byDay = rows.map((r) => ({
        day: r.day,
        route: r.route,
        count: Number(r.count)
      }));

      return ok(request, { from, to, total, byDay });
    } catch (error) {
      return fail(reply, request, 500, "INTERNAL", error instanceof Error ? error.message : "Failed to retrieve usage.");
    }
  });

  // Validate an API key (returns key info, used for testing key validity)
  app.get<{ Querystring: { key?: string } }>("/api/api-keys/validate", async (request, reply) => {
    const raw = request.query.key ?? extractApiKeyFromHeader(request);
    if (!raw) return fail(reply, request, 400, "KEY_REQUIRED", "API key is required.");

    try {
      const key = await verifyApiKey(requirePool(), raw);
      if (!key) return fail(reply, request, 401, "INVALID_API_KEY", "API key is invalid or revoked.");
      return ok(request, {
        id: key.id,
        label: key.label,
        monthlyQuota: key.monthlyQuota,
        status: key.status,
        createdAt: key.createdAt
      });
    } catch (error) {
      return fail(reply, request, 500, "INTERNAL", error instanceof Error ? error.message : "Failed to validate key.");
    }
  });
}

function extractApiKeyFromHeader(request: { headers: Record<string, string | string[] | undefined> }): string | null {
  const val = request.headers["x-api-key"];
  return typeof val === "string" ? val : null;
}
