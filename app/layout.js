import "./globals.css";
import { Inter } from "next/font/google";
import { GoogleAnalytics } from "@next/third-parties/google";
import LayoutClient from "@/components/LayoutClient";
import { SITE_URL, absoluteUrl } from "@/lib/site-url";

const gaMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-inter",
});

const firebaseAuthRaw = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN?.trim();
const firebaseAuthOrigin = firebaseAuthRaw
  ? firebaseAuthRaw.startsWith("http://") || firebaseAuthRaw.startsWith("https://")
    ? firebaseAuthRaw
    : `https://${firebaseAuthRaw}`
  : null;

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// ✅ Export metadata for SEO - this runs on the server
export const metadata = {
  title: {
    default: "Deckbase — AI flashcards from notes, PDFs, and articles",
    template: "%s | Deckbase",
  },
  description:
    "Deckbase turns notes, PDFs, and articles into study-ready flashcards in seconds. Generate cards with AI, retain more with spaced repetition, automate workflows with MCP, and move easily with Anki-friendly import/export.",
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
    title: "Deckbase — AI flashcards from notes, PDFs, and articles",
    description:
      "Deckbase turns notes, PDFs, and articles into study-ready flashcards in seconds. Generate cards with AI, retain more with spaced repetition, and use Anki-friendly import/export.",
    url: SITE_URL,
    siteName: "Deckbase",
    images: [
      {
        url: "/app_logo.webp",
        width: 512,
        height: 512,
        alt: "Deckbase logo",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Deckbase — AI flashcards from notes, PDFs, and articles",
    description:
      "Deckbase turns notes, PDFs, and articles into study-ready flashcards in seconds. Generate with AI and retain more with spaced repetition.",
    site: "@DeckbaseApp",
    images: ["/app_logo.webp"],
  },
  icons: {
    icon: [
      { url: "/app_logo.webp", type: "image/webp", sizes: "512x512" },
    ],
    apple: [{ url: "/app_logo.webp", sizes: "512x512", type: "image/webp" }],
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
const founderId = `${SITE_URL}/#founder`;
const founderName = process.env.NEXT_PUBLIC_FOUNDER_NAME?.trim();
const founderUrl = process.env.NEXT_PUBLIC_FOUNDER_URL?.trim();
const founderSameAs = process.env.NEXT_PUBLIC_FOUNDER_SAME_AS?.split(",")
  .map((url) => url.trim())
  .filter(Boolean);
const hasFounder = Boolean(founderName);

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
        "Deckbase turns notes, PDFs, and articles into study-ready flashcards in seconds with AI, spaced repetition, MCP workflows, and Anki-friendly import/export.",
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
        email: "hello@deckbase.co",
        contactType: "customer support",
      },
      ...(hasFounder ? { founder: { "@id": founderId } } : {}),
    },
    ...(hasFounder
      ? [
          {
            "@type": "Person",
            "@id": founderId,
            name: founderName,
            ...(founderUrl ? { url: founderUrl } : {}),
            ...(founderSameAs?.length ? { sameAs: founderSameAs } : {}),
            worksFor: { "@id": orgId },
          },
        ]
      : []),
    {
      "@type": "WebSite",
      name: "Deckbase",
      url: SITE_URL,
      description:
        "AI flashcards from notes, PDFs, and articles with spaced repetition and Anki-friendly import/export.",
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
    <html lang="en" className="overflow-x-hidden">
      <head>
        <link rel="preconnect" href="https://identitytoolkit.googleapis.com" />
        <link rel="preconnect" href="https://firestore.googleapis.com" />
        {firebaseAuthOrigin ? (
          <link rel="preconnect" href={firebaseAuthOrigin} crossOrigin="anonymous" />
        ) : null}
        <link rel="dns-prefetch" href="https://connect.facebook.net" />
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`${inter.variable} ${inter.className} text-gray-900 min-h-screen flex flex-col bg-black overflow-x-hidden`}
        suppressHydrationWarning
      >
        <LayoutClient>{children}</LayoutClient>
        {gaMeasurementId ? (
          <GoogleAnalytics gaId={gaMeasurementId} />
        ) : null}
      </body>
    </html>
  );
}
