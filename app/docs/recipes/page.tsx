import type { Metadata } from "next";
import Link from "next/link";
import { DocPage, H2, H3, P, Note, UL, LI, Code, Table } from "@/components/docs/prose";
import { RECIPES, planInstall } from "@/lib/recipes";
import {
  AUTOMATION_LIMITATION,
  BUTTON_LIMITATION,
  RECURRING_LIMITATION,
  SYNCED_BLOCK_LIMITATION,
} from "@/lib/recipes/types";
import { COMPONENTS } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Authoring a recipe",
  description:
    "How a Blocksmith native recipe is declared (databases, property refs, relation resolution, views, seed rows, page bodies and manual steps) and how planInstall turns it into an ordered request list.",
};

const recipeList = Object.values(RECIPES);

/** Count how many recipes cite each limitation, rather than asserting a number. */
function cites(needle: string) {
  return recipeList.filter((r) => r.manual.some((m) => m.reason.includes(needle))).length;
}
const crm = RECIPES["crm-pipeline"];
const crmPlan = planInstall(crm);
const crmComponent = COMPONENTS.find((c) => c.slug === "crm-pipeline")!;

export default function RecipesPage() {
  return (
    <DocPage
      eyebrow="Building"
      title="Authoring a recipe"
      lede={
        <>
          A recipe is a declarative description of a Notion workspace fragment:
          databases, their properties, the views over them, seed rows, and
          documentation pages written as real block trees. The installer turns it
          into an ordered list of API calls, including the two passes that
          relations force. You never write a request yourself.
        </>
      }
    >
      <section className="flex flex-col gap-4">
        <H2 id="shape">The shape</H2>
        <Code
          lang="ts"
          filename="lib/recipes/types.ts"
          code={`type Recipe = {
  id: string;              // matches the catalog slug
  summary: string;         // one paragraph, shown on the component page
  databases: RecipeDb[];   // created first, base properties only
  views: ViewSpec[];       // created after the databases exist
  pages: RecipePage[];     // documentation, appended as block trees
  manual: RecipeManual[];  // the gaps, with reasons
};

type RecipeDb = {
  ref: string;             // local name other databases point at
  title: string;
  icon: string;            // single emoji
  isInline?: boolean;      // renders inline in its parent page
  properties: Record<string, PropertySchema>;
  seed?: Record<string, unknown>[];   // rows created after the schema settles
};

type RecipeManual = {
  title: string;
  reason: string;          // always a real API limitation, never a shortcut
  steps: string[];         // exact click path
};`}
        />
        <Note tone="blue" title="ref is the whole trick">
          Recipe databases do not know their own ids: they do not exist yet. So
          they address each other by <code>ref</code>, a local string. The
          installer resolves refs to real <code>data_source_id</code>s in a second
          pass. That indirection is what lets a recipe declare a bidirectional
          relation between two databases that have not been created.
        </Note>
      </section>

      <section className="flex flex-col gap-4">
        <H2 id="example">A worked example</H2>
        <P>
          <Link href="/components/crm-pipeline" className="text-primary underline underline-offset-2">
            {crmComponent.name}
          </Link>{" "}
          declares {crm.databases.length} databases and produces{" "}
          {crmPlan.totalRequests} API requests. Here is the declaration of the
          relation that ties two of them together:
        </P>
        <Code
          lang="ts"
          filename="lib/recipes/business.ts, abbreviated"
          code={`{
  ref: "deals",
  title: "Deals",
  icon: "🤝",
  properties: {
    "Deal":      title(),
    "Amount":    num("dollar"),
    "Stage":     status([
      { name: "Qualified",     group: "In progress" },
      { name: "Proposal out",  group: "In progress" },
      { name: "Negotiation",   group: "In progress" },
      { name: "Won",           group: "Complete" },
      { name: "Lost",          group: "Complete" },
    ]),
    "Company":   relation("companies"),                       // ← by ref
    "Owner":     relation("people", {
      twoWay: true,
      syncedName: "Deals",                                    // ← name on the far side
    }),
    "Close date": date(),
    "Weighted":  formula(
      'prop("Amount") * if(prop("Stage") == "Qualified", 0.2, ' +
      'if(prop("Stage") == "Proposal out", 0.5, ' +
      'if(prop("Stage") == "Negotiation", 0.8, ' +
      'if(prop("Stage") == "Won", 1, 0))))'
    ),
    "Days open": rollup("Company", "Created", "earliest_date"),
  },
  seed: [
    { "Deal": "Northwind · Platform", "Amount": 48000, "Stage": "Proposal out" },
    { "Deal": "Aurelia Health",       "Amount": 180000, "Stage": "Negotiation" },
  ],
}`}
        />
        <H3>What the installer does with it</H3>
        <UL>
          <LI>
            <code>relation("companies")</code> attaches an internal{" "}
            <code>__relationRef: "companies"</code> marker and produces the{" "}
            <code>single_property</code> shape.
          </LI>
          <LI>
            <code>{"{ twoWay: true, syncedName }"}</code> produces the{" "}
            <code>dual_property</code> shape, so Notion creates the reverse
            property on People named <code>Deals</code>.
          </LI>
          <LI>
            Both relations, both the rollup and the <code>Weighted</code> formula
            are <strong className="font-semibold text-foreground">stripped from
            pass 1</strong>: the databases are created with{" "}
            {crm.databases.map((d) => `${d.title} (${Object.keys(d.properties).length} props)`).join(", ")}{" "}
            minus anything that references another database.
          </LI>
          <LI>
            They come back in pass 3 and 4 as{" "}
            <code>PATCH /v1/data_sources/{"{id}"}</code>, with{" "}
            <code>companies</code> resolved to the id Notion assigned.
          </LI>
        </UL>
      </section>

      <section className="flex flex-col gap-4">
        <H2 id="ordering">How planInstall orders the work</H2>
        <P>
          This is the exact sequence for {crm.id}. Every recipe page renders it
          from the same function, and <code>POST /api/install</code> with{" "}
          <code>mode: "plan"</code> returns it as JSON.
        </P>
        <div className="overflow-hidden rounded-xl border border-border">
          {crmPlan.calls.map((call, i) => (
            <div key={i} className="flex gap-3 border-b border-border px-3.5 py-2 last:border-0 odd:bg-card even:bg-raised/50">
              <span className="mt-px w-5 shrink-0 text-right font-mono text-[11px] text-muted-foreground/70">{i + 1}</span>
              <span className="mt-px h-fit shrink-0 rounded border border-border-strong bg-background px-1.5 py-px font-mono text-[10.5px] font-bold text-muted-foreground">
                {call.method}
              </span>
              <div className="min-w-0 flex-1">
                <code className="block truncate font-mono text-[12px]">{call.path}</code>
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
        <P>
          {crmPlan.totalRequests} requests, {crmPlan.manualSteps} manual steps.
          Paced at Notion's roughly three requests per second, the whole install
          runs in well under a minute.
        </P>
        <Note tone="yellow" title="Order is load-bearing">
          Views come after properties, because a board view groups by a select
          property that must exist. Seed rows come after views, because rows
          created before a form view exists cannot be validated against it. Page
          bodies come last, in chunks of 100, because that is the append limit,
          and any chunk that needs deeper than two levels is appended against the
          block id the previous chunk returned.
        </Note>
      </section>

      <section className="flex flex-col gap-4">
        <H2 id="views">Views</H2>
        <P>
          Views are declared separately from databases, because one database
          usually gets several. Each spec names the database ref, the view type,
          and whatever that type needs.
        </P>
        <Code
          lang="ts"
          code={`// board grouped by a status property
{ on: "deals", name: "Pipeline", type: "board",
  board: { group_by: "Stage" },
  sorts: [{ property: "Amount", direction: "descending" }] }

// calendar
{ on: "deals", name: "Close calendar", type: "calendar",
  calendar: { start_date_property: "Close date" } }

// form: Notion renders it as a public intake page
{ on: "intake", name: "New client intake", type: "form",
  form: { questions: [
    { property: "Company", required: true },
    { property: "What do you need?", required: true },
  ] } }

// chart
{ on: "logs", name: "Consistency", type: "chart",
  chart: { type: "bar", x_property: "Week", y_aggregate: "count" } }

// dashboard: layout is Notion's to compose
{ on: "habits", name: "Habit dashboard", type: "dashboard" }`}
        />
        <Note tone="red" title="Dashboard layouts are read-only">
          You can create a dashboard view and you can create the chart views it
          displays, but there is no API for positioning them. Notion composes the
          layout itself from the widget views attached to the same data source.
          Recipes say so in their manual steps rather than pretending otherwise.
        </Note>
      </section>

      <section className="flex flex-col gap-4">
        <H2 id="pages">Documentation pages</H2>
        <P>
          A workspace that arrives empty is a workspace nobody uses. Recipes
          append real block trees (not markdown, not screenshots) so headings
          are headings and toggles are toggles.
        </P>
        <Code
          lang="ts"
          code={`{
  title: "How to run a sprint",
  icon: "🔁",
  blocks: [
    heading(2, "Monday: planning, 45 minutes"),
    numbered([t("Read the sprint goal out loud. If nobody can, rewrite it.")]),
    numbered([t("Pull from Backlog, not from Triage.")]),
    callout("Stop at capacity. Carry-over counts against capacity first.", "⚠️"),
    columns(
      [heading(3, "Daily"), bullet([t("15 minutes, standing up.")])],
      [heading(3, "Friday"), bullet([t("Demo, then retro.")])]
    ),
    simpleTable([
      ["Ritual", "When", "Owner"],
      ["Planning", "Monday 09:30", "PM"],
      ["Retro", "Friday 16:00", "Anyone"],
    ]),
  ],
}`}
        />
        <UL>
          <LI>
            Use the builders in <code>lib/notion/schema.ts</code> rather than raw
            objects. They keep the nesting depth legal and the rich-text shape
            correct, which is where hand-written payloads usually break.
          </LI>
          <LI>
            <code>syncedBlock()</code> creates the original. Its duplicates cannot
            be created by API: that is always a manual step.
          </LI>
          <LI>
            <code>embedUrl()</code> can point a recipe page at one of our widgets,
            which is how <code>client-portal</code> puts a live countdown on the
            client-facing page.
          </LI>
        </UL>
      </section>

      <section className="flex flex-col gap-4">
        <H2 id="manual">Writing manual steps</H2>
        <P>
          A manual step is a promise to you that we tried. The{" "}
          <code>reason</code> field must name a real limitation. There are four
          shared constants, and every one of the {recipeList.length} recipes uses
          them rather than inventing an excuse:
        </P>
        <Table
          head={["Constant", "The limitation", "Appears in"]}
          widths={["28%", undefined, "20%"]}
          rows={[
            [<span><code>BUTTON_LIMITATION</code></span>, BUTTON_LIMITATION, `${cites(BUTTON_LIMITATION)} recipes`],
            [<span><code>AUTOMATION_LIMITATION</code></span>, AUTOMATION_LIMITATION, `${cites(AUTOMATION_LIMITATION)} recipes`],
            [<span><code>RECURRING_LIMITATION</code></span>, RECURRING_LIMITATION, `${cites(RECURRING_LIMITATION)} recipes`],
            [<span><code>SYNCED_BLOCK_LIMITATION</code></span>, SYNCED_BLOCK_LIMITATION, `${cites(SYNCED_BLOCK_LIMITATION)} recipes`],
          ]}
        />
        <Note tone="green" title="The rule">
          If you find yourself writing a manual step whose reason is "it is
          easier by hand", you are writing a shortcut, not a limitation. Either
          script it or do not include the recipe.
        </Note>
      </section>

      <section className="flex flex-col gap-4">
        <H2 id="adding">Adding a recipe</H2>
        <UL>
          <LI>
            Write it in <code>lib/recipes/business.ts</code> or{" "}
            <code>lib/recipes/systems.ts</code>, whichever half of the catalog it
            belongs to.
          </LI>
          <LI>
            Register it in the <code>RECIPES</code> map in{" "}
            <code>lib/recipes/index.ts</code>. Nothing else needs to change.
          </LI>
          <LI>
            Add the catalog entry with <code>kind: "native"</code> and a{" "}
            <code>recipe</code> field matching the id.
          </LI>
          <LI>
            Open the component page. The install plan, the property tables, the
            view list, the page-body previews and the manual steps all render
            from the declaration. Check that the plan reads the way you
            intended before you call it done.
          </LI>
        </UL>
        <H3>Then run the plan, not the install</H3>
        <Code
          lang="bash"
          code={`curl -s -X POST localhost:3000/api/install \\
  -H 'content-type: application/json' \\
  -d '{"component":"crm-pipeline","mode":"plan"}' \\
  | jq '.plan.calls[] | {method, path, note}'

# count the requests, check the order, read the warnings
curl -s -X POST localhost:3000/api/install \\
  -H 'content-type: application/json' \\
  -d '{"component":"crm-pipeline","mode":"plan"}' \\
  | jq '{total: .plan.totalRequests, manual: .plan.manualSteps, warnings: .plan.warnings}'`}
        />
        <P>
          Plan mode needs no credentials and touches nothing. It is the review
          step, and it is the reason an agent can be given a recipe without being
          given a token first.
        </P>
      </section>

      <section className="flex flex-col gap-4">
        <H2 id="catalog">Everything published</H2>
        <div className="grid gap-2 sm:grid-cols-2">
          {recipeList.map((r) => {
            const plan = planInstall(r);
            return (
              <Link
                key={r.id}
                href={`/components/${r.id}`}
                className="group rounded-xl border border-border bg-card px-3.5 py-3 transition-colors duration-150 hover:border-border-strong"
              >
                <div className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold group-hover:text-primary">
                    {r.id}
                  </span>
                  <span className="shrink-0 rounded border border-border bg-secondary px-1.5 py-px font-mono text-[10.5px] text-muted-foreground">
                    {plan.totalRequests} req
                  </span>
                </div>
                <dl className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[11px] text-ink-soft tnum">
                  {[
                    ["db", r.databases.length],
                    ["views", r.views.length],
                    ["pages", r.pages.length],
                    ["manual", r.manual.length],
                  ].map(([k, v], i) => (
                    <span key={String(k)} className="flex items-center gap-2">
                      {i > 0 && (
                        <span aria-hidden className="h-3 w-px bg-border-strong" />
                      )}
                      <span>
                        {String(v)} <span className="text-ink-faint">{String(k)}</span>
                      </span>
                    </span>
                  ))}
                </dl>
              </Link>
            );
          })}
        </div>
      </section>
    </DocPage>
  );
}
