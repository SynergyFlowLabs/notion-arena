import { OgImage } from "@/lib/og";

export const alt = "Components in a category — Notion Arena.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return OgImage({
    eyebrow: "category",
    illustration: "components-illustration.png",
    title: ["Filtered to just", "the ones you need."],
    subhead:
      "Browse widgets and recipes in one category, then copy an embed URL or install through the API.",
    chip: "by category",
  });
}
