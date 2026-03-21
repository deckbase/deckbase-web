import { JsonLdScript } from "@/components/seo/JsonLdScript";
import { breadcrumbSchema, marketingFaqPageSchema } from "@/lib/seo-schema";
import { absoluteUrl } from "@/lib/site-url";

export const metadata = {
  title: "About Deckbase — Our Story, Mission & Values",
  description:
    "Learn about Deckbase: AI-powered flashcards and spaced repetition to turn what you read into lasting knowledge. Our story, mission, and values.",
  openGraph: {
    title: "About Deckbase — Our Story & Mission",
    description:
      "Learn about Deckbase: AI-powered flashcards and spaced repetition for lasting knowledge.",
    url: absoluteUrl("/about-us"),
  },
  alternates: { canonical: absoluteUrl("/about-us") },
};

export default function AboutLayout({ children }) {
  return (
    <>
      <JsonLdScript data={marketingFaqPageSchema()} />
      <JsonLdScript
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "About", path: "/about-us" },
        ])}
      />
      {children}
    </>
  );
}
