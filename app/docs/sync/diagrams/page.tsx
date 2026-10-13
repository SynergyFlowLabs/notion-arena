import type { Metadata } from "next";
import { withCanonical } from "@/lib/seo";
import { DocPage, H2, P, Note } from "@/components/docs/prose";
import { DIAGRAMS } from "@/lib/diagrams";
import { SyncFigure } from "@/components/sync/figure";
import { FigureDownload } from "@/components/sync/figure-download";

export const metadata: Metadata = withCanonical("/docs/sync/diagrams", {
  title: "The sync, in six figures",
  description:
    "Where a component's state lives today, what two-way sync costs, and how one click becomes one row: six diagrams drawn from the same source as the code they describe.",
});

const READ = [
  { kind: "solid" as const, label: "happens on every sync, no condition" },
  { kind: "dashed" as const, label: "conditional: offline, or a platform refusal" },
  { kind: "dotted" as const, label: "ordering and containment, not transport" },
];

const MEANING = [
  { color: "var(--primary)", label: "Arena, and the widget's own write" },
  { color: "var(--tint-mint-ink)", label: "landed in the workspace" },
  { color: "var(--tint-butter-ink)", label: "waiting outside Notion" },
  { color: "var(--tint-ember-ink)", label: "the platform refused it" },
];

function Rule({ kind }: { kind: "solid" | "dashed" | "dotted" }) {
  return (
    <span
      aria-hidden
      className="h-0 w-7 shrink-0 border-t-2 border-ink-faint"
      style={{ borderStyle: kind }}
    />
  );
}

export default function DiagramDocsPage() {
  return (
    <DocPage
      eyebrow="Notion platform"
      title="The sync, in six figures"
      lede={
        <>
          The same six pictures the rest of this section argues in prose. Each
          one is drawn from <code>lib/diagrams.ts</code>, exported to PNG by{" "}
          <code>scripts/export-diagrams.mjs</code>, and footed with the files it
          was measured against, so a claim that stops being true can be caught
          by reading the figure next to the code.
        </>
      }
    >
      <section className="flex flex-col gap-4">
        <H2 id="read">How to read them</H2>
        <div className="flex flex-wrap gap-x-8 gap-y-3">
          <ul className="flex flex-col gap-2">
            {READ.map((item) => (
              <li key={item.kind} className="flex items-center gap-2.5 text-[13.5px] text-ink-soft">
                <Rule kind={item.kind} />
                {item.label}
              </li>
            ))}
          </ul>
          <ul className="flex flex-col gap-2">
            {MEANING.map((item) => (
              <li key={item.label} className="flex items-center gap-2.5 text-[13.5px] text-ink-soft">
                <span
                  aria-hidden
                  className="size-3 shrink-0 rounded-[3px]"
                  style={{ background: item.color }}
                />
                {item.label}
              </li>
            ))}
          </ul>
        </div>
        <P>
          Every identifier in a figure is a real one: <code>notion-arena.habit-grid.v1</code>{" "}
          is the key <code>public/widgets/habit-grid.html</code> writes,{" "}
          <code>1500</code> ms is the stream poll in{" "}
          <code>app/api/sync/instances/[id]/stream/route.ts</code>, and{" "}
          <code>450</code> ms is the debounce in <code>lib/bridge/client.js</code>.
          Nothing here is a placeholder rounded for looks.
        </P>
      </section>

      <section className="flex flex-col gap-10">
        <H2 id="figures">The six</H2>
        {DIAGRAMS.map((fig, i) => (
          <div key={fig.id} id={fig.id} className="scroll-mt-24">
            <div className="mb-2 flex items-center justify-between gap-4 border-b border-border pb-2">
              <p className="label-mono text-ink-faint">
                Figure {String(i + 1).padStart(2, "0")}
              </p>
              <FigureDownload id={fig.id} />
            </div>
            <SyncFigure id={fig.id} />
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-4">
        <H2 id="provenance">Where these come from</H2>
        <P>
          The figures are code, not drawings that drift. <code>lib/diagrams.ts</code>{" "}
          holds them as SVG strings built from measured text, and it is imported
          by this page as a module: what you are reading and what the exporter
          writes to <code>public/diagrams/</code> are the same characters. The
          export resolves <code>var(--token)</code> through{" "}
          <code>app/globals.css</code> and fails loudly on a token that does not
          exist, so a colour that stops being part of the design system breaks
          the build rather than the picture.
        </P>
        <Note title="What a figure is allowed to say" tone="yellow">
          Each of these was checked against the running slice before it was
          drawn. Where the slice is only a slice, the figure says so in its own
          footer instead of implying a finished system: the adapter has been
          exercised against a demo workspace, not against live Notion, and the
          four environment questions in <code>docs/SYNC_PLAN.md</code> are
          still open.
        </Note>
        <P>
          The argument they support, with citations, is in{" "}
          <a href="/docs/sync">two-way data sync</a>; the platform limits are
          quoted line by line in <a href="/docs/api-limits">API limits, cited</a>.
        </P>
      </section>
    </DocPage>
  );
}
