import DocsIndexClient from "./DocsIndexClient";
import { JsonLdScript } from "@/components/seo/JsonLdScript";
import { breadcrumbSchema } from "@/lib/seo-schema";
import { absoluteUrl } from "@/lib/site-url";

export const metadata = {
  title: "Documentation",
  description:
    "Technical documentation for Deckbase: integrations, APIs, and guides (MCP, developer setup).",
  alternates: { canonical: "/docs" },
  openGraph: {
    title: "Deckbase Documentation",
    description:
      "Technical documentation for Deckbase: integrations, APIs, and guides.",
    url: absoluteUrl("/docs"),
    siteName: "Deckbase",
  },
};

export default function DocsPage() {
  const breadcrumbLd = breadcrumbSchema([
    { name: "Home", path: "/" },
    { name: "Docs", path: "/docs" },
  ]);
  return (
    <>
      <JsonLdScript data={breadcrumbLd} />
      <DocsIndexClient />
    </>
  );
}
