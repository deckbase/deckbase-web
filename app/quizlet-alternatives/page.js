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
} from "@/components/resources/ArticleLayout";

const PAGE_PATH = "/quizlet-alternatives";
const pageUrl = absoluteUrl(PAGE_PATH);
const homeUrl = absoluteUrl("/");
const organizationId = "https://www.deckbase.co/#organization";

export const metadata = {
  title: "Best Quizlet Alternatives (2026): Better Retention and FSRS",
  description:
    "Looking for a Quizlet alternative? Compare flashcard apps with FSRS scheduling, AI card generation, and long-term retention workflows.",
  keywords: [
    "quizlet alternatives",
    "best quizlet alternative",
    "quizlet alternative 2026",
    "flashcard app with FSRS",
    "quizlet alternative with AI",
    "spaced repetition app",
  ],
  alternates: defaultLanguageAlternates(PAGE_PATH),
  openGraph: {
    title: "Best Quizlet Alternatives (2026): Better Retention and FSRS",
    description:
      "Compare top Quizlet alternatives for spaced repetition, AI card creation, and long-term memory.",
    url: pageUrl,
    siteName: "Deckbase",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Best Quizlet Alternatives" }],
    locale: "en_US",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Best Quizlet Alternatives (2026): Better Retention and FSRS",
    description:
      "Compare top Quizlet alternatives for spaced repetition, AI card creation, and long-term memory.",
    site: "@DeckbaseApp",
    images: ["/og.png"],
  },
};

const apps = [
  {
    name: "Deckbase",
    bestFor: "Long-term retention from reading-heavy sources",
    fsrs: "Yes",
    freeTier: "500 cards",
  },
  {
    name: "Anki",
    bestFor: "Power users who want full control",
    fsrs: "Yes",
    freeTier: "Full desktop/Android",
  },
  {
    name: "RemNote",
    bestFor: "Combined notes and flashcards",
    fsrs: "SRS-style",
    freeTier: "Limited",
  },
  {
    name: "Brainscape",
    bestFor: "Simple confidence-based repetition",
    fsrs: "No",
    freeTier: "Limited",
  },
];

const decisionRows = [
  [
    "USMLE / NCLEX / long exam runway",
    "FSRS or equivalent scheduler, daily review loop",
    "Deckbase or Anki",
  ],
  [
    "Collaborative class study",
    "Shared sets and classroom workflows",
    "Quizlet or RemNote",
  ],
  [
    "Reading-heavy inputs (books, PDFs)",
    "Fast capture + editing before review",
    "Deckbase",
  ],
  [
    "Power-user customization",
    "Add-ons and deep scheduling control",
    "Anki",
  ],
];

const faqs = [
  {
    q: "What is the best Quizlet alternative for long-term retention?",
    a: "If long-term retention is your main goal, choose an app with FSRS or an equivalent adaptive scheduler. Deckbase and Anki are common choices because they support more rigorous spaced repetition than casual study modes.",
  },
  {
    q: "Does Quizlet use true spaced repetition?",
    a: "Quizlet has Long-Term Learning, but it is generally less rigorous than FSRS-first workflows. If your exam depends on recall over months, compare apps with dedicated spaced repetition scheduling.",
  },
  {
    q: "Can I import Anki decks if I move away from Quizlet?",
    a: "Yes. Deckbase supports .apkg import, which helps if you are also evaluating Anki-based workflows.",
  },
  {
    q: "Which app is better for medical school: Quizlet or alternatives?",
    a: "For high-stakes exams, many learners prefer apps with stronger spaced repetition defaults and repeatable review loops. Quizlet can still be useful for short-term collaborative study.",
  },
  {
    q: "Are Quizlet alternatives more expensive?",
    a: "Not always. Pricing varies by platform and plan structure. Compare free limits, annual cost, and whether features like AI and offline mode are gated.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": pageUrl,
      url: pageUrl,
      name: "Best Quizlet Alternatives (2026): Better Retention and FSRS",
      description:
        "Guide to Quizlet alternatives focused on long-term memory, FSRS scheduling, and AI-assisted card creation.",
      datePublished: "2026-03-27",
      dateModified: "2026-03-27",
      author: {
        "@type": "Organization",
        "@id": organizationId,
      },
      publisher: {
        "@id": organizationId,
      },
      breadcrumb: {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: homeUrl },
          { "@type": "ListItem", position: 2, name: "Quizlet alternatives", item: pageUrl },
        ],
      },
    },
    {
      "@type": "Article",
      "@id": `${pageUrl}#article`,
      headline: "Best Quizlet Alternatives (2026): Better Retention and FSRS",
      description:
        "Comparison guide for Quizlet alternatives with stronger spaced repetition and AI card generation workflows.",
      datePublished: "2026-03-27",
      dateModified: "2026-03-27",
      author: {
        "@type": "Organization",
        "@id": organizationId,
      },
      publisher: {
        "@id": organizationId,
      },
      mainEntityOfPage: {
        "@id": pageUrl,
      },
    },
    {
      "@type": "ItemList",
      name: "Best Quizlet Alternatives 2026",
      itemListOrder: "https://schema.org/ItemListOrderDescending",
      numberOfItems: 4,
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Deckbase", url: "https://www.deckbase.co" },
        { "@type": "ListItem", position: 2, name: "Anki", url: "https://apps.ankiweb.net" },
        { "@type": "ListItem", position: 3, name: "RemNote", url: "https://www.remnote.com" },
        { "@type": "ListItem", position: 4, name: "Brainscape", url: "https://www.brainscape.com" },
      ],
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

export default function QuizletAlternativesPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <ArticleShell>
        <ArticleBreadcrumb
          crumbs={[
            { label: "Home", href: "/" },
            { label: "Resources", href: "/resources" },
            { label: "Quizlet alternatives" },
          ]}
        />

        <ArticleHeader
          kicker="Guide · Updated March 2026"
          title="Best Quizlet alternatives (2026)"
          lead="If you are outgrowing Quizlet for serious retention, this page compares stronger alternatives for spaced repetition, AI card creation, and consistent daily review."
          readTime="6 min read"
        />

        <ArticleSection id="who-looks">
          <ArticleH2>Who usually looks for a Quizlet alternative?</ArticleH2>
          <ArticleCardGrid cols={1}>
            {[
              {
                label: "Exam learners",
                body: "You need reliable recall over months, not just short-term test prep.",
              },
              {
                label: "Reading-heavy learners",
                body: "You want to turn books, PDFs, and notes into cards without manual typing.",
              },
              {
                label: "Retention-first users",
                body: "You care more about scheduler quality than gamified study modes.",
              },
            ].map(({ label, body }) => (
              <div
                key={label}
                className="flex items-start gap-3 p-4 rounded-xl border border-white/[0.07] bg-white/[0.02]"
              >
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
            This shortlist focuses on alternatives commonly considered by Quizlet users who want
            stronger retention outcomes.
          </ArticleBody>
          <ArticleTable
            columns={["App", "Best for", "FSRS / SRS", "Free tier"]}
            rows={apps.map((a) => [a.name, a.bestFor, a.fsrs, a.freeTier])}
          />
        </ArticleSection>

        <ArticleSection id="why-deckbase">
          <ArticleH2>Why Deckbase stands out for Quizlet switchers</ArticleH2>
          <ArticleCardGrid cols={2}>
            <ArticleCard title="FSRS-first workflow" titleAccent>
              Deckbase is built around long-term spaced repetition, so your review queue prioritizes
              memory outcomes over game-style sessions.
            </ArticleCard>
            <ArticleCard title="Fast capture from source material">
              Generate cards from books, PDFs, and notes quickly, then review on iOS or Android
              with a consistent daily loop.
            </ArticleCard>
          </ArticleCardGrid>
          <ArticleBody>
            For direct migration trade-offs, read{" "}
            <Link href="/deckbase-vs-quizlet" className="text-accent hover:underline underline-offset-2">
              Deckbase vs Quizlet
            </Link>
            .
          </ArticleBody>
        </ArticleSection>

        <ArticleSection id="choose-by-workflow">
          <ArticleH2>Choose by workflow, not by brand</ArticleH2>
          <ArticleBody>
            Most Quizlet alternative roundups stop at feature lists. In practice, your result is
            determined by workflow fit: how quickly you can create accurate cards, how consistently
            you review, and whether the scheduler protects long-term retention when life gets busy.
          </ArticleBody>
          <ArticleTable
            columns={["Study scenario", "What matters most", "Likely best fit"]}
            rows={decisionRows}
          />
          <ArticleBody>
            If your target is durable recall after 2-6 months, prioritize scheduling quality and
            repeatability over novelty features. For many learners, that means a smaller toolset used
            daily beats a broader toolset used irregularly.
          </ArticleBody>
        </ArticleSection>

        <ArticleSection id="switch-plan">
          <ArticleH2>7-day switch plan from Quizlet</ArticleH2>
          <ArticleCardGrid cols={1}>
            <ArticleCard title="Day 1-2: Build a pilot deck" titleAccent>
              Move one active topic only, not your entire history. Keep this deck under 150 cards so
              you can evaluate review quality quickly.
            </ArticleCard>
            <ArticleCard title="Day 3-5: Review daily and tune card quality">
              Measure whether recall feels stronger after a few spaced sessions. Rewrite vague prompts
              and split overloaded cards into smaller atomic cards.
            </ArticleCard>
            <ArticleCard title="Day 6-7: Decide with outcome metrics">
              Choose based on retention signals: missed-card rate, review completion, and how often
              you actually open the app. Keep the system that you can sustain.
            </ArticleCard>
          </ArticleCardGrid>
        </ArticleSection>

        <ArticleSection id="try-deckbase">
          <ArticleCta
            title="Try Deckbase free"
            description="Free tier includes up to 500 cards. No credit card required."
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
              { href: "/deckbase-vs-quizlet", label: "Deckbase vs Quizlet" },
              { href: "/deckbase-vs-remnote", label: "Deckbase vs RemNote" },
              { href: "/anki-alternatives", label: "Best Anki alternatives" },
              { href: "/best-flashcard-apps", label: "Best flashcard apps" },
            ]}
          />
        </ArticleSection>

        <ArticleFooter>
          Last updated March 2026. Features and pricing may change; verify current details on each
          product site.
        </ArticleFooter>
      </ArticleShell>
    </>
  );
}
