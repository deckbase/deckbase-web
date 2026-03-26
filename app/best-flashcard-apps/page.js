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
  ArticleCardGrid,
  ArticleCard,
  ArticleFaq,
  ArticleCta,
  ArticleRelated,
  ArticleFooter,
} from "@/components/resources/ArticleLayout";

const PAGE_PATH = "/best-flashcard-apps";
const pageUrl = absoluteUrl(PAGE_PATH);
const homeUrl = absoluteUrl("/");

export const metadata = {
  title: "Best Flashcard Apps in 2026 (Med, Languages, AI)",
  description:
    "A practical guide to the best flashcard apps in 2026: spaced repetition (FSRS), AI card creation, med school workflows, and language learning — including how Deckbase fits.",
  keywords: [
    "best flashcard apps",
    "best flashcard app 2026",
    "spaced repetition app",
    "flashcard app medical students",
    "AI flashcard app",
    "FSRS app",
  ],
  alternates: defaultLanguageAlternates(PAGE_PATH),
  openGraph: {
    title: "Best Flashcard Apps in 2026 (Med, Languages, AI)",
    description: "Compare leading flashcard apps for spaced repetition, AI generation, and mobile study — and where Deckbase fits.",
    url: pageUrl,
    siteName: "Deckbase",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Best Flashcard Apps" }],
    locale: "en_US",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Best Flashcard Apps in 2026 (Med, Languages, AI)",
    description: "Compare leading flashcard apps for spaced repetition, AI generation, and mobile study.",
    site: "@DeckbaseApp",
    images: ["/og.png"],
  },
};

const criteria = [
  { n: "1", title: "Card creation", desc: "Manual typing vs AI from PDFs and notes — pick what you will actually keep doing." },
  { n: "2", title: "Scheduler", desc: "FSRS or equivalent adaptive intervals beat cram-only modes for long-term retention." },
  { n: "3", title: "Platform", desc: "Desktop-heavy vs mobile-first — match where you actually review every day." },
];

const picks = [
  { title: "Deckbase", badge: "AI + FSRS · mobile-first", body: "Best when you want to generate cards from books and PDFs quickly, study on iOS/Android, and keep FSRS-style scheduling without a long setup." },
  { title: "Anki", badge: "Power users · community decks", body: "Best when you want maximum control, add-ons, and free desktop/Android use — and you are okay investing time in setup." },
  { title: "Quizlet", badge: "Simple sets · classroom", body: "Best for lightweight review and shared sets; verify whether the study mode matches your spaced repetition needs for exams." },
];

const faqs = [
  { q: "What is the best flashcard app for medical students?", a: "The best app is the one you will use daily with a real spaced repetition workflow. Many students use Anki for community decks and deep customization; others prefer Deckbase for AI-generated cards from books and PDFs with FSRS scheduling. Match the app to whether you prioritize manual control or speed of card creation." },
  { q: "Are AI flashcard apps better than manual decks?", a: "AI apps reduce time spent writing cards, which helps consistency. Manual decks can be higher precision for niche material. Many learners combine both." },
  { q: "What is FSRS and why does it matter?", a: "FSRS (Free Spaced Repetition Scheduler) models memory more accurately than older SM-2-style defaults. Deckbase uses FSRS-based scheduling." },
  { q: "Is Quizlet good for spaced repetition?", a: "Quizlet is popular for simple study sets. For long-term retention with strict spaced repetition, compare options with FSRS or equivalent scheduling — see Deckbase vs Quizlet." },
  { q: "How does Deckbase compare to other flashcard apps?", a: "Deckbase focuses on AI card creation, FSRS scheduling, and mobile-first studying, with Anki .apkg import. See Deckbase vs Anki and Deckbase vs Quizlet for tables." },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": pageUrl,
      url: pageUrl,
      name: "Best Flashcard Apps in 2026 (Med, Languages, AI)",
      description: "Guide to top flashcard apps: FSRS, AI cards, med school and language learning use cases.",
      breadcrumb: {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: homeUrl },
          { "@type": "ListItem", position: 2, name: "Best flashcard apps", item: pageUrl },
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

export default function BestFlashcardAppsPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <ArticleShell>
        <ArticleBreadcrumb
          crumbs={[
            { label: "Home", href: "/" },
            { label: "Resources", href: "/resources" },
            { label: "Best flashcard apps" },
          ]}
        />

        <ArticleHeader
          kicker="Guide · Updated March 2026"
          title="Best flashcard apps in 2026"
          lead="Med school, languages, licensing exams — the right flashcard app is the one that fits your study rhythm. Below is a practical way to choose, a short shortlist, and answers to common questions."
          readTime="5 min read"
        />

        <ArticleSection id="how-to-choose">
          <ArticleH2>How to choose (fast)</ArticleH2>
          <ArticleCardGrid cols={3}>
            {criteria.map((x) => (
              <ArticleCard key={x.n} badge={`0${x.n}`} title={x.title}>
                {x.desc}
              </ArticleCard>
            ))}
          </ArticleCardGrid>
        </ArticleSection>

        <ArticleSection id="shortlist">
          <ArticleH2>Shortlist</ArticleH2>
          <ArticleCardGrid cols={1}>
            {picks.map((p) => (
              <ArticleCard key={p.title} title={p.title} badge={p.badge}>
                {p.body}
              </ArticleCard>
            ))}
          </ArticleCardGrid>
          <ArticleBody>
            For a broader Anki-focused list (including migration), see{" "}
            <Link href="/anki-alternatives" className="text-accent hover:underline underline-offset-2">
              Best Anki alternatives
            </Link>
            .
          </ArticleBody>
        </ArticleSection>

        <ArticleSection id="try-deckbase">
          <ArticleCta
            title="Try Deckbase free"
            description="Free tier includes unlimited cards. No credit card required."
            primaryHref="/download"
            primaryLabel="Download"
            secondaryHref="/features"
            secondaryLabel="See features"
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
              { href: "/anki-alternatives", label: "Best Anki alternatives" },
              { href: "/deckbase-vs-anki", label: "Deckbase vs Anki" },
              { href: "/deckbase-vs-quizlet", label: "Deckbase vs Quizlet" },
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
