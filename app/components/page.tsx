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
          <p className="text-[12px] font-semibold uppercase tracking-[0.09em] text-primary">
            The catalog
          </p>
          <h1 className="mt-2 max-w-2xl text-balance text-[34px] font-semibold leading-[1.12] tracking-[-0.03em] sm:text-[42px]">
            Every component, previewed live
          </h1>
          <p className="mt-3 max-w-2xl text-pretty text-[15px] leading-relaxed text-muted-foreground">
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
