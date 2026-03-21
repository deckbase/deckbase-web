import Link from "next/link";
import { defaultLanguageAlternates } from "@/lib/language-alternates";
import { absoluteUrl } from "@/lib/site-url";
import { mediumArticle, M } from "@/components/resources/MediumArticle";

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
    description:
      "Compare leading flashcard apps for spaced repetition, AI generation, and mobile study — and where Deckbase fits.",
    url: pageUrl,
    siteName: "Deckbase",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Best Flashcard Apps" }],
    locale: "en_US",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Best Flashcard Apps in 2026 (Med, Languages, AI)",
    description:
      "Compare leading flashcard apps for spaced repetition, AI generation, and mobile study.",
    site: "@DeckbaseApp",
    images: ["/og.png"],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": pageUrl,
      url: pageUrl,
      name: "Best Flashcard Apps in 2026 (Med, Languages, AI)",
      description:
        "Guide to top flashcard apps: FSRS, AI cards, med school and language learning use cases.",
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
      mainEntity: [
        {
          "@type": "Question",
          name: "What is the best flashcard app for medical students?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "The best app is the one you will use daily with a real spaced repetition workflow. Many students use Anki for community decks and deep customization; others prefer Deckbase for AI-generated cards from books and PDFs with FSRS scheduling and strong mobile apps. Match the app to whether you prioritize manual control or speed of card creation.",
          },
        },
        {
          "@type": "Question",
          name: "Are AI flashcard apps better than manual decks?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "AI flashcard apps reduce time spent writing cards, which helps consistency. Manual decks can be higher precision for niche material. Many learners combine both: AI for bulk material, manual cards for weak spots.",
          },
        },
        {
          "@type": "Question",
          name: "What is FSRS and why does it matter?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "FSRS (Free Spaced Repetition Scheduler) is a modern scheduling algorithm that models memory more accurately than older SM-2-style defaults. Deckbase uses FSRS-based scheduling; several other apps also advertise FSRS or similar adaptive intervals.",
          },
        },
        {
          "@type": "Question",
          name: "Is Quizlet good for spaced repetition?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Quizlet is popular for simple study sets and classroom use. For long-term retention with strict spaced repetition, compare options that expose FSRS or equivalent scheduling. See Deckbase vs Quizlet for a direct comparison.",
          },
        },
        {
          "@type": "Question",
          name: "How does Deckbase compare to other flashcard apps?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Deckbase focuses on AI card creation, FSRS scheduling, and mobile-first studying, with Anki .apkg import. For head-to-head tables, see Deckbase vs Anki and Deckbase vs Quizlet.",
          },
        },
      ],
    },
  ],
};

const picks = [
  {
    title: "Deckbase",
    badge: "AI + FSRS · mobile-first",
    body: "Best when you want to generate cards from books and PDFs quickly, study on iOS/Android, and keep FSRS-style scheduling without a long setup.",
  },
  {
    title: "Anki",
    badge: "Power users · community decks",
    body: "Best when you want maximum control, add-ons, and free desktop/Android use — and you are okay investing time in setup.",
  },
  {
    title: "Quizlet",
    badge: "Simple sets · classroom",
    body: "Best for lightweight review and shared sets; verify whether the study mode matches your spaced repetition needs for exams.",
  },
];

const faqs = [
  {
    q: "What is the best flashcard app for medical students?",
    a: "The best app is the one you will use daily with a real spaced repetition workflow. Many students use Anki for community decks and deep customization; others prefer Deckbase for AI-generated cards from books and PDFs with FSRS scheduling. Match the app to whether you prioritize manual control or speed of card creation.",
  },
  {
    q: "Are AI flashcard apps better than manual decks?",
    a: "AI apps reduce time spent writing cards, which helps consistency. Manual decks can be higher precision for niche material. Many learners combine both.",
  },
  {
    q: "What is FSRS and why does it matter?",
    a: "FSRS (Free Spaced Repetition Scheduler) models memory more accurately than older SM-2-style defaults. Deckbase uses FSRS-based scheduling.",
  },
  {
    q: "Is Quizlet good for spaced repetition?",
    a: "Quizlet is popular for simple study sets. For long-term retention with strict spaced repetition, compare options with FSRS or equivalent scheduling — see Deckbase vs Quizlet.",
  },
  {
    q: "How does Deckbase compare to other flashcard apps?",
    a: "Deckbase focuses on AI card creation, FSRS scheduling, and mobile-first studying, with Anki .apkg import. See Deckbase vs Anki and Deckbase vs Quizlet for tables.",
  },
];

export default function BestFlashcardAppsPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <article className={`${mediumArticle} flex flex-col gap-10`}>
        <nav className={M.breadcrumb} aria-label="Breadcrumb">
          <ol className="flex flex-wrap gap-x-2 gap-y-1">
            <li>
              <Link href="/">Home</Link>
            </li>
            <li aria-hidden="true" className="text-neutral-400">
              /
            </li>
            <li>
              <Link href="/resources">Resources</Link>
            </li>
            <li aria-hidden="true" className="text-neutral-400">
              /
            </li>
            <li className={M.breadcrumbCurrent}>Best flashcard apps</li>
          </ol>
        </nav>

        <header>
          <p className={M.kicker}>Guide · Updated March 2026</p>
          <h1 className={M.title}>Best flashcard apps in 2026</h1>
          <p className={M.lead}>
            Med school, languages, licensing exams — the right flashcard app is the one that fits your
            study rhythm. Below is a practical way to choose, a short shortlist, and answers to common
            questions.
          </p>
          <p className={M.byline}>
            <span className={M.bylineBrand}>Deckbase</span>
            <span aria-hidden="true">·</span>
            <span>5 min read</span>
          </p>
        </header>

        <section id="how-to-choose" className="scroll-mt-28">
          <h2 className={M.h2}>How to choose (fast)</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              {
                n: "1",
                t: "Card creation",
                d: "Manual typing vs AI from PDFs and notes — pick what you will actually keep doing.",
              },
              {
                n: "2",
                t: "Scheduler",
                d: "FSRS or equivalent adaptive intervals beat cram-only modes for long-term retention.",
              },
              {
                n: "3",
                t: "Platform",
                d: "Desktop-heavy vs mobile-first — match where you actually review every day.",
              },
            ].map((x) => (
              <div key={x.n} className={M.cardGrid}>
                <span className="font-mono text-xs text-neutral-500">{x.n}</span>
                <h3 className={`${M.h3} text-sm`}>{x.t}</h3>
                <p className={`${M.bodyMuted} text-sm`}>{x.d}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="shortlist" className="scroll-mt-28">
          <h2 className={M.h2}>Shortlist</h2>
          <div className="flex flex-col gap-5">
            {picks.map((p) => (
              <div key={p.title} className={M.card}>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className={M.h3}>{p.title}</h3>
                  <span className={M.badge}>{p.badge}</span>
                </div>
                <p className={`${M.bodyMuted} mt-3`}>{p.body}</p>
              </div>
            ))}
          </div>
          <p className={`${M.bodyMuted} mt-6 text-sm`}>
            For a broader Anki-focused list (including migration), see{" "}
            <Link href="/anki-alternatives" className={M.link}>
              Best Anki alternatives
            </Link>
            .
          </p>
        </section>

        <section id="try-deckbase" className={`scroll-mt-28 ${M.ctaBox}`}>
          <h2 className={M.h3}>Try Deckbase free</h2>
          <p className={`${M.bodyMuted} mt-3 max-w-md`}>
            Free tier includes up to 500 cards. No credit card required.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/download" className={M.btnPrimary}>
              Download
            </Link>
            <Link href="/features" className={M.btnSecondary}>
              Features
            </Link>
          </div>
        </section>

        <section id="faq" className="scroll-mt-28">
          <h2 className={M.h2}>Frequently asked questions</h2>
          <div className={M.faqWrap}>
            {faqs.map(({ q, a }) => (
              <div key={q} className={M.faqItem}>
                <h3 className={M.faqQ}>{q}</h3>
                <p className={M.faqA}>{a}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="related" className="scroll-mt-28 pb-2">
          <h2 className={M.h2}>Related</h2>
          <ul className="flex flex-col gap-2 text-sm">
            <li>
              <Link href="/anki-alternatives" className={M.linkPlain}>
                Best Anki alternatives
              </Link>
            </li>
            <li>
              <Link href="/deckbase-vs-anki" className={M.linkPlain}>
                Deckbase vs Anki
              </Link>
            </li>
            <li>
              <Link href="/deckbase-vs-quizlet" className={M.linkPlain}>
                Deckbase vs Quizlet
              </Link>
            </li>
          </ul>
        </section>
      </article>
    </>
  );
}
