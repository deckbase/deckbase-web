import { JsonLdScript } from "@/components/seo/JsonLdScript";
import { breadcrumbSchema } from "@/lib/seo-schema";
import { absoluteUrl } from "@/lib/site-url";

export const metadata = {
  title: "What's New — Updates & Changelog",
  description:
    "Latest Deckbase updates: new features, AI improvements, and product news. Stay informed about the future of flashcard learning.",
  openGraph: {
    title: "What's New — Deckbase Updates",
    description: "Latest Deckbase features and product updates.",
    url: absoluteUrl("/updates"),
  },
  alternates: { canonical: absoluteUrl("/updates") },
};

export default function UpdatesLayout({ children }) {
  return (
    <>
      <JsonLdScript
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Updates", path: "/updates" },
        ])}
      />
      {children}
    </>
  );
}
