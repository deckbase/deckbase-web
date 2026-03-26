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
  ArticleTable,
  ArticleCardGrid,
  ArticleCard,
  ArticleFaq,
  ArticleCta,
  ArticleRelated,
  ArticleFooter,
  Code,
} from "@/components/resources/ArticleLayout";

const PAGE_PATH = "/anki-alternatives";
const pageUrl = absoluteUrl(PAGE_PATH);
const homeUrl = absoluteUrl("/");

export const metadata = {
  title: "Best Anki Alternatives (2026): AI Flashcards, FSRS & Mobile",
  description:
    "Looking for an Anki alternative? Compare AI flashcard apps with FSRS scheduling, mobile apps, and easy card creation — plus how Deckbase fits med school, languages, and exams.",
  keywords: [
    "anki alternatives",
    "best anki alternative",
    "anki alternative with AI",
    "FSRS flashcard app",
    "anki alternative mobile",
    "spaced repetition app like anki",
  ],
  alternates: defaultLanguageAlternates(PAGE_PATH),
  openGraph: {
    title: "Best Anki Alternatives (2026): AI Flashcards, FSRS & Mobile",
    description:
      "Compare top Anki alternatives: AI card generation, FSRS scheduling, and mobile experience — and where Deckbase fits.",
    url: pageUrl,
    siteName: "Deckbase",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Best Anki Alternatives" }],
    locale: "en_US",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Best Anki Alternatives (2026): AI Flashcards, FSRS & Mobile",
    description: "Compare top Anki alternatives: AI card generation, FSRS scheduling, and mobile experience.",
    site: "@DeckbaseApp",
    images: ["/og.png"],
  },
};

const apps = [
  { name: "Deckbase",  focus: "AI cards, FSRS, mobile-first",          ai: "Built-in",       fsrs: "Yes",                       note: "Best when you want fast creation from books/PDFs and .apkg import." },
  { name: "Anki",     focus: "Power users, add-ons, community decks",  ai: "Via add-ons",    fsrs: "Yes (desktop)",             note: "Best when you want maximum control and free desktop/Android." },
  { name: "Quizlet",  focus: "Study sets, classroom",                  ai: "Limited",        fsrs: "Not traditional FSRS-style", note: "Best for simple sets; see Deckbase vs Quizlet for spaced repetition differences." },
  { name: "RemNote",  focus: "Notes + flashcards",                     ai: "Varies",         fsrs: "SRS-style scheduling",      note: "Best when you want documents and cards in one system." },
];

const faqs = [
  { q: "What is the best Anki alternative for AI flashcards?", a: "If you want AI-generated cards from books, PDFs, and notes with FSRS scheduling, Deckbase is built for that workflow. Anki remains the standard for manual card creation and deep customization. Choose based on whether you prioritize speed of card creation or maximum control." },
  { q: "Do Anki alternatives use FSRS?", a: "Many modern spaced repetition apps support FSRS or similar algorithms. Deckbase uses FSRS-based scheduling. Anki added FSRS in recent versions; check each app's docs for the exact scheduler." },
  { q: "Can I move my Anki decks to another app?", a: "Deckbase supports importing Anki .apkg files so you can migrate existing decks. Other apps vary; verify import options before switching." },
  { q: "Is Anki still worth using in 2026?", a: "Yes, for users who want free desktop use, add-ons, and fine-grained control. If you mostly study on mobile and want faster card creation, a modern alternative may save time." },
  { q: "How does Deckbase compare to Anki?", a: "Deckbase emphasizes AI card generation and a streamlined mobile experience with FSRS. Anki offers unmatched customization and community decks. See the dedicated Deckbase vs Anki comparison for a feature-by-feature table." },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": pageUrl,
      url: pageUrl,
      name: "Best Anki Alternatives (2026): AI Flashcards, FSRS & Mobile",
      description: "Guide to Anki alternatives: AI flashcards, FSRS scheduling, mobile apps, and how Deckbase compares.",
      breadcrumb: {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: homeUrl },
          { "@type": "ListItem", position: 2, name: "Anki alternatives", item: pageUrl },
        ],
      },
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

export default function AnkiAlternativesPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <ArticleShell>
        <ArticleBreadcrumb
          crumbs={[
            { label: "Home", href: "/" },
            { label: "Resources", href: "/resources" },
            { label: "Anki alternatives" },
          ]}
        />

        <ArticleHeader
          kicker="Guide · Updated March 2026"
          title="Best Anki alternatives (2026)"
          lead="Anki set the bar for spaced repetition. These apps pick up where Anki leaves off — faster card creation, modern mobile apps, and FSRS-style scheduling without a week of setup."
          readTime="6 min read"
        />

        <ArticleSection id="who-looks">
          <ArticleH2>Who usually looks for an Anki alternative?</ArticleH2>
          <ArticleCardGrid cols={1}>
            {[
              { label: "Med students & heavy memorization", body: "You want FSRS-level scheduling but less friction creating cards from dense material." },
              { label: "Language learners", body: "You want audio-friendly review and quick card generation from reading material — not only manual typing." },
              { label: "Mobile-first learners", body: "You rarely open a desktop app and need a polished iOS/Android experience out of the box." },
            ].map(({ label, body }) => (
              <div key={label} className="flex items-start gap-3 p-4 rounded-xl border border-white/[0.07] bg-white/[0.02]">
                <span className="w-1.5 h-1.5 rounded-full bg-accent/60 flex-shrink-0 mt-[6px]" />
                <div>
                  <p className="text-[13px] font-semibold text-white/75 mb-0.5">{label}</p>
                  <p className="text-[13px] text-white/45 leading-relaxed">{body}</p>
                </div>
              </div>
            ))}
          </ArticleCardGrid>
        </ArticleSection>

        <ArticleSection id="apps-at-a-glance">
          <ArticleH2>Apps at a glance</ArticleH2>
          <ArticleBody>
            Short comparison — not exhaustive. For Deckbase vs a single competitor, use the
            dedicated comparison pages below.
          </ArticleBody>
          <ArticleTable
            columns={["App", "Best for", "AI cards", "FSRS / SRS"]}
            rows={apps.map((a) => [a.name, a.focus, a.ai, a.fsrs])}
          />
          <div className="flex flex-col gap-2">
            {apps.map((a) => (
              <p key={a.name} className="text-[13px] text-white/40 leading-relaxed">
                <span className="text-accent font-medium">{a.name}:</span> {a.note}
              </p>
            ))}
          </div>
        </ArticleSection>

        <ArticleSection id="why-deckbase">
          <ArticleH2>Why people choose Deckbase</ArticleH2>
          <ArticleCardGrid cols={2}>
            <ArticleCard title="AI + FSRS together" titleAccent>
              Turn books, PDFs, and notes into review-ready cards without spending minutes per card.
              Scheduling uses FSRS-style intervals so reviews stay efficient.
            </ArticleCard>
            <ArticleCard title="Bring Anki decks with you">
              Import <Code>.apkg</Code> files when you&apos;re ready to migrate — no need to start
              from zero.
            </ArticleCard>
          </ArticleCardGrid>
        </ArticleSection>

        <ArticleSection id="try-deckbase">
          <ArticleCta
            title="Try Deckbase free"
            description="Free tier includes unlimited cards. No credit card required."
            primaryHref="/download"
            primaryLabel="Download"
            secondaryHref="/premium"
            secondaryLabel="See pricing"
          />
        </ArticleSection>

        <ArticleSection id="faq">
          <ArticleH2>Frequently asked questions</ArticleH2>
          <ArticleFaq items={faqs} />
        </ArticleSection>

        <ArticleSection id="related">
          <ArticleH2>Related</ArticleH2>
          <ArticleRelated
            links={[
              { href: "/deckbase-vs-anki", label: "Deckbase vs Anki" },
              { href: "/deckbase-vs-quizlet", label: "Deckbase vs Quizlet" },
              { href: "/best-flashcard-apps", label: "Best flashcard apps" },
            ]}
          />
        </ArticleSection>

        <ArticleFooter>
          Last updated March 2026. App features change; verify current capabilities on each product&apos;s site.
        </ArticleFooter>
      </ArticleShell>
    </>
  );
}
