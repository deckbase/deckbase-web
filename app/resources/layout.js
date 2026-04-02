import ResourcesLayoutClient from "@/components/resources/ResourcesLayoutClient";
import { absoluteUrl } from "@/lib/site-url";

export const metadata = {
  title: "Resources — FSRS, MCP, and Flashcard Workflows | Deckbase",
  description:
    "Deckbase resources: practical guides on FSRS, MCP workflows, OCR study pipelines, and Anki-friendly migration for long-term retention.",
  alternates: { canonical: "/resources" },
  openGraph: {
    title: "Deckbase Resources",
    description:
      "Guides and articles on FSRS, MCP automation, OCR workflows, and practical flashcard study systems.",
    url: absoluteUrl("/resources"),
    siteName: "Deckbase",
  },
};

export default function ResourcesSectionLayout({ children }) {
  return <ResourcesLayoutClient>{children}</ResourcesLayoutClient>;
}
