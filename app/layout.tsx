import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { fontVariables } from "@/lib/fonts";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://notionarena.vercel.app"
  ),
  title: {
    default: "Notion Arena: the component registry for Notion",
    template: "%s · Notion Arena",
  },
  description:
    "Pre-built, embeddable components for Notion dashboards. Interactive widgets that run as /embed URLs or native HTML blocks, plus API-installable database recipes: the shadcn/ui model, applied to Notion.",
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
  openGraph: {
    type: "website",
  },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
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

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={fontVariables} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh antialiased">
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
