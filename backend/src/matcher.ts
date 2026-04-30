import type { Fingerprint, Proof, VerificationResult } from "./schemas.js";

export function matchFingerprint(input: Fingerprint, candidates: Proof[]): VerificationResult {
  let best: VerificationResult = {
    matchType: "none",
    confidence: 0,
    matchedProofId: null,
    certificateUrl: null
  };

  for (const proof of candidates) {
    const exact = proof.sha256 === input.sha256;
    const rootSimilarity = prefixSimilarity(proof.fingerprintRoot, input.fingerprintRoot);
    const frameSimilarity = overlapScore(proof.frameHashes, input.frameHashes);
    const confidence = exact ? 1 : Math.max(rootSimilarity, frameSimilarity);

    if (confidence > best.confidence) {
      best = {
        matchType: exact ? "exact" : confidence >= 0.72 ? "visual" : confidence >= 0.5 ? "possible" : "none",
        confidence: Number(confidence.toFixed(2)),
        matchedProofId: confidence >= 0.5 ? proof.id : null,
        certificateUrl: confidence >= 0.5 ? `/certificate/${proof.id}` : null
      };
    }
  }

  if (!best.matchedProofId) {
    return { matchType: "none", confidence: Number(best.confidence.toFixed(2)), matchedProofId: null, certificateUrl: null };
  }

  return best;
}

function overlapScore(left: string[], right: string[]) {
  if (!left.length || !right.length) return 0;
  const rightSet = new Set(right);
  const matches = left.filter((item) => rightSet.has(item)).length;
  return matches / Math.max(left.length, right.length);
}

function prefixSimilarity(left: string, right: string) {
  const max = Math.min(left.length, right.length);
  let same = 0;
  for (let index = 0; index < max; index += 1) {
    if (left[index] !== right[index]) break;
    same += 1;
  }
  return same / Math.max(left.length, right.length, 1);
}
