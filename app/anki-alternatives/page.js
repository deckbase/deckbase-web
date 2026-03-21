import Link from "next/link";
import { defaultLanguageAlternates } from "@/lib/language-alternates";
import { absoluteUrl } from "@/lib/site-url";
import { mediumArticle, M } from "@/components/resources/MediumArticle";

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
    description:
      "Compare top Anki alternatives: AI card generation, FSRS scheduling, and mobile experience.",
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
      name: "Best Anki Alternatives (2026): AI Flashcards, FSRS & Mobile",
      description:
        "Guide to Anki alternatives: AI flashcards, FSRS scheduling, mobile apps, and how Deckbase compares.",
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
      mainEntity: [
        {
          "@type": "Question",
          name: "What is the best Anki alternative for AI flashcards?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "If you want AI-generated cards from books, PDFs, and notes with FSRS scheduling, Deckbase is built for that workflow. Anki remains the standard for manual card creation and deep customization; RemNote and others blend notes and cards. Choose based on whether you prioritize speed of card creation or maximum control.",
          },
        },
        {
          "@type": "Question",
          name: "Do Anki alternatives use FSRS?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Many modern spaced repetition apps support FSRS or similar algorithms. Deckbase uses FSRS-based scheduling. Anki added FSRS in recent versions; always check the app’s docs for the exact scheduler.",
          },
        },
        {
          "@type": "Question",
          name: "Can I move my Anki decks to another app?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Deckbase supports importing Anki .apkg files so you can migrate existing decks. Other apps vary; verify import options before switching.",
          },
        },
        {
          "@type": "Question",
          name: "Is Anki still worth using in 2026?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes, for users who want free desktop use, add-ons, and fine-grained control. If you mostly study on mobile and want faster card creation, an alternative with a modern mobile app and AI may save time.",
          },
        },
        {
          "@type": "Question",
          name: "How does Deckbase compare to Anki?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Deckbase emphasizes AI card generation and a streamlined mobile experience with FSRS. Anki offers unmatched customization and community decks. See the dedicated Deckbase vs Anki comparison for a feature-by-feature table.",
          },
        },
      ],
    },
  ],
};

const apps = [
  {
    name: "Deckbase",
    focus: "AI cards, FSRS, mobile-first",
    ai: "Built-in",
    fsrs: "Yes",
    note: "Best when you want fast creation from books/PDFs and .apkg import.",
  },
  {
    name: "Anki",
    focus: "Power users, add-ons, community decks",
    ai: "Via add-ons",
    fsrs: "Yes (desktop)",
    note: "Best when you want maximum control and free desktop/Android.",
  },
  {
    name: "Quizlet",
    focus: "Study sets, classroom",
    ai: "Limited",
    fsrs: "Not traditional SRS like FSRS",
    note: "Best for simple sets; see Deckbase vs Quizlet for spaced repetition differences.",
  },
  {
    name: "RemNote",
    focus: "Notes + flashcards",
    ai: "Varies",
    fsrs: "SRS-style scheduling",
    note: "Best when you want documents and cards in one system.",
  },
];

const faqs = [
  {
    q: "What is the best Anki alternative for AI flashcards?",
    a: "If you want AI-generated cards from books, PDFs, and notes with FSRS scheduling, Deckbase is built for that workflow. Anki remains the standard for manual card creation and deep customization. Choose based on whether you prioritize speed of card creation or maximum control.",
  },
  {
    q: "Do Anki alternatives use FSRS?",
    a: "Many modern spaced repetition apps support FSRS or similar algorithms. Deckbase uses FSRS-based scheduling. Anki added FSRS in recent versions; check each app’s docs for the exact scheduler.",
  },
  {
    q: "Can I move my Anki decks to another app?",
    a: "Deckbase supports importing Anki .apkg files so you can migrate existing decks. Other apps vary; verify import options before switching.",
  },
  {
    q: "Is Anki still worth using in 2026?",
    a: "Yes, for users who want free desktop use, add-ons, and fine-grained control. If you mostly study on mobile and want faster card creation, a modern alternative may save time.",
  },
  {
    q: "How does Deckbase compare to Anki?",
    a: "Deckbase emphasizes AI card generation and a streamlined mobile experience with FSRS. Anki offers unmatched customization and community decks. See the dedicated Deckbase vs Anki comparison for a feature-by-feature table.",
  },
];

export default function AnkiAlternativesPage() {
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
            <li className={M.breadcrumbCurrent}>Anki alternatives</li>
          </ol>
        </nav>

        <header>
          <p className={M.kicker}>Guide · Updated March 2026</p>
          <h1 className={M.title}>Best Anki alternatives (2026)</h1>
          <p className={M.lead}>
            Anki set the bar for spaced repetition. These apps pick up where Anki leaves off — faster
            card creation, modern mobile apps, and FSRS-style scheduling without a week of setup.
          </p>
          <p className={M.byline}>
            <span className={M.bylineBrand}>Deckbase</span>
            <span aria-hidden="true">·</span>
            <span>6 min read</span>
          </p>
        </header>

        <section id="who-looks" className="scroll-mt-28">
          <h2 className={M.h2}>Who usually looks for an Anki alternative?</h2>
          <div className={`${M.card} space-y-4`}>
            <p className={M.bodyMuted}>
              <strong className="font-semibold text-neutral-100">Med students &amp; heavy memorization:</strong>{" "}
              You want FSRS-level scheduling but less friction creating cards from dense material.
            </p>
            <p className={M.bodyMuted}>
              <strong className="font-semibold text-neutral-100">Language learners:</strong> You want
              audio-friendly review and quick card generation from reading material — not only manual
              typing.
            </p>
            <p className={M.bodyMuted}>
              <strong className="font-semibold text-neutral-100">Mobile-first learners:</strong> You rarely
              open a desktop app and need a polished iOS/Android experience out of the box.
            </p>
          </div>
        </section>

        <section id="apps-at-a-glance" className="scroll-mt-28">
          <h2 className={M.h2}>Apps at a glance</h2>
          <p className={`${M.bodyMuted} -mt-2 mb-6`}>
            Short comparison — not exhaustive. For Deckbase vs a single competitor, use the dedicated
            comparison pages below.
          </p>
          <div className={M.tableWrap}>
            <table className="w-full text-left text-sm">
              <thead>
                <tr className={M.tableHead}>
                  <th className={`${M.tableCell} font-semibold text-neutral-200`}>App</th>
                  <th className={`${M.tableCell} font-semibold text-neutral-200`}>Best for</th>
                  <th className={`${M.tableCell} font-semibold text-neutral-200`}>AI cards</th>
                  <th className={`${M.tableCell} font-semibold text-neutral-200`}>FSRS / SRS</th>
                </tr>
              </thead>
              <tbody>
                {apps.map((row) => (
                  <tr key={row.name} className="border-b border-neutral-800 last:border-0">
                    <td className={`${M.tableCell} font-medium text-neutral-100`}>{row.name}</td>
                    <td className={`${M.tableCell} text-neutral-600`}>{row.focus}</td>
                    <td className={`${M.tableCell} text-neutral-600`}>{row.ai}</td>
                    <td className={`${M.tableCell} text-neutral-600`}>{row.fsrs}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="mt-6 flex flex-col gap-3 text-sm leading-relaxed text-neutral-500">
            {apps.map((row) => (
              <li key={`${row.name}-note`}>
                <span className={`font-semibold ${M.accent}`}>{row.name}:</span> {row.note}
              </li>
            ))}
          </ul>
        </section>

        <section id="why-deckbase" className="scroll-mt-28">
          <h2 className={M.h2}>Why people choose Deckbase</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className={M.card}>
              <h3 className={`${M.h3} ${M.accent}`}>AI + FSRS together</h3>
              <p className={`${M.bodyMuted} mt-3`}>
                Turn books, PDFs, and notes into review-ready cards without spending minutes per card.
                Scheduling uses FSRS-style intervals so reviews stay efficient.
              </p>
            </div>
            <div className={M.card}>
              <h3 className={M.h3}>Bring Anki decks with you</h3>
              <p className={`${M.bodyMuted} mt-3`}>
                Import{" "}
                <code className="font-mono text-[0.9em] text-accent">
                  .apkg
                </code>{" "}
                files when you&apos;re ready to migrate — no need to start from zero.
              </p>
            </div>
          </div>
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
            <Link href="/premium" className={M.btnSecondary}>
              Premium
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
              <Link href="/deckbase-vs-anki" className={M.linkPlain}>
                Deckbase vs Anki
              </Link>
            </li>
            <li>
              <Link href="/deckbase-vs-quizlet" className={M.linkPlain}>
                Deckbase vs Quizlet
              </Link>
            </li>
            <li>
              <Link href="/best-flashcard-apps" className={M.linkPlain}>
                Best flashcard apps
              </Link>
            </li>
          </ul>
        </section>
      </article>
    </>
  );
}
