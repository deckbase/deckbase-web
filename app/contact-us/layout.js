import { JsonLdScript } from "@/components/seo/JsonLdScript";
import { breadcrumbSchema } from "@/lib/seo-schema";
import { absoluteUrl } from "@/lib/site-url";

export const metadata = {
  title: "Contact Us — Support & Inquiries",
  description:
    "Contact Deckbase for support, feature requests, partnerships, or general inquiries. We're here to help.",
  openGraph: {
    title: "Contact Deckbase — Support & Inquiries",
    description: "Get in touch with Deckbase for support, partnerships, or questions.",
    url: absoluteUrl("/contact-us"),
  },
  alternates: { canonical: absoluteUrl("/contact-us") },
};

export default function ContactLayout({ children }) {
  return (
    <>
      <JsonLdScript
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Contact", path: "/contact-us" },
        ])}
      />
      {children}
    </>
  );
}
