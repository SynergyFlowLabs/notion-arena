import { OgImage } from "@/lib/og";

export const alt = "MCP server reference — installation, tools, environment variables, and safety notes for notion-arena-mcp.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return OgImage({
    eyebrow: "docs · MCP server",
    illustration: "mcp-illustration.png",
    title: ["MCP server", "reference."],
    subhead:
      "Install, configure, and use the ten tools — plan-before-you-install, dry runs, and host pinning included.",
    chip: "/docs/mcp",
  });
}
