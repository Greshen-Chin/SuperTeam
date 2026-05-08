import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import type { FastifyInstance } from "fastify";

const { mockQuery, mockPool } = vi.hoisted(() => {
  const mockQuery = vi.fn();
  const mockPool = { query: mockQuery, connect: vi.fn() };
  return { mockQuery, mockPool };
});

vi.mock("../src/solana.js", () => ({
  getTransaction: vi.fn().mockResolvedValue(null),
  isMockSignature: vi.fn().mockReturnValue(true),
  getBalanceLamports: vi.fn().mockResolvedValue(0),
  requestDevnetAirdrop: vi.fn().mockResolvedValue("mock_sig"),
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
  generateAccessToken: vi.fn().mockReturnValue("mock_token"),
  generateNonce: vi.fn().mockReturnValue("nonce")
}));

vi.mock("../src/repositories/auth-repository.js", () => ({
  createAuthRepository: () => ({
    findById: vi.fn().mockResolvedValue({
      id: "user_test_id",
      walletAddress: "4vMsoUT2BWatFweudnQM1xedRLfJgJ7hswhcpz4xgBTy",
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

// 44-char Solana-style addresses
const CREATOR_WALLET = "4vMsoUT2BWatFweudnQM1xedRLfJgJ7hswhcpz4xgBTy";
const BUYER_WALLET   = "9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin";

const mockProofRow = {
  id: "proof_test",
  title: "Test Video",
  description: null,
  creator_wallet: CREATOR_WALLET,
  creator_handle: null,
  sha256: "abc123",
  phash: null,
  frame_hashes: ["f000000000000000"],
  fingerprint_root: "root123",
  duration: "30",
  solana_signature: "mock_proof_sig",
  mint_address: null,
  metadata_uri: null,
  ipfs_video_uri: null,
  ipfs_thumbnail_uri: null,
  license_fee_lamports: "1000000",
  license_model: "flat",
  license_split: null,
  phash_bucket0: 15,
  registered_at: new Date().toISOString(),
  status: "active"
};

const mockLicenseRow = {
  id: "lic_test",
  proof_id: "proof_test",
  buyer_wallet: BUYER_WALLET,
  seller_wallet: CREATOR_WALLET,
  license_model: "flat",
  fee_lamports: "1000000",
  split_config: null,
  license_token_mint: null,
  solana_signature: "mock_license_sig",
  status: "active",
  created_at: new Date().toISOString()
};

describe("License routes", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp({ logger: false });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    mockQuery.mockReset();
  });

  it("POST /api/licenses — creates a license for a mock signature", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })            // findBySignature → no duplicate
      .mockResolvedValueOnce({ rows: [mockProofRow] }) // findById proof
      .mockResolvedValueOnce({ rows: [mockLicenseRow] }); // create license

    const res = await app.inject({
      method: "POST",
      url: "/api/licenses",
      payload: {
        proofId: "proof_test",
        buyerWallet: BUYER_WALLET,
        feeLamports: 1_000_000,
        solanaSignature: "mock_license_sig"
      }
    });

    expect(res.statusCode).toBe(201);
    expect(res.json().data.id).toBe("lic_test");
  });

  it("POST /api/licenses — 409 for duplicate signature", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [mockLicenseRow] }); // findBySignature → duplicate

    const res = await app.inject({
      method: "POST",
      url: "/api/licenses",
      payload: {
        proofId: "proof_test",
        buyerWallet: BUYER_WALLET,
        feeLamports: 1_000_000,
        solanaSignature: "mock_license_sig"
      }
    });

    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe("LICENSE_DUPLICATE");
  });

  it("GET /api/licenses/:id — returns license", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [mockLicenseRow] });

    const res = await app.inject({
      method: "GET",
      url: "/api/licenses/lic_test"
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().data.id).toBe("lic_test");
  });

  it("GET /api/licenses/:id — 404 when not found", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await app.inject({
      method: "GET",
      url: "/api/licenses/lic_missing"
    });

    expect(res.statusCode).toBe(404);
  });

  it("GET /api/licenses?buyerWallet= — returns page", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [mockLicenseRow] });

    const res = await app.inject({
      method: "GET",
      url: `/api/licenses?buyerWallet=${BUYER_WALLET}`
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().data.items).toBeDefined();
  });

  it("GET /api/licenses — 400 when buyerWallet missing", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/licenses"
    });

    expect(res.statusCode).toBe(400);
  });
});
