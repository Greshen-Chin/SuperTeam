import { createHash, randomBytes } from "node:crypto";
import type { Pool } from "pg";
import type { FastifyRequest } from "fastify";
import { makeId } from "./fingerprint.js";

export type ApiKey = {
  id: string;
  ownerWallet: string;
  label: string | null;
  monthlyQuota: number;
  status: "active" | "revoked";
  createdAt: string;
  lastUsedAt: string | null;
};

export function hashApiKey(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export function generateApiKey(): { raw: string; hash: string } {
  const raw = `vk_live_${randomBytes(32).toString("hex")}`;
  return { raw, hash: hashApiKey(raw) };
}

export function extractApiKey(req: FastifyRequest): string | null {
  const val = req.headers["x-api-key"];
  return typeof val === "string" ? val : null;
}

export async function createApiKey(
  pool: Pool,
  opts: { ownerWallet: string; label?: string; monthlyQuota?: number }
): Promise<ApiKey & { raw: string }> {
  const { raw, hash } = generateApiKey();
  const id = makeId("key");

  const { rows } = await pool.query<{
    id: string;
    owner_wallet: string;
    label: string | null;
    monthly_quota: number;
    status: string;
    created_at: string;
    last_used_at: string | null;
  }>(
    `insert into api_keys (id, owner_wallet, key_hash, label, monthly_quota)
     values ($1, $2, $3, $4, $5)
     returning id, owner_wallet, label, monthly_quota, status, created_at, last_used_at`,
    [id, opts.ownerWallet, hash, opts.label ?? null, opts.monthlyQuota ?? 10000]
  );

  const r = rows[0]!;
  return {
    id: r.id,
    ownerWallet: r.owner_wallet,
    label: r.label,
    monthlyQuota: r.monthly_quota,
    status: r.status as "active" | "revoked",
    createdAt: r.created_at,
    lastUsedAt: r.last_used_at,
    raw
  };
}

export async function verifyApiKey(pool: Pool, raw: string): Promise<ApiKey | null> {
  const hash = hashApiKey(raw);
  const { rows } = await pool.query<{
    id: string;
    owner_wallet: string;
    label: string | null;
    monthly_quota: number;
    status: string;
    created_at: string;
    last_used_at: string | null;
  }>(
    `update api_keys set last_used_at = now()
     where key_hash = $1 and status = 'active'
     returning id, owner_wallet, label, monthly_quota, status, created_at, last_used_at`,
    [hash]
  );
  if (!rows[0]) return null;
  const r = rows[0];
  return {
    id: r.id,
    ownerWallet: r.owner_wallet,
    label: r.label,
    monthlyQuota: r.monthly_quota,
    status: r.status as "active" | "revoked",
    createdAt: r.created_at,
    lastUsedAt: r.last_used_at
  };
}

export async function recordUsage(
  pool: Pool,
  keyId: string,
  route: string,
  statusCode: number
): Promise<void> {
  await pool.query(
    `insert into api_usage (api_key_id, route, status_code) values ($1, $2, $3)`,
    [keyId, route, statusCode]
  );
}

export async function checkMonthlyQuota(
  pool: Pool,
  keyId: string
): Promise<{ used: number; quota: number; ok: boolean }> {
  const [keyRes, usageRes] = await Promise.all([
    pool.query<{ monthly_quota: number }>(
      `select monthly_quota from api_keys where id = $1`,
      [keyId]
    ),
    pool.query<{ count: string }>(
      `select count(*) as count from api_usage
       where api_key_id = $1 and occurred_at >= date_trunc('month', now())`,
      [keyId]
    )
  ]);

  const quota = keyRes.rows[0]?.monthly_quota ?? 10000;
  const used = Number(usageRes.rows[0]?.count ?? 0);
  return { used, quota, ok: used < quota };
}
