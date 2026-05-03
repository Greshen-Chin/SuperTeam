export type ReputationLabel = "verified" | "neutral" | "flagged" | "known_infringer";

export type ReputationScore = {
  wallet: string;
  label: ReputationLabel;
  score: number;
  totalDisputesAsAccused: number;
  unresolvedDisputesAsAccused: number;
  resolvedAgainst: number;
  dismissed: number;
  totalDisputesAsClaimant: number;
  registeredProofs: number;
  asOf: string;
};

export function scoreFromCounts(
  c: Pick<
    ReputationScore,
    | "totalDisputesAsAccused"
    | "unresolvedDisputesAsAccused"
    | "resolvedAgainst"
    | "dismissed"
    | "registeredProofs"
  >
): { score: number; label: ReputationLabel } {
  let score = 100;
  score -= 15 * c.resolvedAgainst;
  score -= 5 * c.unresolvedDisputesAsAccused;
  score += 2 * Math.min(c.registeredProofs, 10);
  score = Math.max(0, Math.min(100, score));

  let label: ReputationLabel;
  if (c.resolvedAgainst >= 3) {
    label = "known_infringer";
  } else if (c.unresolvedDisputesAsAccused >= 1 || c.resolvedAgainst >= 1) {
    label = "flagged";
  } else if (c.resolvedAgainst === 0 && c.registeredProofs >= 1 && score >= 95) {
    label = "verified";
  } else {
    label = "neutral";
  }

  return { score, label };
}
