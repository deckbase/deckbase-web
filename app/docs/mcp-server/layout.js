import { JsonLdScript } from "@/components/seo/JsonLdScript";
import { breadcrumbSchema } from "@/lib/seo-schema";
import { absoluteUrl } from "@/lib/site-url";

export const metadata = {
  title: "MCP Server",
  description:
    "Deckbase Model Context Protocol (MCP) server: endpoints, tools, and resources for Cursor, VS Code, and Claude Code.",
  alternates: { canonical: "/docs/mcp-server" },
  openGraph: {
    title: "Deckbase MCP Server",
    description:
      "Model Context Protocol server for Deckbase — connect AI tools to your decks and cards.",
    url: absoluteUrl("/docs/mcp-server"),
    siteName: "Deckbase",
  },
};

export default function McpServerDocLayout({ children }) {
  const breadcrumbLd = breadcrumbSchema([
    { name: "Home", path: "/" },
    { name: "Docs", path: "/docs" },
    { name: "MCP Server", path: "/docs/mcp-server" },
  ]);
  return (
    <>
      <JsonLdScript data={breadcrumbLd} />
      {children}
    </>
  );
}
