import { OgImage } from "@/lib/og";

export const alt = "Teach your coding agent Notion Arena in one SKILL.md — the honesty policy, the three-channel decision table, the widget sandbox rules, and the install flows.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return OgImage({
    eyebrow: "for AI agents",
    illustration: "skills-illustration.png",
    title: ["A SKILL.md that", "teaches your agent."],
    subhead:
      "One Markdown file: the honesty policy, the three-channel rule, the sandbox contract, and plan-before-you-install.",
    chip: "agent skill",
  });
}
