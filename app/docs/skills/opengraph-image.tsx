import { OgImage } from "@/lib/og";

export const alt = "Agent skill reference — what SKILL.md teaches your coding agent about Notion Arena, how to install it, and how to pair it with the MCP server.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return OgImage({
    eyebrow: "docs · agent skill",
    illustration: "skills-illustration.png",
    title: ["Agent skill", "reference."],
    subhead:
      "Install via the skills CLI or by hand, then let it steer channel choice, safety, and install plans.",
    chip: "/docs/skills",
  });
}
