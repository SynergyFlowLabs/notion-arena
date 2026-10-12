import { OgImage } from "@/lib/og";

export const alt = "Notion Arena Privacy Policy — what we collect, what we don't, and why you always own the HTML you download.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return OgImage({
    eyebrow: "legal · privacy",
    illustration: "docs-illustration.png",
    title: ["Privacy policy."],
    subhead:
      "What we collect, what we don't, and why you always own the HTML you download from Notion Arena.",
    chip: "legal / privacy",
  });
}
