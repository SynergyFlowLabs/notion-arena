"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Label                                                             */
/* ------------------------------------------------------------------ */

export function Label({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        "text-[12px] font-medium leading-none text-foreground",
        className
      )}
      {...props}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Input  (plain textual)                                            */
/* ------------------------------------------------------------------ */

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          "flex h-9 w-full rounded-lg border border-border bg-background px-3 text-[13px] text-foreground transition-colors placeholder:text-ink-faint focus:border-foreground/40 focus:outline-none focus:ring-4 focus:ring-foreground/5 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      />
    );
  }
);

/* ------------------------------------------------------------------ */
/*  Textarea                                                          */
/* ------------------------------------------------------------------ */

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        className={cn(
          "flex min-h-[36px] w-full rounded-lg border border-border bg-background px-3 py-2 text-[12.5px] leading-relaxed text-foreground transition-colors placeholder:text-ink-faint focus:border-foreground/40 focus:outline-none focus:ring-4 focus:ring-foreground/5 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      />
    );
  }
);

/* ------------------------------------------------------------------ */
/*  Switch (toggle)                                                   */
/* ------------------------------------------------------------------ */

export function Switch({
  checked,
  onCheckedChange,
  id,
  disabled,
}: {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  id?: string;
  disabled?: boolean;
}) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-[22px] w-[38px] shrink-0 cursor-pointer items-center rounded-full border transition-colors duration-200",
        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-foreground/10",
        checked
          ? "border-foreground bg-foreground"
          : "border-border-strong bg-secondary",
        disabled && "opacity-50"
      )}
    >
      <span
        className={cn(
          "pointer-events-none block size-[16px] rounded-full bg-background shadow-sm transition-transform duration-200",
          checked ? "translate-x-[19px]" : "translate-x-[2.5px]"
        )}
      />
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Slider + numeric readout                                          */
/* ------------------------------------------------------------------ */

export function Slider({
  value,
  min = 0,
  max = 100,
  step = 1,
  onChange,
  suffix,
  className,
}: {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (v: number) => void;
  suffix?: string;
  className?: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  const [text, setText] = React.useState(String(value));
  React.useEffect(() => setText(String(value)), [value]);
  function commit(v: string) {
    const n = Number(v);
    if (!Number.isFinite(n)) { setText(String(value)); return; }
    const clamped = Math.min(max, Math.max(min, n));
    const fixed = step < 1 ? Number(clamped.toFixed(2)) : Math.round(clamped);
    onChange(fixed);
  }
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="relative h-5 flex-1 touch-none select-none">
        <div className="absolute top-1/2 h-1 w-full -translate-y-1/2 rounded-full bg-border" />
        <div
          className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-foreground"
          style={{ width: `${pct}%` }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 h-full w-full cursor-pointer appearance-none bg-transparent opacity-0"
        />
        <span
          className="pointer-events-none absolute top-1/2 size-[14px] -translate-y-1/2 rounded-full border-2 border-foreground bg-background shadow-sm"
          style={{ left: `calc(${pct}% - 7px)` }}
        />
      </div>
      <div className="flex h-8 min-w-[76px] items-center gap-0.5 rounded-md border border-border bg-background px-2 has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-foreground/5">
        <input
          type="text"
          inputMode="numeric"
          value={text}
          onChange={(e) => setText(e.target.value.replace(/[^0-9.\-]/g, ""))}
          onBlur={() => commit(text)}
          onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
          className="w-full bg-transparent text-right font-mono text-[12px] tabular-nums text-foreground outline-none"
        />
        {suffix && <span className="shrink-0 text-ink-faint">{suffix}</span>}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Color picker                                                      */
/* ------------------------------------------------------------------ */

export function ColorField({
  value,
  onChange,
  id,
}: {
  value: string;
  onChange: (v: string) => void;
  id?: string;
}) {
  const valid = /^#[0-9a-f]{6}$/i.test(value);
  return (
    <div className="flex items-center gap-2">
      <label
        htmlFor={`${id}-swatch`}
        className={cn(
          "grid h-9 w-11 shrink-0 cursor-pointer place-items-center rounded-lg border border-border bg-background transition-colors",
          "has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-foreground/10"
        )}
        style={{ background: valid ? value : "transparent" }}
      >
        {!valid && <span className="text-[10px] text-ink-faint">hex</span>}
        <input
          id={`${id}-swatch`}
          type="color"
          value={valid ? value : "#2383e2"}
          onChange={(e) => onChange(e.target.value)}
          className="sr-only"
        />
      </label>
      <Input
        id={id}
        type="text"
        spellCheck={false}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 font-mono uppercase tracking-wider"
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Native <select> shadcn styling (fallback for non-search selects)  */
/* ------------------------------------------------------------------ */

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...props }, ref) {
    return (
      <div className="relative">
        <select
          ref={ref}
          className={cn(
            "flex h-9 w-full appearance-none rounded-lg border border-border bg-background px-3 pr-9 text-[13px] text-foreground transition-colors",
            "focus:border-foreground/40 focus:outline-none focus:ring-4 focus:ring-foreground/5",
            "disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          {...props}
        >
          {children}
        </select>
        <svg
          aria-hidden
          viewBox="0 0 20 20"
          className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-ink-faint"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.75}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m6 8 4 4 4-4" />
        </svg>
      </div>
    );
  }
);

/* ------------------------------------------------------------------ */
/*  Combobox (searchable select) — keyboard-navigable, no external    */
/*  dependencies.                                                     */
/* ------------------------------------------------------------------ */

export interface ComboboxOption {
  value: string;
  label: string;
  hint?: string;
  keywords?: string;
}

export function Combobox({
  id,
  value,
  onChange,
  options,
  placeholder = "Search…",
  emptyText = "No matches",
  className,
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  options: ComboboxOption[];
  placeholder?: string;
  emptyText?: string;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState("");
  const [active, setActive] = React.useState(0);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLUListElement>(null);

  const selected = options.find((o) => o.value === value);
  const normalized = q.trim().toLowerCase();
  const filtered = React.useMemo(() => {
    if (!normalized) return options;
    return options.filter((o) => {
      const hay = `${o.label} ${o.hint ?? ""} ${o.keywords ?? ""} ${o.value}`.toLowerCase();
      return hay.includes(normalized);
    });
  }, [options, normalized]);

  // Close on outside click.
  React.useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // Reset highlight when list changes.
  React.useEffect(() => {
    setActive(0);
  }, [q, open]);

  // Scroll active option into view.
  React.useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(`[data-idx="${active}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  function commit(v: string) {
    onChange(v);
    setOpen(false);
    setQ("");
    inputRef.current?.blur();
  }

  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, Math.max(0, filtered.length - 1)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const opt = filtered[active];
      if (opt) commit(opt.value);
    } else if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    }
  }

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        id={id}
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
        className={cn(
          "flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 text-left text-[13px] transition-colors",
          "hover:border-border-strong",
          open ? "border-foreground/40 ring-4 ring-foreground/5" : ""
        )}
      >
        <span className={cn("truncate", selected ? "text-foreground" : "text-ink-faint")}>
          {selected ? selected.label : placeholder}
        </span>
        <svg
          aria-hidden
          viewBox="0 0 20 20"
          className={cn("size-4 shrink-0 text-ink-faint transition-transform", open && "rotate-180")}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.75}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m6 8 4 4 4-4" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-lg border border-border bg-card shadow-pop">
          <div className="border-b border-border p-1.5">
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={onKey}
              placeholder="Type to filter…"
              className="flex h-8 w-full rounded-md border border-transparent bg-background px-2 text-[12.5px] text-foreground outline-none placeholder:text-ink-faint focus:border-border-strong"
            />
          </div>
          <ul
            ref={listRef}
            role="listbox"
            className="max-h-[260px] overflow-auto py-1"
          >
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-[12.5px] text-ink-faint">{emptyText}</li>
            )}
            {filtered.map((o, i) => {
              const isSel = o.value === value;
              const isActive = i === active;
              return (
                <li key={o.value} data-idx={i}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSel}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => commit(o.value)}
                    className={cn(
                      "flex w-full items-start gap-2 px-3 py-1.5 text-left text-[12.5px] transition-colors",
                      isActive && "bg-secondary",
                      isSel && "font-medium text-foreground"
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 grid size-[14px] shrink-0 place-items-center rounded-[3px]",
                        isSel ? "bg-foreground text-background" : "border border-border-strong"
                      )}
                    >
                      {isSel && (
                        <svg viewBox="0 0 20 20" className="size-3" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                          <path d="m5 10 3 3 7-7" />
                        </svg>
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-foreground">{o.label}</span>
                      {o.hint && (
                        <span className="mt-0.5 block truncate font-mono text-[10.5px] text-ink-faint">
                          {o.hint}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  SegmentedControl (small tabs)                                     */
/* ------------------------------------------------------------------ */

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex items-center gap-0.5 rounded-lg border border-border bg-background p-0.5",
        className
      )}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "rounded-md px-2.5 py-1 text-[12px] font-medium transition-colors",
              active
                ? "bg-foreground text-background shadow-sm"
                : "text-ink-soft hover:bg-secondary hover:text-foreground"
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
