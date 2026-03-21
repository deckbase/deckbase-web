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
  /** Thin placeholder page — remove when there is a real public changelog. */
  robots: { index: false, follow: true },
};

export default function UpdatesLayout({ children }) {
  return children;
}
