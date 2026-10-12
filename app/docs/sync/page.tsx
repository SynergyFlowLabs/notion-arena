import type { Metadata } from "next";
import { DocPage, H2, H3, P, Note, UL, LI, Code, Table } from "@/components/docs/prose";
import { DataPlanePlayground } from "@/components/sync/playground";
import { FigureRef, SyncFigure } from "@/components/sync/figure";
import { BOUND_COMPONENTS } from "@/lib/sync/components";
import { schemaFor, schemaSource } from "@/lib/sync/schemas";

export const metadata: Metadata = {
  title: "Two-way data sync",
  description:
    "How a Notion Arena component binds to a database or page and syncs both ways, why the HTML block and the embed need different transports, and the live harness to try it without a Notion token.",
};

/**
 * The ten, resolved through the same schema the engine binds them through.
 *
 * Computed here rather than written out, because a hand-written column list is
 * exactly the kind of table that stays pretty while the columns it describes
 * change underneath it.
 */
function boundRows() {
  return BOUND_COMPONENTS.map((component) => {
    const schema = schemaFor(component.slug, component.seed, component.seed);
    const source = schemaSource(component.slug);
    const columns =
      component.mode === "kv-blob"
        ? ["Arena key", "State", "Rev", "Updated"]
        : schema.fields.map((f) => (f.keyPart ? `${f.prop}*` : f.prop));
    return { component, schema, source, columns };
  });
}

export default async function SyncDocsPage({
  searchParams,
}: {
  searchParams: Promise<{ component?: string }>;
}) {
  const { component } = await searchParams;
  const bound = boundRows();
  return (
    <DocPage
      eyebrow="Notion platform"
      title="Two-way data sync"
      lede={
        <>
          Widgets have always been configurable by URL and persisted by
          themselves. That is one-way and per-browser. This is the other half: an
          instance bound to a database or page in your own workspace, where the
          rows are the state, an edit in either place lands in the other, and the
          same rows appear on the next device you open it on.
        </>
      }
    >
      <section className="flex flex-col gap-4">
        <H2 id="try">Try it, without a Notion token</H2>
        <P>
          Everything below runs against a demo workspace that implements the same
          adapter interface as the Notion API, including its rate limits and its
          Free-plan block cap. Two renderers are shown side by side because that
          is the honest picture of the design: the left frame is the hosted
          embed, the right frame is the downloaded artifact running the way
          Notion runs an HTML block, in a sandbox with an opaque origin and no
          network at all.
        </P>
        <DataPlanePlayground initialSlug={component} />
      </section>

      <section className="flex flex-col gap-4">
        <H2 id="ten">Ten components, bound for real</H2>
        <P>
          Ten components are wired, not illustrated: the playground above binds
          any of them in one click, and each one carries a schema that has been
          driven through the whole loop by <code>npm run check:components</code>{" "}
          (138 assertions, one component at a time: bind, write, find the row,
          edit the row in Notion, find the value in what a device renders,
          trash the row, find the tombstone). They were picked the way a test
          suite is picked, so between them they cover every state shape the
          other 182 widgets use and every property type the mapping layer can
          write.
        </P>
        <Table
          head={["Component", "What it proves", "Columns"]}
          widths={["24%", "38%", undefined]}
          rows={bound.map(({ component, source, columns }) => [
            <span key="c">
              <strong className="text-foreground">{component.label}</strong>
              <br />
              <a href={`/docs/sync?component=${component.slug}`}>try it</a>
              <br />
              <span className="font-mono text-[11.5px] text-ink-faint">{component.mode}</span>
              {source === "inferred" ? (
                <>
                  <br />
                  <span className="text-[11.5px] text-ink-faint">inferred</span>
                </>
              ) : null}
            </span>,
            component.blurb,
            <span key="cols" className="font-mono text-[11.5px] text-ink-soft">
              {columns.join(" · ")}
            </span>,
          ])}
        />
        <P>
          <strong className="text-foreground">The star marks a key field.</strong>{" "}
          A row is identified by its key columns and nothing else, which is why
          those columns matter more than they look: a widget that mints its own
          id (the SPEC family, so the three on the bottom row) gives every record
          an identity, so two invoices that happen to look identical are two
          rows. A widget that does not gives its records a key built from their
          own fields, so two identical expenses on the same day are one row.
          Each component says which of the two it is, above and in the
          playground, instead of leaving a user to find out by losing a row.
        </P>
        <P>
          The same machinery reaches further than the ten.{" "}
          <strong className="text-foreground">
            84 of the 192 widgets are generated from a field list the widget
            already carries
          </strong>
          , and all 84 map through it with nothing left out: bind one and its
          columns come from the widget&apos;s own SPEC rather than a guess. Of
          the 166 widgets that persist state, ten do not use the{" "}
          <code>notion-arena.&lt;slug&gt;.v1</code> key they look like they
          should, and the bind reads the key out of the file rather than
          assuming it, because adopting the wrong key is invisible until a
          device renders empty.
        </P>
      </section>

      <section className="flex flex-col gap-4">
        <H2 id="model">The model, in four sentences</H2>
        <UL>
          <LI>
            Notion is the source of truth. Arena stores bindings, a sealed
            instance key, and a cache. Delete Arena and the data is still a
            database in your workspace, readable by any Notion client.
          </LI>
          <LI>
            An <strong>instance</strong> is one component, in one configuration,
            bound to one data source. It has an id and a capability key, and both
            live in the URL, so identity travels with the link and never depends
            on cookies or browser storage.
          </LI>
          <LI>
            A <strong>renderer</strong> is anything that draws that instance: the
            hosted embed, the HTML block, a standalone page, an integrator&apos;s
            site. Every renderer is the same file with a different transport.
          </LI>
          <LI>
            Widgets keep their own state shape and their own code. The mapping
            layer, not the widget, decides whether that shape becomes typed rows
            (<code>records</code>) or one JSON cell (<code>kv-blob</code>).
          </LI>
        </UL>
        <P>
          Two drawings carry this section better than prose does:{" "}
          <FigureRef id="01-where-state-lives" /> is the problem, three devices
          and three separate copies with no channel between them, and{" "}
          <FigureRef id="02-topology" /> is the shape that replaces it. Both are
          in the gallery, with the rest of them.
        </P>
        <Note title="The question that decides everything else">
          Can a widget inside Notion reach the network? In an HTML block, no. Its
          sandbox has no network, so there is no fetch, no SSE, and no
          third-party <code>localStorage</code> to fall back on. Any design that
          pretends otherwise ships a component that silently loses data on Safari
          and on every browser that partitions storage. The offline transport is
          therefore not a degraded mode bolted on at the end: it is the reason
          the live pull exists at all.
        </Note>
      </section>

      <section className="flex flex-col gap-4">
        <H2 id="channels">Two channels, one instance</H2>
        <P>
          The same instance is reachable two ways. They differ in transport and
          in what the browser is allowed to do, not in what they show.
        </P>
        <Table
          head={["", "Embed block", "HTML block"]}
          widths={["26%", undefined, undefined]}
          rows={[
            [
              "Transport",
              "live: fetch on open, SSE for pushes, 20 s poll as fallback",
              "outbox: reads the baked snapshot, queues ops locally",
            ],
            [
              "Identity",
              "instance id and key in the embed URL",
              "same key, baked into the file at publish time",
            ],
            [
              "Storage",
              "first-party to Arena, so the cache and the outbox work",
              "opaque origin: <code>localStorage</code> throws, memory only",
            ],
            [
              "Writes",
              "pushed to the workspace adapter immediately",
              "queued, then handed off by sync code or refreshed server-side",
            ],
            [
              "Refresh",
              "new revision arrives in place, no reload",
              "server re-renders and PATCHes the block's file in place",
            ],
          ]}
        />
        <SyncFigure id="02-topology" />
        <H3>The sync code</H3>
        <P>
          An offline renderer cannot reach Arena, but a person can carry text
          between two machines, so that is the bridge. The bridge exposes a sync
          code: instance id, base revision, and the queued operations, encoded
          and shown as a short string. Paste it into any reachable renderer on
          the same instance and the ops are pushed from there, with the same
          idempotency keys they were born with, so replaying the same code twice
          cannot double-write.
        </P>
        <Code
          lang="text"
          code={`ARC1.eyJ2IjoxLCJpIjoiaW5zXzAxaDkiLCJiYXNlIjo0MSwib3BzIjpbeyJpZCI6Im9wXzdmMiIsImtleSI6IndhdGVyIiwicGF0aCI6WyIyMDI2LTEwLTEyIl0sInZhbHVlIjoyLCJhdCI6MTc2MDMyMTA0Mn1dfQ`}
        />
        <P>
          The server-side refresh is the other half: the publish endpoint
          re-renders the instance with the current revision and swaps the
          block&apos;s file through a single <code>PATCH /v1/blocks/{"{id}"}</code>{" "}
          with a fresh file upload, so an offline reader picks up changes without
          an extra block appearing on the page every time.
        </P>
      </section>

      <section className="flex flex-col gap-4">
        <H2 id="binding">Binding a component to your data</H2>
        <P>
          Binding answers two questions: which data source, and how does the
          widget&apos;s state become rows. The mapping layer infers the second by
          default, from the sample document in the widget&apos;s own registry
          entry, and a declared schema overrides it where inference guesses
          wrong.
        </P>
        <Table
          head={["Mode", "State shape", "In Notion", "Example"]}
          widths={["17%", "30%", undefined, undefined]}
          rows={[
            [
              "records",
              "array of flat records",
              "one row per record, one property per field, inferred types",
              "expense tracker → Date / Amount / Category / Description",
            ],
            [
              "records (declared)",
              "nested but rectangular",
              "one row per leaf, with the keys promoted to properties",
              "habit heatmap → Habit / Date / Level",
            ],
            [
              "kv-blob",
              "nested, arbitrary",
              "one row per instance, whole document as JSON in a rich_text cell",
              "grocery list → Component / Key / State / Rev / Updated",
            ],
          ]}
        />
        <P>
          A record&apos;s identity is a business key, not a row id: the widget
          says <code>&quot;water&quot;</code> and <code>&quot;2026-10-12&quot;</code>{" "}
          and the engine finds the row that matches. Renaming a component or
          re-binding it to a different database therefore does not orphan data,
          and a person editing the table by hand cannot break the link by
          touching a hidden column.
        </P>
        <SyncFigure id="04-click-to-row" />
        <H3>Conflicts</H3>
        <P>
          Two writers can touch one field within the same minute, and the
          workspace is the only place that knows what actually happened, so the
          rule is per-field last-writer-wins ordered by{" "}
          <code>last_edited_time</code>, with our own monotonic counter breaking
          ties. Nothing is silently dropped: the losing value is written to an
          append-only conflict log and shown as a notice in the widget.
          Event-shaped data is the exception, where the right answer is{" "}
          <code>keep-both</code> rather than last-writer-wins.
        </P>
        <SyncFigure id="05-conflict-policy" />
      </section>

      <section className="flex flex-col gap-4">
        <H2 id="auth">Connections and credentials</H2>
        <P>
          Two ways in, because they fail in different places. The public
          connection (OAuth) is the default for anything a user gives to other
          people: it can create databases anywhere the user installs it, and it
          survives nothing on our side, which is the point. A pasted token (an
          internal connection or a personal access token) is the escape hatch for
          local work, air-gapped installs and self-hosting.
        </P>
        <Table
          head={["", "Public connection (OAuth)", "Pasted token (PAT / internal)"]}
          widths={["22%", undefined, undefined]}
          rows={[
            ["Identity", "Installation in a workspace, per-user grants", "A bot identity inside one workspace"],
            [
              "Can create at workspace level",
              "Yes, which is what a binding needs",
              "Yes",
            ],
            ["Lifetime", "Until the user revokes it", "Expiry chosen at creation, 7 days to 1 year"],
            ["List all users", "Yes, when granted", "No"],
            ["Used here for", "The default path, and the marketplace listing", "Local development, offline and enterprise setups"],
          ]}
        />
        <P>
          A user&apos;s Notion token is never placed in a widget URL. It is
          validated on the way in by reading its own identity, sealed with
          AES-256-GCM, and stored server-side. What reaches the browser is a
          capability key scoped to one instance, revocable, rotatable, and
          useless against anything else in the workspace.
        </P>
      </section>

      <section className="flex flex-col gap-4">
        <H2 id="limits">What the platform will refuse</H2>
        <P>
          Three limits shape the design, and each one is handled rather than
          retried.
        </P>
        <UL>
          <LI>
            <strong>The Free-plan block cap.</strong> A multi-member workspace on
            Free has a lifetime block allowance, and deleting blocks does not
            give it back. The API says so precisely: a 403{" "}
            <code>restricted_resource</code> carrying{" "}
            <code>additional_data.block_limit</code>. Retrying will never
            succeed, so the engine stops and explains. Personal access tokens and
            any-workspace OAuth installations are exempt.
          </LI>
          <LI>
            <strong>Rate limits per connection.</strong> 180 requests per minute
            on Free and Plus, 600 on Business and above, shared across the whole
            workspace, with <code>Retry-After</code> that can exceed a minute.
            Every adapter call goes through one token bucket, and only 429 and
            529 are retried, because those are the only two that mean
            &quot;later&quot;.
          </LI>
          <LI>
            <strong>Record size.</strong> A page that gets too large is rejected
            outright, so a blob-mode instance keeps a size ceiling and warns well
            before it, instead of an unexplained 400 on the next save.
          </LI>
        </UL>
        <Note title="Webhooks are a hint, not a feed" tone="yellow">
          Notion sends ids, never content, at most once, aggregated, up to about
          five minutes late, and the subscription URL is immutable once
          verified, which is why a local development server needs a simulator
          instead of a tunnel. So the webhook only says{" "}
          <em>something changed in this data source</em>; the engine re-reads the
          changed rows and reconciles. A missed webhook costs latency, never
          data.
        </Note>
      </section>

      <section className="flex flex-col gap-4">
        <H2 id="api">The endpoints</H2>
        <Table
          head={["Route", "Method", "What it does"]}
          widths={["38%", "12%", undefined]}
          rows={[
            ["/api/sync/connections", "GET, POST", "List connections; connect the demo workspace or store a validated token"],
            ["/api/sync/datasources", "GET", "Candidate data sources to bind to, with their property names and types"],
            ["/api/sync/instances", "GET, POST", "List by component; create an instance, returning the sync key exactly once"],
            ["/api/sync/instances/{id}", "GET, PATCH, DELETE", "Summary, change log and events; re-bind or rename; rotate or revoke the key"],
            ["/api/sync/instances/{id}/sync", "POST, GET", "The endpoint both renderers read and write through"],
            ["/api/sync/instances/{id}/stream", "GET", "Server-sent revisions and events for the live renderer"],
            ["/api/sync/instances/{id}/bundle", "GET, HEAD", "The offline artifact, and the same artifact as a download"],
            ["/api/sync/instances/{id}/publish", "POST", "Install or refresh the HTML block in the user's workspace"],
            ["/api/sync/notion/table", "GET", "The bound table read back out of Notion, for verification"],
            ["/api/webhooks/notion", "POST, GET", "Signature-verified webhook fanout into the change log"],
            ["/api/dev/notion", "POST", "Development-only simulator for edits made by a person in Notion"],
          ]}
        />
        <P>
          <code>/embed/{"{slug}"}</code> stays what it always was, and gains the
          bound form: <code>?i=&lt;instance&gt;&amp;k=&lt;key&gt;</code> renders
          that instance live, no key renders the query-string configuration as
          before.
        </P>
      </section>

      <section className="flex flex-col gap-4">
        <H2 id="open">Still open, and how to close it</H2>
        <P>
          Four questions cannot be answered from documentation, because they
          depend on which Notion client is rendering the page. The probe file
          measures the environment it is running in, so it answers them from
          inside a real workspace: upload it as an HTML block, or open the URL in
          an embed block, and read the table.
        </P>
        <Table
          head={["Question", "How to answer it"]}
          widths={["48%", undefined]}
          rows={[
            ["Does an HTML block allow localStorage, or is the origin opaque?", "The probe reports its own origin and a storage round trip"],
            ["Does the embed frame permit popups and clipboard writes?", "The probe offers both, since real widgets use them for export"],
            ["Does PATCH on a block swap an embed's file in place?", "The publish button above counts refreshes"],
            ["Does mobile render an HTML block where it refuses embeds?", "Open the same page on a phone"],
          ]}
        />
        <P>
          The whole loop, one write end to end, is{" "}
          <FigureRef id="03-lifecycle" />; the identity that makes the same
          instance render the same rows on a second device is{" "}
          <FigureRef id="06-identity" />. All six are collected at{" "}
          <a href="/docs/sync/diagrams">the sync in figures</a>, each with a PNG
          to take away.
        </P>
        <P>
          The deeper research, including the direct citations for every platform
          limit quoted above and the survey of what two-way-sync vendors do and
          do not do, is in{" "}
          <code>docs/DATA_SYNC_RESEARCH.md</code>. The phased build order is in{" "}
          <code>docs/SYNC_PLAN.md</code>.
        </P>
      </section>
    </DocPage>
  );
}
