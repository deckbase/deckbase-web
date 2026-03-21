import { JsonLdScript } from "@/components/seo/JsonLdScript";
import { breadcrumbSchema } from "@/lib/seo-schema";
import { absoluteUrl } from "@/lib/site-url";

export const metadata = {
  title: "MCP — Connect AI tools to Deckbase",
  description:
    "Connect Cursor, Claude Code, VS Code, and other tools to Deckbase via the Model Context Protocol (MCP).",
  alternates: { canonical: "/mcp" },
  openGraph: {
    title: "Deckbase MCP",
    description: "Model Context Protocol setup for Deckbase.",
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
