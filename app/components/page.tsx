import type { Metadata } from "next";
import { Suspense, ViewTransition } from "react";
import { CatalogBrowser } from "@/components/catalog-browser";
import { PageTransition } from "@/components/page-transition";
import { STATS } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Components",
  description:
    "Browse every Blocksmith component: interactive widgets that run inside a Notion page, and native database recipes that install through the Notion API.",
};

export default function ComponentsPage() {
  return (
    <PageTransition>
      <section className="border-b border-border bg-raised">
        <div className="mx-auto w-full max-w-[1240px] px-4 pb-8 pt-12 sm:px-6">
          <p className="label-mono text-primary">
            The catalog
          </p>
          <h1 className="font-display mt-3 max-w-2xl text-h2 text-foreground sm:text-hero sm:leading-[1.04] sm:tracking-[-0.025em]">
            Every component, previewed live
          </h1>
          <p className="mt-4 max-w-2xl text-lede text-ink-soft">
            {STATS.widgets} widgets that run inside a Notion page — as an{" "}
            <code className="rounded bg-secondary px-1 py-px font-mono text-[13px]">/embed</code>{" "}
            URL or a native HTML block — and {STATS.native} database recipes that
            install through the API. Nothing here is a screenshot.
          </p>
        </div>
      </section>

      <div className="pt-4">
        <Suspense
          fallback={
            <ViewTransition exit="slide-down">
              <div className="mx-auto max-w-[1240px] px-4 py-10 sm:px-6">
                <p className="label-mono text-ink-faint">loading catalog…</p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {Array.from({ length: 6 }, (_, i) => (
                    <div
                      key={i}
                      className="h-[268px] animate-pulse rounded-xl border border-border bg-card"
                      style={{ animationDelay: `${i * 60}ms` }}
                    />
                  ))}
                </div>
              </div>
            </ViewTransition>
          }
        >
          {/* default="none" so a revalidation does not replay the reveal. */}
          <ViewTransition enter="slide-up" default="none">
            <CatalogBrowser />
          </ViewTransition>
        </Suspense>
      </div>
    </PageTransition>
  );
}
