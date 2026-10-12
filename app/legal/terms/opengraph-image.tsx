import { OgImage } from "@/lib/og";

export const alt = "Notion Arena Terms of Service — what you can do with components, what we promise, and where MIT and Pro licenses apply.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return OgImage({
    eyebrow: "legal · terms",
    illustration: "docs-illustration.png",
    title: ["Terms of service."],
    subhead:
      "What you can do with components, what we promise, and where the MIT and Pro licenses each apply.",
    chip: "legal / terms",
  });
}
