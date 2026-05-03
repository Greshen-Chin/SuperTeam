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

// Claimant wallet is the proof owner
const CLAIMANT_WALLET = "4vMsoUT2BWatFweudnQM1xedRLfJgJ7hswhcpz4xgBTy";
const ACCUSED_WALLET  = "9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin";

vi.mock("../src/repositories/auth-repository.js", () => ({
  createAuthRepository: () => ({
    findById: vi.fn().mockResolvedValue({
      id: "user_test_id",
      walletAddress: CLAIMANT_WALLET,
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

import { buildApp } from "../src/app.js";

const deadline = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();

const mockProofRow = {
  id: "proof_test",
  title: "Test",
  description: null,
  creator_wallet: CLAIMANT_WALLET,
  creator_handle: null,
  sha256: "abc",
  phash: null,
  frame_hashes: [],
  fingerprint_root: "root",
  duration: "10",
  solana_signature: "mock_proof_sig",
  mint_address: null,
  metadata_uri: null,
  ipfs_video_uri: null,
  ipfs_thumbnail_uri: null,
  license_fee_lamports: "0",
  license_model: "flat",
  license_split: null,
  phash_bucket0: null,
  registered_at: new Date().toISOString(),
  status: "active"
};

const mockDisputeRow = {
  id: "disp_test",
  proof_id: "proof_test",
  claimant_wallet: CLAIMANT_WALLET,
  accused_wallet: ACCUSED_WALLET,
  accused_url: "https://example.com/piracy",
  reason: "Unauthorized reproduction of copyrighted video content",
  evidence: null,
  filing_fee_lamports: "10000000",
  filing_signature: "mock_dispute_sig",
  response_deadline: deadline,
  response_text: null,
  response_signature: null,
  resolution: null,
  resolution_note: null,
  resolution_signature: null,
  status: "open",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

describe("Dispute routes", () => {
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

  it("POST /api/disputes — files a dispute", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [mockProofRow] })  // findById proof (checked first)
      .mockResolvedValueOnce({ rows: [] })              // findBySignature → no dup
      .mockResolvedValueOnce({ rows: [mockDisputeRow] }); // create dispute

    const res = await app.inject({
      method: "POST",
      url: "/api/disputes",
      headers: { authorization: "Bearer mock_token" },
      payload: {
        proofId: "proof_test",
        accusedWallet: ACCUSED_WALLET,
        accusedUrl: "https://example.com/piracy",
        reason: "Unauthorized reproduction of copyrighted video content",
        filingSignature: "mock_dispute_sig"
      }
    });

    expect(res.statusCode).toBe(201);
    expect(res.json().data.id).toBe("disp_test");
  });

  it("POST /api/disputes — 401 without auth", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/disputes",
      payload: {
        proofId: "proof_test",
        accusedWallet: ACCUSED_WALLET,
        reason: "Unauthorized reproduction of copyrighted video content",
        filingSignature: "mock_sig"
      }
    });
    expect(res.statusCode).toBe(401);
  });

  it("GET /api/disputes/:id — returns dispute", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [mockDisputeRow] });

    const res = await app.inject({
      method: "GET",
      url: "/api/disputes/disp_test"
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().data.id).toBe("disp_test");
    expect(res.json().data.status).toBe("open");
  });

  it("GET /api/disputes/:id — 404 when not found", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await app.inject({
      method: "GET",
      url: "/api/disputes/disp_missing"
    });

    expect(res.statusCode).toBe(404);
  });

  it("GET /api/disputes — 400 when no filter provided", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/disputes"
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe("MISSING_FILTER");
  });

  it("GET /api/disputes?proofId= — lists by proof", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [mockDisputeRow] });

    const res = await app.inject({
      method: "GET",
      url: "/api/disputes?proofId=proof_test"
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().data.disputes).toHaveLength(1);
  });
});
