import { ImageResponse } from "next/og";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { STATS } from "@/lib/catalog";
import { CATEGORIES } from "@/lib/types";

export const alt =
  "Blocksmith — the component registry for Notion. 14 interactive widgets and 11 native database recipes.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Rendered at build time rather than shipped as a static PNG, so the counts and
 * the palette can never drift from the catalog and globals.css.
 *
 * Satori constraints that shaped this: flexbox only (no grid), no CSS variables
 * (so the token values are written out literally below and mirrored from
 * globals.css), no WOFF2, and every container with children needs an explicit
 * `display: flex`.
 */

// Mirrored from app/globals.css — satori cannot resolve var().
const C = {
  paper: "#f6f5f4",
  card: "#ffffff",
  ink: "#0d0d0c",
  inkSoft: "#5f5e5a",
  inkFaint: "#717069",
  line: "#e6e4df",
  primary: "#006fd2",
  primaryWash: "#e9f1fc",
  primaryDeep: "#005fad",
  band: "#191918",
  tagGreenBg: "#dbebe9",
  tagGreenInk: "#0f7466",
  tagBlueBg: "#dae9f0",
  tagBlueInk: "#0b6e99",
  tagPurpleBg: "#e8e2f2",
  tagPurpleInk: "#6940a5",
  tagAmberBg: "#faf2d9",
  tagAmberInk: "#896a06",
} as const;

const MONO = "IBM Plex Mono";
const SANS = "Inter";

export default function OpengraphImage() {
  const root = process.cwd();
  const fonts = [
    { name: SANS, data: readFileSync(join(root, "fonts/Inter-700.woff")), weight: 700 as const, style: "normal" as const },
    { name: SANS, data: readFileSync(join(root, "fonts/Inter-400.woff")), weight: 400 as const, style: "normal" as const },
    { name: MONO, data: readFileSync(join(root, "fonts/IBMPlexMono-500.woff")), weight: 500 as const, style: "normal" as const },
  ];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: C.paper,
          padding: "52px 72px 48px",
          fontFamily: SANS,
          color: C.ink,
        }}
      >
        {/* ── brand row ─────────────────────────────────────────── */}
        <div style={{ display: "flex", alignItems: "center", width: "100%" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 40,
              height: 40,
              borderRadius: 10,
              background: C.ink,
            }}
          >
            {/* the mark: a block with two rules in it */}
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <div style={{ display: "flex", width: 18, height: 3, borderRadius: 2, background: C.paper }} />
              <div style={{ display: "flex", width: 11, height: 3, borderRadius: 2, background: C.paper }} />
            </div>
          </div>
          <div
            style={{
              display: "flex",
              marginLeft: 14,
              fontSize: 27,
              fontWeight: 700,
              letterSpacing: "-0.021em",
            }}
          >
            Blocksmith
          </div>

          <div style={{ display: "flex", marginLeft: "auto" }}>
            <div
              style={{
                display: "flex",
                padding: "7px 13px",
                borderRadius: 7,
                background: C.primaryWash,
                color: C.primaryDeep,
                fontFamily: MONO,
                fontSize: 15,
                fontWeight: 500,
                letterSpacing: "0.06em",
              }}
            >
              components/{STATS.total}
            </div>
          </div>
        </div>

        {/* ── headline ──────────────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: 40,
            fontSize: 66,
            fontWeight: 700,
            lineHeight: 1.05,
            letterSpacing: "-0.035em",
          }}
        >
          <div style={{ display: "flex" }}>Notion gives you a page</div>
          <div style={{ display: "flex" }}>and a database.</div>
          <div style={{ display: "flex", color: C.inkSoft }}>This is the rest.</div>
        </div>

        {/* Two explicit single-line rows: satori collapses the height of a
            multi-line text box, which hid the second line behind the chips. */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 5,
            marginTop: 22,
            fontSize: 22,
            lineHeight: 1.35,
            color: C.inkSoft,
          }}
        >
          <div style={{ display: "flex" }}>Interactive widgets that run inside a page,</div>
          <div style={{ display: "flex" }}>and database systems that install through the API.</div>
        </div>

        {/* ── channel chips: the three ways in ──────────────────── */}
        <div style={{ display: "flex", gap: 12, marginTop: 26 }}>
          {[
            { label: "Embed URL", bg: C.tagBlueBg, ink: C.tagBlueInk },
            { label: "HTML block", bg: C.tagGreenBg, ink: C.tagGreenInk },
            { label: "API recipe", bg: C.tagPurpleBg, ink: C.tagPurpleInk },
          ].map((chip) => (
            <div
              key={chip.label}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "9px 16px",
                borderRadius: 8,
                background: chip.bg,
                color: chip.ink,
                fontSize: 19,
                fontWeight: 700,
                letterSpacing: "-0.01em",
              }}
            >
              {chip.label}
            </div>
          ))}
        </div>

        {/* ── footer: hairline, then the derived counts ─────────── */}
        <div style={{ display: "flex", marginTop: "auto", width: "100%" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              width: "100%",
              borderTop: `1px solid ${C.line}`,
              paddingTop: 18,
            }}
          >
            {[
              { n: STATS.widgets, k: "widgets" },
              { n: STATS.native, k: "native recipes" },
              { n: STATS.free, k: "free under MIT" },
              { n: CATEGORIES.length, k: "categories" },
            ].map((s) => (
              // A real divider element rather than a conditional borderLeft:
              // satori throws on an explicitly undefined border value.
              <div key={s.k} style={{ display: "flex", alignItems: "center" }}>
                {s.k !== "widgets" && (
                  <div
                    style={{
                      display: "flex",
                      width: 1,
                      height: 34,
                      background: C.line,
                      marginRight: 32,
                    }}
                  />
                )}
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: 8,
                    marginRight: 32,
                  }}
                >
                <span
                  style={{
                    display: "flex",
                    fontSize: 26,
                    fontWeight: 700,
                    letterSpacing: "-0.02em",
                    color: C.ink,
                  }}
                >
                  {s.n}
                </span>
                <span
                  style={{
                    display: "flex",
                    fontSize: 15,
                    fontFamily: MONO,
                    fontWeight: 500,
                    letterSpacing: "0.04em",
                    color: C.inkFaint,
                  }}
                >
                  {s.k}
                </span>
                </div>
              </div>
            ))}

            <div
              style={{
                display: "flex",
                marginLeft: "auto",
                fontSize: 15,
                fontFamily: MONO,
                fontWeight: 500,
                letterSpacing: "0.06em",
                color: C.tagAmberInk,
                background: C.tagAmberBg,
                padding: "6px 12px",
                borderRadius: 7,
              }}
            >
              notion-version 2026-03-11
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size, fonts }
  );
}
