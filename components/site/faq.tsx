"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { IconPlus } from "@/components/icons";

export const FAQS: { q: string; a: React.ReactNode }[] = [
  {
    q: "Do I need Notion Business or Enterprise to use this?",
    a: (
      <>
        No. Embed URLs and HTML blocks work on every plan, including Free. You
        need Business or Enterprise only if you want Notion's AI to generate or
        edit HTML inside a block: the blocks you install still render everywhere.
        Native recipes work on any plan that has API access, which includes Free.
      </>
    ),
  },
  {
    q: "Can these widgets read my Notion data?",
    a: (
      <>
        No, and this is the single most important thing to understand. An HTML
        block runs in a sandboxed iframe with no URL and no network access, so it
        cannot see the page it sits on, cannot call the Notion API, and cannot
        talk to any external service. Our widgets are therefore driven by URL
        parameters, baked-in configuration and{" "}
        <code className="rounded bg-secondary px-1 py-px font-mono text-[12px]">localStorage</code>,{" "}
        not by your database. For anything data-driven, use a native recipe or
        Notion's own dashboard and chart views.
      </>
    ),
  },
  {
    q: "What does localStorage mean for my team?",
    a: (
      <>
        State saved by a widget is per browser, per device. Your colleague opening
        the same page sees the widget's defaults, not your checked-off squares.
        That is fine for timers, calculators and mood logs. It is wrong for shared
        trackers, which is why the shared versions of those exist as native
        database recipes instead.
      </>
    ),
  },
  {
    q: "Why do some recipes list manual steps?",
    a: (
      <>
        Because the Notion API genuinely cannot do those things. There is no{" "}
        <code className="rounded bg-secondary px-1 py-px font-mono text-[12px]">button</code>{" "}
        block type in the public API, database automations cannot be created
        programmatically, recurring templates are a paid feature with no endpoint,
        and dashboard view layouts are read-only. We install everything that can
        be installed and hand you the exact click path for the rest.
      </>
    ),
  },
  {
    q: "Is this connected to Notion the company?",
    a: (
      <>
        No. Blocksmith is an independent project. Notion, Notion Labs Inc. and the
        Notion API are trademarks of Notion Labs Inc. We build on their public API
        and their documented HTML block feature.
      </>
    ),
  },
  {
    q: "Can I edit a component I installed?",
    a: (
      <>
        The HTML file you download is yours: edit it, host it yourself, ship it
        in your own templates. The embed URL keeps receiving our updates
        automatically; a downloaded HTML block is frozen at the version you took,
        which is exactly what you want for a template you sell.
      </>
    ),
  },
  {
    q: "What does the registry actually give me?",
    a: (
      <>
        A machine-readable manifest at{" "}
        <code className="rounded bg-secondary px-1 py-px font-mono text-[12px]">/r/index.json</code>{" "}
        in the shadcn registry-item schema, plus per-component files that inline
        the full HTML. Point Notion's MCP server, Claude Code, Codex or Cursor at
        it and the agent can list, fetch and install components without a human
        clicking anything.
      </>
    ),
  },
  {
    q: "What happens if you shut down?",
    a: (
      <>
        Embed URLs stop loading. That is the honest downside of hosted delivery,
        and it is why every widget is downloadable as a single self-contained
        HTML file with no CDN dependencies. Download it once and the block works
        forever, offline, with no account and no server.
      </>
    ),
  },
];

export function Faq() {
  const [open, setOpen] = React.useState<number | null>(0);
  return (
    <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
      {FAQS.map((item, i) => {
        const isOpen = open === i;
        const panelId = `faq-panel-${i}`;
        const buttonId = `faq-button-${i}`;
        return (
          <div key={item.q} id={`faq-${i}`} className="scroll-mt-20">
            <h3>
              <button
                type="button"
                id={buttonId}
                onClick={() => setOpen(isOpen ? null : i)}
                aria-expanded={isOpen}
                aria-controls={panelId}
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors duration-150 hover:bg-secondary/70 sm:px-5"
              >
                <span className="flex-1 text-[14.5px] font-semibold leading-snug tracking-[-0.008em] text-foreground">
                  {item.q}
                </span>
                <span
                  className={cn(
                    "grid size-6 shrink-0 place-items-center rounded-[6px] border transition-[background-color,border-color,color,transform] duration-200",
                    isOpen
                      ? "rotate-45 border-primary bg-primary-wash text-primary-deep"
                      : "border-border text-ink-faint"
                  )}
                >
                  <IconPlus size={13} />
                </span>
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              className={cn(
                "grid transition-[grid-template-rows,opacity] duration-200",
                isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
              )}
            >
              <div className="overflow-hidden">
                <div className="px-4 pb-4 text-[13.5px] leading-[1.7] text-ink-soft sm:px-5 sm:pr-12">
                  {item.a}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
