import { OgImage } from "@/lib/og";

export const alt = "Browse 143 Notion components — widgets, dashboards, and native database recipes.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return OgImage({
    eyebrow: "the catalog",
    illustration: "components-illustration.png",
    title: ["Pick a component.", "Drop it in Notion."],
    subhead:
      "Browse widgets and recipes by category, then copy an embed URL or install through the API.",
    chip: "all components",
  });
}
