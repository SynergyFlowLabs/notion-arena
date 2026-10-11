import * as React from "react";
import { cn } from "@/lib/utils";
import type { SVGProps } from "react";

/**
 * Blocksmith illustration set, drawn as inline SVG.
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

/** Embed URL: a browser bar, a link chain, one shareable address. */
export function ChannelEmbedArt(props: P) {
  return (
    <Sheet {...props}>
      <rect x="28" y="34" width="184" height="92" rx="10" />
      <path d="M28 54h184" />
      <circle cx="42" cy="44" r="2.4" fill="currentColor" stroke="none" opacity={0.5} />
      <circle cx="52" cy="44" r="2.4" fill="currentColor" stroke="none" opacity={0.5} />
      <circle cx="62" cy="44" r="2.4" fill="currentColor" stroke="none" opacity={0.5} />
      <rect x="76" y="39" width="120" height="10" rx="5" opacity={0.35} />
      {/* the address is the product: one configured link */}
      <rect x="44" y="68" width="152" height="18" rx="9" style={{ fill: "var(--tint-sky)", stroke: "none" }} />
      <path d="M56 77h10M72 77h52" style={{ stroke: "var(--tint-sky-ink)" }} />
      <path d="M132 77h52" style={{ stroke: "var(--tint-sky-ink)" }} opacity={0.55} />
      {/* link chain, centred as the hero of the card */}
      <path d="M110 108h-8a10 10 0 0 1 0-20h8" />
      <path d="M130 88h8a10 10 0 0 1 0 20h-8" />
      <path d="M104 98h32" />
    </Sheet>
  );
}

/** HTML block: one self-contained file, uploaded into a Notion page. */
export function ChannelBlockArt(props: P) {
  return (
    <Sheet {...props}>
      <PageGlyph x={132} y={30} w={72} h={100} />
      {/* the slot the file lands in */}
      <rect x="144" y="86" width="48" height="30" rx="6" strokeDasharray="4 4" opacity={0.7} />
      {/* the file itself */}
      <path d="M40 52a6 6 0 0 1 6-6h30l14 14v52a6 6 0 0 1-6 6H46a6 6 0 0 1-6-6Z" style={{ fill: "var(--card)" }} />
      <path d="M76 46v14h14" />
      <path d="M52 76h26M52 86h20M52 96h24" opacity={0.55} />
      {/* upload arrow, file to slot */}
      <path d="M104 100h18m0 0-6-6m6 6-6 6" style={{ stroke: "var(--primary)" }} />
      <path d="M65 64v-12m0 0-5 5m5-5 5 5" style={{ stroke: "var(--primary)" }} />
    </Sheet>
  );
}

/** Native recipe: a terminal issuing API calls that build a database. */
export function ChannelRecipeArt(props: P) {
  return (
    <Sheet {...props}>
      <rect x="26" y="36" width="104" height="72" rx="10" />
      <path d="M26 54h104" />
      <path d="M40 70l10 8-10 8M58 86h28" style={{ stroke: "var(--tint-mint-ink)" }} />
      <path d="M40 98h56" opacity={0.45} />
      {/* request arrows, terminal to database */}
      <path d="M138 62h16m0 0-5-5m5 5-5 5" opacity={0.8} />
      <path d="M138 80h16m0 0-5-5m5 5-5 5" opacity={0.6} />
      <path d="M138 98h16m0 0-5-5m5 5-5 5" opacity={0.4} />
      {/* database cylinder */}
      <ellipse cx="182" cy="52" rx="26" ry="9" style={{ fill: "var(--tint-lavender)", stroke: "var(--tint-lavender-ink)" }} />
      <path d="M156 52v44c0 5 11.6 9 26 9s26-4 26-9V52" style={{ stroke: "var(--tint-lavender-ink)" }} />
      <path d="M156 74c0 5 11.6 9 26 9s26-4 26-9M156 92c0 5 11.6 9 26 9s26-4 26-9" style={{ stroke: "var(--tint-lavender-ink)" }} opacity={0.6} />
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
