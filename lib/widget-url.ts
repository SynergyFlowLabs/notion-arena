/**
 * Browser-safe URL helpers.
 *
 * `lib/widget.ts` reads from the filesystem, so it can only be imported on the
 * server. These are the pieces shared by client components.
 */

export function siteBase(): string {
  if (typeof window !== "undefined") return window.location.origin;
  return (
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "http://localhost:3000")
  ).replace(/\/$/, "");
}

export function embedUrl(slug: string, config: Record<string, unknown> = {}): string {
  const url = new URL(`${siteBase()}/embed/${slug}`);
  Object.entries(config).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    url.searchParams.set(k, String(v));
  });
  return url.toString();
}

export function downloadUrl(slug: string, config: Record<string, unknown> = {}): string {
  const url = new URL(`${siteBase()}/api/widget/${slug}`);
  Object.entries(config).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    url.searchParams.set(k, String(v));
  });
  return url.toString();
}

/** Only the params that differ from the component's declared default. */
export function diffFromDefaults(
  params: { key: string; default: string | number | boolean }[],
  config: Record<string, string | number | boolean>
): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  params.forEach((p) => {
    const v = config[p.key];
    if (v !== undefined && String(v) !== String(p.default)) out[p.key] = v;
  });
  return out;
}
