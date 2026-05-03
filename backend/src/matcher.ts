import type { Fingerprint, Proof, VerificationResult } from "./schemas.js";

const MAX_FRAME_HAMMING = 10;

function popcountBigInt(n: bigint): number {
  let count = 0;
  let x = n;
  while (x > 0n) {
    if (x & 1n) count++;
    x >>= 1n;
  }
  return count;
}

function frameHammingDistance(a: string, b: string): number {
  if (!a || !b) return 64;
  const padded = (s: string) => s.slice(0, 16).padEnd(16, "0");
  const aVal = BigInt(`0x${padded(a)}`);
  const bVal = BigInt(`0x${padded(b)}`);
  return popcountBigInt(aVal ^ bVal);
}

export function computePhashBuckets(frameHashes: string[]): number[] {
  const buckets = new Set<number>();
  for (const hash of frameHashes) {
    const firstChar = hash[0];
    if (firstChar) buckets.add(parseInt(firstChar, 16));
  }
  return Array.from(buckets);
}

export function matchFingerprint(input: Fingerprint, candidates: Proof[]): VerificationResult {
  if (!input.frameHashes.length) {
    return { matchType: "none", confidence: 0, matchedProofId: null, certificateUrl: null };
  }

  let bestConfidence = 0;
  let bestAvgHamming = 64;
  let bestResult: VerificationResult = {
    matchType: "none",
    confidence: 0,
    matchedProofId: null,
    certificateUrl: null
  };

  for (const proof of candidates) {
    if (!proof.frameHashes.length) continue;

    let framesUnderThreshold = 0;
    let totalHamming = 0;

    for (const uploadedFrame of input.frameHashes) {
      let minHamming = 64;
      for (const candidateFrame of proof.frameHashes) {
        const dist = frameHammingDistance(uploadedFrame, candidateFrame);
        if (dist < minHamming) minHamming = dist;
      }
      if (minHamming <= MAX_FRAME_HAMMING) framesUnderThreshold++;
      totalHamming += minHamming;
    }

    const score = framesUnderThreshold / input.frameHashes.length;
    const avgHamming = totalHamming / input.frameHashes.length;

    let matchType: VerificationResult["matchType"];
    let confidence: number;

    if (score >= 0.6) {
      matchType = "visual";
      confidence = 0.85 + score * 0.14;
    } else if (score >= 0.4) {
      matchType = "possible";
      confidence = 0.65 + score * 0.19;
    } else {
      matchType = "none";
      confidence = score;
    }

    if (
      matchType !== "none" &&
      (confidence > bestConfidence || (confidence === bestConfidence && avgHamming < bestAvgHamming))
    ) {
      bestConfidence = confidence;
      bestAvgHamming = avgHamming;
      bestResult = {
        matchType,
        confidence: Number(confidence.toFixed(4)),
        matchedProofId: proof.id,
        certificateUrl: `/certificate/${proof.id}`
      };
    }
  }

  return bestResult;
}
