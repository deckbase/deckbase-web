import { JsonLdScript } from "@/components/seo/JsonLdScript";
import { breadcrumbSchema, faqPageSchemaFromItems } from "@/lib/seo-schema";
import { downloadFaqItems } from "@/lib/download-faq";
import { absoluteUrl } from "@/lib/site-url";

export const metadata = {
  title: "Download Deckbase — iOS & Android | Scan. Build. Remember.",
  description:
    "Download Deckbase for iPhone and Android. Turn books and PDFs into AI flashcards with spaced repetition. Free to start.",
  openGraph: {
    title: "Download Deckbase — iOS & Android",
    description:
      "Download Deckbase for iPhone and Android. Turn books and PDFs into AI flashcards with spaced repetition.",
    url: absoluteUrl("/download"),
  },
  alternates: { canonical: absoluteUrl("/download") },
};

export default function DownloadLayout({ children }) {
  return (
    <>
      <JsonLdScript
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Download", path: "/download" },
        ])}
      />
      <JsonLdScript data={faqPageSchemaFromItems(downloadFaqItems)} />
      {children}
    </>
  );
}
