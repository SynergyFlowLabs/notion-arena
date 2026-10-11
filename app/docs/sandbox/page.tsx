import type { Metadata } from "next";
import { DocPage, H2, H3, P, Note, UL, LI, Code, Table, YesNo, Cite } from "@/components/docs/prose";
import { SandboxFlowArt } from "@/components/illustrations";

export const metadata: Metadata = {
  title: "The HTML block sandbox",
  description:
    "What Notion's native HTML block can and cannot do: JavaScript, localStorage, network access, parent-page access, editing, plan availability. Verified against the Notion changelog and the File Upload API reference.",
};

export default function SandboxPage() {
  return (
    <DocPage
      eyebrow="Notion platform"
      title="The HTML block sandbox"
      lede={
        <>
          Notion 3.6 added a native HTML block. It lets a page contain a runnable
          file, and the common reading of how it works is wrong. It is
          not an iframe of a URL and it is not a plugin. It is a file you
          upload, rendered in a frame with no address and no network. Every
          design decision behind our widgets follows from that.
        </>
      }
    >
      <SandboxFlowArt className="mb-2 h-44 w-full max-w-[420px] text-ink-soft" />
      <section className="flex flex-col gap-4">
        <H2 id="what-it-is">What it actually is</H2>
        <P>
          When you create an HTML block, Notion stores an <code>.html</code> file
          in its own file storage and renders it inside a sandboxed frame. The{" "}
          <code>/html</code> slash command does this by hand: you paste source,
          Notion uploads it. The API does it in three requests: reserve an
          upload, send the bytes, then append an <code>embed</code> block that
          points at the upload id.
        </P>
        <P>
          There is no separate <code>html</code> block type in the API. The{" "}
          <code>embed</code> block type does double duty: with a{" "}
          <code>url</code> it iframes a remote page, with a{" "}
          <code>file_upload.id</code> it renders an uploaded HTML file. This is
          the part people get wrong, and the reason scripted attempts fail on the
          first try.
        </P>
        <Note tone="blue" title="Where this is documented">
          The File Upload flow lives in the{" "}
          <Cite href="https://developers.notion.com/docs/uploading-small-files">
            uploading small files
          </Cite>{" "}
          guide and the{" "}
          <Cite href="https://developers.notion.com/reference/create-a-file-upload">
            create a file upload
          </Cite>{" "}
          reference. The HTML block itself shipped in the{" "}
          <Cite href="https://developers.notion.com/page/changelog">
            Notion 3.6 changelog
          </Cite>
          , alongside <code>heading_4</code>, tab blocks, and the{" "}
          <code>position</code> field that replaced <code>after</code>.
        </Note>
      </section>

      <section className="flex flex-col gap-4">
        <H2 id="capability-matrix">Capability matrix</H2>
        <P>
          Documented behaviour, plus what we observe when our own widgets render
          in a real block. Where a row is browser-dependent rather than
          Notion-dependent it is marked partial, treat those as "test it on the
          devices your team actually uses".
        </P>
        <Table
          head={["Capability", "", "What it means in practice"]}
          widths={["34%", "36px", undefined]}
          rows={[
            [<span>JavaScript execution</span>, <YesNo v />, "Full ES2022. Timers, requestAnimationFrame, canvas 2D, SVG, WebAudio, drag events, IntersectionObserver, the async Clipboard API on a user gesture."],
            [<span>CSS</span>, <YesNo v />, "Full, including container queries, <code>:has()</code>, <code>color-mix()</code> and custom properties. Inline only, no external stylesheets."],
            [<span>Viewing the block</span>, <YesNo v />, "Every plan: Free, Plus, Business, Enterprise. It is a block, not a feature flag."],
            [<span>localStorage / IndexedDB</span>, <YesNo v="partial" />, "Works, scoped to the browser profile. Not synced to teammates, not available in the mobile app's WebView on some versions, cleared with site data."],
            [<span>Clipboard write</span>, <YesNo v="partial" />, "Requires a user gesture. Our export buttons therefore always also <code>console.log</code> the payload as a fallback."],
            [<span>External network calls</span>, <YesNo v={false} />, "None. No <code>fetch</code>, no XHR, no WebSocket, no image hotlink, no CDN script, no webfont, no analytics beacon."],
            [<span>Reading the host page</span>, <YesNo v={false} />, "No URL, no <code>location.search</code>, no postMessage bridge to Notion, no access to page content or database properties."],
            [<span>Writing to Notion</span>, <YesNo v={false} />, "No API access. A block cannot create a page, tick a checkbox or update a property, even with a valid token, which it could not hold anyway."],
            [<span>AI generating or editing the HTML</span>, <YesNo v="partial" />, "Notion AI can author and revise HTML blocks on Business and Enterprise plans only. Blocks you installed still render everywhere regardless of who made them."],
            [<span>Editing in place</span>, <YesNo v={false} />, "You replace the file. Notion does not expose a source editor for an existing block through the API."],
          ]}
        />
        <Note tone="red" title="The two rows that decide your architecture">
          No network and no page access. Together they mean a widget can never be
          data-driven from your workspace. If a component needs to display real
          numbers, it has to be a database with a view or a chart, i.e. a native
          recipe. Any product that claims an HTML block reads your Notion data is
          either wrong or is doing something you should look at closely.
        </Note>
      </section>

      <section className="flex flex-col gap-4">
        <H2 id="configuration">Configuring a block that has no URL</H2>
        <P>
          The hosted embed reads its parameters from the query string. A
          downloaded HTML block cannot: <code>location.search</code> is empty
          inside the sandbox. So the configuration has to travel inside the file.
          Every Blocksmith widget implements the same loader:
        </P>
        <Code
          lang="js"
          filename="the loader every widget ships with"
          code={`// 1. baked-in config, if the file was downloaded with one
const baked = JSON.parse(
  document.getElementById("bk-config")?.textContent ?? "{}"
);

// 2. query string on top, if the file is being served at a URL
const qs = new URLSearchParams(location.search);
const cfg = { ...baked };
for (const [key, value] of qs) cfg[key] = value;

// 3. typed accessors: never trust the raw string
const num  = (k, d) => Number.isFinite(+cfg[k]) ? +cfg[k] : d;
const bool = (k, d) => cfg[k] === undefined ? d : ["true", "1"].includes(String(cfg[k]));`}
        />
        <P>
          The injection point is a <code>&lt;script&gt;</code> tag placed
          immediately before <code>&lt;/head&gt;</code>, and the values are
          escaped for <code>&lt;</code>, <code>&gt;</code>, <code>&amp;</code>,
          U+2028 and U+2029 so a label containing{" "}
          <code>&lt;/script&gt;</code> cannot break out of the tag. Only declared
          parameters survive: unknown keys are dropped rather than passed
          through, which is what stops a URL from becoming an injection vector.
        </P>
        <H3>Two parameters exist on every widget</H3>
        <UL>
          <LI>
            <code>theme</code>: <code>auto</code>, <code>light</code> or{" "}
            <code>dark</code>. Sets <code>data-theme</code> on{" "}
            <code>&lt;html&gt;</code>. <code>auto</code> follows{" "}
            <code>prefers-color-scheme</code>, which inside Notion means it
            follows Notion's own appearance setting.
          </LI>
          <LI>
            <code>accent</code>: any CSS colour, written to{" "}
            <code>--accent</code>. Derived shades use{" "}
            <code>color-mix(in oklab, …)</code> so one accent produces a
            consistent palette rather than five hardcoded ones.
          </LI>
        </UL>
      </section>

      <section className="flex flex-col gap-4">
        <H2 id="state">State, and why it is not shared</H2>
        <P>
          Widgets that need to remember something (a pomodoro's session count, a
          habit grid's checked squares, a kanban's card positions) use{" "}
          <code>localStorage</code> under a namespaced key:
        </P>
        <Code lang="text" code={`blocksmith.pomodoro-timer.v1   → {"day":"2026-10-11","sessions":3,"minutes":75}
blocksmith.habit-grid.v1       → {"2026-10-11":{"Read":1,"Run":0}}
blocksmith.whiteboard.v1       → {"shapes":[…],"notes":[…],"pan":[0,0]}`} />
        <P>
          The <code>.v1</code> suffix is deliberate: it lets a widget migrate a
          stored shape without silently corrupting an older one.
        </P>
        <Note tone="yellow" title="Say this out loud to your team">
          State is per browser, per device. Your colleague opening the same page
          sees defaults, not your checked squares. That is correct for a personal
          timer, a calculator or a mood log. It is wrong for anything a team
          tracks together, which is why every shared tracker in this catalog
          also exists as a native recipe with a real database behind it.
        </Note>
      </section>

      <section className="flex flex-col gap-4">
        <H2 id="install">Installing one, end to end</H2>
        <P>
          Three requests. The second one goes to a Notion storage host, not to{" "}
          <code>api.notion.com</code>, and takes no <code>Authorization</code>{" "}
          header: the upload URL is already scoped.
        </P>
        <Code
          lang="bash"
          filename="install.sh"
          code={`set -euo pipefail
NOTION_VERSION="2026-03-11"

# 1 · reserve an upload
RES=$(curl -sS -X POST https://api.notion.com/v1/file_uploads \\
  -H "Authorization: Bearer $NOTION_TOKEN" \\
  -H "Notion-Version: $NOTION_VERSION" \\
  -H "Content-Type: application/json" -d '{}')

UPLOAD_ID=$(echo "$RES" | jq -r .id)
UPLOAD_URL=$(echo "$RES" | jq -r .upload_url)

# 2 · send the bytes to the storage host
curl -sS -X POST "$UPLOAD_URL" \\
  -H "Content-Type: text/html" \\
  --data-binary @pomodoro-timer.html

# 3 · append an embed block referencing the upload
curl -sS -X PATCH "https://api.notion.com/v1/blocks/$PAGE_ID/children" \\
  -H "Authorization: Bearer $NOTION_TOKEN" \\
  -H "Notion-Version: $NOTION_VERSION" \\
  -H "Content-Type: application/json" \\
  -d '{
    "children": [{
      "object": "block",
      "type": "embed",
      "embed": {
        "file_upload": { "id": "'"$UPLOAD_ID"'" },
        "caption": [{ "type": "text", "text": { "content": "Pomodoro" } }]
      }
    }]
  }'`}
        />
        <P>
          Or let this site do it: <code>POST /api/install</code> with{" "}
          <code>mode: "html-block"</code> renders the widget with your config,
          runs all three requests, and returns the block id.
        </P>
        <Note tone="red" title="restricted_resource">
          If every write returns 403 with <code>restricted_resource</code>, your
          integration is not connected to the target page. On the page:{" "}
          <strong className="font-semibold text-foreground">••• → Connections</strong>{" "}
          → add your integration. A token alone is never enough; Notion requires
          an explicit per-page grant.
        </Note>
      </section>

      <section className="flex flex-col gap-4">
        <H2 id="embed-vs-block">Embed URL versus HTML block</H2>
        <Table
          head={["", "Embed URL", "HTML block"]}
          widths={["30%", undefined, undefined]}
          rows={[
            ["Where the file lives", "Our host", "Notion's file storage"],
            ["Needs internet to render", "Yes", "No"],
            ["Configuration source", "Query string", "Baked-in JSON script tag"],
            ["Receives our updates", "Yes, automatically", "No. Frozen at your version"],
            ["Install effort", "/embed + paste", "/html + upload, or 3 API calls"],
            ["Works on Free plan", "Yes", "Yes"],
            ["Safe to resell in a template", "Risky: we could disappear", "Yes. It is self-contained"],
            ["Inspectable by you", "View source", "The file you downloaded"],
          ]}
        />
        <P>
          Our recommendation: use the embed URL while you are iterating, and
          download the HTML block for anything that is finished, shared with a
          client, or embedded in a template you sell. The two channels serve the
          same bytes precisely so that switching costs nothing.
        </P>
      </section>
    </DocPage>
  );
}
