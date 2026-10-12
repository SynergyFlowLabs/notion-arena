import { OgImage } from "@/lib/og";

export const alt =
  "Notion Arena — the component registry for Notion. Interactive widgets and native database recipes.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return OgImage({
    illustration: "home-illustration.png",
    title: ["Notion gives you a page", "and a database."],
    titleAccent: "This is the rest.",
    subhead:
      "143 components, installable as embed URLs, HTML blocks, or API recipes.",
    chip: "components/143",
  });
}
