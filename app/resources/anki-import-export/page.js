import Link from "next/link";
import { defaultLanguageAlternates } from "@/lib/language-alternates";
import { absoluteUrl } from "@/lib/site-url";
import {
  ArticleShell,
  ArticleBreadcrumb,
  ArticleHeader,
  ArticleSection,
  ArticleH2,
  ArticleBody,
  ArticleSteps,
  ArticleFaq,
  ArticleRelated,
  ArticleFooter,
  Code,
} from "@/components/resources/ArticleLayout";

const PAGE_PATH = "/resources/anki-import-export";
const pageUrl = absoluteUrl(PAGE_PATH);
const homeUrl = absoluteUrl("/");
const publishedAt = "2026-03-27";
const updatedAt = "2026-03-27";
const orgId = `${homeUrl}/#organization`;
const authorId = `${homeUrl}/#deckbase-editorial`;

export const metadata = {
  title: "Deckbase and Anki Import/Export Guide: Migrate Without Losing Momentum",
  description:
    "Step-by-step migration guide for Anki and Deckbase: importing .apkg decks, preserving study flow, and using AI generation without breaking your review habit.",
  keywords: [
    "anki import deckbase",
    "deckbase export anki",
    "apkg import guide",
    "migrate from anki",
    "flashcard migration workflow",
  ],
  alternates: defaultLanguageAlternates(PAGE_PATH),
  openGraph: {
    title: "Deckbase and Anki Import/Export Guide",
    description:
      "Practical migration workflow: import existing decks, clean templates, and keep your study streak.",
    url: pageUrl,
    siteName: "Deckbase",
    images: [{ url: "/app_logo.webp", width: 512, height: 512, alt: "Deckbase Anki import export guide" }],
    locale: "en_US",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Deckbase and Anki Import/Export Guide",
    description: "How to move between Anki and Deckbase while preserving your study system.",
    site: "@DeckbaseApp",
    images: ["/app_logo.webp"],
  },
  robots: { index: true, follow: true },
};

const faqs = [
  {
    q: "Can I move my Anki decks to Deckbase?",
    a: "Yes. Deckbase supports .apkg import, so you can bring existing decks into a mobile-first workflow and continue reviewing.",
  },
  {
    q: "Will imported cards need cleanup?",
    a: "Usually some light cleanup helps: normalize field names, remove duplicates, and ensure prompt-answer clarity for better FSRS results.",
  },
  {
    q: "Can I still use both apps?",
    a: "Yes. Many learners keep legacy decks in Anki while creating new AI-assisted decks in Deckbase, then gradually consolidate.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": `${pageUrl}#webpage`,
      url: pageUrl,
      name: "Deckbase and Anki Import/Export Guide",
      description:
        "Migration guide for Anki and Deckbase with practical steps and common pitfalls.",
      datePublished: publishedAt,
      dateModified: updatedAt,
      isPartOf: { "@type": "WebSite", name: "Deckbase", url: homeUrl },
      breadcrumb: {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: homeUrl },
          { "@type": "ListItem", position: 2, name: "Resources", item: absoluteUrl("/resources") },
          { "@type": "ListItem", position: 3, name: "Anki import/export", item: pageUrl },
        ],
      },
    },
    {
      "@type": "Article",
      "@id": `${pageUrl}#article`,
      mainEntityOfPage: { "@id": `${pageUrl}#webpage` },
      headline: "Deckbase and Anki Import/Export Guide",
      description:
        "How to migrate decks between Anki and Deckbase without losing your study momentum.",
      author: { "@id": authorId },
      publisher: { "@id": orgId },
      datePublished: publishedAt,
      dateModified: updatedAt,
      image: absoluteUrl("/app_logo.webp"),
      about: ["Anki", "Deck migration", "Flashcards"],
    },
    {
      "@type": "FAQPage",
      mainEntity: faqs.map(({ q, a }) => ({
        "@type": "Question",
        name: q,
        acceptedAnswer: { "@type": "Answer", text: a },
      })),
    },
  ],
};

export default function AnkiImportExportPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ArticleShell>
        <ArticleBreadcrumb
          crumbs={[
            { label: "Home", href: "/" },
            { label: "Resources", href: "/resources" },
            { label: "Anki import/export" },
          ]}
        />
        <ArticleHeader
          kicker="Guide · Resources"
          title="Deckbase and Anki import/export: a practical migration workflow"
          lead="Move your decks without breaking your study habit. This guide covers .apkg import, cleanup, and a gradual transition plan."
          author="Deckbase Editorial Team"
          readTime="5 min read"
        />

        <ArticleSection id="quick-answer">
          <ArticleH2>Quick answer</ArticleH2>
          <ArticleBody>
            Yes, you can import existing Anki decks into Deckbase using <Code>.apkg</Code>. The
            best migration strategy is incremental: keep your highest-value legacy decks, start new
            content in Deckbase, and clean imported cards for better recall quality.
          </ArticleBody>
        </ArticleSection>

        <ArticleSection id="steps">
          <ArticleH2>Recommended migration steps</ArticleH2>
          <ArticleSteps
            items={[
              "Export your source deck from Anki as .apkg and keep a backup copy first.",
              "Import into Deckbase and verify deck structure, fields, and obvious formatting issues.",
              "Normalize card wording (one idea per card), remove duplicates, and simplify long prompts.",
              "Resume daily reviews immediately to preserve momentum; avoid waiting for perfect cleanup.",
              "Create new cards in Deckbase from PDFs/notes and let old decks phase out naturally.",
            ]}
          />
        </ArticleSection>

        <ArticleSection id="common-pitfalls">
          <ArticleH2>Common pitfalls to avoid</ArticleH2>
          <ArticleBody>
            The largest migration risk is over-editing before review restarts. If you spend a week
            cleaning cards without reviewing, retention drops. Start reviews first, then improve
            cards in small batches.
          </ArticleBody>
          <ArticleBody>
            Also avoid mixing template structures blindly. If you use MCP to create new cards, check
            template block IDs with <Code>get_template_schema</Code> before batch creation.
          </ArticleBody>
        </ArticleSection>

        <ArticleSection id="faq">
          <ArticleH2>FAQ</ArticleH2>
          <ArticleFaq items={faqs} />
        </ArticleSection>

        <ArticleSection id="related">
          <ArticleH2>Related resources</ArticleH2>
          <ArticleRelated
            links={[
              { href: "/deckbase-vs-anki", label: "Deckbase vs Anki comparison" },
              { href: "/resources/fsrs-guide", label: "FSRS practical guide" },
              { href: "/resources/mcp", label: "Deckbase MCP for flashcards" },
            ]}
          />
        </ArticleSection>

        <ArticleFooter>
          Last updated March 2026. For setup and account details, see{" "}
          <Link href="/premium" className="text-accent hover:underline underline-offset-2">
            premium
          </Link>{" "}
          and{" "}
          <Link href="/docs" className="text-accent hover:underline underline-offset-2">
            docs
          </Link>
          .
        </ArticleFooter>
      </ArticleShell>
    </>
  );
}
