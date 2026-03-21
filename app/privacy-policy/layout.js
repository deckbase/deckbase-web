import { JsonLdScript } from "@/components/seo/JsonLdScript";
import { breadcrumbSchema } from "@/lib/seo-schema";
import { absoluteUrl } from "@/lib/site-url";

export const metadata = {
  title: "Privacy Policy",
  description:
    "Deckbase privacy policy: how we collect, use, and protect your data. Your learning data stays private and secure.",
  openGraph: {
    title: "Privacy Policy — Deckbase",
    description: "How Deckbase collects, uses, and protects your data.",
    url: absoluteUrl("/privacy-policy"),
  },
  alternates: { canonical: absoluteUrl("/privacy-policy") },
  robots: { index: true, follow: true },
};

export default function PrivacyLayout({ children }) {
  return (
    <>
      <JsonLdScript
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Privacy Policy", path: "/privacy-policy" },
        ])}
      />
      {children}
    </>
  );
}
