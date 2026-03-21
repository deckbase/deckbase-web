import { JsonLdScript } from "@/components/seo/JsonLdScript";
import { breadcrumbSchema } from "@/lib/seo-schema";
import { absoluteUrl } from "@/lib/site-url";

export const metadata = {
  title: "Terms and Conditions",
  description:
    "Deckbase terms and conditions: terms of use, acceptable use, and legal information for using our flashcard platform.",
  openGraph: {
    title: "Terms and Conditions — Deckbase",
    description: "Terms of use and legal information for Deckbase.",
    url: absoluteUrl("/terms-and-conditions"),
  },
  alternates: { canonical: absoluteUrl("/terms-and-conditions") },
  robots: { index: true, follow: true },
};

export default function TermsLayout({ children }) {
  return (
    <>
      <JsonLdScript
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Terms & Conditions", path: "/terms-and-conditions" },
        ])}
      />
      {children}
    </>
  );
}
