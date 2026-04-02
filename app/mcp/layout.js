import { JsonLdScript } from "@/components/seo/JsonLdScript";
import { breadcrumbSchema } from "@/lib/seo-schema";
import { absoluteUrl } from "@/lib/site-url";

export const metadata = {
  title: "MCP — AI Flashcards via Model Context Protocol | Deckbase",
  description:
    "Connect Cursor, Claude Code, and VS Code to Deckbase via MCP. Use hosted /api/mcp with OAuth or API key to create and sync decks and cards.",
  alternates: { canonical: "/mcp" },
  openGraph: {
    title: "Deckbase MCP — Flashcards for AI tools",
    description:
      "Model Context Protocol setup: manage Deckbase decks and cards from your editor; same library on web and mobile.",
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
