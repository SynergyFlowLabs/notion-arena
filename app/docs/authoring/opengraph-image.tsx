import { OgImage } from "@/lib/og";

export const alt = "Authoring a widget — build a self-contained HTML file, register it in the catalog, and ship it through all three delivery channels.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return OgImage({
    eyebrow: "docs · authoring widgets",
    illustration: "docs-illustration.png",
    title: ["Authoring a", "widget."],
    subhead:
      "Build a self-contained HTML file, register it in the catalog, and ship it through embed, HTML block, and download.",
    chip: "/docs/authoring",
  });
}
