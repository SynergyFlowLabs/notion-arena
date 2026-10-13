import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { fontVariables } from "@/lib/fonts";
import { SITE_NAME, SITE_URL, TWITTER_HANDLE } from "@/lib/seo";
import { JsonLd } from "@/components/site/json-ld";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Notion Arena: the component registry for Notion",
    template: "%s · Notion Arena",
  },
  description:
    "The component registry for Notion: interactive widgets that run as /embed URLs or HTML blocks, plus API-installable database systems. Free to browse.",
  keywords: [
    "notion components",
    "notion widgets",
    "notion dashboard",
    "notion html block",
    "notion embed",
    "notion templates",
    "notion registry",
    "notion arena",
    "mcp",
    "model context protocol",
  ],
  // Each page overrides this with its own path (see withCanonical in lib/seo.ts);
  // the root URL belongs to the home page.
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: SITE_NAME,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    // Update if the project's X/Twitter handle ever changes.
    site: TWITTER_HANDLE,
  },
  robots: { index: true, follow: true },
  manifest: "/site.webmanifest",
  icons: {
    // .ico first so Google's crawler sees a raster fallback immediately;
    // the SVG stays for modern browsers, PNGs for the rest.
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon-16x16.png", type: "image/png", sizes: "16x16" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: [
    // Matches the paper canvas, not pure white; Notion's page bg is warm.
    { media: "(prefers-color-scheme: light)", color: "#f6f5f4" },
    { media: "(prefers-color-scheme: dark)", color: "#191919" },
  ],
};

const themeScript = `(function(){try{var t=localStorage.getItem('notion-arena.theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark');}}catch(e){}})();`;

/** Site-level structured data: who publishes this and what the site is. */
const siteJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: SITE_URL,
      logo: `${SITE_URL}/android-chrome-512x512.png`,
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      inLanguage: "en",
      publisher: { "@id": `${SITE_URL}/#organization` },
    },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={fontVariables} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh antialiased">
        <JsonLd data={siteJsonLd} />
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-foreground focus:px-4 focus:py-2 focus:text-sm focus:text-background"
        >
          Skip to content
        </a>
        <SiteHeader />
        <main id="main">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
