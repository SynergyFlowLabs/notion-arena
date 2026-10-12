import { promises as fs } from "node:fs";
import path from "node:path";
import type { Binding, CapabilityProfile, Instance } from "@/lib/sync/types";
import { absoluteUrl } from "@/lib/utils";

/**
 * Wiring the bridge into both renderers.
 *
 * The bridge is injected, never imported by a widget. That keeps
 * `public/widgets/*.html` byte-for-byte sandbox-pure (the contract
 * `scripts/check-widgets.mjs` enforces) while the artifact the user actually
 * receives carries a data plane.
 *
 * Two renderers, one envelope:
 *   • `transport: "live"`  : the hosted embed. fetch + SSE to our API.
 *   • `transport: "outbox"`: the HTML block, and anything the user downloads.
 *     No network is assumed; the snapshot is baked in and edits queue locally.
 */

export interface Envelope {
  v: 1;
  id: string;
  slug: string;
  mode: Binding["mode"];
  /** the instance sync key; scoped, revocable, hashed at rest server-side */
  key: string;
  /** API base, absolute because a sandboxed HTML block has no document base */
  api: string;
  rev: number;
  /** the state document baked at render time */
  baked: unknown;
  transport: "live" | "outbox";
  /** the localStorage key this instance adopts */
  adoptKey: string;
  binding: {
    mode: Binding["mode"];
    databaseTitle: string;
    dataSourceId: string;
    keyProp: string;
    fields: Binding["fields"];
  };
  ui?: boolean;
  reloadOnRemote?: boolean;
  /**
   * Opt-in postMessage channel to a parent we control (the standalone page, the
   * playground, an integrator's site). Never settable from a Notion surface:
   * Notion has no host SDK, see docs/DATA_SYNC_RESEARCH.md §2.7.
   */
  host?: boolean;
  config?: Record<string, unknown>;
}

const BRIDGE_PATH = path.join(process.cwd(), "lib", "bridge", "client.js");

export async function bridgeSource(): Promise<string> {
  return fs.readFile(BRIDGE_PATH, "utf8");
}

export function adoptKeyFor(instance: Pick<Instance, "slug" | "adoptKey">): string {
  return instance.adoptKey || `notion-arena.${instance.slug}.v1`;
}

export function envelopeFor(input: {
  instance: Instance;
  syncKey?: string;
  baked: unknown;
  transport?: Envelope["transport"];
  api?: string;
  ui?: boolean;
  reloadOnRemote?: boolean;
  host?: boolean;
}): Envelope {
  const { instance } = input;
  return {
    v: 1,
    id: instance.id,
    slug: instance.slug,
    mode: instance.binding.mode,
    key: input.syncKey ?? "",
    api: (input.api ?? absoluteUrl("")).replace(/\/$/, ""),
    rev: instance.rev,
    baked: input.baked ?? {},
    transport: input.transport ?? "live",
    adoptKey: adoptKeyFor(instance),
    binding: {
      mode: instance.binding.mode,
      databaseTitle: instance.binding.databaseTitle,
      dataSourceId: instance.binding.dataSourceId,
      keyProp: instance.binding.keyProp,
      fields: instance.binding.fields,
    },
    ui: input.ui,
    reloadOnRemote: input.reloadOnRemote,
    host: input.host,
    config: instance.config,
  };
}

function escapeJsonForScript(json: string): string {
  return json
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

/**
 * Inserts the envelope and the runtime just before </head>.
 *
 * Before the widget's own script on purpose: the bridge patches
 * `Storage.prototype` and primes the adopted key, so the widget's very first
 * synchronous `localStorage.getItem(KEY)` already returns server data rather
 * than an empty string. That removes the "flash of empty state" and, in the
 * offline renderer, removes the need for the widget to know anything changed.
 */
export function injectArena(html: string, envelope: Envelope, bridgeJs: string): string {
  const env = `<script id="arena-instance" type="application/json">${escapeJsonForScript(
    JSON.stringify(envelope)
  )}</script>`;
  const runtime = `<script id="arena-bridge">${bridgeJs}</script>`;
  const block = `${env}\n${runtime}\n`;
  if (html.includes("</head>")) return html.replace("</head>", `${block}</head>`);
  return block + html;
}

/** The CSP the /embed response must send once a data plane is present. */
export const ARENA_CSP =
  "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; " +
  "img-src data: blob:; media-src data: blob:; connect-src 'self'; " +
  "base-uri 'none'; form-action 'none'; frame-ancestors *";

/** What the probe file renders, so a human can answer Q1 to Q4 in the research. */
export function capabilityReport(profile: CapabilityProfile): string[] {
  return [
    `Framed: ${profile.framed ? "yes" : "no (top level)"}`,
    `Frame origin: ${profile.origin}`,
    `Storage: ${profile.storage}${profile.storageError ? ` (${profile.storageError})` : ""}`,
    `Network: ${profile.network ? "yes" : "no"}`,
    `Clipboard write: ${profile.clipboard ? "yes" : "no"}`,
    `BroadcastChannel: ${profile.broadcastChannel ? "yes" : "no"}`,
    `Preferred transport: ${profile.transport}`,
  ];
}

/* ------------------------------------------------------------------ */
/* Rendering both renderers                                            */
/* ------------------------------------------------------------------ */

export interface RenderBundleInput {
  instance: Instance;
  /** the state document to bake into the file */
  doc: unknown;
  /** "live" for the hosted embed, "outbox" for the downloaded HTML block */
  transport: Envelope["transport"];
  syncKey?: string;
  ui?: boolean;
  reloadOnRemote?: boolean;
  host?: boolean;
}

/**
 * One function, two renderers.
 *
 * The hosted embed and the file the user uploads into Notion differ by exactly
 * one field: `transport`. Everything else (config, envelope, runtime, baked
 * document) is identical, which is what makes "same instance, two renderers"
 * a property of the code rather than a promise in a doc.
 */
export async function renderDataBundle(input: RenderBundleInput): Promise<string> {
  const { readWidgetFile, buildConfig, injectConfig, getWidget } = await import("@/lib/widget");
  const widget = getWidget(input.instance.slug);
  if (!widget) throw new Error(`Unknown component: ${input.instance.slug}`);

  const source = await readWidgetFile(widget);
  const config = buildConfig(widget, input.instance.config as Record<string, string>);
  const withConfig = injectConfig(source, config);
  const envelope = envelopeFor({
    instance: input.instance,
    syncKey: input.syncKey,
    baked: input.doc,
    transport: input.transport,
    ui: input.ui,
    reloadOnRemote: input.reloadOnRemote,
    host: input.host,
  });
  return injectArena(withConfig, envelope, await bridgeSource());
}
