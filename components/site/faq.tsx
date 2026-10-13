"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { FAQS } from "@/lib/faqs";
import { IconPlus } from "@/components/icons";

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
                  {item.a.map((seg, i) =>
                    typeof seg === "string" ? (
                      <React.Fragment key={i}>{seg}</React.Fragment>
                    ) : (
                      <code
                        key={i}
                        className="rounded bg-secondary px-1 py-px font-mono text-[12px]"
                      >
                        {seg.code}
                      </code>
                    )
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
