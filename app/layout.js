import "./globals.css";
import LayoutClient from "@/components/LayoutClient";

// ✅ Export metadata for SEO - this runs on the server
export const metadata = {
  title: "Deckbase — Scan. Build. Remember.",
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
  metadataBase: new URL("https://deckbase.co"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Deckbase — Scan. Build. Remember.",
    description:
      "Scan books into flashcards with AI. Study smarter with spaced repetition and remember more of what you read.",
    url: "https://deckbase.co",
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

// ✅ Structured data for Google rich results
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Deckbase",
  applicationCategory: "EducationalApplication",
  operatingSystem: "Android, iOS",
  url: "https://deckbase.co",
  description:
    "Scan books into flashcards with AI. Study smarter with spaced repetition and remember more of what you read.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.8",
    ratingCount: "500",
  },
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
