import { ImageResponse } from "next/og";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { STATS } from "@/lib/catalog";

export const OG_SIZE = { width: 1200, height: 630 } as const;
export const OG_CONTENT_TYPE = "image/png";

// Palette — mirrors app/globals.css light tokens (light-mode only as requested).
const C = {
  paper: "#f6f5f4",
  card: "#ffffff",
  ink: "#0d0d0c",
  inkSoft: "#5f5e5a",
  inkFaint: "#717069",
  line: "#e6e4df",
  accent: "#0d0d0c",
  tagBg: "#ffffff",
  tagBorder: "#dedbd4",
};

const MONO = "IBM Plex Mono";
const SANS = "Inter";

function loadFont(name: "Inter" | "IBM Plex Mono", file: string, weight: 400 | 500 | 700) {
  return {
    name,
    data: readFileSync(join(process.cwd(), "fonts", file)),
    weight,
    style: "normal" as const,
  };
}

const FONTS = [
  loadFont("Inter", "Inter-700.woff", 700),
  loadFont("Inter", "Inter-400.woff", 400),
  loadFont("IBM Plex Mono", "IBMPlexMono-500.woff", 500),
];

/**
 * Read an illustration PNG from public/og and return a data URL suitable for
 * use inside satori <img>.
 */
function illustrationDataUrl(filename: string): string {
  const abs = join(process.cwd(), "public", "og", filename);
  const buf = readFileSync(abs);
  return `data:image/png;base64,${buf.toString("base64")}`;
}

/**
 * Shared light-mode OG layout:
 *  - paper background
 *  - brand row (logo + Notion Arena + mono chip)
 *  - eyebrow / kicker in mono
 *  - big two-line title
 *  - short subhead
 *  - B&W illustration on the right edge, with the generated PNG covering the
 *    right ~55% of the frame (left side intentionally blank for copy)
 *  - bottom hairline + counts footer
 */
export function OgImage({
  eyebrow,
  title,
  titleAccent,
  subhead,
  chip,
  illustration,
}: {
  eyebrow?: string;
  title: [string] | [string, string];
  titleAccent?: string; // optional highlighted line appended after title
  subhead?: string;
  chip?: string;
  illustration?: string; // filename in public/og
}) {
  const illo = illustration ? illustrationDataUrl(illustration) : null;

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
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* right-side illustration — absolutely positioned so it can sit
            behind the copy, anchored to the right edge. object-contain keeps
            every stroke intact (no cropped feet or table legs). */}
        {illo && (
          <div
            style={{
              position: "absolute",
              right: 20,
              top: 0,
              width: 660,
              height: 630,
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
            }}
          >
            <img
              src={illo}
              width={660}
              height={560}
              style={{
                width: 660,
                height: 560,
                objectFit: "contain",
                objectPosition: "right center",
              }}
            />
          </div>
        )}
        {/* Soft fade into paper at the left edge of the illustration zone, so
            long titles never crash into the drawing. */}
        {illo && (
          <div
            style={{
              position: "absolute",
              left: 420,
              top: 0,
              width: 180,
              height: 630,
              background:
                "linear-gradient(to right, " + C.paper + " 0%, rgba(246,245,244,0.55) 60%, rgba(246,245,244,0) 100%)",
            }}
          />
        )}

        {/* brand row */}
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
            Notion Arena
          </div>

          <div style={{ display: "flex", marginLeft: "auto" }}>
            <div
              style={{
                display: "flex",
                padding: "7px 13px",
                borderRadius: 7,
                border: `1px solid ${C.tagBorder}`,
                background: C.tagBg,
                color: C.ink,
                fontFamily: MONO,
                fontSize: 15,
                fontWeight: 500,
                letterSpacing: "0.06em",
              }}
            >
              {chip ?? `components/${STATS.total}`}
            </div>
          </div>
        </div>

        {/* eyebrow */}
        {eyebrow && (
          <div
            style={{
              display: "flex",
              marginTop: 40,
              fontFamily: MONO,
              fontSize: 16,
              fontWeight: 500,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: C.inkFaint,
            }}
          >
            {eyebrow}
          </div>
        )}

        {/* headline */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: eyebrow ? 14 : 40,
            fontSize: title.length > 1 ? 62 : 72,
            fontWeight: 700,
            lineHeight: 1.05,
            letterSpacing: "-0.035em",
            maxWidth: 720,
          }}
        >
          {title.map((line, i) => (
            <div key={i} style={{ display: "flex" }}>
              {line}
            </div>
          ))}
          {titleAccent && (
            <div
              style={{
                display: "flex",
                color: C.inkSoft,
                fontStyle: "italic",
              }}
            >
              {titleAccent}
            </div>
          )}
        </div>

        {/* subhead */}
        {subhead && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 5,
              marginTop: 22,
              fontSize: 22,
              lineHeight: 1.35,
              color: C.inkSoft,
              maxWidth: 620,
            }}
          >
            <div style={{ display: "flex" }}>{subhead}</div>
          </div>
        )}

        {/* footer: hairline + url */}
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
            <div
              style={{
                display: "flex",
                fontFamily: MONO,
                fontSize: 15,
                fontWeight: 500,
                letterSpacing: "0.02em",
                color: C.inkFaint,
              }}
            >
              notionarena.vercel.app
            </div>
            <div
              style={{
                display: "flex",
                marginLeft: "auto",
                fontFamily: MONO,
                fontSize: 13,
                fontWeight: 500,
                letterSpacing: "0.08em",
                color: C.inkFaint,
              }}
            >
              NOTION ARENA
            </div>
          </div>
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts: FONTS }
  );
}
