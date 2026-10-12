import { OgImage } from "@/lib/og";

export const alt = "Notion Arena documentation — embed URLs, the HTML block sandbox, the Notion API, authoring widgets and native recipes.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return OgImage({
    eyebrow: "documentation",
    illustration: "docs-illustration.png",
    title: ["Everything you need", "to ship in Notion."],
    subhead:
      "Embed URLs, the HTML-block sandbox, the Notion API limits, authoring widgets, writing recipes, and integrating with agents.",
    chip: "reference · guides",
  });
}
