import type { SVGProps } from "react";

/**
 * Notion Arena icon set.
 *
 * One visual language, so the icons read as a family rather than a bag of
 * borrowed glyphs: 24px grid, 1.6px stroke, round caps and joins, drawn in
 * `currentColor` so they inherit ink and never fight the surface they sit on.
 *
 * Filled shapes are reserved for exactly one job : marking state (a checked
 * box, an active dot) : so that a filled mark always means something.
 */

type P = SVGProps<SVGSVGElement> & { size?: number };

function Base({ size = 20, children, ...rest }: P & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
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

/* ------------------------------------------------------------------ */
/* Brand mark                                                          */
/* ------------------------------------------------------------------ */

/**
 * The Notion Arena mark: an anvil-shaped block mid-assembly. Two stacked
 * planes and a struck corner : a component being forged into a page.
 */
export function LogoMark({ size = 22, ...rest }: P) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {/* back plane */}
      <path
        d="M6.6 3.4 18.2 5.9a1 1 0 0 1 .8.98v10.2a1 1 0 0 1-.72.96l-1.4.44"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.42}
      />
      {/* front block */}
      <rect
        x="3.4"
        y="7.2"
        width="12.4"
        height="12.4"
        rx="2.4"
        fill="currentColor"
      />
 {/* struck corner : the smith's mark */}
      <path
        d="M15.8 7.2v-2a1.6 1.6 0 0 0-2.3-1.44l-1.9.86"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* inset glyph */}
      <path
        d="M6.9 11.1h5.4M6.9 14h3.4"
        stroke="var(--color-card, #fff)"
        strokeWidth={1.7}
        strokeLinecap="round"
      />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Navigation & sections                                               */
/* ------------------------------------------------------------------ */

export const IconCompass = (p: P) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="m14.9 9.1-1.7 4.1-4.1 1.7 1.7-4.1z" fill="currentColor" stroke="none" />
  </Base>
);

/* ------------------------------------------------------------------ */
/* Delivery channels                                                   */
/* ------------------------------------------------------------------ */

export const IconLink = (p: P) => (
  <Base {...p}>
    <path d="M10.2 13.8a3.6 3.6 0 0 0 5.1 0l2.6-2.6a3.6 3.6 0 0 0-5.1-5.1l-1.2 1.2" />
    <path d="M13.8 10.2a3.6 3.6 0 0 0-5.1 0L6.1 12.8a3.6 3.6 0 0 0 5.1 5.1l1.2-1.2" />
  </Base>
);

export const IconCode = (p: P) => (
  <Base {...p}>
    <path d="m8.4 8.2-4 3.8 4 3.8M15.6 8.2l4 3.8-4 3.8M13.6 5.4l-3.2 13.2" />
  </Base>
);

export const IconTerminal = (p: P) => (
  <Base {...p}>
    <rect x="3" y="4.5" width="18" height="15" rx="2.2" />
    <path d="m7.4 10 2.3 2.2-2.3 2.2M12.6 14.6h4" />
  </Base>
);

export const IconDatabase = (p: P) => (
  <Base {...p}>
    <ellipse cx="12" cy="6.2" rx="7.4" ry="2.9" />
    <path d="M4.6 6.2v11.6c0 1.6 3.3 2.9 7.4 2.9s7.4-1.3 7.4-2.9V6.2" />
    <path d="M4.6 12c0 1.6 3.3 2.9 7.4 2.9s7.4-1.3 7.4-2.9" />
  </Base>
);

export const IconFrame = (p: P) => (
  <Base {...p}>
    <rect x="3" y="4.5" width="18" height="15" rx="2.2" />
    <path d="M3 8.8h18" />
    <circle cx="6" cy="6.6" r="0.7" fill="currentColor" stroke="none" />
    <circle cx="8.4" cy="6.6" r="0.7" fill="currentColor" stroke="none" />
  </Base>
);

/* ------------------------------------------------------------------ */
/* Actions                                                             */
/* ------------------------------------------------------------------ */

export const IconCopy = (p: P) => (
  <Base {...p}>
    <rect x="8.6" y="8.6" width="11.4" height="11.4" rx="2" />
    <path d="M15.4 5.6A2 2 0 0 0 13.4 4H6a2 2 0 0 0-2 2v7.4a2 2 0 0 0 1.6 1.96" />
  </Base>
);

export const IconCheck = (p: P) => (
  <Base {...p}>
    <path d="m4.8 12.6 4.6 4.6L19.2 7.4" strokeWidth={2} />
  </Base>
);

export const IconDownload = (p: P) => (
  <Base {...p}>
    <path d="M12 3.6v11.2M7.6 10.6 12 15l4.4-4.4M4.4 19.6h15.2" />
  </Base>
);

export const IconExternal = (p: P) => (
  <Base {...p}>
    <path d="M14.4 4h5.6v5.6M19.4 4.6 11 13" />
    <path d="M18 14.6v4a1.8 1.8 0 0 1-1.8 1.8H5.8A1.8 1.8 0 0 1 4 18.6V8.2a1.8 1.8 0 0 1 1.8-1.8h4" />
  </Base>
);

export const IconSearch = (p: P) => (
  <Base {...p}>
    <circle cx="10.8" cy="10.8" r="6.6" />
    <path d="m15.6 15.6 4.2 4.2" />
  </Base>
);

export const IconArrowRight = (p: P) => (
  <Base {...p}>
    <path d="M4.6 12h14.2M13.4 6.6 18.8 12l-5.4 5.4" />
  </Base>
);

export const IconChevron = (p: P) => (
  <Base {...p}>
    <path d="m9.4 6.2 5.8 5.8-5.8 5.8" />
  </Base>
);

export const IconRefresh = (p: P) => (
  <Base {...p}>
    <path d="M3.8 12a8.2 8.2 0 0 1 14-5.8M20.2 12a8.2 8.2 0 0 1-14 5.8" />
    <path d="M17.8 3.4v3.4h-3.4M6.2 20.6v-3.4h3.4" />
  </Base>
);

export const IconSun = (p: P) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="4.1" />
    <path d="M12 3v2M12 19v2M4.9 4.9l1.5 1.5M17.6 17.6l1.5 1.5M3 12h2M19 12h2M4.9 19.1l1.5-1.5M17.6 6.4l1.5-1.5" />
  </Base>
);

export const IconMoon = (p: P) => (
  <Base {...p}>
    <path d="M20 14.2A8.4 8.4 0 0 1 9.8 4 8.4 8.4 0 1 0 20 14.2" />
  </Base>
);

export const IconGithub = (p: P) => (
  <svg width={p.size ?? 20} height={p.size ?? 20} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" focusable="false" {...p}>
    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.4 7.4 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
  </svg>
);

export const IconMenu = (p: P) => (
  <Base {...p}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </Base>
);

export const IconClose = (p: P) => (
  <Base {...p}>
    <path d="m6.2 6.2 11.6 11.6M17.8 6.2 6.2 17.8" />
  </Base>
);

export const IconPlus = (p: P) => (
  <Base {...p}>
    <path d="M12 5.2v13.6M5.2 12h13.6" />
  </Base>
);

/* ------------------------------------------------------------------ */
/* State                                                               */
/* ------------------------------------------------------------------ */

export const IconCheckCircle = (p: P) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="m8.2 12.3 2.6 2.6 5-5.4" strokeWidth={1.9} />
  </Base>
);

export const IconXCircle = (p: P) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="m9.2 9.2 5.6 5.6M14.8 9.2l-5.6 5.6" strokeWidth={1.9} />
  </Base>
);

export const IconAlert = (p: P) => (
  <Base {...p}>
    <path d="M12 4.4 21 19.6H3z" />
    <path d="M12 10v4" strokeWidth={1.9} />
    <circle cx="12" cy="16.8" r="0.9" fill="currentColor" stroke="none" />
  </Base>
);

export const IconShield = (p: P) => (
  <Base {...p}>
    <path d="M12 3.2 5 6v5.4c0 4.3 2.9 7.6 7 9.4 4.1-1.8 7-5.1 7-9.4V6Z" />
    <path d="m9.2 11.8 2 2 3.6-4" />
  </Base>
);

export const IconUpload = (p: P) => (
  <Base {...p}>
    <path d="M12 15V4.6m0 0-4 4m4-4 4 4" />
    <path d="M4.8 14.4v3.2a2 2 0 0 0 2 2h10.4a2 2 0 0 0 2-2v-3.2" />
  </Base>
);

export const IconLayers = (p: P) => (
  <Base {...p}>
    <path d="m12 3.6 8.4 4.2L12 12 3.6 7.8Z" />
    <path d="m3.6 12.2 8.4 4.2 8.4-4.2" />
    <path d="m3.6 16.4 8.4 4.2 8.4-4.2" opacity={0.55} />
  </Base>
);

export const IconWrench = (p: P) => (
  <Base {...p}>
    <path d="M14.8 3.6a5.2 5.2 0 0 0-6.1 6.9L3.6 15.6a1.9 1.9 0 0 0 2.7 2.7l5.1-5.1a5.2 5.2 0 0 0 6.9-6.1l-2.9 2.9-2.6-.6-.6-2.6z" />
  </Base>
);

/* ------------------------------------------------------------------ */
/* Category glyphs : one distinctive mark per catalog category */
/* ------------------------------------------------------------------ */

/** Dashboards: a block grid with one live tile. */
export const CatDashboards = (p: P) => (
  <Base {...p}>
    <rect x="3.4" y="3.4" width="7.4" height="4.6" rx="1.4" />
    <rect x="13.2" y="3.4" width="7.4" height="4.6" rx="1.4" />
    <rect x="3.4" y="10.4" width="7.4" height="10.2" rx="1.4" />
    <rect x="13.2" y="10.4" width="7.4" height="10.2" rx="1.4" fill="currentColor" stroke="none" opacity={0.9} />
  </Base>
);

/** Time: a clock with an elapsed wedge. */
export const CatTime = (p: P) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="8.6" />
    <path d="M12 12V6.6" />
    <path d="M12 12a5.4 5.4 0 0 1 4.7 2.7L12 12z" fill="currentColor" stroke="none" />
    <path d="m12 12 4.2 2.4" />
  </Base>
);

/** Trackers: a contribution heatmap. */
export const CatTrackers = (p: P) => (
  <Base {...p}>
    <rect x="3.4" y="3.4" width="4.6" height="4.6" rx="1" fill="currentColor" stroke="none" opacity={0.35} />
    <rect x="9.7" y="3.4" width="4.6" height="4.6" rx="1" fill="currentColor" stroke="none" opacity={0.75} />
    <rect x="16" y="3.4" width="4.6" height="4.6" rx="1" />
    <rect x="3.4" y="9.7" width="4.6" height="4.6" rx="1" />
    <rect x="9.7" y="9.7" width="4.6" height="4.6" rx="1" fill="currentColor" stroke="none" />
    <rect x="16" y="9.7" width="4.6" height="4.6" rx="1" fill="currentColor" stroke="none" opacity={0.35} />
    <rect x="3.4" y="16" width="4.6" height="4.6" rx="1" fill="currentColor" stroke="none" opacity={0.75} />
    <rect x="9.7" y="16" width="4.6" height="4.6" rx="1" />
    <rect x="16" y="16" width="4.6" height="4.6" rx="1" fill="currentColor" stroke="none" />
  </Base>
);

/** Planning: timeline bars on a rail. */
export const CatPlanning = (p: P) => (
  <Base {...p}>
    <path d="M4 3.6v16.8" />
    <rect x="6.6" y="5" width="9" height="3.4" rx="1.2" fill="currentColor" stroke="none" />
    <rect x="9" y="10.4" width="11" height="3.4" rx="1.2" />
    <rect x="6.6" y="15.8" width="6.6" height="3.4" rx="1.2" fill="currentColor" stroke="none" opacity={0.45} />
  </Base>
);

/** Business: ascending bars under a trend line. */
export const CatBusiness = (p: P) => (
  <Base {...p}>
    <path d="M3.6 20.4h16.8" />
    <rect x="5.4" y="13.6" width="3.4" height="5" rx="1" />
    <rect x="10.6" y="9.8" width="3.4" height="8.8" rx="1" fill="currentColor" stroke="none" />
    <rect x="15.8" y="5.4" width="3.4" height="13.2" rx="1" />
    <path d="m5 8.4 4.6-3.2 4 2.2L20 3.4" opacity={0.5} />
  </Base>
);

/** Visuals: shapes on a canvas. */
export const CatVisuals = (p: P) => (
  <Base {...p}>
    <circle cx="8.6" cy="8.6" r="4.6" />
    <rect x="12.4" y="12.4" width="8" height="8" rx="1.6" fill="currentColor" stroke="none" opacity={0.85} />
    <path d="m17.8 3.6 3.4 5.8h-6.8z" opacity={0.5} />
  </Base>
);

/** Docs: a page with a folded corner and rules. */
export const CatDocs = (p: P) => (
  <Base {...p}>
    <path d="M13.4 3.4H6.8a1.8 1.8 0 0 0-1.8 1.8v13.6a1.8 1.8 0 0 0 1.8 1.8h10.4a1.8 1.8 0 0 0 1.8-1.8V8.6z" />
    <path d="M13.4 3.4v5.2H19" />
    <path d="M8.4 13h7M8.4 16.4h4.6" />
  </Base>
);

/** Automations: a bolt inside a loop. */
export const CatAutomations = (p: P) => (
  <Base {...p}>
    <path d="M20 12a8 8 0 1 1-2.6-5.9" />
    <path d="M20 3.6V8h-4.4" />
    <path d="m13 8.6-2.6 4.2h3.2L11 17l4.6-5.4h-3.2z" fill="currentColor" stroke="none" />
  </Base>
);

export const CATEGORY_ICONS = {
  dashboards: CatDashboards,
  time: CatTime,
  trackers: CatTrackers,
  planning: CatPlanning,
  business: CatBusiness,
  visuals: CatVisuals,
  docs: CatDocs,
  automations: CatAutomations,
} as const;

export const IconChevronUp = (p: P) => (
  <Base {...p}>
    <path d="M6 14l6-6 6 6" />
  </Base>
);

export const IconChevronDown = (p: P) => (
  <Base {...p}>
    <path d="M6 10l6 6 6-6" />
  </Base>
);

export const IconTrash = (p: P) => (
  <Base {...p}>
    <path d="M4 7h16" />
    <path d="M9 7V4h6v3" />
    <path d="M6 7l1 13h10l1-13" />
    <path d="M10 11v6M14 11v6" />
  </Base>
);

export const IconDragDots = (p: P) => (
  <Base {...p}>
    <circle cx="9" cy="6" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="15" cy="6" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="9" cy="12" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="15" cy="12" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="9" cy="18" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="15" cy="18" r="1.2" fill="currentColor" stroke="none" />
  </Base>
);
