import type { MetadataRoute } from "next";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://blocksmith.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // The install endpoint takes credentials in the body; nothing to index,
        // and we do not want a crawler POSTing to it.
        disallow: ["/api/install", "/api/widget/"],
      },
    ],
 // /r/* is the machine-readable registry. Agents are explicitly welcome :
    // that is the entire point of publishing it.
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  };
}
