import { OgImage } from "@/lib/og";

export const alt = "How Notion Arena components actually get into Notion — embed URLs, HTML blocks, and native recipes, including exactly where each one breaks.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return OgImage({
    eyebrow: "how it works",
    illustration: "how-illustration.png",
    title: ["Three ways in.", "One page."],
    subhead:
      "Embed URLs for speed, HTML blocks for offline templates, native recipes for real workspace data.",
    chip: "delivery channels",
  });
}
