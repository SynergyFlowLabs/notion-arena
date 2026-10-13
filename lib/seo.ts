import type { Metadata } from "next";

/**
 * Single source of truth for site identity, used by metadata, JSON-LD and the
 * web manifest. Override with NEXT_PUBLIC_SITE_URL when previewing elsewhere.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://notionarena.vercel.app";

export const SITE_NAME = "Notion Arena";
export const SITE_TAGLINE = "the component registry for Notion";

/** The X/Twitter account that owns the card attribution. */
export const TWITTER_HANDLE = "@notionarena";

/**
 * Per-page canonical URL. Next merges page metadata over the root layout's
 * shallowly, so a canonical set once in the layout would label every route
 * with the home URL — each page must declare its own path.
 */
export function withCanonical(path: string, metadata: Metadata): Metadata {
  return {
    ...metadata,
    alternates: { ...metadata.alternates, canonical: path || "/" },
  };
}
