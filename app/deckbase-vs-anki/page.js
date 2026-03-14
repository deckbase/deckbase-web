import Link from "next/link";

export const metadata = {
  title: "Deckbase vs Anki: AI Flashcards vs Manual SRS (2026)",
  description:
    "Deckbase vs Anki: honest comparison of AI-powered card generation, FSRS scheduling, price, and ease of use. Find out which flashcard app fits your study style.",
  keywords: [
    "deckbase vs anki",
    "anki alternative with AI",
    "AI flashcard app",
    "FSRS vs SM-2",
    "anki alternative mobile",
    "best spaced repetition app 2026",
    "flashcard app comparison",
  ],
  alternates: {
    canonical: "/deckbase-vs-anki",
  },
  openGraph: {
    title: "Deckbase vs Anki: AI Flashcards vs Manual SRS (2026)",
    description:
      "Honest head-to-head comparison of Deckbase and Anki — AI generation, spaced repetition algorithm, pricing, and ease of use.",
    url: "https://deckbase.co/deckbase-vs-anki",
    siteName: "Deckbase",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Deckbase vs Anki Comparison" }],
    locale: "en_US",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Deckbase vs Anki: AI Flashcards vs Manual SRS (2026)",
    description:
      "Honest head-to-head comparison of Deckbase and Anki — AI generation, spaced repetition algorithm, pricing, and ease of use.",
    site: "@DeckbaseApp",
    images: ["/og.png"],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": "https://deckbase.co/deckbase-vs-anki",
      url: "https://deckbase.co/deckbase-vs-anki",
      name: "Deckbase vs Anki: AI Flashcards vs Manual SRS (2026)",
      description:
        "Honest head-to-head comparison of Deckbase and Anki — AI card generation, FSRS vs SM-2, pricing, and ease of use.",
      breadcrumb: {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: "https://deckbase.co" },
          {
            "@type": "ListItem",
            position: 2,
            name: "Deckbase vs Anki",
            item: "https://deckbase.co/deckbase-vs-anki",
          },
        ],
      },
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "Is Deckbase better than Anki?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "It depends on your goals. Deckbase is better for people who want to quickly turn books, PDFs, and notes into flashcards using AI — no manual card creation required. Anki is better for power users who want maximum algorithm configurability and a massive add-on ecosystem. Both use FSRS-based spaced repetition scheduling.",
          },
        },
        {
          "@type": "Question",
          name: "Does Deckbase use the same algorithm as Anki?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Deckbase uses the FSRS (Free Spaced Repetition Scheduler) algorithm. Anki originally used SM-2 and added FSRS support in version 23.10. Both produce scientifically optimized review intervals, but FSRS is a more modern algorithm that better models human memory.",
          },
        },
        {
          "@type": "Question",
          name: "Can I import my Anki decks into Deckbase?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Deckbase supports importing Anki .apkg files, so you can migrate your existing decks without losing your cards.",
          },
        },
        {
          "@type": "Question",
          name: "Is Anki free?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Anki desktop (Windows, Mac, Linux) and AnkiDroid (Android) are free. AnkiMobile for iOS costs $24.99 as a one-time purchase. Deckbase offers a free tier (up to 500 cards) and a Premium plan at $4.99/month or $49.99/year.",
          },
        },
        {
          "@type": "Question",
          name: "Which app is easier to use: Deckbase or Anki?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Deckbase is significantly easier to use. Anki has a steep learning curve and often requires watching tutorials and configuring multiple settings before it becomes effective. Deckbase is designed for immediate use — scan or paste content and start reviewing in minutes.",
          },
        },
      ],
    },
  ],
};

const features = [
  { feature: "AI Card Generation", deckbase: "✅ Built-in", anki: "❌ Add-ons only" },
  { feature: "PDF / Book Scanning (OCR)", deckbase: "✅ Yes", anki: "⚠️ Add-ons only" },
  { feature: "Spaced Repetition Algorithm", deckbase: "✅ FSRS", anki: "✅ FSRS / SM-2" },
  { feature: "Algorithm Configurability", deckbase: "⚠️ Standard presets", anki: "✅ Full control" },
  { feature: "Add-ons / Plugins", deckbase: "❌ No", anki: "✅ Thousands" },
  { feature: "Anki .apkg Import", deckbase: "✅ Yes", anki: "✅ Native" },
  { feature: "Desktop App", deckbase: "❌ Mobile only", anki: "✅ Free" },
  { feature: "iOS App", deckbase: "✅ Free tier", anki: "💲 $24.99 one-time" },
  { feature: "Android App", deckbase: "✅ Free tier", anki: "✅ Free (AnkiDroid)" },
  { feature: "Free Tier", deckbase: "✅ Up to 500 cards", anki: "✅ Full (desktop/Android)" },
  { feature: "Paid Plan", deckbase: "$4.99/mo · $49.99/yr", anki: "$24.99 iOS one-time" },
  { feature: "Learning Curve", deckbase: "✅ Easy (minutes)", anki: "⚠️ Steep (hours–days)" },
  { feature: "Card Creation Speed", deckbase: "✅ AI automatic", anki: "❌ Manual (~30s each)" },
  { feature: "Community Deck Library", deckbase: "❌ Limited", anki: "✅ Massive" },
  { feature: "Open Source", deckbase: "❌ No", anki: "✅ Yes" },
];

export default function DeckbaseVsAnki() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="min-h-screen bg-black text-white pt-20">
        {/* Breadcrumb */}
        <nav className="max-w-4xl mx-auto px-4 pt-8 pb-2" aria-label="Breadcrumb">
          <ol className="flex gap-2 text-sm text-gray-400">
            <li>
              <Link href="/" className="hover:text-white transition-colors">
                Home
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="text-gray-200">Deckbase vs Anki</li>
          </ol>
        </nav>

        {/* Hero */}
        <header className="max-w-4xl mx-auto px-4 py-12 text-center">
          <p className="inline-block mb-4 px-3 py-1 rounded-full bg-accent/10 border border-accent/30 text-accent text-sm font-medium">
            App Comparison · Updated March 2026
          </p>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
            Deckbase vs Anki:{" "}
            <span className="bg-gradient-to-r from-accent to-purple-500 bg-clip-text text-transparent">
              Which Is Right for You?
            </span>
          </h1>
          <p className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto mb-8">
            Both apps use scientifically proven spaced repetition. The difference is everything
            else — how you create cards, how long setup takes, and how much you&apos;ll actually
            use it.
          </p>
          {/* Quick verdict badges */}
          <div className="flex flex-wrap justify-center gap-4">
            <div className="px-4 py-2 rounded-lg bg-accent/10 border border-accent/30 text-sm text-gray-200">
              <span className="text-accent font-semibold">Deckbase</span> — Best for: AI-generated
              cards from books &amp; PDFs
            </div>
            <div className="px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-sm text-gray-200">
              <span className="text-gray-100 font-semibold">Anki</span> — Best for: power users
              who want full SRS control
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 pb-24 space-y-20">
          {/* Summary */}
          <section>
            <h2 className="text-2xl md:text-3xl font-bold mb-6">Quick Summary</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="rounded-2xl bg-gray-900 border border-gray-800 p-6">
                <h3 className="text-lg font-semibold text-accent mb-3">Choose Deckbase if…</h3>
                <ul className="space-y-2 text-gray-300 text-sm">
                  <li>✅ You want to turn a book or PDF into flashcards in minutes</li>
                  <li>✅ You hate spending 30 seconds manually typing each card</li>
                  <li>✅ You prefer a clean, mobile-first app you can use immediately</li>
                  <li>✅ You already have Anki decks you want to migrate (.apkg import)</li>
                  <li>✅ You want FSRS scheduling without the configuration overhead</li>
                </ul>
              </div>
              <div className="rounded-2xl bg-gray-900 border border-gray-800 p-6">
                <h3 className="text-lg font-semibold text-gray-200 mb-3">Choose Anki if…</h3>
                <ul className="space-y-2 text-gray-300 text-sm">
                  <li>✅ You&apos;re studying for medical school or language exams long-term</li>
                  <li>✅ You want fine-grained control over scheduling parameters</li>
                  <li>✅ You use a desktop computer and want a free app</li>
                  <li>✅ You rely on community-made shared decks</li>
                  <li>✅ You need add-ons for specialized workflows (MathJax, audio, etc.)</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Feature comparison table */}
          <section>
            <h2 className="text-2xl md:text-3xl font-bold mb-2">
              Feature Comparison Table
            </h2>
            <p className="text-sm text-gray-400 mb-6">
              As of March 2026 — based on publicly available product information.{" "}
              <Link
                href="https://apps.ankiweb.net"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-gray-200"
              >
                Anki
              </Link>{" "}
              data sourced from ankiweb.net.
            </p>
            <div className="overflow-x-auto rounded-2xl border border-gray-800">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-900 text-left">
                    <th className="px-4 py-3 font-semibold text-gray-300 w-1/2">Feature</th>
                    <th className="px-4 py-3 font-semibold text-accent text-center w-1/4">
                      Deckbase
                    </th>
                    <th className="px-4 py-3 font-semibold text-gray-200 text-center w-1/4">
                      Anki
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {features.map((row, i) => (
                    <tr
                      key={row.feature}
                      className={i % 2 === 0 ? "bg-black" : "bg-gray-950"}
                    >
                      <td className="px-4 py-3 text-gray-300">{row.feature}</td>
                      <td className="px-4 py-3 text-center text-gray-200">{row.deckbase}</td>
                      <td className="px-4 py-3 text-center text-gray-200">{row.anki}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Deep dive sections */}
          <section>
            <h2 className="text-2xl md:text-3xl font-bold mb-8">
              Deep Dive: What Actually Matters
            </h2>
            <div className="space-y-10">
              {/* Card creation */}
              <div>
                <h3 className="text-xl font-semibold mb-3 text-accent">
                  Card Creation: 30 Seconds vs 30 Milliseconds
                </h3>
                <p className="text-gray-300 leading-relaxed mb-3">
                  The biggest practical difference between Deckbase and Anki is how you create
                  cards. Anki is entirely manual — you type each question and answer yourself.
                  For a chapter of 40 key concepts, that&apos;s 20+ minutes of data entry before
                  you can even start studying.
                </p>
                <p className="text-gray-300 leading-relaxed">
                  Deckbase reverses this. Photograph a page, paste an article, or upload a PDF
                  and the AI extracts the key concepts and generates Q&A cards automatically.
                  The same 40 cards take under a minute. This isn&apos;t just a convenience
                  feature — it removes the biggest barrier to actually building a study habit.
                </p>
              </div>

              {/* Algorithm */}
              <div>
                <h3 className="text-xl font-semibold mb-3 text-accent">
                  Spaced Repetition: FSRS vs SM-2
                </h3>
                <p className="text-gray-300 leading-relaxed mb-3">
                  Anki originally used the SM-2 algorithm, developed in 1987. It works — decades
                  of users have proven that. In October 2023, Anki added native FSRS (Free Spaced
                  Repetition Scheduler) support, which uses a more modern memory model.
                </p>
                <p className="text-gray-300 leading-relaxed">
                  Deckbase uses FSRS by default. You don&apos;t need to enable it or configure
                  parameters — it&apos;s simply how the scheduler works. If you want to fine-tune
                  scheduling intervals or add custom deck options, Anki gives you deeper control.
                  For most learners, the difference in outcomes is small; the difference in setup
                  time is large.
                </p>
              </div>

              {/* Pricing */}
              <div>
                <h3 className="text-xl font-semibold mb-3 text-accent">
                  Pricing: It&apos;s More Complex Than You Think
                </h3>
                <p className="text-gray-300 leading-relaxed mb-3">
                  Anki desktop is completely free — and so is AnkiDroid on Android. If you study
                  on a phone with Android, Anki costs nothing. But iOS users pay $24.99 once for
                  AnkiMobile — a one-time fee that funds the developer.
                </p>
                <p className="text-gray-300 leading-relaxed">
                  Deckbase is free for up to 500 cards. Beyond that, Premium is $4.99/month or
                  $49.99/year (about $4.17/month). For iPhone users choosing between $24.99
                  one-time Anki and $4.99/month Deckbase, the math depends on how long you plan
                  to study — after about 5 months, Anki&apos;s upfront cost has paid for itself.
                  But Deckbase&apos;s AI features are not available in Anki at any price.
                </p>
              </div>

              {/* Ease of use */}
              <div>
                <h3 className="text-xl font-semibold mb-3 text-accent">
                  Ease of Use: Immediate vs Invested
                </h3>
                <p className="text-gray-300 leading-relaxed mb-3">
                  Anki has a famously steep learning curve. Most new users spend hours on YouTube
                  watching tutorials to understand deck options, card templates, note types, and
                  sync configuration before they&apos;re productive. Many abandon it before
                  seeing results.
                </p>
                <p className="text-gray-300 leading-relaxed">
                  Deckbase is designed to be productive within 5 minutes of installing. The
                  trade-off is less configurability — you get fewer knobs to turn. For most
                  students and casual learners, this is the right trade-off.
                </p>
              </div>
            </div>
          </section>

          {/* CTA */}
          <section className="rounded-2xl bg-gradient-to-br from-accent/10 to-purple-900/20 border border-accent/30 p-8 text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">
              Ready to Try AI-Powered Flashcards?
            </h2>
            <p className="text-gray-300 mb-8 max-w-xl mx-auto">
              Deckbase is free to download. Start turning your books and notes into flashcards
              in minutes — no manual card creation required.
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
                See All Features
              </Link>
            </div>
            <p className="mt-4 text-xs text-gray-500">
              Free tier includes up to 500 cards. No credit card required.
            </p>
          </section>

          {/* FAQ */}
          <section>
            <h2 className="text-2xl md:text-3xl font-bold mb-8">
              Frequently Asked Questions
            </h2>
            <div className="space-y-6">
              {[
                {
                  q: "Is Deckbase better than Anki?",
                  a: "It depends on your goals. Deckbase is better for quickly turning books, PDFs, and notes into flashcards using AI. Anki is better for power users who want maximum algorithm configurability and a massive add-on ecosystem. Both use FSRS-based spaced repetition scheduling.",
                },
                {
                  q: "Does Deckbase use the same algorithm as Anki?",
                  a: "Deckbase uses FSRS (Free Spaced Repetition Scheduler). Anki originally used SM-2 and added FSRS support in version 23.10. Both produce scientifically optimized review intervals — FSRS is the more modern approach.",
                },
                {
                  q: "Can I import my Anki decks into Deckbase?",
                  a: "Yes. Deckbase supports importing Anki .apkg files, so you can migrate your existing decks without losing your cards.",
                },
                {
                  q: "Is Anki completely free?",
                  a: "Anki desktop and AnkiDroid (Android) are free. AnkiMobile for iOS costs $24.99 as a one-time purchase. Deckbase offers a free tier (up to 500 cards) and a Premium plan at $4.99/month or $49.99/year.",
                },
                {
                  q: "Which app is easier to use?",
                  a: "Deckbase is significantly easier. Anki has a steep learning curve requiring hours of tutorials before becoming productive. Deckbase is designed to be useful within 5 minutes of installing.",
                },
              ].map(({ q, a }) => (
                <div key={q} className="rounded-xl bg-gray-900 border border-gray-800 p-6">
                  <h3 className="font-semibold text-white mb-2">{q}</h3>
                  <p className="text-gray-300 text-sm leading-relaxed">{a}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Related comparisons */}
          <section>
            <h2 className="text-xl font-bold mb-4 text-gray-200">Related Comparisons</h2>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/deckbase-vs-quizlet"
                className="px-4 py-2 rounded-lg bg-gray-900 border border-gray-800 text-gray-300 text-sm hover:border-gray-600 transition-colors"
              >
                Deckbase vs Quizlet →
              </Link>
            </div>
          </section>
        </main>
      </div>
    </>
  );
}
