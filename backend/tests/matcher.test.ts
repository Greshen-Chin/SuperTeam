import { describe, it, expect } from "vitest";
import { matchFingerprint, computePhashBuckets } from "../src/matcher.js";
import type { Fingerprint, Proof } from "../src/schemas.js";

const FRAME = "ffff000000000000";
const FRAME_1BIT_FLIP = "ffff000000000001";
const FRAME_30BIT_DIFF = "0000ffffffffffff";

function makeProof(frameHashes: string[]): Proof {
  return {
    id: "proof_test",
    title: "Test",
    creatorWallet: "wallet1",
    sha256: "abc",
    fingerprintRoot: "root",
    frameHashes,
    duration: 10,
    solanaSignature: "sig",
    registeredAt: new Date().toISOString(),
    status: "active"
  };
}

function makeFingerprint(frameHashes: string[]): Fingerprint {
  return {
    sha256: "uploaded",
    frameHashes,
    fingerprintRoot: "uploaded_root",
    duration: 10
  };
}

describe("matchFingerprint", () => {
  it("returns none with confidence 0 for empty frameHashes", () => {
    const result = matchFingerprint(makeFingerprint([]), [makeProof([FRAME])]);
    expect(result.matchType).toBe("none");
    expect(result.confidence).toBe(0);
    expect(result.matchedProofId).toBeNull();
  });

  it("returns visual for identical frame hashes", () => {
    const frames = Array(10).fill(FRAME);
    const result = matchFingerprint(makeFingerprint(frames), [makeProof(frames)]);
    expect(result.matchType).toBe("visual");
    expect(result.confidence).toBeGreaterThanOrEqual(0.99);
    expect(result.matchedProofId).toBe("proof_test");
  });

  it("returns visual when one bit per frame is flipped", () => {
    const uploaded = Array(10).fill(FRAME_1BIT_FLIP);
    const candidate = Array(10).fill(FRAME);
    const result = matchFingerprint(makeFingerprint(uploaded), [makeProof(candidate)]);
    expect(result.matchType).toBe("visual");
  });

  it("returns none when all frames diverge by 30+ bits", () => {
    const uploaded = Array(10).fill(FRAME_30BIT_DIFF);
    const candidate = Array(10).fill(FRAME);
    const result = matchFingerprint(makeFingerprint(uploaded), [makeProof(candidate)]);
    expect(result.matchType).toBe("none");
  });

  it("returns none when no candidates", () => {
    const result = matchFingerprint(makeFingerprint([FRAME]), []);
    expect(result.matchType).toBe("none");
    expect(result.confidence).toBe(0);
  });

  it("picks best candidate when multiple proofs", () => {
    const exact = makeProof([FRAME]);
    exact.id = "exact_proof";
    const partial = makeProof([FRAME_30BIT_DIFF]);
    partial.id = "partial_proof";

    const result = matchFingerprint(makeFingerprint([FRAME]), [partial, exact]);
    expect(result.matchedProofId).toBe("exact_proof");
  });
});

describe("computePhashBuckets", () => {
  it("returns unique 4-bit prefixes as numbers", () => {
    const buckets = computePhashBuckets(["f000000000000000", "a000000000000000"]);
    expect(buckets).toContain(15); // f = 15
    expect(buckets).toContain(10); // a = 10
    expect(buckets.length).toBe(2);
  });

  it("deduplicates same prefix", () => {
    const buckets = computePhashBuckets(["f111111111111111", "f222222222222222"]);
    expect(buckets).toEqual([15]);
  });

  it("returns empty array for empty input", () => {
    expect(computePhashBuckets([])).toEqual([]);
  });
});
