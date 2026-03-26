import { JsonLdScript } from "@/components/seo/JsonLdScript";
import { breadcrumbSchema, marketingFaqPageSchema } from "@/lib/seo-schema";
import { absoluteUrl } from "@/lib/site-url";

export const metadata = {
  title: "Features — AI Flashcards, Spaced Repetition & More",
  description:
    "Explore Deckbase features: AI card creation, spaced repetition, CSV/Excel/Anki import, template-based cards, cross-device sync, and MCP/API workflows.",
  openGraph: {
    title: "Deckbase Features — AI Flashcards & Spaced Repetition",
    description:
      "AI card creation, spaced repetition, structured templates, import workflows, and cross-device learning with Deckbase.",
    url: absoluteUrl("/features"),
  },
  alternates: { canonical: absoluteUrl("/features") },
};

export default function FeaturesLayout({ children }) {
  return (
    <>
      <JsonLdScript data={marketingFaqPageSchema()} />
      <JsonLdScript
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Features", path: "/features" },
        ])}
      />
      {children}
    </>
  );
}
