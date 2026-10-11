import { cn } from "@/lib/utils";

/**
 * Branded avatars.
 *
 * Notion's own avatars are flat geometric marks in its property palette, so
 * these are generated rather than illustrated: a stable hash of the seed picks
 * a tint pair and one of six block arrangements. Same seed always yields the
 * same avatar, which is what makes them usable as author/contributor marks.
 *
 * Pure SVG : no image requests, no raster assets, and they stay crisp at the
 * 18px size they usually render at.
 */

const PALETTE = [
  { bg: "var(--tint-peach)", fg: "var(--tint-peach-ink)" },
  { bg: "var(--tint-rose)", fg: "var(--tint-rose-ink)" },
  { bg: "var(--tint-mint)", fg: "var(--tint-mint-ink)" },
  { bg: "var(--tint-lavender)", fg: "var(--tint-lavender-ink)" },
  { bg: "var(--tint-sky)", fg: "var(--tint-sky-ink)" },
  { bg: "var(--tint-butter)", fg: "var(--tint-butter-ink)" },
  { bg: "var(--tint-clay)", fg: "var(--tint-clay-ink)" },
  { bg: "var(--tint-stone)", fg: "var(--tint-stone-ink)" },
] as const;

/** djb2 : small, stable, and identical across server and client renders. */
function hash(seed: string) {
  let h = 5381;
  for (let i = 0; i < seed.length; i++) h = ((h << 5) + h + seed.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/**
 * Six block arrangements on a 3×3 grid, as [x, y, w, h] in grid units.
 * Each is a different way of stacking Notion blocks, which is the subject
 * these avatars belong to.
 */
const GLYPHS: [number, number, number, number][][] = [
  // stacked bars, descending width
  [
    [0, 0, 3, 0.8],
    [0, 1.1, 2.2, 0.8],
    [0, 2.2, 1.4, 0.8],
  ],
  // quadrant with a full-width footer
  [
    [0, 0, 1.35, 1.35],
    [1.65, 0, 1.35, 1.35],
    [0, 1.65, 3, 1.35],
  ],
  // header, column, footer
  [
    [0, 0, 3, 0.7],
    [1.1, 0.95, 0.8, 1.2],
    [0, 2.4, 3, 0.6],
  ],
  // staircase
  [
    [0, 2, 0.9, 1],
    [1.05, 1.2, 0.9, 1.8],
    [2.1, 0.3, 0.9, 2.7],
  ],
  // four equal blocks
  [
    [0, 0, 1.35, 1.35],
    [1.65, 0, 1.35, 1.35],
    [0, 1.65, 1.35, 1.35],
    [1.65, 1.65, 1.35, 1.35],
  ],
  // diagonal with a counterweight
  [
    [0, 0, 1.1, 1.1],
    [1.1, 1.1, 1.1, 1.1],
    [2.2, 2.2, 0.8, 0.8],
  ],
];

export function Avatar({
  seed,
  size = 24,
  className,
  label,
}: {
  seed: string;
  size?: number;
  className?: string;
  label?: string;
}) {
  const h = hash(seed);
  const { bg, fg } = PALETTE[h % PALETTE.length];
  const glyph = GLYPHS[(h >> 3) % GLYPHS.length];
  const unit = 24 / 3.3;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role={label ? "img" : "presentation"}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
      className={cn("shrink-0 rounded-[6px]", className)}
      style={{ background: bg }}
    >
      {glyph.map(([gx, gy, gw, gh], i) => (
        <rect
          key={i}
          x={gx * unit + 1.6}
          y={gy * unit + 1.6}
          width={gw * unit}
          height={gh * unit}
          rx={Math.min(1.5, (gh * unit) / 2.6)}
          fill={fg}
          opacity={0.55 + ((h >> (i + 2)) % 3) * 0.2}
        />
      ))}
    </svg>
  );
}

/**
 * Initials variant, for named people. Uses the same palette and hashing so a
 * group of avatars reads as one family whichever variant is in play.
 */
export function InitialsAvatar({
  name,
  size = 24,
  className,
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const h = hash(name);
  const { bg, fg } = PALETTE[h % PALETTE.length];
  const initials = name
    .split(/[\s_-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <span
      role="img"
      aria-label={name}
      className={cn(
        "grid shrink-0 place-items-center rounded-[6px] font-semibold",
        className
      )}
      style={{
        width: size,
        height: size,
        background: bg,
        color: fg,
        fontSize: Math.round(size * 0.42),
        letterSpacing: "-0.02em",
      }}
    >
      {initials || "?"}
    </span>
  );
}
