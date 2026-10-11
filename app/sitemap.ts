import type { MetadataRoute } from "next";
import { COMPONENTS } from "@/lib/catalog";
import { CATEGORIES } from "@/lib/types";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://notionarena.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    "",
    "/components",
    "/how-it-works",
    "/registry",
    "/docs",
    "/docs/sandbox",
    "/docs/api-limits",
    "/pricing",
    "/changelog",
    "/legal/terms",
    "/legal/privacy",
  ].map((path) => ({
    url: `${BASE}${path}`,
    lastModified: now,
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : path === "/components" ? 0.9 : 0.6,
  }));

  const componentRoutes: MetadataRoute.Sitemap = COMPONENTS.map((c) => ({
    url: `${BASE}/components/${c.slug}`,
    lastModified: new Date(c.updatedAt),
    changeFrequency: "monthly",
    priority: c.badge ? 0.8 : 0.7,
  }));

  const categoryRoutes: MetadataRoute.Sitemap = CATEGORIES.map((c) => ({
    url: `${BASE}/categories/${c.slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...staticRoutes, ...componentRoutes, ...categoryRoutes];
}
