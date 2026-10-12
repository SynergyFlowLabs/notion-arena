import { OgImage } from "@/lib/og";

export const alt = "Notion Arena changelog — new components, features, fixes, and agent updates.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return OgImage({
    eyebrow: "changelog",
    illustration: "changelog-illustration.png",
    title: ["What's new in", "Notion Arena."],
    subhead:
      "New components, new channels, new agent tools — every release, in order.",
    chip: "release notes",
  });
}
