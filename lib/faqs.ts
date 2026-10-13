/**
 * The home-page FAQ, as data so that the accordion and the FAQPage JSON-LD
 * stay in sync. An answer is a list of segments; a `{ code }` segment renders
 * as an inline code pill in the UI and as its literal text in structured data.
 */
export type FaqSegment = string | { code: string };

export interface FaqEntry {
  q: string;
  a: FaqSegment[];
}

export const FAQS: FaqEntry[] = [
  {
    q: "Do I need Notion Business or Enterprise to use this?",
    a: [
      "No. Embed URLs and HTML blocks work on every plan, including Free. You need Business or Enterprise only if you want Notion's AI to generate or edit HTML inside a block: the blocks you install still render everywhere. Native recipes work on any plan that has API access, which includes Free.",
    ],
  },
  {
    q: "Can these widgets read my Notion data?",
    a: [
      "No, and this is the single most important thing to understand. An HTML block runs in a sandboxed iframe with no URL and no network access, so it cannot see the page it sits on, cannot call the Notion API, and cannot talk to any external service. Our widgets are therefore driven by URL parameters, baked-in configuration and ",
      { code: "localStorage" },
      ", not by your database. For anything data-driven, use a native recipe or Notion's own dashboard and chart views.",
    ],
  },
  {
    q: "What does localStorage mean for my team?",
    a: [
      "State saved by a widget is per browser, per device. Your colleague opening the same page sees the widget's defaults, not your checked-off squares. That is fine for timers, calculators and mood logs. It is wrong for shared trackers, which is why the shared versions of those exist as native database recipes instead.",
    ],
  },
  {
    q: "Why do some recipes list manual steps?",
    a: [
      "Because the Notion API genuinely cannot do those things. There is no ",
      { code: "button" },
      " block type in the public API, database automations cannot be created programmatically, recurring templates are a paid feature with no endpoint, and dashboard view layouts are read-only. We install everything that can be installed and hand you the exact click path for the rest.",
    ],
  },
  {
    q: "Is this connected to Notion the company?",
    a: [
      "No. Notion Arena is an independent project. Notion, Notion Labs Inc. and the Notion API are trademarks of Notion Labs Inc. We build on their public API and their documented HTML block feature.",
    ],
  },
  {
    q: "Can I edit a component I installed?",
    a: [
      "The HTML file you download is yours: edit it, host it yourself, ship it in your own templates. The embed URL keeps receiving our updates automatically; a downloaded HTML block is frozen at the version you took, which is exactly what you want for a template you sell.",
    ],
  },
  {
    q: "What does the registry actually give me?",
    a: [
      "A machine-readable manifest at ",
      { code: "/r/index.json" },
      " in the shadcn registry-item schema, plus per-component files that inline the full HTML. Point Claude Code, Cursor, or Claude Desktop at our MCP server (",
      { code: "claude mcp add --scope project notion-arena -- npx -y notion-arena-mcp" },
      " or ",
      { code: "npx -y notion-arena-mcp@0.2.2" },
      ") and Agent Skill (",
      { code: "npx skills add SynergyFlowLabs/notion-arena --skill notion-arena" },
      ") and the agent can list, fetch and plan-install components directly from chat.",
    ],
  },
  {
    q: "What happens if you shut down?",
    a: [
      "Embed URLs stop loading. That is the honest downside of hosted delivery, and it is why every widget is downloadable as a single self-contained HTML file with no CDN dependencies. Download it once and the block works forever, offline, with no account and no server.",
    ],
  },
];

/** Plain-text form of an answer, for JSON-LD and anywhere styling is unwanted. */
export function faqAnswerText(segments: FaqSegment[]): string {
  return segments.map((s) => (typeof s === "string" ? s : s.code)).join("");
}
