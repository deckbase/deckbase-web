import { JsonLdScript } from "@/components/seo/JsonLdScript";
import { breadcrumbSchema, marketingFaqPageSchema } from "@/lib/seo-schema";
import { absoluteUrl } from "@/lib/site-url";

export const metadata = {
  title: "Deckbase Premium — Unlimited AI & Advanced Learning Tools",
  description:
    "Deckbase Premium: unlimited AI card generation, advanced analytics, priority processing, cross-device sync. Master any subject faster.",
  openGraph: {
    title: "Deckbase Premium — Unlimited AI Learning",
    description:
      "Unlimited AI generation, advanced analytics, and cross-device sync. Unlock Premium.",
    url: absoluteUrl("/premium"),
  },
  alternates: { canonical: absoluteUrl("/premium") },
};

export default function PremiumLayout({ children }) {
  return (
    <>
      <JsonLdScript data={marketingFaqPageSchema()} />
      <JsonLdScript
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Premium", path: "/premium" },
        ])}
      />
      {children}
    </>
  );
}
