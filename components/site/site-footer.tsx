import Link from "next/link";
import { Logo } from "./logo";
import { CATEGORIES } from "@/lib/types";
import { STATS } from "@/lib/catalog";
import { IconGithub } from "@/components/icons";

const COLS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: "Catalog",
    links: [
      { href: "/components", label: "All components" },
      { href: "/components?kind=widget", label: "Widgets" },
      { href: "/components?kind=native", label: "Native recipes" },
      { href: "/components?tier=free", label: "Free tier" },
      { href: "/components?tier=pro", label: "Pro tier" },
      { href: "/components?interactive=1", label: "Interactive" },
    ],
  },
  {
    title: "Delivery",
    links: [
      { href: "/how-it-works#embed", label: "Embed URL" },
      { href: "/how-it-works#html-block", label: "HTML block" },
      { href: "/how-it-works#recipe", label: "Native recipe" },
      { href: "/how-it-works#config", label: "Configuration" },
      { href: "/how-it-works#choose", label: "Which one?" },
    ],
  },
  {
    title: "Developers",
    links: [
      { href: "/registry", label: "Registry API" },
      { href: "/docs", label: "Documentation" },
      { href: "/docs/sandbox", label: "HTML block sandbox" },
      { href: "/docs/api-limits", label: "Notion API limits" },
      { href: "/docs/authoring", label: "Authoring a widget" },
      { href: "/docs/recipes", label: "Authoring a recipe" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/pricing", label: "Pricing" },
      { href: "/changelog", label: "Changelog" },
      { href: "/legal/terms", label: "Terms" },
      { href: "/legal/privacy", label: "Privacy" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="band mt-auto" style={{ viewTransitionName: "site-footer" }}>
      {/* hairline top edge, not a shadow */}
      <div className="border-t border-white/10">
        <div className="mx-auto w-full max-w-[1240px] px-4 py-14 sm:px-6">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.5fr)_repeat(4,minmax(0,1fr))]">
            {/* brand column */}
            <div className="max-w-sm">
              <Link href="/" aria-label="Blocksmith home" className="inline-flex rounded-lg focus-visible:outline-offset-4">
                <Logo inverted />
              </Link>
              <p className="mt-4 text-[14px] leading-[1.65] text-band-muted">
                The component registry for Notion. {STATS.widgets} widgets that run
                inside a page, and {STATS.native} database systems that install
                through the API.
              </p>

              <dl className="mt-6 grid grid-cols-3 gap-3 border-t border-white/10 pt-5">
                {[
                  ["Components", STATS.total],
                  ["Free", STATS.free],
                  ["Categories", CATEGORIES.length],
                ].map(([label, value]) => (
                  <div key={String(label)}>
                    <dt className="label-mono text-band-muted">{String(label)}</dt>
                    <dd className="mt-1 text-[20px] font-semibold leading-none tnum text-band-foreground">
                      {String(value)}
                    </dd>
                  </div>
                ))}
              </dl>

              <a
                href="https://github.com/SynergyFlowLabs/notion-components"
                target="_blank"
                rel="noreferrer noopener"
                className="mt-6 inline-flex h-9 items-center gap-2 rounded-lg border border-white/15 px-3 text-[13.5px] font-medium text-band-foreground transition-colors hover:border-white/30 hover:bg-white/5"
              >
                <IconGithub size={16} />
                View source
              </a>
            </div>

            {/* link columns */}
            {COLS.map((col) => (
              <nav key={col.title} aria-label={col.title}>
                <h2 className="label-mono text-band-muted">{col.title}</h2>
                <ul className="mt-3.5 flex flex-col gap-2.5">
                  {col.links.map((l) => (
                    <li key={l.href + l.label}>
                      <Link
                        href={l.href}
                        className="text-[13.5px] leading-snug text-band-foreground/80 transition-colors hover:text-band-foreground"
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>

          {/* categories: every one, not a curated four */}
          <nav aria-label="Categories" className="mt-12 border-t border-white/10 pt-6">
            <h2 className="label-mono text-band-muted">Categories</h2>
            <ul className="mt-3.5 flex flex-wrap gap-x-5 gap-y-2.5">
              {CATEGORIES.map((c) => (
                <li key={c.slug}>
                  <Link
                    href={`/categories/${c.slug}`}
                    className="text-[13.5px] text-band-foreground/80 transition-colors hover:text-band-foreground"
                  >
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="mt-10 flex flex-col gap-4 border-t border-white/10 pt-6 text-[12.5px] leading-relaxed text-band-muted sm:flex-row sm:items-start sm:justify-between">
            <p className="max-w-xl">
              © {new Date().getFullYear()} Blocksmith. Components ship under MIT
              unless marked Pro. Not affiliated with Notion Labs, Inc. Notion is
              a trademark of Notion Labs, Inc.
            </p>
            <p className="shrink-0 font-mono text-[11.5px] text-band-muted/80">
              Notion-Version 2026-03-11
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
