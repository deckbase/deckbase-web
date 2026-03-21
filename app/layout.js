import "./globals.css";
import LayoutClient from "@/components/LayoutClient";
import { SITE_URL, absoluteUrl } from "@/lib/site-url";

// ✅ Export metadata for SEO - this runs on the server
export const metadata = {
  title: {
    default: "Deckbase — Scan. Build. Remember.",
    template: "%s | Deckbase",
  },
  description:
    "Scan books into flashcards with AI. Deckbase turns what you read into lasting knowledge using spaced repetition. Study smarter, remember more.",
  keywords: [
    "flashcards",
    "AI flashcards",
    "spaced repetition",
    "learning app",
    "study tool",
    "memory app",
    "Deckbase",
    "smart learning",
    "PDF to flashcards",
    "book scanner",
    "scan to flashcards",
    "study flashcards",
    "flashcard maker",
    "AI study app",
    "remember more",
    "active recall",
    "learning platform",
  ],
  authors: [{ name: "Deckbase" }],
  creator: "Deckbase",
  publisher: "Deckbase",
  metadataBase: new URL(SITE_URL),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Deckbase — Scan. Build. Remember.",
    description:
      "Scan books into flashcards with AI. Study smarter with spaced repetition and remember more of what you read.",
    url: SITE_URL,
    siteName: "Deckbase",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "Deckbase — Scan. Build. Remember.",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Deckbase — Scan. Build. Remember.",
    description:
      "Scan books into flashcards with AI. Study smarter with spaced repetition and remember more of what you read.",
    site: "@DeckbaseApp",
    images: ["/og.png"],
  },
  icons: {
    icon: [
      { url: "/favicon/favicon.ico" },
      { url: "/favicon/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      {
        url: "/favicon/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        url: "/favicon/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
    apple: [{ url: "/favicon/apple-touch-icon.png", sizes: "180x180" }],
  },
  manifest: "/favicon/site.webmanifest",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

const orgId = `${SITE_URL}/#organization`;

// ✅ Structured data for Google rich results (SoftwareApplication + Organization + WebSite)
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      name: "Deckbase",
      applicationCategory: "EducationalApplication",
      operatingSystem: "Android, iOS",
      url: SITE_URL,
      description:
        "Scan books into flashcards with AI. Study smarter with spaced repetition and remember more of what you read.",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
    },
    {
      "@type": "Organization",
      "@id": orgId,
      name: "Deckbase",
      url: SITE_URL,
      logo: absoluteUrl("/favicon/android-chrome-512x512.png"),
      sameAs: [
        "https://twitter.com/DeckbaseApp",
        "https://apps.apple.com/app/deckbase/id6748827564",
        "https://play.google.com/store/apps/details?id=co.deckbase.app",
      ],
      contactPoint: {
        "@type": "ContactPoint",
        email: "support@deckbase.co",
        contactType: "customer support",
      },
    },
    {
      "@type": "WebSite",
      name: "Deckbase",
      url: SITE_URL,
      description:
        "Scan books into flashcards with AI. Study smarter with spaced repetition.",
      publisher: { "@id": orgId },
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${SITE_URL}/?q={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
    },
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className="text-gray-900 min-h-screen flex flex-col bg-black"
        suppressHydrationWarning
      >
        <LayoutClient>{children}</LayoutClient>
      </body>
    </html>
  );
}
