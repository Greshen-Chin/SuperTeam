import { describe, it, expect } from "vitest";
import { scoreFromCounts } from "../src/reputation.js";

function counts(overrides: {
  totalDisputesAsAccused?: number;
  unresolvedDisputesAsAccused?: number;
  resolvedAgainst?: number;
  dismissed?: number;
  registeredProofs?: number;
}) {
  return {
    totalDisputesAsAccused: 0,
    unresolvedDisputesAsAccused: 0,
    resolvedAgainst: 0,
    dismissed: 0,
    registeredProofs: 0,
    ...overrides
  };
}

describe("scoreFromCounts", () => {
  it("neutral for brand new wallet with no proofs or disputes", () => {
    const { score, label } = scoreFromCounts(counts({}));
    expect(score).toBe(100);
    expect(label).toBe("neutral");
  });

  it("verified when no disputes and at least 1 proof, score >= 95", () => {
    const { score, label } = scoreFromCounts(counts({ registeredProofs: 3 }));
    expect(score).toBe(100); // 100 + 6 clamped to 100
    expect(label).toBe("verified");
  });

  it("verified requires registeredProofs >= 1", () => {
    const { label } = scoreFromCounts(counts({ registeredProofs: 0 }));
    expect(label).toBe("neutral");
  });

  it("flagged for 1 unresolved dispute as accused", () => {
    const { label } = scoreFromCounts(counts({ unresolvedDisputesAsAccused: 1 }));
    expect(label).toBe("flagged");
  });

  it("flagged for 1 resolved-against even if proofs exist", () => {
    const { label } = scoreFromCounts(counts({ resolvedAgainst: 1, registeredProofs: 5 }));
    expect(label).toBe("flagged");
  });

  it("known_infringer at resolvedAgainst >= 3", () => {
    const { label } = scoreFromCounts(counts({ resolvedAgainst: 3 }));
    expect(label).toBe("known_infringer");
  });

  it("known_infringer at resolvedAgainst = 5 with score = 25", () => {
    const { score, label } = scoreFromCounts(counts({ resolvedAgainst: 5 }));
    expect(score).toBe(Math.max(0, 100 - 15 * 5));
    expect(label).toBe("known_infringer");
  });

  it("score never goes below 0", () => {
    const { score } = scoreFromCounts(counts({ resolvedAgainst: 20 }));
    expect(score).toBe(0);
  });

  it("score never goes above 100", () => {
    const { score } = scoreFromCounts(counts({ registeredProofs: 100 }));
    expect(score).toBe(100);
  });

  it("score reflects 15 points per resolvedAgainst", () => {
    const { score } = scoreFromCounts(counts({ resolvedAgainst: 2 }));
    expect(score).toBe(100 - 30);
  });

  it("score reflects 5 points per unresolved dispute", () => {
    const { score } = scoreFromCounts(counts({ unresolvedDisputesAsAccused: 2 }));
    expect(score).toBe(100 - 10);
  });

  it("score adds 2 points per proof (capped at 10 proofs)", () => {
    const { score: s10 } = scoreFromCounts(counts({ registeredProofs: 10 }));
    const { score: s20 } = scoreFromCounts(counts({ registeredProofs: 20 }));
    expect(s10).toBe(100); // 100 + 20 → clamped to 100
    expect(s20).toBe(100); // same cap
  });
});
