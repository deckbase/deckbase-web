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

const migrationModes = [
  ["Clean split", "Keep old decks in Anki, create new decks in Deckbase", "Low risk", "Learners who want immediate momentum"],
  ["Progressive merge", "Import active Anki decks and standardize templates over time", "Medium", "Users consolidating to one system"],
  ["Full cutover", "Move all decks quickly and enforce one template system", "High", "Teams with strict migration deadlines"],
];

const cleanupPriorityRows = [
  ["Prompt ambiguity", "Directly raises lapse rate", "Rewrite with one clear recall target"],
  ["Overloaded cards", "Inconsistent ratings and long review time", "Split into smaller atomic cards"],
  ["Duplicate prompts", "Wasted review budget", "Deduplicate by prompt + answer pair"],
  ["Formatting noise", "Lower readability during reviews", "Normalize punctuation and line breaks"],
  ["Missing context tags", "Cross-topic confusion", "Add concise domain or chapter tags"],
];

const weekMetricsRows = [
  ["Review completion", ">=80% planned days", "Stability of study habit"],
  ["Average time per session", "Flat or declining", "Workflow efficiency"],
  ["Lapse rate trend", "Down by week 2-3", "Card quality + scheduler fit"],
  ["Import cleanup backlog", "Shrinking each week", "Operational health of migration"],
];

const scenarioRows = [
  [
    "Medical exam prep (8-16 weeks)",
    "Protect review consistency under time pressure",
    "Migrate only active decks first, keep strict daily cap, defer cosmetic cleanup",
  ],
  [
    "Language learning (ongoing)",
    "Sustainability and low friction",
    "Progressive merge with sentence-context template standardization",
  ],
  [
    "Team/shared content migration",
    "Template consistency across users",
    "Define canonical template rules before high-volume imports",
  ],
  [
    "Personal archive cleanup",
    "Avoid carrying low-quality legacy cards",
    "Import by topic and retire low-yield decks early",
  ],
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

        <ArticleSection id="readiness-checklist">
          <ArticleH2>Migration readiness checklist (before you move everything)</ArticleH2>
          <ArticleSteps
            items={[
              "Identify your active decks from the last 30 days first. Move those before archived material.",
              "Set a daily review floor (for example: 15-25 minutes) so migration does not interrupt consistency.",
              "Define your card quality rule: one prompt, one expected answer, one clear context.",
              "Keep one fallback export from each major deck until your first 2 weeks are stable.",
            ]}
          />
          <ArticleBody>
            This approach reduces risk because you migrate the highest-value material first and keep
            a clean rollback path. Most failed migrations come from trying to reformat everything at
            once before review habits stabilize.
          </ArticleBody>
        </ArticleSection>

        <ArticleSection id="two-week-plan">
          <ArticleH2>A practical 14-day transition plan</ArticleH2>
          <ArticleSteps
            items={[
              "Days 1-3: Import one active deck, clean only obvious issues, and resume reviews immediately.",
              "Days 4-7: Add new cards from current study inputs (notes/PDFs) inside Deckbase only.",
              "Days 8-10: Measure friction points (duplicate cards, unclear prompts, overloaded cards) and fix in batches.",
              "Days 11-14: Decide what stays in Anki vs what becomes Deckbase-native, then standardize templates.",
            ]}
          />
          <ArticleBody>
            By the end of week 2, you should have clear evidence on retention quality and workflow
            speed. Keep the setup that preserves daily completion and lowest lapse rate.
          </ArticleBody>
        </ArticleSection>

        <ArticleSection id="choose-migration-mode">
          <ArticleH2>Choose the right migration mode</ArticleH2>
          <ArticleBody>
            Not every learner should migrate the same way. A clean split is usually safest for
            individual learners who need continuity. Progressive merge is better when you want one
            eventual library but cannot afford a disruption period. Full cutover is fastest, but it
            carries higher risk if card quality controls are weak.
          </ArticleBody>
          <ArticleTable
            columns={["Mode", "How it works", "Risk", "Best for"]}
            rows={migrationModes}
          />
          <ArticleBody>
            If you are unsure, start with clean split for 2-4 weeks, then move into progressive merge
            once your daily review completion is stable and your cleanup backlog is under control.
          </ArticleBody>
        </ArticleSection>

        <ArticleSection id="cleanup-priorities">
          <ArticleH2>Post-import cleanup priorities (in order)</ArticleH2>
          <ArticleBody>
            The highest leverage move is fixing only what affects recall quality first. Cosmetic edits
            can wait. Many migrations fail because users spend days formatting cards while neglecting
            prompt clarity, duplicates, and card granularity.
          </ArticleBody>
          <ArticleTable
            columns={["Issue", "Why it matters", "First action"]}
            rows={cleanupPriorityRows}
          />
          <ArticleBody>
            Use short cleanup sessions (20-30 minutes) after daily reviews. This keeps momentum intact
            and avoids rebuilding the entire deck library before seeing retention results.
          </ArticleBody>
        </ArticleSection>

        <ArticleSection id="weekly-metrics">
          <ArticleH2>Weekly migration scorecard</ArticleH2>
          <ArticleBody>
            During migration, run one lightweight scorecard every 7 days. This helps you detect early
            friction before it becomes a motivation problem. If completion is falling or session time
            spikes, reduce incoming card volume and prioritize card rewrites over new imports.
          </ArticleBody>
          <ArticleTable
            columns={["Metric", "Healthy signal", "What it indicates"]}
            rows={weekMetricsRows}
          />
          <ArticleBody>
            A strong migration trend is simple: completion stays high, lapse rate declines, and backlog
            of broken cards shrinks each week.
          </ArticleBody>
        </ArticleSection>

        <ArticleSection id="failure-recovery">
          <ArticleH2>Failure recovery: what to do if migration quality drops</ArticleH2>
          <ArticleSteps
            items={[
              "Pause new imports for 3-5 days and stabilize daily review completion first.",
              "Identify top 50 failing cards and classify causes (ambiguity, overload, duplicates, context mismatch).",
              "Rewrite those cards, then remeasure lapse rate after one week before expanding imports.",
              "Reintroduce imports in small batches and stop immediately if session time spikes again.",
            ]}
          />
          <ArticleBody>
            This recovery loop works because it protects your retention system before adding more
            complexity. In most cases, users recover faster by reducing volume and improving card
            design rather than tuning advanced scheduler settings.
          </ArticleBody>
        </ArticleSection>

        <ArticleSection id="scenario-playbooks">
          <ArticleH2>Scenario playbooks: choose migration strategy by context</ArticleH2>
          <ArticleBody>
            Migration advice is most useful when it maps to your real constraints. A learner preparing
            for a high-stakes exam needs a different rollout than someone gradually modernizing a
            personal archive. The table below helps you select a mode quickly and avoid over-migrating
            before your daily review habit is stable.
          </ArticleBody>
          <ArticleTable
            columns={["Scenario", "Main objective", "Recommended migration approach"]}
            rows={scenarioRows}
          />
          <ArticleBody>
            If two scenarios overlap, choose the lower-risk path first. In practice, consistency beats
            speed: a slower migration with stable reviews almost always outperforms a fast migration
            that disrupts your study loop.
          </ArticleBody>
        </ArticleSection>

        <ArticleSection id="template-standardization">
          <ArticleH2>Template standardization before large imports</ArticleH2>
          <ArticleBody>
            Template mismatch is one of the most expensive migration mistakes. If similar concepts are
            represented with different field structures, review quality drops and batch automation
            becomes unreliable. Before large imports, define one default template for each card type
            (definition, cloze-like recall, bilingual vocabulary, formula recall, etc.).
          </ArticleBody>
          <ArticleSteps
            items={[
              "Define required fields for each card type and keep naming consistent across decks.",
              "Set formatting rules for prompts and answers (length, punctuation, context style).",
              "Map legacy fields to new template fields before batch imports start.",
              "Validate 20-30 sample cards manually before scaling to full deck imports.",
            ]}
          />
          <ArticleBody>
            Standardization is not busywork. It increases rating consistency, lowers cleanup backlog,
            and improves long-term maintainability when new cards are added from OCR or MCP workflows.
          </ArticleBody>
        </ArticleSection>

        <ArticleSection id="quality-acceptance-gates">
          <ArticleH2>Quality acceptance gates for each migration batch</ArticleH2>
          <ArticleBody>
            Use explicit pass/fail gates before importing the next batch. This prevents low-quality
            cards from spreading across active decks and protects daily review confidence.
          </ArticleBody>
          <ArticleSteps
            items={[
              "Gate 1: At least 90% of sampled cards are understandable without editing.",
              "Gate 2: Duplicate prompt rate stays below 2-3% in the current batch.",
              "Gate 3: Average session time does not increase more than 10-15% week-over-week.",
              "Gate 4: Lapse trend is stable or improving after one week of normal review.",
            ]}
          />
          <ArticleBody>
            If any gate fails, stop new imports and run a focused repair sprint. Correcting issues at
            batch size 50 is far cheaper than fixing the same pattern after 2,000 imported cards.
          </ArticleBody>
        </ArticleSection>

        <ArticleSection id="post-migration-operations">
          <ArticleH2>Post-migration operations: keep the library healthy</ArticleH2>
          <ArticleBody>
            Migration is complete only when your weekly operations are stable. After cutover, run a
            light maintenance rhythm so deck quality does not drift over time.
          </ArticleBody>
          <ArticleSteps
            items={[
              "Run a weekly duplicate check on recently imported decks.",
              "Tag and rewrite cards with repeated lapses rather than increasing review load globally.",
              "Archive low-yield legacy decks that no longer support current goals.",
              "Document one workflow improvement per month (capture, cleanup, template, or review policy).",
            ]}
          />
          <ArticleBody>
            This operational layer is what keeps migration gains durable. Without it, card quality can
            regress and recreate the same friction that triggered migration in the first place.
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
