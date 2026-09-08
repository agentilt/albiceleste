import type { ReactNode } from "react";

/**
 * A vertical pitch (attacking upwards) drawn with hairlines, as the ground for a depth chart. Children are positioned
 * absolutely by the caller in percentages of the box. 3:4, so eleven slot boxes fit without the length of a real pitch.
 */
export function PitchField({ children, className = "" }: { children: ReactNode; className?: string }) {
  const stroke = "var(--color-rule-strong)";
  return (
    <div className={`relative w-full overflow-hidden border border-rule-strong bg-surface ${className}`} style={{ aspectRatio: "3 / 4" }}>
      <svg viewBox="0 0 300 400" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <rect x={0} y={0} width={300} height={400} fill="var(--color-celeste-tint)" fillOpacity={0.35} />
        <rect x={8} y={8} width={284} height={384} fill="none" stroke={stroke} />
        <line x1={8} x2={292} y1={200} y2={200} stroke={stroke} />
        <circle cx={150} cy={200} r={34} fill="none" stroke={stroke} />
        <circle cx={150} cy={200} r={1.5} fill={stroke} />
        <rect x={72} y={8} width={156} height={56} fill="none" stroke={stroke} />
        <rect x={108} y={8} width={84} height={20} fill="none" stroke={stroke} />
        <circle cx={150} cy={46} r={1.5} fill={stroke} />
        <rect x={72} y={336} width={156} height={56} fill="none" stroke={stroke} />
        <rect x={108} y={372} width={84} height={20} fill="none" stroke={stroke} />
        <circle cx={150} cy={354} r={1.5} fill={stroke} />
      </svg>
      {children}
    </div>
  );
}
