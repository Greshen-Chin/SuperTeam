import { formatPercent } from "@/lib/utils";

type ConfidenceMeterProps = {
  value: number;
};

export function ConfidenceMeter({ value }: ConfidenceMeterProps) {
  const width = `${Math.round(value * 100)}%`;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold text-ink">Confidence</span>
        <span className="text-muted">{formatPercent(value)}</span>
      </div>
      <div className="h-2 rounded-full bg-surface">
        <div className="h-2 rounded-full bg-brand-600" style={{ width }} />
      </div>
    </div>
  );
}

