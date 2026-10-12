"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  IconChevronUp, IconChevronDown, IconPlus, IconTrash, IconDragDots,
} from "@/components/icons";
import { Input, Textarea, ColorField } from "@/components/ui/form";
import type { JsonArraySpec, JsonField } from "@/lib/widget-editors";
import { parseJsonArray, serializeJsonArray } from "@/lib/widget-editors";

/** A button used for add/remove/reorder — 28px, rounded, icon-only. */
function RowBtn({
  icon, onClick, title, className, disabled,
}: { icon: React.ReactNode; onClick?: () => void; title: string; className?: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex h-7 w-7 items-center justify-center rounded-md border border-transparent text-ink-soft transition hover:bg-secondary hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-ink-soft",
        className
      )}
    >
      {icon}
    </button>
  );
}

function fieldToInputValue(field: JsonField, value: unknown): string {
  if (value == null) return "";
  if (field.arrayOfNumbers && Array.isArray(value)) {
    return value.map((n) => (typeof n === "number" ? String(n) : "")).filter(Boolean).join(",");
  }
  return String(value);
}

function inputValueToField(field: JsonField, raw: string): unknown {
  if (field.type === "number") {
    const n = Number(raw);
    return Number.isFinite(n) ? n : field.default ?? 0;
  }
  if (field.arrayOfNumbers) {
    if (!raw.trim()) return [];
    return raw
      .split(/[\s,]+/)
      .map((s) => Number(s))
      .filter((n) => Number.isFinite(n));
  }
  return raw;
}

function FieldCell({
  field, value, onChange,
}: { field: JsonField; value: unknown; onChange: (v: unknown) => void }) {
  const str = fieldToInputValue(field, value);
  if (field.type === "color") {
    return (
      <ColorField
        value={str || String(field.default ?? "#2383e2")}
        onChange={(v) => onChange(v)}
      />
    );
  }
  if (field.type === "number") {
    return (
      <Input
        type="number"
        value={str}
        placeholder={field.placeholder}
        onChange={(e) => onChange(inputValueToField(field, e.target.value))}
      />
    );
  }
  if (field.multiline) {
    return (
      <Textarea
        value={str}
        rows={2}
        placeholder={field.placeholder}
        onChange={(e) => onChange(inputValueToField(field, e.target.value))}
      />
    );
  }
  return (
    <Input
      type="text"
      value={str}
      placeholder={field.placeholder}
      onChange={(e) => onChange(inputValueToField(field, e.target.value))}
    />
  );
}

export function JsonArrayEditor({
  spec, value, onChange,
}: {
  spec: JsonArraySpec;
  value: string;
  onChange: (json: string) => void;
}) {
  const rows = parseJsonArray(value) as Record<string, unknown>[];

  const setField = (idx: number, key: string, val: unknown) => {
    const next = rows.map((r, i) => (i === idx ? { ...r, [key]: val } : r));
    onChange(serializeJsonArray(next));
  };

  const addRow = () => {
    const next = [...rows, { ...spec.emptyItem }];
    onChange(serializeJsonArray(next));
  };

  const removeRow = (idx: number) => {
    const next = rows.filter((_, i) => i !== idx);
    onChange(serializeJsonArray(next));
  };

  const move = (idx: number, delta: number) => {
    const j = idx + delta;
    if (j < 0 || j >= rows.length) return;
    const next = rows.slice();
    const [it] = next.splice(idx, 1);
    next.splice(j, 0, it);
    onChange(serializeJsonArray(next));
  };

  return (
    <div className="space-y-2">
      {spec.description ? (
        <p className="text-[13px] leading-relaxed text-ink-soft">{spec.description}</p>
      ) : null}

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card/40 p-5 text-center text-[13px] text-ink-soft">
          No {spec.itemLabel}s yet.
          <button
            type="button"
            onClick={addRow}
            className="ml-1.5 inline-flex items-center gap-1 rounded-md bg-foreground px-2 py-1 text-[12px] font-medium text-background hover:opacity-90"
          >
            <IconPlus className="h-3.5 w-3.5" /> Add first {spec.itemLabel}
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="overflow-hidden rounded-lg border border-border">
            <div className="flex items-center gap-2 bg-card px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
              <span className="w-7 shrink-0" />
              {spec.fields.map((f) => (
                <span key={f.key} className="min-w-0 flex-1 truncate">
                  {f.label}
                </span>
              ))}
              <span className="w-16 shrink-0 text-right">Actions</span>
            </div>
            <div className="divide-y divide-border bg-background">
              {rows.map((row, idx) => (
                <div
                  key={idx}
                  className="group/row flex items-start gap-2 px-3 py-2 hover:bg-subtle"
                >
                  <div className="flex h-9 w-7 shrink-0 items-center justify-center">
                    <IconDragDots className="h-4 w-4 text-ink-soft/60" />
                  </div>
                  {spec.fields.map((f) => (
                    <div key={f.key} className="min-w-0 flex-1">
                      <FieldCell
                        field={f}
                        value={row[f.key] ?? ""}
                        onChange={(v) => setField(idx, f.key, v)}
                      />
                      {f.hint ? (
                        <p className="mt-0.5 text-[11px] leading-tight text-ink-soft/80">{f.hint}</p>
                      ) : null}
                    </div>
                  ))}
                  <div className="flex w-16 shrink-0 items-start justify-end gap-0.5 pt-1">
                    <RowBtn
                      icon={<IconChevronUp className="h-3.5 w-3.5" />}
                      title={`Move ${spec.itemLabel} up`}
                      disabled={idx === 0}
                      onClick={() => move(idx, -1)}
                    />
                    <RowBtn
                      icon={<IconChevronDown className="h-3.5 w-3.5" />}
                      title={`Move ${spec.itemLabel} down`}
                      disabled={idx === rows.length - 1}
                      onClick={() => move(idx, 1)}
                    />
                    <RowBtn
                      icon={<IconTrash className="h-3.5 w-3.5" />}
                      title={`Remove ${spec.itemLabel}`}
                      className="hover:bg-red-500/10 hover:text-red-500"
                      onClick={() => removeRow(idx)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={addRow}
        className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-border bg-card/60 px-3 py-1.5 text-[12px] font-medium text-ink-soft transition hover:border-ink-soft/40 hover:bg-subtle hover:text-ink"
      >
        <IconPlus className="h-3.5 w-3.5" />
        Add {spec.itemLabel}
      </button>
    </div>
  );
}

/**
 * Wrapper that lets users switch between the structured row editor (when a
 * spec exists) and raw JSON textarea. The raw editor is always available so
 * power users can paste or hand-author arbitrary shapes.
 */
export function JsonParamEditor({
  spec, value, onChange,
}: {
  spec: JsonArraySpec | null;
  value: string;
  onChange: (json: string) => void;
}) {
  // If a spec exists the structured editor is the default; raw is a toggle.
  const [rawMode, setRawMode] = useState(false);
  const [localRaw, setLocalRaw] = useState(value);
  const [err, setErr] = useState<string | null>(null);

  // If the outside value changed (e.g. reset), sync localRaw
  if (localRaw !== value && !rawMode) setLocalRaw(value);

  const applyRaw = () => {
    if (!localRaw.trim()) {
      setErr(null);
      onChange("");
      return;
    }
    try {
      const parsed = JSON.parse(localRaw);
      if (!Array.isArray(parsed)) {
        setErr("Top-level value must be a JSON array.");
        return;
      }
      setErr(null);
      onChange(serializeJsonArray(parsed));
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  const showStructured = spec && !rawMode;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 rounded-md border border-border bg-background p-0.5 text-[12px]">
          <button
            type="button"
            onClick={() => setRawMode(false)}
            className={cn(
              "rounded px-2 py-1 font-medium transition",
              !rawMode ? "bg-foreground text-background" : "text-ink-soft hover:text-ink"
            )}
            disabled={!spec}
            title={spec ? "Build rows visually" : "Install or edit the raw JSON array"}
          >
            Visual
          </button>
          <button
            type="button"
            onClick={() => { setLocalRaw(value); setErr(null); setRawMode(true); }}
            className={cn(
              "rounded px-2 py-1 font-medium transition",
              rawMode ? "bg-foreground text-background" : "text-ink-soft hover:text-ink"
            )}
          >
            Raw JSON
          </button>
        </div>
        {spec ? (
          <span className="text-[11px] text-ink-soft">
            {parseJsonArray(value).length} {spec.itemLabel}
            {parseJsonArray(value).length === 1 ? "" : "s"}
          </span>
        ) : null}
      </div>

      {showStructured && spec ? (
        <JsonArrayEditor spec={spec} value={value} onChange={onChange} />
      ) : (
        <div>
          <Textarea
            value={rawMode ? localRaw : value}
            onChange={(e) => { setLocalRaw(e.target.value); setErr(null); }}
            rows={8}
            spellCheck={false}
            className="font-mono text-[12px]"
            placeholder="[{...}]"
          />
          {rawMode ? (
            <div className="mt-2 flex items-center justify-between gap-2">
              {err ? (
                <span className="text-[12px] text-red-500">Invalid JSON: {err}</span>
              ) : (
                <span className="text-[12px] text-ink-soft">Paste or edit a JSON array.</span>
              )}
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => { setLocalRaw(value); setErr(null); }}
                  className="rounded-md border border-border px-2 py-1 text-[12px] font-medium text-ink-soft hover:bg-subtle hover:text-ink"
                >
                  Revert
                </button>
                <button
                  type="button"
                  onClick={applyRaw}
                  className="rounded-md bg-foreground px-2.5 py-1 text-[12px] font-medium text-background hover:opacity-90"
                >
                  Apply
                </button>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
