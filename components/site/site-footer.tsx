import Link from "next/link";
import { Logo } from "./logo";

const COLS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: "Catalog",
    links: [
      { href: "/components", label: "All components" },
      { href: "/components?kind=widget", label: "Widgets" },
      { href: "/components?kind=native", label: "Native recipes" },
      { href: "/components?tier=free", label: "Free tier" },
    ],
  },
  {
    title: "Categories",
    links: [
      { href: "/categories/dashboards", label: "Dashboards & KPIs" },
      { href: "/categories/time", label: "Time & focus" },
      { href: "/categories/planning", label: "Planning & projects" },
      { href: "/categories/business", label: "Business & CRM" },
    ],
  },
  {
    title: "Developers",
    links: [
      { href: "/registry", label: "Registry API" },
      { href: "/docs", label: "Documentation" },
      { href: "/docs/sandbox", label: "HTML block sandbox" },
      { href: "/docs/api-limits", label: "Notion API limits" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/pricing", label: "Pricing" },
      { href: "/how-it-works", label: "How it works" },
      { href: "/changelog", label: "Changelog" },
      { href: "/legal/terms", label: "Terms" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-raised">
      <div className="mx-auto w-full max-w-[1200px] px-4 py-12 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(4,1fr)]">
          <div className="max-w-xs">
            <Link href="/" className="inline-flex items-center gap-2">
              <Logo />
            </Link>
            <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
              The component registry for Notion. Widgets that run inside a page,
              and database systems that install through the API.
            </p>
            <p className="mt-4 text-[12px] leading-relaxed text-muted-foreground/80">
              Not affiliated with Notion Labs, Inc. Notion is a trademark of
              Notion Labs, Inc.
            </p>
          </div>

          {COLS.map((col) => (
            <div key={col.title}>
              <h3 className="text-[12px] font-semibold tracking-wide text-foreground">
                {col.title}
              </h3>
              <ul className="mt-3 space-y-2">
                {col.links.map((l) => (
                  <li key={l.href + l.label}>
                    <Link
                      href={l.href}
                      className="text-[13px] text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-border pt-6 text-[12.5px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Blocksmith. Components ship under MIT unless marked Pro.</p>
          <div className="flex items-center gap-4">
            <a
              href="https://github.com/SynergyFlowLabs/notion-components"
              target="_blank"
              rel="noreferrer noopener"
              className="transition-colors hover:text-foreground"
            >
              GitHub
            </a>
            <Link href="/legal/privacy" className="transition-colors hover:text-foreground">
              Privacy
            </Link>
            <Link href="/legal/terms" className="transition-colors hover:text-foreground">
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
