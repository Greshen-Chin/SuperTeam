import { Badge } from "@/components/ui/badge";
import type { MatchType } from "@/shared/schemas";

const labelByMatchType: Record<MatchType, string> = {
  exact: "Exact Match",
  visual: "Likely Match Found",
  sequence: "Sequence Match",
  possible: "Possible Match",
  none: "No Registered Origin"
};

const toneByMatchType: Record<MatchType, "green" | "amber" | "red" | "brand"> = {
  exact: "green",
  visual: "green",
  sequence: "brand",
  possible: "amber",
  none: "red"
};

type ProofStatusBadgeProps = {
  matchType: MatchType;
};

export function ProofStatusBadge({ matchType }: ProofStatusBadgeProps) {
  return <Badge tone={toneByMatchType[matchType]}>{labelByMatchType[matchType]}</Badge>;
}

