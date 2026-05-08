import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";

// ── Hoist mocks so they're available when vi.mock factories run ───────────────
const { mockQuery, mockPool } = vi.hoisted(() => {
  const mockQuery = vi.fn();
  const mockPool = { query: mockQuery, connect: vi.fn() };
  return { mockQuery, mockPool };
});

vi.mock("../src/solana.js", () => ({
  getTransaction: vi.fn().mockResolvedValue(null),
  isMockSignature: vi.fn().mockReturnValue(true),
  getBalanceLamports: vi.fn().mockResolvedValue(0),
  requestDevnetAirdrop: vi.fn().mockResolvedValue("mock_airdrop_sig"),
  getReceivedLamports: vi.fn().mockReturnValue(1_000_000_000)
}));

vi.mock("../src/ipfs.js", () => ({
  uploadToIpfs: vi.fn().mockResolvedValue({ ipfsUrl: "ipfs://Qm123", gatewayUrl: "https://gw/Qm123" })
}));

vi.mock("../src/db.js", () => ({
  pool: mockPool,
  requirePool: () => mockPool,
  migrate: vi.fn()
}));

vi.mock("../src/auth.js", () => ({
  verifyAccessToken: vi.fn().mockReturnValue({ sub: "user_test_id" }),
  generateAccessToken: vi.fn().mockReturnValue("mock_access_token"),
  generateNonce: vi.fn().mockReturnValue("mock_nonce")
}));

vi.mock("../src/repositories/auth-repository.js", () => ({
  createAuthRepository: () => ({
    findById: vi.fn().mockResolvedValue({
      id: "user_test_id",
      walletAddress: "TestWaLLeTaBcD12345",
      email: null,
      displayName: null,
      walletLinkedAt: null,
      createdAt: new Date().toISOString()
    }),
    upsertWalletUser: vi.fn(),
    listUsers: vi.fn().mockResolvedValue([]),
    saveNonce: vi.fn(),
    consumeNonce: vi.fn(),
    linkWallet: vi.fn()
  }),
  normalizeAddress: (a: string) => a
}));

import { buildApp } from "../src/build-app.js";

describe("API key routes", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp({ logger: false });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("POST /api/api-keys — creates key and returns rawKey once", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{
        id: "key_abc",
        owner_wallet: "TestWaLLeTaBcD12345",
        label: "my-key",
        monthly_quota: 10000,
        status: "active",
        created_at: new Date().toISOString(),
        last_used_at: null
      }]
    });

    const res = await app.inject({
      method: "POST",
      url: "/api/api-keys",
      headers: { authorization: "Bearer mock_token" },
      payload: { label: "my-key" }
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.data.rawKey).toMatch(/^vk_live_/);
    expect(body.data.id).toBe("key_abc");
    expect(body.data.label).toBe("my-key");
  });

  it("POST /api/api-keys — rawKey not present in subsequent list", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{
        id: "key_abc",
        label: "my-key",
        monthly_quota: 10000,
        status: "active",
        created_at: new Date().toISOString(),
        last_used_at: null
      }]
    });

    const res = await app.inject({
      method: "GET",
      url: "/api/api-keys",
      headers: { authorization: "Bearer mock_token" }
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.keys[0]).not.toHaveProperty("rawKey");
  });

  it("POST /api/api-keys — requires auth", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/api-keys",
      payload: { label: "test" }
    });
    expect(res.statusCode).toBe(401);
  });

  it("GET /api/api-keys — lists keys without rawKey", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{
        id: "key_abc",
        label: "my-key",
        monthly_quota: 10000,
        status: "active",
        created_at: new Date().toISOString(),
        last_used_at: null
      }]
    });

    const res = await app.inject({
      method: "GET",
      url: "/api/api-keys",
      headers: { authorization: "Bearer mock_token" }
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.keys).toHaveLength(1);
    expect(body.data.keys[0]).not.toHaveProperty("rawKey");
    expect(body.data.keys[0].id).toBe("key_abc");
  });

  it("DELETE /api/api-keys/:id — revokes key", async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });

    const res = await app.inject({
      method: "DELETE",
      url: "/api/api-keys/key_abc",
      headers: { authorization: "Bearer mock_token" }
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.revoked).toBe(true);
  });

  it("DELETE /api/api-keys/:id — 404 for non-existent or already revoked", async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 0 });

    const res = await app.inject({
      method: "DELETE",
      url: "/api/api-keys/key_nonexistent",
      headers: { authorization: "Bearer mock_token" }
    });

    expect(res.statusCode).toBe(404);
  });

  it("GET /api/api-keys/:id/usage — returns usage stats", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: "key_abc" }] })
      .mockResolvedValueOnce({
        rows: [
          { day: "2025-01-15", route: "/api/proofs/verify", count: "42" },
          { day: "2025-01-14", route: "/api/proofs/:id", count: "10" }
        ]
      });

    const res = await app.inject({
      method: "GET",
      url: "/api/api-keys/key_abc/usage",
      headers: { authorization: "Bearer mock_token" }
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.total).toBe(52);
    expect(body.data.byDay).toHaveLength(2);
  });
});
