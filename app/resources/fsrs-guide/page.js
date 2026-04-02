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
  ArticleSteps,
  ArticleFaq,
  ArticleRelated,
  ArticleFooter,
  Code,
} from "@/components/resources/ArticleLayout";

const PAGE_PATH = "/resources/fsrs-guide";
const pageUrl = absoluteUrl(PAGE_PATH);
const homeUrl = absoluteUrl("/");
const publishedAt = "2026-03-27";
const updatedAt = "2026-03-27";
const orgId = `${homeUrl}/#organization`;
const authorId = `${homeUrl}/#deckbase-editorial`;

export const metadata = {
  title: "What Is FSRS? Practical Guide to Spaced Repetition for Real Learners",
  description:
    "FSRS explained in plain English: how it differs from old SRS methods, what improves retention, and how to use it in a practical daily study workflow.",
  keywords: [
    "FSRS guide",
    "what is FSRS",
    "spaced repetition explained",
    "FSRS vs SM-2",
    "how to study with FSRS",
  ],
  alternates: defaultLanguageAlternates(PAGE_PATH),
  openGraph: {
    title: "What Is FSRS? Practical Guide to Spaced Repetition",
    description:
      "A practical FSRS guide for students and professionals: core concepts, setup tips, and daily workflow.",
    url: pageUrl,
    siteName: "Deckbase",
    images: [{ url: "/app_logo.webp", width: 512, height: 512, alt: "FSRS guide by Deckbase" }],
    locale: "en_US",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "What Is FSRS? Practical Guide to Spaced Repetition",
    description: "Understand FSRS quickly and use it in a sustainable study workflow.",
    site: "@DeckbaseApp",
    images: ["/app_logo.webp"],
  },
  robots: { index: true, follow: true },
};

const fsrsVsLegacy = [
  ["Scheduling model", "Static/easier heuristics", "Memory-model based, personalized intervals"],
  ["Adaptation speed", "Slower to fit your behavior", "Learns from your ratings continuously"],
  ["Retention target", "Implicit or rigid", "Explicit retention optimization"],
  ["Daily workload", "Can drift over time", "Better balance between recall and volume"],
];

const retentionTargets = [
  ["New topic ramp-up", "85-90%", "Faster card turnover while concepts are unstable"],
  ["Core exam material", "90-93%", "Balanced workload with lower lapse risk"],
  ["Long-term reference", "93-95%", "Higher recall at the cost of more reviews"],
];

const workloadScenarios = [
  ["200 cards, 20 min/day", "90%", "Manageable workload, good baseline for consistency"],
  ["200 cards, 20 min/day", "93%", "Higher recall with moderate extra review load"],
  ["400 cards, 25 min/day", "90%", "Sustainable for many exam learners if card quality is strong"],
  ["400 cards, 25 min/day", "95%", "Often too expensive unless the material is truly high stakes"],
];

const troubleshootingRows = [
  ["Review queue feels overwhelming", "Retention target too high or too many new cards", "Lower new-card rate first, then reduce target by 1-2 points"],
  ["Frequent surprise lapses", "Cards are ambiguous or overstuffed", "Split complex prompts and add context tags"],
  ["Intervals feel too long", "Overrated recall quality", "Rate answers more strictly for two weeks"],
  ["Progress stalls after 2-3 weeks", "No card maintenance loop", "Rewrite weakest cards weekly and remove low-value items"],
];

const faqs = [
  {
    q: "What is FSRS in one sentence?",
    a: "FSRS is a modern spaced-repetition scheduler that predicts when you are likely to forget and schedules reviews at the most efficient time for long-term retention.",
  },
  {
    q: "Is FSRS only for language learners?",
    a: "No. FSRS works for any domain where recall matters: medicine, law, software, certifications, and general knowledge.",
  },
  {
    q: "Do I need to tune complex settings?",
    a: "Most learners do not. A default FSRS setup is usually enough; consistency and good card quality matter more than advanced parameter tuning.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": `${pageUrl}#webpage`,
      url: pageUrl,
      name: "What Is FSRS? Practical Guide to Spaced Repetition",
      description:
        "Plain-English explanation of FSRS, why it improves study outcomes, and how to use it in daily practice.",
      datePublished: publishedAt,
      dateModified: updatedAt,
      isPartOf: { "@type": "WebSite", name: "Deckbase", url: homeUrl },
      breadcrumb: {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: homeUrl },
          { "@type": "ListItem", position: 2, name: "Resources", item: absoluteUrl("/resources") },
          { "@type": "ListItem", position: 3, name: "FSRS guide", item: pageUrl },
        ],
      },
    },
    {
      "@type": "Article",
      "@id": `${pageUrl}#article`,
      mainEntityOfPage: { "@id": `${pageUrl}#webpage` },
      headline: "What Is FSRS? Practical Guide to Spaced Repetition",
      description:
        "Practical FSRS guide: core ideas, comparison with legacy schedulers, and a sustainable daily review routine.",
      author: { "@id": authorId },
      publisher: { "@id": orgId },
      datePublished: publishedAt,
      dateModified: updatedAt,
      image: absoluteUrl("/app_logo.webp"),
      about: ["FSRS", "Spaced repetition", "Learning science"],
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

export default function FsrsGuidePage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ArticleShell>
        <ArticleBreadcrumb
          crumbs={[
            { label: "Home", href: "/" },
            { label: "Resources", href: "/resources" },
            { label: "FSRS guide" },
          ]}
        />
        <ArticleHeader
          kicker="Guide · Resources"
          title="What is FSRS? A practical guide to spaced repetition"
          lead="FSRS (Free Spaced Repetition Scheduler) is a modern review scheduler that predicts forgetting and times reviews for maximum long-term recall with minimal wasted effort."
          author="Deckbase Editorial Team"
          readTime="6 min read"
        />

        <ArticleSection id="definition">
          <ArticleH2>What FSRS means in practice</ArticleH2>
          <ArticleBody>
            FSRS is not just &quot;review later.&quot; It continuously estimates memory strength from your
            review history and picks a next interval that balances retention and workload. In
            practical terms, that means fewer unnecessary reviews and fewer surprise lapses.
          </ArticleBody>
          <ArticleBody>
            If your goal is to remember material for months (not just next week), FSRS gives a more
            stable schedule than older fixed-heuristic approaches.
          </ArticleBody>
        </ArticleSection>

        <ArticleSection id="comparison">
          <ArticleH2>FSRS vs older schedulers</ArticleH2>
          <ArticleTable columns={["Category", "Older SRS", "FSRS"]} rows={fsrsVsLegacy} />
        </ArticleSection>

        <ArticleSection id="workflow">
          <ArticleH2>Simple daily FSRS workflow</ArticleH2>
          <ArticleSteps
            items={[
              <>
                Keep cards atomic: one fact or concept per prompt. Smaller cards improve both
                recall and scheduler accuracy.
              </>,
              <>
                Study daily in short sessions (10-20 minutes). FSRS benefits from consistent review
                signals more than occasional long sessions.
              </>,
              <>
                Rate honestly after recall. Overrating hard cards leads to long intervals and avoidable
                forgetting.
              </>,
              <>
                Prioritize quality sources. For Deckbase users, scanning books/PDFs then editing AI drafts
                keeps card quality high.
              </>,
            ]}
          />
          <ArticleBody>
            In Deckbase, this is usually &quot;capture source → generate cards → edit → review.&quot; If you
            create cards through MCP, follow your template schema with <Code>get_template_schema</Code>{" "}
            before bulk writes.
          </ArticleBody>
        </ArticleSection>

        <ArticleSection id="retention-targets">
          <ArticleH2>How to pick a retention target</ArticleH2>
          <ArticleBody>
            FSRS works best when your target retention matches your context. A single universal number
            is rarely optimal: aggressive targets can inflate workload, while low targets can produce
            avoidable forgetting before high-stakes exams.
          </ArticleBody>
          <ArticleTable
            columns={["Study context", "Suggested retention target", "Why"]}
            rows={retentionTargets}
          />
          <ArticleBody>
            Start near 90-92% for most learners, then adjust after 2-3 weeks by looking at real
            outcomes: overdue count, daily review time, and lapse frequency. Small changes are usually
            better than large jumps.
          </ArticleBody>
        </ArticleSection>

        <ArticleSection id="card-quality-checklist">
          <ArticleH2>Card quality checklist for better FSRS results</ArticleH2>
          <ArticleSteps
            items={[
              <>Use one clear question per card. Ambiguous prompts create noisy ratings and weaker interval predictions.</>,
              <>Prefer concrete answers over broad summaries. Specific recall events improve scheduling accuracy.</>,
              <>Add context only when needed. Extra text should disambiguate, not overwhelm the recall step.</>,
              <>Review recent lapses weekly and rewrite the worst 10 cards. FSRS performs best when input quality keeps improving.</>,
            ]}
          />
        </ArticleSection>

        <ArticleSection id="workload-planning">
          <ArticleH2>Workload planning: retention is a budget decision</ArticleH2>
          <ArticleBody>
            FSRS is powerful because it makes trade-offs explicit. Higher retention targets can reduce
            forgetting, but they usually increase daily review cost. Lower targets reduce workload,
            but can raise lapse risk before exams. The right setting depends on your available time,
            card volume, and consequence of forgetting.
          </ArticleBody>
          <ArticleBody>
            Instead of chasing a single &quot;best&quot; number, treat retention as a budget: how many minutes
            per day can you actually sustain over months, not just one motivated week? Most learners
            improve faster when they pick a target that they can maintain consistently.
          </ArticleBody>
          <ArticleTable
            columns={["Scenario", "Retention target", "Expected trade-off"]}
            rows={workloadScenarios}
          />
          <ArticleBody>
            A practical default is 90-92% while you stabilize habits. Move upward only when your
            completion rate stays high and your daily review time is predictable.
          </ArticleBody>
        </ArticleSection>

        <ArticleSection id="thirty-day-plan">
          <ArticleH2>A practical 30-day FSRS adoption plan</ArticleH2>
          <ArticleBody>
            The biggest mistake with spaced repetition is optimizing settings before the workflow is
            stable. This 30-day plan prioritizes consistency first, then tuning. It works for medical
            learners, certification prep, language study, and technical domains where recall quality
            matters beyond short-term exams.
          </ArticleBody>
          <ArticleSteps
            items={[
              <>
                <strong className="text-white/75">Days 1-7: establish baseline.</strong> Keep sessions
                short and daily. Cap new cards to a level you can review without backlog growth.
              </>,
              <>
                <strong className="text-white/75">Days 8-14: fix card quality.</strong> Review your
                worst cards and rewrite unclear prompts. Prioritize one concept per card.
              </>,
              <>
                <strong className="text-white/75">Days 15-21: tune retention gently.</strong> If lapses
                are high, increase quality before adjusting retention. If workload is too heavy,
                reduce new cards before lowering retention.
              </>,
              <>
                <strong className="text-white/75">Days 22-30: lock your operating mode.</strong> Keep
                the settings that produce stable completion and acceptable lapse rates, then avoid
                frequent parameter changes.
              </>,
            ]}
          />
          <ArticleBody>
            By day 30, you should know your sustainable card volume, your realistic retention target,
            and where your card authoring process still creates avoidable errors.
          </ArticleBody>
        </ArticleSection>

        <ArticleSection id="troubleshooting">
          <ArticleH2>FSRS troubleshooting guide</ArticleH2>
          <ArticleBody>
            Most FSRS failures are not algorithm failures. They come from poor card inputs, inflated
            self-ratings, or unsustainable new-card volume. Use the table below to diagnose quickly
            before making large configuration changes.
          </ArticleBody>
          <ArticleTable
            columns={["Symptom", "Likely cause", "First fix to try"]}
            rows={troubleshootingRows}
          />
          <ArticleBody>
            Keep troubleshooting iterative. Change one variable at a time and monitor for 7-10 days.
            This prevents confusing signal overlap and helps you identify what actually improved recall.
          </ArticleBody>
        </ArticleSection>

        <ArticleSection id="exam-vs-long-term">
          <ArticleH2>Exam prep vs long-term mastery: two valid FSRS modes</ArticleH2>
          <ArticleBody>
            Exam prep mode emphasizes recall reliability over a fixed horizon (for example 6-12
            weeks), often with moderate-to-high retention targets and strict daily completion. In this
            mode, trimming low-yield cards is usually more effective than endlessly increasing review
            time.
          </ArticleBody>
          <ArticleBody>
            Long-term mastery mode optimizes sustainability across months or years. You may run a
            slightly lower target with higher card quality and cleaner tagging. The objective shifts
            from short-term score maximization to durable knowledge with manageable workload.
          </ArticleBody>
          <ArticleBody>
            Both modes are valid. Choose the one that matches your timeline, then keep rules stable
            long enough to evaluate outcomes from real review data.
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
              { href: "/resources/anki-import-export", label: "Anki import/export migration guide" },
              { href: "/resources/mcp", label: "Deckbase MCP for flashcards" },
              { href: "/best-flashcard-apps", label: "Best flashcard apps (2026)" },
            ]}
          />
        </ArticleSection>

        <ArticleFooter>
          Last updated March 2026. For product details, see{" "}
          <Link href="/features" className="text-accent hover:underline underline-offset-2">
            features
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
