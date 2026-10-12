import { OgImage } from "@/lib/og";

export const alt = "The Notion Arena MCP server — ten tools that let Claude Code, Cursor, or any MCP client browse, configure, and install Notion components from inside the chat.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return OgImage({
    eyebrow: "for AI agents",
    illustration: "mcp-illustration.png",
    title: ["An MCP server that", "knows every component."],
    subhead:
      "Ten read-by-default tools over stdio — browse, search, configure, and plan installs without leaving the chat.",
    chip: "npx notion-arena-mcp",
  });
}
