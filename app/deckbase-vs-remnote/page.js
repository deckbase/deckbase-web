import Link from "next/link";
import { absoluteUrl } from "@/lib/site-url";

const PAGE_PATH = "/deckbase-vs-remnote";
const pageUrl = absoluteUrl(PAGE_PATH);
const homeUrl = absoluteUrl("/");

export const metadata = {
  title: "Deckbase vs RemNote: Focused Flashcards vs All-in-One Notes (2026)",
  description:
    "Deckbase vs RemNote: compare AI card creation, FSRS scheduling, note-taking depth, mobile experience, and learning curve.",
  keywords: [
    "deckbase vs remnote",
    "remnote alternative",
    "flashcard app vs note taking app",
    "FSRS app comparison",
    "AI flashcard app",
    "best spaced repetition app 2026",
  ],
  alternates: {
    canonical: "/deckbase-vs-remnote",
  },
  openGraph: {
    title: "Deckbase vs RemNote: Focused Flashcards vs All-in-One Notes (2026)",
    description:
      "Honest comparison of Deckbase and RemNote — AI cards, spaced repetition quality, note workflows, and complexity.",
    url: pageUrl,
    siteName: "Deckbase",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Deckbase vs RemNote Comparison" }],
    locale: "en_US",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Deckbase vs RemNote: Focused Flashcards vs All-in-One Notes (2026)",
    description:
      "Honest comparison of Deckbase and RemNote — AI cards, spaced repetition quality, note workflows, and complexity.",
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
      name: "Deckbase vs RemNote: Focused Flashcards vs All-in-One Notes (2026)",
      description:
        "Head-to-head comparison of Deckbase and RemNote for flashcard creation speed, scheduling quality, and day-to-day usability.",
      datePublished: "2026-03-27",
      dateModified: "2026-03-27",
      author: {
        "@type": "Organization",
        "@id": "https://www.deckbase.co/#organization",
      },
      publisher: {
        "@id": "https://www.deckbase.co/#organization",
      },
      breadcrumb: {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: homeUrl },
          { "@type": "ListItem", position: 2, name: "Deckbase vs RemNote", item: pageUrl },
        ],
      },
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "Is Deckbase better than RemNote?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Deckbase is usually better if your main goal is fast card creation and long-term retention with minimal setup. RemNote is better if you want a full note-taking and knowledge-graph workflow in the same tool.",
          },
        },
        {
          "@type": "Question",
          name: "Does RemNote use FSRS?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "RemNote uses spaced repetition, but its workflow and defaults differ from Deckbase's FSRS-first approach. If you want a focused review loop with minimal configuration, Deckbase is typically simpler.",
          },
        },
        {
          "@type": "Question",
          name: "Can I use RemNote as just a flashcard app?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes, but RemNote is designed as an all-in-one notes plus flashcards platform. Many learners feel extra complexity if they only need card generation and review.",
          },
        },
        {
          "@type": "Question",
          name: "Which app is easier for beginners?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Deckbase is easier for beginners because it focuses on a shorter path from source material to review. RemNote has a steeper curve due to its broader feature set.",
          },
        },
        {
          "@type": "Question",
          name: "Which app is better for medical school?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Both can work. Deckbase is typically better for students who want to scan materials and review quickly with low setup overhead. RemNote is better if you want heavy note organization plus flashcards in one system.",
          },
        },
      ],
    },
  ],
};

const features = [
  { feature: "AI Card Generation", deckbase: "Yes, built-in", remnote: "Yes, available" },
  { feature: "FSRS Scheduling", deckbase: "Yes, default", remnote: "SRS-style workflow" },
  { feature: "PDF / Book OCR", deckbase: "Yes", remnote: "Limited" },
  { feature: "Note-taking", deckbase: "No", remnote: "Full outliner + knowledge graph" },
  { feature: "Anki Import (.apkg)", deckbase: "Yes", remnote: "Limited" },
  { feature: "Mobile-first focus", deckbase: "Yes", remnote: "More web-centric" },
  { feature: "Complexity", deckbase: "Low", remnote: "Higher" },
  { feature: "Best for", deckbase: "Retention-first learners", remnote: "Notes + cards power users" },
];

export default function DeckbaseVsRemNote() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="min-h-screen bg-black text-white pt-20">
        <nav className="max-w-4xl mx-auto px-4 pt-8 pb-2" aria-label="Breadcrumb">
          <ol className="flex gap-2 text-sm text-gray-400">
            <li>
              <Link href="/" className="hover:text-white transition-colors">
                Home
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="text-gray-200">Deckbase vs RemNote</li>
          </ol>
        </nav>

        <header className="max-w-4xl mx-auto px-4 py-12 text-center">
          <p className="inline-block mb-4 px-3 py-1 rounded-full bg-accent/10 border border-accent/30 text-accent text-sm font-medium">
            App Comparison · Updated March 2026
          </p>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
            Deckbase vs RemNote:{" "}
            <span className="bg-gradient-to-r from-accent to-purple-500 bg-clip-text text-transparent">
              Which Workflow Fits You?
            </span>
          </h1>
          <p className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto mb-8">
            RemNote is a broad knowledge system. Deckbase is a focused flashcard engine. The right
            choice depends on whether you want depth of note infrastructure or speed to retention.
          </p>
          <p className="text-sm text-gray-400 mb-8">By Deckbase Editorial Team · Updated March 2026</p>
          <div className="flex flex-wrap justify-center gap-4">
            <div className="px-4 py-2 rounded-lg bg-accent/10 border border-accent/30 text-sm text-gray-200">
              <span className="text-accent font-semibold">Deckbase</span> — Best for: fast card
              creation and low-friction reviews
            </div>
            <div className="px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-sm text-gray-200">
              <span className="text-gray-100 font-semibold">RemNote</span> — Best for: notes +
              cards in one structured workspace
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 pb-24 space-y-20">
          <section id="summary">
            <h2 className="text-2xl md:text-3xl font-bold mb-6">Quick Summary</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="rounded-2xl bg-gray-900 border border-gray-800 p-6">
                <h3 className="text-lg font-semibold text-accent mb-3">Choose Deckbase if...</h3>
                <ul className="space-y-2 text-gray-300 text-sm">
                  <li>Yes - you want AI cards from books and PDFs quickly</li>
                  <li>Yes - you prefer FSRS-first reviews without tuning dozens of settings</li>
                  <li>Yes - you are mobile-first and want a simpler daily workflow</li>
                  <li>Yes - you want to study, not design your note system</li>
                </ul>
              </div>
              <div className="rounded-2xl bg-gray-900 border border-gray-800 p-6">
                <h3 className="text-lg font-semibold text-gray-200 mb-3">Choose RemNote if...</h3>
                <ul className="space-y-2 text-gray-300 text-sm">
                  <li>Yes - you want deep note linking and outliner workflows</li>
                  <li>Yes - you are building a long-term personal knowledge base</li>
                  <li>Yes - you accept higher setup complexity for flexibility</li>
                  <li>Yes - you need notes and cards tightly coupled in one app</li>
                </ul>
              </div>
            </div>
          </section>

          <section id="feature-comparison">
            <h2 className="text-2xl md:text-3xl font-bold mb-2">Feature Comparison Table</h2>
            <p className="text-sm text-gray-400 mb-6">
              As of March 2026 — based on publicly available product information from{" "}
              <Link
                href="https://www.remnote.com"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-gray-200"
              >
                remnote.com
              </Link>
              .
            </p>
            <div className="overflow-x-auto rounded-2xl border border-gray-800">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-900 text-left">
                    <th className="px-4 py-3 font-semibold text-gray-300 w-1/2">Feature</th>
                    <th className="px-4 py-3 font-semibold text-accent text-center w-1/4">Deckbase</th>
                    <th className="px-4 py-3 font-semibold text-gray-200 text-center w-1/4">RemNote</th>
                  </tr>
                </thead>
                <tbody>
                  {features.map((row, i) => (
                    <tr key={row.feature} className={i % 2 === 0 ? "bg-black" : "bg-gray-950"}>
                      <td className="px-4 py-3 text-gray-300">{row.feature}</td>
                      <td className="px-4 py-3 text-center text-gray-200">{row.deckbase}</td>
                      <td className="px-4 py-3 text-center text-gray-200">{row.remnote}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section id="pricing">
            <h2 className="text-2xl md:text-3xl font-bold mb-2">Pricing at a Glance</h2>
            <p className="text-sm text-gray-400 mb-6">Pricing as of March 2026.</p>
            <div className="overflow-x-auto rounded-2xl border border-gray-800">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-900 text-left">
                    <th className="px-4 py-3 font-semibold text-gray-300 w-1/2">Category</th>
                    <th className="px-4 py-3 font-semibold text-accent text-center w-1/4">Deckbase</th>
                    <th className="px-4 py-3 font-semibold text-gray-200 text-center w-1/4">RemNote</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: "Free tier", deckbase: "500 cards", remnote: "Limited" },
                    { label: "Monthly (entry paid plan)", deckbase: "$4.99", remnote: "Varies by plan" },
                    { label: "Annual (entry paid plan)", deckbase: "$49.99 ($4.17/mo)", remnote: "Varies by plan" },
                    { label: "AI features", deckbase: "Included", remnote: "Available on supported tiers" },
                    { label: "Offline/mobile workflow", deckbase: "Mobile-first", remnote: "More web-centric" },
                    { label: "Primary paid value", deckbase: "AI + FSRS simplicity", remnote: "Broader notes + knowledge tools" },
                  ].map((row, i) => (
                    <tr key={row.label} className={i % 2 === 0 ? "bg-black" : "bg-gray-950"}>
                      <td className="px-4 py-3 text-gray-300">{row.label}</td>
                      <td className="px-4 py-3 text-center text-gray-200">{row.deckbase}</td>
                      <td className="px-4 py-3 text-center text-gray-200">{row.remnote}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-sm text-gray-300 mt-4">
              Deckbase pricing is straightforward; RemNote pricing varies by feature tier. The
              better value depends on whether you need an all-in-one note system or a focused
              retention workflow.
            </p>
          </section>

          <section id="deep-dive">
            <h2 className="text-2xl md:text-3xl font-bold mb-8">Deep Dive: Focus vs Flexibility</h2>
            <div className="space-y-10">
              <div>
                <h3 className="text-xl font-semibold mb-3 text-accent">Workflow philosophy</h3>
                <p className="text-gray-300 leading-relaxed">
                  Deckbase optimizes for one clear loop: capture material, generate cards, review on
                  schedule. RemNote optimizes for a broader knowledge workflow where notes, links, and
                  concepts are first-class objects. If you only need flashcards, broader scope can feel
                  like overhead.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-3 text-accent">Setup time and consistency</h3>
                <p className="text-gray-300 leading-relaxed">
                  Most learners benefit from systems they can start using immediately. Deckbase tends
                  to be faster to adopt. RemNote can be powerful long-term, but often requires more
                  upfront decisions about structure and habits before the workflow feels smooth.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-3 text-accent">Best fit by study style</h3>
                <p className="text-gray-300 leading-relaxed">
                  If your objective is retention from textbooks and PDFs, Deckbase usually fits better.
                  If your objective is building a connected knowledge graph with integrated recall,
                  RemNote is a better fit.
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl bg-gradient-to-br from-accent/10 to-purple-900/20 border border-accent/30 p-8 text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">Try Deckbase Free</h2>
            <p className="text-gray-300 mb-8 max-w-xl mx-auto">
              Start with 500 free cards and see whether the focused workflow helps you review more
              consistently.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href="/download"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-accent text-black font-semibold hover:bg-accent/90 transition-colors"
              >
                Download Free
              </Link>
              <Link
                href="/features"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white font-semibold hover:bg-gray-700 transition-colors"
              >
                See Features
              </Link>
            </div>
          </section>

          <section id="faq">
            <h2 className="text-2xl md:text-3xl font-bold mb-8">Frequently Asked Questions</h2>
            <div className="space-y-6">
              {[
                {
                  q: "Is Deckbase better than RemNote?",
                  a: "Deckbase is usually better for fast card creation and low-friction reviews. RemNote is usually better for deep note organization and knowledge graph workflows.",
                },
                {
                  q: "Does RemNote use FSRS?",
                  a: "RemNote uses spaced repetition, but workflows and defaults differ. Deckbase is designed around a straightforward FSRS-first review loop.",
                },
                {
                  q: "Can I use RemNote only for flashcards?",
                  a: "Yes, but many users still interact with broader note features. If you only want flashcards, Deckbase may feel simpler.",
                },
                {
                  q: "Which app is better for beginners?",
                  a: "Deckbase is generally easier to start because the workflow is narrower and faster from source to review.",
                },
                {
                  q: "Which app is better for medical students?",
                  a: "For retention-first exam prep with low setup time, Deckbase is often the better fit. For note-heavy workflows, RemNote can be strong.",
                },
              ].map(({ q, a }) => (
                <div key={q} className="rounded-xl bg-gray-900 border border-gray-800 p-6">
                  <h3 className="font-semibold text-white mb-2">{q}</h3>
                  <p className="text-gray-300 text-sm leading-relaxed">{a}</p>
                </div>
              ))}
            </div>
          </section>

          <section id="related">
            <h2 className="text-xl font-bold mb-4 text-gray-200">Related Comparisons</h2>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/deckbase-vs-anki"
                className="px-4 py-2 rounded-lg bg-gray-900 border border-gray-800 text-gray-300 text-sm hover:border-gray-600 transition-colors"
              >
                Deckbase vs Anki →
              </Link>
              <Link
                href="/deckbase-vs-quizlet"
                className="px-4 py-2 rounded-lg bg-gray-900 border border-gray-800 text-gray-300 text-sm hover:border-gray-600 transition-colors"
              >
                Deckbase vs Quizlet →
              </Link>
              <Link
                href="/quizlet-alternatives"
                className="px-4 py-2 rounded-lg bg-gray-900 border border-gray-800 text-gray-300 text-sm hover:border-gray-600 transition-colors"
              >
                Best Quizlet alternatives →
              </Link>
              <Link
                href="/anki-alternatives"
                className="px-4 py-2 rounded-lg bg-gray-900 border border-gray-800 text-gray-300 text-sm hover:border-gray-600 transition-colors"
              >
                Best Anki alternatives →
              </Link>
              <Link
                href="/best-flashcard-apps"
                className="px-4 py-2 rounded-lg bg-gray-900 border border-gray-800 text-gray-300 text-sm hover:border-gray-600 transition-colors"
              >
                Best flashcard apps →
              </Link>
            </div>
          </section>
        </main>
      </div>
    </>
  );
}
