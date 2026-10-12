import { OgImage } from "@/lib/og";

export const alt = "Authoring a recipe — turn a database system into a shippable install plan with dry runs, token handling, and manual steps.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return OgImage({
    eyebrow: "docs · authoring recipes",
    illustration: "docs-illustration.png",
    title: ["Authoring a", "recipe."],
    subhead:
      "Turn a database system into a shippable install plan with dry-runs, explicit manual steps, and safe token handling.",
    chip: "/docs/recipes",
  });
}
