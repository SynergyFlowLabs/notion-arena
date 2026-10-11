import type { Metadata } from "next";
import { DocPage, H2, H3, P, Note, UL, LI, Code, Table, YesNo, Cite } from "@/components/docs/prose";
import { RECIPES, planInstall } from "@/lib/recipes";

export const metadata: Metadata = {
  title: "Notion API limits, cited",
  description:
    "Every Notion API constraint that shapes a Blocksmith recipe: block nesting depth, children per request, rate limits, the missing button type, automations, recurring templates, dashboard layouts, and the two-pass data-source problem.",
};

const recipeCount = Object.keys(RECIPES).length;
/** Derived, so this page can never quote a request count the plan disagrees with. */
const crmRequests = planInstall(RECIPES["crm-pipeline"]).totalRequests;

export default function ApiLimitsPage() {
  return (
    <DocPage
      eyebrow="Notion platform"
      title="Notion API limits, cited"
      lede={
        <>
          These are the constraints that decide what a recipe can install and
          what it has to hand you as a click path. Each one links to the page in
          the Notion reference that states it. Nothing here is inferred from a
          forum post.
        </>
      }
    >
      <section className="flex flex-col gap-4">
        <H2 id="blocks">Block creation</H2>
        <Table
          head={["Limit", "Value", "How we handle it"]}
          widths={["30%", "18%", undefined]}
          rows={[
            ["Children per append request", "100", "The installer chunks every page body into groups of 100 and issues one PATCH per chunk."],
            ["Nesting depth per request", "2 levels", "A column_list containing columns containing paragraphs is already at the ceiling. Deeper trees are split across requests, appended to the block id the previous request returned."],
            [<span>Block types available</span>, "See reference", "paragraph, heading_1-4, bulleted/numbered_list_item, to_do, toggle, quote, callout, divider, code, equation, embed, bookmark, column_list, synced_block, table, table_row, breadcrumb, table_of_contents, child_page, child_database."],
            [<span><code>button</code> block type</span>, <span className="text-[var(--tag-ink-red)]">does not exist</span>, "Buttons are the single most-requested thing a recipe cannot create. Every recipe that needs one ships the exact click path instead."],
            ["Insertion position", <><code>position</code></>, "Since 2026-03-11, <code>position</code> replaces the older <code>after</code> field for placing children."],
            ["Notifications on write", <><code>mode: "silent"</code></>, "Bulk installs should send this, otherwise every appended block can notify watchers of the page."],
          ]}
        />
        <P>
          Sources:{" "}
          <Cite href="https://developers.notion.com/reference/patch-block-children">
            Append block children
          </Cite>{" "}
          and{" "}
          <Cite href="https://developers.notion.com/reference/block">
            Block object
          </Cite>
          .
        </P>
      </section>

      <section className="flex flex-col gap-4">
        <H2 id="data-sources">The data-source split, and why installs are two-pass</H2>
        <P>
          Notion separated <em>databases</em> from <em>data sources</em>. A
          database is the container; a data source holds the schema and the rows.
          Every database created through the API arrives with exactly one default
          data source, whose id you do not choose and cannot predict.
        </P>
        <P>
          A <code>relation</code> property targets a data source. So creating
          <strong className="font-semibold text-foreground"> Deals</strong> with
          a relation to <strong className="font-semibold text-foreground"> Companies</strong>{" "}
          requires the <code>data_source_id</code> of Companies, which only
          exists after Companies has been created and read back.
        </P>
        <Code
          lang="text"
          filename="the ordering a correct install must follow"
          code={`pass 1 · POST /v1/databases      create every database, base properties only
                                 (relations, rollups and dependent formulas omitted)
pass 2 · GET  /v1/databases/{id} read each one back, take data_sources[0].id
pass 3 · PATCH /v1/data_sources/{id}
                                 now add the relation properties, using the ids
pass 4 · PATCH /v1/data_sources/{id}
                                 then rollups (they name a relation property)
pass 5 · PATCH /v1/data_sources/{id}
                                 then formulas that read either of the above`}
        />
        <Note tone="blue" title="Why recipes declare refs instead of ids">
          In a recipe definition, a relation points at another recipe database by{" "}
          <code>ref</code>: a local name like <code>companies</code>. The
          installer marks those with an internal{" "}
          <code>__relationRef</code> field, strips them from pass 1, and resolves
          each one to a real <code>data_source_id</code> in pass 3. That is why a
          recipe can declare a bidirectional relation between two databases that
          do not exist yet.
        </Note>
        <P>
          Sources:{" "}
          <Cite href="https://developers.notion.com/reference/create-a-data-source">
            Create a data source
          </Cite>{" "}
          and{" "}
          <Cite href="https://developers.notion.com/reference/property-object">
            Property object
          </Cite>
          .
        </P>
      </section>

      <section className="flex flex-col gap-4">
        <H2 id="property-writes">Properties the API will not write</H2>
        <P>
          Two property types exist in the response schema and are silently
          ignored on create or update:
        </P>
        <Table
          head={["Property type", "Readable", "Writable", "Note"]}
          widths={["24%", "80px", "80px", undefined]}
          rows={[
            [<span><code>button</code></span>, <YesNo v />, <YesNo v={false} />, "Returned by the API on databases that have one. Cannot be created or configured programmatically: it is a page-level control, not a schema field."],
            [<span><code>verification</code></span>, <YesNo v />, <YesNo v={false} />, "The wiki page-verification badge. Response-only."],
            [<span><code>status</code> groups</span>, <YesNo v />, <YesNo v="partial" />, "On create, each option may carry a <code>group</code> of To-do, In progress or Complete. In responses, groups arrive separately with <code>option_ids</code>, so a round-trip is not symmetrical."],
            [<span><code>unique_id</code></span>, <YesNo v />, <YesNo v="partial" />, "You can set the <code>prefix</code>. You cannot set the number."],
            [<span><code>relation</code></span>, <YesNo v />, <YesNo v />, "Current versions target a data source, not a database id. Older integrations pinned to an earlier Notion-Version still address databases directly."],
          ]}
        />
        <P>
          Source:{" "}
          <Cite href="https://developers.notion.com/reference/property-object">
            Property object
          </Cite>
          .
        </P>
      </section>

      <section className="flex flex-col gap-4">
        <H2 id="views">Views</H2>
        <P>
          The Views API is recent, and it is the reason provisioning a workspace
          from code finally works end to end. Before it, you could create a
          database but not shape how anyone looked at it.
        </P>
        <UL>
          <LI>
            <code>POST /v1/views</code> creates table, board, list, calendar,
            timeline, gallery, form, chart, map and dashboard views.
          </LI>
          <LI>
            Board groups, timeline date properties, calendar ranges, chart axes
            and form questions are all configurable at creation time.
          </LI>
          <LI>
            <strong className="font-semibold text-foreground">Dashboard layouts
            are read-only.</strong> You can create a dashboard view, and you can
            create the widget views it would display, but you cannot position
            them. Notion composes the layout itself from the widget views
            attached to the same data source.
          </LI>
        </UL>
        <P>
          Our <code>habit-os-native</code> recipe creates a dashboard view plus
          each chart view as its own request, then tells you in the manual steps
          that the arrangement is Notion's to decide.
        </P>
        <P>
          Source:{" "}
          <Cite href="https://developers.notion.com/guides/data-apis/working-with-views">
            Working with views
          </Cite>
          .
        </P>
      </section>

      <section className="flex flex-col gap-4">
        <H2 id="gaps">The four gaps every recipe works around</H2>
        <P>
          These appear as <code>manual[]</code> entries in {recipeCount} of our{" "}
          {recipeCount} recipes. Each entry carries the reason, verbatim, so you
          can check it against the reference yourself.
        </P>

        <div className="flex flex-col gap-3">
          {[
            {
              t: "Button blocks",
              why: "There is no button block type in the public API, and the button property is response-only. A recipe can build everything a button acts on, never the button.",
              path: "On the target page, type /button → add each action in order → Notion runs them top to bottom. Buttons cannot loop, cannot branch, and cannot read a rollup.",
              tone: "red" as const,
            },
            {
              t: "Database automations",
              why: "No endpoint exists. Automations are configured in the database UI and stored outside the public schema.",
              path: "Open the database → ••• → Automations → New automation. Each recipe lists the trigger, the conditions and the actions in the order to add them.",
              tone: "red" as const,
            },
            {
              t: "Recurring templates",
              why: "Database templates can be created through the API as page bodies, but the repeat schedule is a Business-and-above feature with no endpoint.",
              path: "Open the database → the arrow next to New → New template → build the body → ••• on the template → Repeat → pick the schedule.",
              tone: "red" as const,
            },
            {
              t: "Synced block placement",
              why: "The API can create a synced_block with children, but cannot create the second instance of it elsewhere in the workspace. An original and its duplicates are linked in the UI, not addressable by id.",
              path: "Create the original via the API, then in each destination page type /synced and choose the existing block. Recipes tell you exactly which pages need it.",
              tone: "yellow" as const,
            },
          ].map((g) => (
            <Note key={g.t} tone={g.tone} title={g.t}>
              <div className="flex flex-col gap-1.5">
                <span>
                  <strong className="font-semibold text-foreground">Why it cannot be scripted:</strong>{" "}
                  {g.why}
                </span>
                <span>
                  <strong className="font-semibold text-foreground">Click path:</strong> {g.path}
                </span>
              </div>
            </Note>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <H2 id="rate-limits">Rate limits and quotas</H2>
        <Table
          head={["Constraint", "Value", "Effect on an install"]}
          widths={["30%", "20%", undefined]}
          rows={[
            ["Request rate", "~3 req/s average", `A ${crmRequests}-request CRM install takes well under a minute even paced conservatively. Our installer does not parallelise writes to the same parent.`],
            ["Children per request", "100", "Long documentation pages are chunked; the chunk count is visible in the plan before you run it."],
            ["Nesting per request", "2 levels", "Deep trees need sequential appends against returned block ids."],
            ["Payload size", "500 KB per request", "Page bodies of a few hundred blocks are fine. A simple_table whose serialized body exceeds 500 KB needs splitting across requests."],
            ["File upload size", "Depends on plan", "Widget HTML is 15-90 KB, so uploads are never close to the limit on any plan."],
            ["Integration connections", "Per page or per workspace", "An internal integration must be explicitly connected to every page it writes to, or writes return restricted_resource."],
          ]}
        />
        <Note tone="blue" title="Read the plan before you spend a token">
          <code>POST /api/install</code> with <code>mode: "plan"</code> requires no
          credentials and returns every request: method, path, body and a note.
          You can count them, diff them, and estimate the runtime before anything
          touches your workspace.
        </Note>
      </section>

      <section className="flex flex-col gap-4">
        <H2 id="version">Notion-Version</H2>
        <P>
          Every request in this project sends{" "}
          <code>Notion-Version: 2026-03-11</code>. That version introduced the
          File Upload path for HTML blocks, <code>heading_4</code>, tab blocks,
          the <code>position</code> field, silent notification mode, and a typed{" "}
          <code>database_type</code> on database objects.
        </P>
        <H3>Why pinning matters</H3>
        <UL>
          <LI>
            Notion's API is versioned by date, and behaviour changes between
            versions, notably the database/data-source split, which
            changes what a <code>relation</code> property points at.
          </LI>
          <LI>
            A recipe that resolves <code>data_sources[0].id</code> is only correct
            on versions where data sources exist. Pinning is what makes that safe.
          </LI>
          <LI>
            If you fork this project and change the version constant, re-run the
            plan for one recipe and diff it before installing anything.
          </LI>
        </UL>
        <P>
          Source:{" "}
          <Cite href="https://developers.notion.com/page/changelog">
            Notion API changelog
          </Cite>
          .
        </P>
      </section>
    </DocPage>
  );
}
