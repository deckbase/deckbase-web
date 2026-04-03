import { JsonLdScript } from "@/components/seo/JsonLdScript";
import { breadcrumbSchema } from "@/lib/seo-schema";
import { absoluteUrl } from "@/lib/site-url";

export const metadata = {
  title: "Flashcard MCP Server — Deckbase Model Context Protocol",
  description:
    "Deckbase MCP server for flashcards: connect Cursor, Claude Code, and VS Code to create and sync decks and cards via hosted /api/mcp.",
  keywords: [
    "flashcard mcp",
    "mcp flashcards",
    "model context protocol flashcards",
    "deckbase mcp",
    "ai flashcard mcp server",
  ],
  alternates: { canonical: "/mcp" },
  openGraph: {
    title: "Deckbase Flashcard MCP Server",
    description:
      "Set up Deckbase MCP to manage flashcard decks and cards from AI tools with synced web and mobile study workflows.",
    url: absoluteUrl("/mcp"),
    siteName: "Deckbase",
  },
};

export default function McpMarketingLayout({ children }) {
  return (
    <>
      <JsonLdScript
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "MCP", path: "/mcp" },
        ])}
      />
      {children}
    </>
  );
}
