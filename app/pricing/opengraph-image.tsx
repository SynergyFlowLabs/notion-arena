import { OgImage } from "@/lib/og";

export const alt = "Notion Arena pricing — 132 free widgets under MIT, Pro for premium templates and native recipes.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return OgImage({
    eyebrow: "pricing",
    illustration: "pricing-illustration.png",
    title: ["132 free.", "Pro for more."],
    subhead:
      "Every widget and every embed is free under MIT. Pro unlocks premium templates, native recipes and business-grade support.",
    chip: "free · pro",
  });
}
