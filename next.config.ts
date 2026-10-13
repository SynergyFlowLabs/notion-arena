import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The injected bridge is read from disk at render time so that
  // public/widgets/*.html stay byte-for-byte sandbox-pure (the contract
  // scripts/check-widgets.mjs enforces). File tracing cannot see a path built
  // with path.join(process.cwd(), ...), so it is declared here by hand.
  outputFileTracingIncludes: {
    "/api/sync/**": ["./lib/bridge/client.js"],
    "/embed/**": ["./lib/bridge/client.js"],
  },
  // The Arena preview proxies the dev server under https://{port}-{sandboxId}.e2b.app
  allowedDevOrigins: ["*.e2b.app", "localhost", "127.0.0.1"],
  async headers() {
    return [
      {
        // Raw widget source files. No X-Frame-Options: there is no value that
        // means "allow all framers" — framing is permitted by omitting the
        // header, and /embed/* states it explicitly with CSP frame-ancestors.
        source: "/widgets/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Cache-Control", value: "public, max-age=300, stale-while-revalidate=3600" },
        ],
      },
      {
        source: "/embed/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          // Iframe target, not a destination page: keep it out of the index.
          { key: "X-Robots-Tag", value: "noindex" },
        ],
      },
      {
        source: "/c/:path*",
        headers: [
          // Same: a sandbox/preview transport, not a page to search for.
          { key: "X-Robots-Tag", value: "noindex" },
        ],
      },
      {
        // shadcn-style registry endpoints
        source: "/r/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Content-Type", value: "application/json" },
          // Raw JSON for agents; the HTML pages are the indexable surface.
          { key: "X-Robots-Tag", value: "noindex" },
        ],
      },
    ];
  },
};

export default nextConfig;
