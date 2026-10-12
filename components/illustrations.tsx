import * as React from "react";
import { cn } from "@/lib/utils";
import type { SVGProps } from "react";

/**
 * Notion Arena illustration set, drawn as inline SVG.
 *
 * Vectors rather than rasters wherever the art has to carry meaning: they
 * inherit `currentColor` and the token variables, so every piece redraws
 * itself for light and dark mode with no second asset, and they stay crisp
 * at any size. One visual language with the icon set: 1.6 stroke, round caps
 * and joins, fills reserved for tinted surfaces and state.
 *
 * Raster illustrations (public/illustrations/) handle the painterly spots;
 * these handle diagrams and states, where labelled structure matters.
 */

type P = SVGProps<SVGSVGElement>;

function Sheet({ children, ...rest }: P & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 240 160"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

/** A Notion page: folded corner, title rule, two body rules. The atom. */
function PageGlyph({ x, y, w = 56, h = 68 }: { x: number; y: number; w?: number; h?: number }) {
  return (
    <g>
      <path d={`M${x} ${y + 6}a6 6 0 0 1 6-6h${w - 18}l12 12v${h - 12}a6 6 0 0 1-6 6h-${w - 6}a6 6 0 0 1-6-6Z`} />
      <path d={`M${x + w - 18} ${y}v12h12`} />
      <path d={`M${x + 10} ${y + 26}h${w - 20}M${x + 10} ${y + 36}h${w - 28}M${x + 10} ${y + 46}h${w - 24}`} opacity={0.55} />
    </g>
  );
}

/** Embed URL: a hand holding a link chain popping out of a browser window. */
export function ChannelEmbedArt(props: P) {
  return (
    <Sheet {...props} viewBox="0 0 260 160" strokeWidth={2.6}>
      {/* Cute chunky browser window */}
      <rect x="46" y="34" width="152" height="96" rx="10" fill="currentColor" opacity="0" />
      <rect x="46" y="34" width="152" height="96" rx="10" />
      <path d="M46 56h152" />
      <circle cx="60" cy="45" r="3" fill="currentColor" stroke="none" />
      <circle cx="72" cy="45" r="3" fill="currentColor" stroke="none" opacity="0.6" />
      <circle cx="84" cy="45" r="3" fill="currentColor" stroke="none" opacity="0.35" />
      {/* Address bar with one link inside */}
      <rect x="96" y="42" width="92" height="8" rx="4" opacity="0.2" />
      {/* Link chain popping out */}
      <path d="M100 98a14 14 0 0 1 0-20h10" strokeWidth={3.2} />
      <path d="M150 78a14 14 0 0 1 0 20h-10" strokeWidth={3.2} />
      <path d="M96 88h50" strokeWidth={3.2} />
      {/* Sparkles around to match hero */}
      <path d="M38 70l3 -5 3 5 -3 5z" fill="currentColor" stroke="none" opacity="0.5" />
      <path d="M216 62l2 -4 2 4 -2 4z" fill="currentColor" stroke="none" opacity="0.5" />
      <path d="M206 112l2 -3 2 3 -2 3z" fill="currentColor" stroke="none" opacity="0.35" />
    </Sheet>
  );
}

/** HTML block: a page with a file being dropped in, plus a little arrow + sparkle. */
export function ChannelBlockArt(props: P) {
  return (
    <Sheet {...props} viewBox="0 0 260 160" strokeWidth={2.6}>
      {/* A friendly Notion-style page */}
      <path d="M72 36h60l18 18v74a6 6 0 0 1-6 6h-72a6 6 0 0 1-6-6V42a6 6 0 0 1 6-6z" />
      <path d="M132 36v18h18" />
      {/* Title line */}
      <path d="M84 66h36" strokeWidth={3} />
      {/* Body lines */}
      <path d="M84 80h54" opacity="0.5" />
      <path d="M84 90h44" opacity="0.5" />
      <path d="M84 100h50" opacity="0.5" />
      {/* File being dropped into the page */}
      <path d="M162 62c0-3 2-5 5-5h18l12 12v30c0 3-2 5-5 5h-25c-3 0-5-2-5-5z" fill="currentColor" opacity="0.08" />
      <path d="M162 62c0-3 2-5 5-5h18l12 12v30c0 3-2 5-5 5h-25c-3 0-5-2-5-5z" />
      <path d="M185 57v12h12" />
      {/* Chevrons on the file */}
      <path d="M172 84h6M172 92h14" opacity="0.5" />
      {/* Arrow down, file -> page */}
      <path d="M148 110l-10 10 -10 -10" strokeWidth={2.8} />
      <path d="M138 120V84" strokeWidth={2.8} />
    </Sheet>
  );
}

/** Native recipe: terminal + database cylinder, connected with an arrow. */
export function ChannelRecipeArt(props: P) {
  return (
    <Sheet {...props} viewBox="0 0 260 160" strokeWidth={2.6}>
      {/* Chunky terminal window */}
      <rect x="32" y="44" width="96" height="74" rx="10" />
      <path d="M32 62h96" />
      <circle cx="46" cy="53" r="3" fill="currentColor" stroke="none" />
      <circle cx="58" cy="53" r="3" fill="currentColor" stroke="none" opacity="0.5" />
      {/* Prompt + chevron */}
      <path d="M48 82l8 7 -8 7" strokeWidth={3} />
      <path d="M64 89h22" opacity="0.5" />
      <path d="M48 102h36" opacity="0.35" />
      {/* Arrow terminal -> database */}
      <path d="M136 82h18" strokeWidth={2.8} />
      <path d="M148 76l6 6 -6 6" strokeWidth={2.8} />
      {/* Database cylinder, bold outline */}
      <ellipse cx="196" cy="66" rx="30" ry="10" />
      <path d="M166 66v40c0 5 13.4 10 30 10s30-5 30-10V66" />
      <path d="M166 86c0 5 13.4 10 30 10s30-5 30-10" opacity="0.5" />
      <path d="M166 98c0 5 13.4 10 30 10s30-5 30-10" opacity="0.3" />
      {/* Little checkmark on the database */}
      <path d="M188 66l6 6 12-12" strokeWidth={3} />
    </Sheet>
  );
}

/** Registry: components.json names a registry, the registry serves bytes. */
export function RegistryFlowArt(props: P) {
  return (
    <Sheet {...props}>
      {/* components.json */}
      <rect x="18" y="52" width="64" height="56" rx="8" style={{ fill: "var(--card)" }} />
      <path d="M30 68h40M30 78h32M30 88h36" opacity={0.55} />
      <path d="M30 98h20" opacity={0.35} />
      <path d="M86 80h20m0 0-5-5m5 5-5 5" />
      {/* registry host */}
      <rect x="110" y="42" width="56" height="76" rx="8" style={{ fill: "var(--tint-sky)" , stroke: "var(--tint-sky-ink)" }} />
      <path d="M120 58h36M120 70h28M120 82h32M120 94h24" style={{ stroke: "var(--tint-sky-ink)" }} opacity={0.7} />
      <path d="M170 66h18m0 0-5-5m5 5-5 5M170 94h18m0 0-5-5m5 5-5 5" />
      {/* consumers: an agent and a browser */}
      <rect x="192" y="40" width="34" height="26" rx="6" />
      <path d="M200 50l5 4-5 4M210 58h8" opacity={0.8} />
      <rect x="192" y="82" width="34" height="26" rx="6" />
      <path d="M192 90h34" opacity={0.6} />
      <circle cx="198" cy="86" r="1.6" fill="currentColor" stroke="none" opacity={0.6} />
    </Sheet>
  );
}

/** Sandbox: the file runs inside a wall it cannot see over. */
export function SandboxFlowArt(props: P) {
  return (
    <Sheet {...props}>
      <PageGlyph x={26} y={44} w={56} h={72} />
      {/* the sandbox wall */}
      <rect x="104" y="30" width="110" height="100" rx="12" strokeDasharray="5 5" />
      <path d="M159 22v8m0 100v8" opacity={0.5} />
      {/* widget running inside */}
      <rect x="120" y="52" width="78" height="40" rx="8" style={{ fill: "var(--tint-mint)", stroke: "var(--tint-mint-ink)" }} />
      <path d="M130 78l10-12 8 8 12-14 12 12" style={{ stroke: "var(--tint-mint-ink)" }} />
      <path d="M120 104h78" opacity={0.45} />
      <path d="M120 114h52" opacity={0.3} />
      {/* no arrow leaves the wall */}
      <path d="M86 80h12" />
      <path d="M96 74l6 6-6 6" opacity={0.4} />
    </Sheet>
  );
}

/** Catalog empty state: a tidy grid with nothing in it yet. */
export function EmptyCatalogArt(props: P) {
  return (
    <Sheet {...props}>
      <rect x="40" y="36" width="48" height="36" rx="8" opacity={0.35} />
      <rect x="96" y="36" width="48" height="36" rx="8" opacity={0.35} />
      <rect x="152" y="36" width="48" height="36" rx="8" opacity={0.35} />
      <rect x="40" y="80" width="48" height="36" rx="8" opacity={0.2} />
      <rect x="152" y="80" width="48" height="36" rx="8" opacity={0.2} />
      {/* the one card the search did not find, lifted out */}
      <rect x="98" y="76" width="48" height="36" rx="8" strokeDasharray="4 4" />
      <circle cx="122" cy="94" r="13" style={{ stroke: "var(--primary)" }} />
      <path d="M131 103l9 9" style={{ stroke: "var(--primary)" }} />
      <path d="M116 94h12" style={{ stroke: "var(--primary)" }} opacity={0.6} />
    </Sheet>
  );
}

/** 404: a page torn out of the binder, compass beside it. */
export function NotFoundArt(props: P) {
  return (
    <Sheet {...props}>
      <path d="M52 40a6 6 0 0 1 6-6h34l14 14v64a6 6 0 0 1-6 6H58a6 6 0 0 1-6-6Z" style={{ fill: "var(--card)" }} />
      <path d="M92 34v14h14" />
      {/* the tear */}
      <path d="M52 84l8 6-8 6 8 6-8 6" style={{ stroke: "var(--notion-red)" }} />
      <path d="M68 58h26M68 68h20" opacity={0.55} />
      {/* compass */}
      <circle cx="164" cy="80" r="34" style={{ fill: "var(--tint-butter)", stroke: "var(--tint-butter-ink)" }} />
      <path d="M164 54v-6M164 112v-6M138 80h-6M196 80h-6" style={{ stroke: "var(--tint-butter-ink)" }} />
      <path d="M176 68l-8 20-20 8 8-20Z" style={{ stroke: "var(--tint-butter-ink)" }} />
      <circle cx="164" cy="80" r="2.4" fill="currentColor" stroke="none" />
    </Sheet>
  );
}

/**
 * Ambient dot grid, for the dark band and the closing call to action.
 * `currentColor` at low opacity means one asset serves both themes and the
 * band's two backgrounds without a variant.
 */
export function DotGrid(props: P) {
  const id = React.useId();
  return (
    <svg aria-hidden="true" focusable="false" {...props}>
      <defs>
        <pattern id={id} width="22" height="22" patternUnits="userSpaceOnUse">
          <circle cx="1.2" cy="1.2" r="1.2" fill="currentColor" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}

/**
 * A generated illustration that follows the visitor's theme.
 *
 * Each spot is painted twice by the image model: once on the warm paper
 * canvas, once on Notion's dark canvas, with the dark pass edited from the
 * light master so the composition stays identical. The two files swap on the
 * `dark` class, so the artwork never sits on a background it was not painted
 * for. Width and height are the light master's intrinsic size; the dark twin
 * is the same 3:2 composition.
 */
export function ThemedIllustration({
  name,
  alt,
  className,
}: {
  name: string;
  alt: string;
  className?: string;
}) {
  return (
    <span className={cn("relative block", className)}>
      <img
        src={`/illustrations/${name}-light.png`}
        alt={alt}
        width={1536}
        height={1024}
        loading="lazy"
        decoding="async"
        className="absolute inset-0 h-full w-full object-contain dark:hidden"
      />
      <img
        src={`/illustrations/${name}-dark.png`}
        alt=""
        aria-hidden="true"
        width={1536}
        height={1024}
        loading="lazy"
        decoding="async"
        className="absolute inset-0 h-full w-full object-contain hidden dark:block"
      />
    </span>
  );
}
