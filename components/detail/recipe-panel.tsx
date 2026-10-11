import type { Recipe } from "@/lib/recipes";
import { planInstall } from "@/lib/recipes";
import { CopyButton } from "@/components/copy-button";
import { cn } from "@/lib/utils";
import { IconAlert, IconCheck, IconChevron, IconWrench } from "@/components/icons";

const TYPE_COLORS: Record<string, string> = {
  title: "text-[var(--tag-ink-gray)]",
  rich_text: "text-[var(--tag-ink-gray)]",
  select: "text-[var(--tag-ink-blue)]",
  multi_select: "text-[var(--tag-ink-purple)]",
  status: "text-[var(--tag-ink-green)]",
  number: "text-[var(--tag-ink-orange)]",
  date: "text-[var(--tag-ink-pink)]",
  checkbox: "text-[var(--tag-ink-green)]",
  people: "text-[var(--tag-ink-blue)]",
  relation: "text-[var(--tag-ink-purple)]",
  rollup: "text-[var(--tag-ink-yellow)]",
  formula: "text-[var(--tag-ink-red)]",
  url: "text-[var(--tag-ink-blue)]",
  email: "text-[var(--tag-ink-blue)]",
  phone_number: "text-[var(--tag-ink-blue)]",
  files: "text-[var(--tag-ink-gray)]",
  created_time: "text-[var(--tag-ink-gray)]",
  created_by: "text-[var(--tag-ink-gray)]",
  last_edited_time: "text-[var(--tag-ink-gray)]",
  unique_id: "text-[var(--tag-ink-gray)]",
};

function propertyType(schema: any): string {
  if (schema?.__relationRef) return "relation";
  return Object.keys(schema ?? {}).find((k) => k !== "description") ?? "unknown";
}

function schemaSummary(schema: any): string {
  const type = propertyType(schema);
  if (type === "select" || type === "multi_select") {
    const opts = schema[type]?.options ?? [];
    return opts.map((o: any) => o.name).slice(0, 4).join(" · ") + (opts.length > 4 ? ` +${opts.length - 4}` : "");
  }
  if (type === "status") {
    const opts = schema.status?.options ?? [];
    if (!opts.length) return "default Not started / In progress / Done";
    return opts.map((o: any) => o.name).slice(0, 4).join(" → ") + (opts.length > 4 ? ` +${opts.length - 4}` : "");
  }
  if (type === "number") return schema.number?.format ?? "number";
  if (type === "relation") {
    const twoWay = schema.relation?.type === "dual_property";
    return `→ ${schema.__relationRef}${twoWay ? " (two-way)" : ""}`;
  }
  if (type === "rollup")
    return `${schema.rollup.function}(${schema.rollup.relation_property_name}.${schema.rollup.rollup_property_name})`;
  if (type === "formula") return schema.formula.expression;
  if (type === "unique_id") return schema.unique_id?.prefix ? `prefix ${schema.unique_id.prefix}` : "auto id";
  return "";
}

export function RecipePanel({ recipe, origin }: { recipe: Recipe; origin: string }) {
  const plan = planInstall(recipe);

  return (
    <div className="flex flex-col gap-8">
      {/* ---- install plan ---- */}
      <section>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-h5 text-foreground">The install plan</h2>
            <p className="mt-1 max-w-2xl text-[13.5px] leading-relaxed text-muted-foreground">
              Exactly what Blocksmith sends to Notion, in order. Notion's
              data-source model forces two passes: relations, rollups and the
              formulas that read them need{" "}
              <code className="rounded bg-secondary px-1 py-px font-mono text-[12px]">data_source_id</code>s
              that only exist once the databases do.
            </p>
          </div>
          <div className="flex gap-2">
            <Stat label="requests" value={plan.totalRequests} />
            <Stat label="manual steps" value={plan.manualSteps} />
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-border">
          {plan.calls.map((call, i) => (
            <div
              key={i}
              className={cn(
                "flex gap-3 border-b border-border px-3.5 py-2.5 last:border-0",
                i % 2 === 1 && "bg-raised/60"
              )}
            >
              <span className="mt-0.5 w-5 shrink-0 text-right font-mono text-[11px] text-muted-foreground/70">
                {i + 1}
              </span>
              <span
                className={cn(
                  "mt-px h-fit shrink-0 rounded border px-1.5 py-px font-mono text-[10.5px] font-bold",
                  call.method === "POST" && "border-[var(--notion-green)]/40 bg-[var(--notion-green)]/10 text-[var(--tag-ink-green)]",
                  call.method === "PATCH" && "border-[var(--notion-yellow)]/40 bg-[var(--notion-yellow)]/12 text-[var(--tag-ink-yellow)]",
                  call.method === "GET" && "border-[var(--notion-blue)]/40 bg-[var(--notion-blue)]/10 text-[var(--tag-ink-blue)]"
                )}
              >
                {call.method}
              </span>
              <div className="min-w-0 flex-1">
                <code className="block truncate font-mono text-[12px] text-foreground">{call.path}</code>
                <p className="mt-0.5 text-[12.5px] leading-snug text-muted-foreground">{call.note}</p>
              </div>
              {call.count > 1 && (
                <span className="mt-px h-fit shrink-0 rounded border border-border bg-background px-1.5 py-px font-mono text-[10.5px] text-muted-foreground">
                  ×{call.count}
                </span>
              )}
            </div>
          ))}
        </div>

        {plan.warnings.length > 0 && (
          <div className="mt-3 flex flex-col gap-2">
            {plan.warnings.map((w, i) => (
              <p
                key={i}
                className="rounded-lg border border-[var(--notion-yellow)]/30 bg-[color-mix(in_oklab,var(--notion-yellow)_8%,transparent)] px-3 py-2 text-[12.5px] leading-relaxed text-foreground"
              >
                <IconAlert size={14} className="mr-1.5 mt-px shrink-0" />
                {w}
              </p>
            ))}
          </div>
        )}

        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <span className="text-[12px] font-semibold">Run it yourself</span>
            <span className="text-[11.5px] text-muted-foreground">Notion-Version {plan.notionVersion}</span>
          </div>
          <div className="relative">
            <pre className="code-block max-h-[300px] overflow-auto pr-12">
              <code>{`curl -X POST ${origin}/api/install \\
  -H 'content-type: application/json' \\
  -d '{
    "component": "${recipe.id}",
    "mode": "plan"
  }'

# add "token" and "parentPageId" and switch to "mode": "api" to install for real`}</code>
            </pre>
            <div className="absolute right-2 top-2">
              <CopyButton
                compact
                value={`curl -X POST ${origin}/api/install -H 'content-type: application/json' -d '{"component":"${recipe.id}","mode":"plan"}'`}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ---- schemas ---- */}
      <section>
        <h2 className="text-h5 text-foreground">What gets created</h2>
        <p className="mt-1 text-[13.5px] leading-relaxed text-muted-foreground">
          The real property schemas, not a description of them. Every formula
          below is a Notion Formula 2.0 expression you can paste into a property
          by hand if you would rather not use the API at all.
        </p>

        <div className="mt-4 flex flex-col gap-4">
          {recipe.databases.map((db) => {
            const entries = Object.entries(db.properties);
            const counts = entries.reduce<Record<string, number>>((acc, [, s]) => {
              const ty = propertyType(s);
              acc[ty] = (acc[ty] ?? 0) + 1;
              return acc;
            }, {});
            return (
              <div key={db.ref} className="overflow-hidden rounded-xl border border-border">
                <div className="flex flex-wrap items-center gap-2 border-b border-border bg-secondary/50 px-3.5 py-2.5">
                  <span className="text-[16px]">{db.icon}</span>
                  <h3 className="text-[14px] font-semibold">{db.title}</h3>
                  <code className="rounded border border-border bg-background px-1.5 py-px font-mono text-[10.5px] text-muted-foreground">
                    ref: {db.ref}
                  </code>
                  <div className="ml-auto flex flex-wrap gap-1">
                    {Object.entries(counts).map(([ty, n]) => (
                      <span
                        key={ty}
                        className={cn(
                          "rounded border border-border bg-background px-1.5 py-px font-mono text-[10.5px]",
                          TYPE_COLORS[ty] ?? "text-muted-foreground"
                        )}
                      >
                        {n}× {ty}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="divide-y divide-border">
                  {entries.map(([name, schema]) => {
                    const ty = propertyType(schema);
                    return (
                      <div key={name} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 px-3.5 py-2 sm:grid-cols-[190px_110px_minmax(0,1fr)]">
                        <span className="truncate text-[13px] font-medium">{name}</span>
                        <span className={cn("hidden font-mono text-[11px] sm:block", TYPE_COLORS[ty] ?? "text-muted-foreground")}>
                          {ty}
                        </span>
                        <code
                          className={cn(
                            "col-span-2 break-words font-mono text-[11.5px] leading-relaxed text-muted-foreground sm:col-span-1",
                            ty === "formula" && "text-foreground/80"
                          )}
                        >
                          {schemaSummary(schema) || "n/a"}
                        </code>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ---- views ---- */}
      {recipe.views.length > 0 && (
        <section>
          <h2 className="text-h5 text-foreground">Views</h2>
          <p className="mt-1 text-[13.5px] leading-relaxed text-muted-foreground">
            Created through <code className="rounded bg-secondary px-1 py-px font-mono text-[12px]">POST /v1/views</code>,
            which shipped in March 2026 and is the reason provisioning a
            workspace from code finally works end to end.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {recipe.views.map((v) => (
              <div key={v.name + v.type} className="rounded-lg border border-border bg-card px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-medium">{v.name}</span>
                  <span className="ml-auto rounded border border-border bg-secondary px-1.5 py-px font-mono text-[10.5px] text-muted-foreground">
                    {v.type}
                  </span>
                </div>
                {v.on && <p className="mt-1 font-mono text-[11px] text-muted-foreground">on {v.on}</p>}
                {v.filter && (
                  <p className="mt-1 truncate font-mono text-[11px] text-muted-foreground/80" title={JSON.stringify(v.filter)}>
                    filter: {JSON.stringify(v.filter).slice(0, 64)}…
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ---- page bodies ---- */}
      {recipe.pages.length > 0 && (
        <section>
          <h2 className="text-h5 text-foreground">Documentation pages</h2>
          <p className="mt-1 text-[13.5px] leading-relaxed text-muted-foreground">
            Appended with real block types (headings, toggles, callouts, to-dos,
            column lists) in chunks of 100, the Append block children limit.
          </p>
          <div className="mt-3 flex flex-col gap-3">
            {recipe.pages.map((p) => (
              <details key={p.title} className="group rounded-xl border border-border bg-card open:shadow-xs">
                <summary className="flex cursor-pointer list-none items-center gap-2 px-3.5 py-2.5 text-[13.5px] font-medium">
                  <span>{p.icon}</span>
                  {p.title}
                  <span className="ml-auto rounded border border-border bg-secondary px-1.5 py-px font-mono text-[10.5px] text-muted-foreground">
                    {p.blocks.length} blocks
                  </span>
                  <IconChevron size={13} className="text-ink-soft transition-transform duration-150 group-open:rotate-90" />
                </summary>
                <div className="border-t border-border px-3.5 py-3">
                  <BlockPreview blocks={p.blocks} />
                </div>
              </details>
            ))}
          </div>
        </section>
      )}

      {/* ---- manual steps ---- */}
      {recipe.manual.length > 0 && (
        <section>
          <h2 className="text-h5 text-foreground">The parts the API cannot do</h2>
          <p className="mt-1 max-w-2xl text-[13.5px] leading-relaxed text-muted-foreground">
            Every recipe ships with its manual steps written out, because
            pretending the API covers everything is how people end up with a
            half-built workspace. These are real Notion limitations, quoted from
            the API reference.
          </p>
          <div className="mt-3 flex flex-col gap-3">
            {recipe.manual.map((m) => (
              <div key={m.title} className="rounded-xl border border-[var(--notion-red)]/25 bg-[color-mix(in_oklab,var(--notion-red)_4%,transparent)] p-3.5">
                <div className="flex items-start gap-2">
                  <IconWrench size={15} className="mt-0.5 shrink-0 text-tag-ink-red" />
                  <div className="min-w-0">
                    <h3 className="text-[14px] font-semibold">{m.title}</h3>
                    <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">{m.reason}</p>
                  </div>
                </div>
                <ol className="mt-3 flex flex-col gap-1.5 border-t border-[var(--notion-red)]/15 pt-3">
                  {m.steps.map((s, i) => (
                    <li key={i} className="flex gap-2.5 text-[13px] leading-relaxed">
                      <span className="mt-px grid size-[18px] shrink-0 place-items-center rounded-full bg-background font-mono text-[10.5px] font-semibold text-muted-foreground">
                        {i + 1}
                      </span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-1.5 text-center">
      <div className="text-[17px] font-semibold leading-tight tabular-nums">{value}</div>
      <div className="label-mono text-ink-faint">{label}</div>
    </div>
  );
}

/** A lightweight, honest rendering of the block tree a recipe appends. */
function BlockPreview({ blocks, depth = 0 }: { blocks: any[]; depth?: number }) {
  return (
    <div className={cn("flex flex-col gap-1.5", depth > 0 && "mt-1.5 border-l border-border pl-3")}>
      {blocks.map((b, i) => {
        const body = b[b.type] ?? {};
        const textOf = (rt: any[]) =>
          (rt ?? []).map((r: any) => r?.text?.content ?? "").join("");
        switch (b.type) {
          case "heading_1":
          case "heading_2":
          case "heading_3":
          case "heading_4": {
            const lvl = Number(b.type.slice(-1));
            const size = ["text-[17px]", "text-[15px]", "text-[13.5px]", "text-[12.5px]"][lvl - 1];
            return (
              <div key={i}>
                <div className={cn("font-semibold tracking-[-0.01em]", size)}>{textOf(body.rich_text)}</div>
                {b.children ? <BlockPreview blocks={b.children} depth={depth + 1} /> : null}
              </div>
            );
          }
          case "paragraph":
            return (
              <div key={i}>
                <p className="text-[13px] leading-relaxed text-muted-foreground">{textOf(body.rich_text) || <em className="opacity-60">empty paragraph</em>}</p>
                {b.children ? <BlockPreview blocks={b.children} depth={depth + 1} /> : null}
              </div>
            );
          case "bulleted_list_item":
          case "numbered_list_item":
            return (
              <div key={i} className="flex gap-2 text-[13px] leading-relaxed text-muted-foreground">
                <span className="shrink-0">{b.type === "bulleted_list_item" ? "•" : "1."}</span>
                <span>{textOf(body.rich_text)}</span>
              </div>
            );
          case "to_do":
            return (
              <div key={i} className="flex items-start gap-2 text-[13px] leading-relaxed">
                <span className={cn("mt-[3px] grid size-[13px] shrink-0 place-items-center rounded-[3px] border", body.checked ? "border-primary bg-primary text-white" : "border-border-strong")}>
                  {body.checked && (
                    <IconCheck size={8} strokeWidth={4} />
                  )}
                </span>
                <span className={cn("text-muted-foreground", body.checked && "line-through opacity-60")}>{textOf(body.rich_text)}</span>
              </div>
            );
          case "callout":
            return (
              <div key={i} className="flex gap-2 rounded-lg border border-border bg-raised px-3 py-2 text-[12.5px] leading-relaxed">
                <span>{body.icon?.emoji ?? "💡"}</span>
                <span className="text-muted-foreground">{textOf(body.rich_text)}</span>
              </div>
            );
          case "toggle":
            return (
              <div key={i}>
                <div className="flex items-center gap-1.5 text-[13px] font-medium">
                  <IconChevron size={11} />
                  {textOf(body.rich_text)}
                </div>
                {b.children ? <BlockPreview blocks={b.children} depth={depth + 1} /> : null}
              </div>
            );
          case "quote":
            return (
              <blockquote key={i} className="border-l-2 border-foreground/70 pl-3 text-[13px] italic leading-relaxed text-muted-foreground">
                {textOf(body.rich_text)}
              </blockquote>
            );
          case "divider":
            return <hr key={i} className="border-border" />;
          case "code":
            return (
              <pre key={i} className="code-block overflow-auto text-[11.5px]">
                <code>{textOf(body.rich_text)}</code>
              </pre>
            );
          case "column_list":
            return (
              <div key={i} className="grid gap-2 sm:grid-cols-3">
                {(b.children ?? []).map((col: any, ci: number) => (
                  <div key={ci} className="rounded-lg border border-border bg-raised/60 p-2">
                    <BlockPreview blocks={col.children ?? []} depth={depth + 1} />
                  </div>
                ))}
              </div>
            );
          case "table":
            return (
              <div key={i} className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-[12px]">
                  <tbody>
                    {(b.children ?? []).map((row: any, ri: number) => (
                      <tr key={ri} className={cn("border-b border-border last:border-0", ri === 0 && body.has_column_header && "bg-secondary/60 font-semibold")}>
                        {(row.table_row?.cells ?? []).map((cell: any, cci: number) => (
                          <td key={cci} className="px-2 py-1.5 align-top text-muted-foreground">
                            {cell.map((rt: any) => rt?.text?.content ?? "").join("")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          case "synced_block":
            return (
              <div key={i} className="rounded-lg border border-dashed border-[var(--notion-purple)]/40 bg-[color-mix(in_oklab,var(--notion-purple)_5%,transparent)] p-2">
                <div className="mb-1.5 flex items-center gap-1 label-mono text-[var(--tag-ink-purple)]">
                  🔁 synced block
                </div>
                <BlockPreview blocks={b.children ?? []} depth={depth + 1} />
              </div>
            );
          case "embed":
            return (
              <div key={i} className="flex items-center gap-2 rounded-lg border border-border bg-raised px-3 py-2 font-mono text-[11.5px] text-muted-foreground">
                📺 {body.url ?? `file_upload ${body.file_upload?.id ?? ""}`}
              </div>
            );
          case "bookmark":
            return (
              <div key={i} className="truncate rounded-lg border border-border bg-raised px-3 py-2 font-mono text-[11.5px] text-muted-foreground">
                🔖 {body.url}
              </div>
            );
          case "table_of_contents":
            return <div key={i} className="label-mono text-ink-faint">≡ table of contents</div>;
          default:
            return (
              <div key={i} className="font-mono text-[11.5px] text-muted-foreground/70">
                [{b.type}]
              </div>
            );
        }
      })}
    </div>
  );
}
