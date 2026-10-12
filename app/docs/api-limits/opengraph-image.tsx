import { OgImage } from "@/lib/og";

export const alt = "Notion API limits and quotas — rate limits, file upload sizes, pagination, and the Notion-Version header to pin against.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return OgImage({
    eyebrow: "docs · notion api limits",
    illustration: "docs-illustration.png",
    title: ["Notion API", "limits & quotas."],
    subhead:
      "Rate limits, file upload caps, pagination cursors, and the Notion-Version header to pin against.",
    chip: "/docs/api-limits",
  });
}
