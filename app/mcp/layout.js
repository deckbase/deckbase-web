import { JsonLdScript } from "@/components/seo/JsonLdScript";
import { breadcrumbSchema } from "@/lib/seo-schema";
import { absoluteUrl } from "@/lib/site-url";

export const metadata = {
  title: "MCP — AI Flashcards via Model Context Protocol | Deckbase",
  description:
    "Connect Cursor, Claude Code, VS Code, and other tools to Deckbase flashcards via the Model Context Protocol (MCP). Hosted POST /api/mcp with OAuth or API key — decks and cards sync to the Deckbase app.",
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
