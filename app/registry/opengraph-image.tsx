import { OgImage } from "@/lib/og";

export const alt = "The Notion Arena registry — shadcn-compatible JSON an agent or script can read to discover components, inspect parameters, and pull raw file contents.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return OgImage({
    eyebrow: "machine-readable",
    illustration: "registry-illustration.png",
    title: ["A registry an", "agent can read."],
    subhead:
      "Every component published as shadcn-compatible JSON — discover, inspect params, and pull file contents without scraping.",
    chip: "/r/{name}.json",
  });
}
