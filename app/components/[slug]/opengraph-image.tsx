import { OgImage } from "@/lib/og";

export const alt = "A Notion Arena component — preview, configuration, and install in one page.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return OgImage({
    eyebrow: "component",
    illustration: "components-illustration.png",
    title: ["Tweak it.", "Paste it into Notion."],
    subhead:
      "Every component page shows the live preview, every param, and three install paths side-by-side.",
    chip: "live preview",
  });
}
