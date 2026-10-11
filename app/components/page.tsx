import type { Metadata } from "next";
import { Suspense } from "react";
import { CatalogBrowser } from "@/components/catalog-browser";
import { STATS } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Components",
  description:
    "Browse every Blocksmith component: interactive widgets that run inside a Notion page, and native database recipes that install through the Notion API.",
};

export default function ComponentsPage() {
  return (
    <>
      <section className="border-b border-border bg-raised">
        <div className="mx-auto w-full max-w-[1200px] px-4 pb-8 pt-12 sm:px-6">
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
        <Suspense fallback={<div className="mx-auto max-w-[1200px] px-4 py-10 sm:px-6 text-sm text-muted-foreground">Loading catalog…</div>}>
          <CatalogBrowser />
        </Suspense>
      </div>
    </>
  );
}
