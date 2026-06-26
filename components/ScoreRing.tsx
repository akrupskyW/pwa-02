// The signature score ring: angular brand-gradient arc with a glowing tip
// dot and a center label. See DESIGN.md §2 "ScoreRing".
//
// Implementation is pure SVG, so the arc length scales with the score and
// the tip dot's angular position lines up with the arc's end. No `mask`
// trickery — keeps it reliable in Safari and printable.

interface Props {
  /** 0-100 — the visible score. */
  value: number;
  /** Diameter in px. Default 220. */
  size?: number;
  /** Ring thickness as a fraction of the radius. Default 0.14 (~14 px on 220). */
  thicknessRatio?: number;
  /** Override the overline label under the score. */
  label?: string;
  /** Override the big number — used to show "—" when value is missing. */
  display?: string;
  /** Hide the halo glow behind the ring. */
  noHalo?: boolean;
  /** Adjust the rendered number's font-size (px). Defaults to size * 0.36. */
  numberSize?: number;
}

const GRADIENT_ID = "score-arc-gradient";
const HALO_ID = "score-arc-halo";

export const ScoreRing = ({
  value,
  size = 220,
  thicknessRatio = 0.14,
  label = "YOUR SCORE",
  display,
  noHalo,
  numberSize,
}: Props) => {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  const r = size / 2;
  const thickness = r * thicknessRatio;
  const innerR = r - thickness / 2;
  const circumference = 2 * Math.PI * innerR;
  // Full arc would be the whole circumference; reserve ~10° of negative space
  // so a 100 doesn't look like a closed ring (subtle but signals the seam).
  const visibleFraction = 0.97;
  const arcLength = circumference * visibleFraction * (clamped / 100);
  const gap = circumference - arcLength;

  // Position the tip dot at the end of the arc. -90° = "12 o'clock" start.
  const tipAngleDeg = -90 + 360 * visibleFraction * (clamped / 100);
  const tipRad = (tipAngleDeg * Math.PI) / 180;
  const tipX = r + innerR * Math.cos(tipRad);
  const tipY = r + innerR * Math.sin(tipRad);

  const number = display ?? String(clamped);
  const ns = numberSize ?? Math.round(size * 0.36);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {!noHalo && (
        <div
          aria-hidden
          className="rounded-pill pointer-events-none absolute inset-0 opacity-70 blur-2xl"
          style={{
            background: "radial-gradient(closest-side, rgba(50,169,102,0.35), transparent 75%)",
          }}
        />
      )}
      <svg
        viewBox={`0 0 ${size} ${size}`}
        width={size}
        height={size}
        className="relative block"
        aria-hidden
      >
        <defs>
          <linearGradient id={GRADIENT_ID} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#32A966" />
            <stop offset="40%" stopColor="#245E3B" />
            <stop offset="75%" stopColor="#587896" />
            <stop offset="100%" stopColor="#25507C" />
          </linearGradient>
          <radialGradient id={HALO_ID}>
            <stop offset="0%" stopColor="#32A966" stopOpacity="0.55" />
            <stop offset="80%" stopColor="#FBF6ED" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Track. */}
        <circle
          cx={r}
          cy={r}
          r={innerR}
          fill="none"
          stroke="var(--color-track)"
          strokeWidth={thickness}
        />

        {/* Progress arc, rotated so the start is at 12 o'clock. */}
        <circle
          cx={r}
          cy={r}
          r={innerR}
          fill="none"
          stroke={`url(#${GRADIENT_ID})`}
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={`${arcLength} ${gap}`}
          transform={`rotate(-90 ${r} ${r})`}
        />

        {/* Tip glow + dot. */}
        {clamped > 0 && (
          <>
            <circle
              cx={tipX}
              cy={tipY}
              r={thickness * 0.7}
              fill="#32A966"
              opacity={0.35}
              filter="blur(6px)"
            />
            <circle cx={tipX} cy={tipY} r={thickness * 0.55} fill="#32A966" />
          </>
        )}
      </svg>

      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <div
          className="text-ink-bright leading-none font-extrabold tabular-nums"
          style={{
            fontSize: ns,
            letterSpacing: `${Math.round(-ns * 0.04)}px`,
          }}
        >
          {number}
        </div>
        {label && (
          <div className="text-ink-muted mt-1 text-[10px] font-bold tracking-[0.18em]">{label}</div>
        )}
      </div>
    </div>
  );
};
