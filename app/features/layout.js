import { JsonLdScript } from "@/components/seo/JsonLdScript";
import { breadcrumbSchema, marketingFaqPageSchema } from "@/lib/seo-schema";
import { absoluteUrl } from "@/lib/site-url";

export const metadata = {
  title: "Features — AI Flashcards, Spaced Repetition & More",
  description:
    "Explore Deckbase features: AI flashcard generation, spaced repetition, multi-source capture, learning analytics, and deck sharing. Study smarter.",
  openGraph: {
    title: "Deckbase Features — AI Flashcards & Spaced Repetition",
    description:
      "AI flashcard generation, spaced repetition, learning analytics, and more. Study smarter with Deckbase.",
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
