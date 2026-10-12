import { OgImage } from "@/lib/og";

export const alt = "The HTML block sandbox — what widgets can and cannot do inside an iframe or an uploaded HTML block.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return OgImage({
    eyebrow: "docs · html block sandbox",
    illustration: "docs-illustration.png",
    title: ["The HTML block", "sandbox."],
    subhead:
      "Network, storage, scripting, sizing, and escape hatches — verified against Notion's block reference.",
    chip: "/docs/sandbox",
  });
}
