"use client";

interface ContextRingProps {
  used: number;
  total: number;
  size?: number;
}

export function ContextRing({ used, total, size = 36 }: ContextRingProps) {
  const pct = total > 0 ? Math.min(used / total, 1) : 0;
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct);

  const color =
    pct > 0.9 ? "var(--error)" : pct > 0.7 ? "var(--warning)" : "var(--success)";

  return (
    <svg width={size} height={size} className="shrink-0">
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke="var(--border)" strokeWidth={3}
      />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={3}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  );
}
