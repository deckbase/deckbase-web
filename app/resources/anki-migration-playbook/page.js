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
  ArticleList,
  ArticleFaq,
  ArticleRelated,
  ArticleFooter,
  Code,
} from "@/components/resources/ArticleLayout";

const PAGE_PATH = "/resources/anki-migration-playbook";
const pageUrl = absoluteUrl(PAGE_PATH);
const homeUrl = absoluteUrl("/");
const publishedAt = "2026-04-03";
const updatedAt = "2026-04-03";
const orgId = `${homeUrl}/#organization`;
const authorId = `${homeUrl}/#deckbase-editorial`;

export const metadata = {
  title: "Anki to Deckbase Migration Playbook (CSV, APKG, QA Checklist)",
  description:
    "Step-by-step Anki migration playbook: APKG and CSV paths, field mapping matrix, duplicate cleanup, and a 14-day stabilization plan.",
  keywords: [
    "anki import csv",
    "anki migration playbook",
    "anki deck cleanup",
    "migrate from anki",
    "anki to deckbase",
  ],
  alternates: defaultLanguageAlternates(PAGE_PATH),
  openGraph: {
    title: "Anki to Deckbase Migration Playbook",
    description:
      "Implementation guide for APKG/CSV migration with quality gates and a low-risk rollout sequence.",
    url: pageUrl,
    siteName: "Deckbase",
    images: [{ url: "/app_logo.webp", width: 512, height: 512, alt: "Anki migration playbook" }],
    locale: "en_US",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Anki to Deckbase Migration Playbook",
    description: "APKG/CSV migration workflow with QA checklist and stabilization metrics.",
    site: "@DeckbaseApp",
    images: ["/app_logo.webp"],
  },
  robots: { index: true, follow: true },
};

const mappingRows = [
  ["Front", "Prompt text", "One concept only", "Split overloaded cards before import"],
  ["Back", "Expected answer", "Direct answer first", "Keep long explanations in notes"],
  ["Tags", "Topic grouping", "Consistent taxonomy", "Use domain/chapter naming"],
  ["Extra / Notes", "Context support", "Short and optional", "Avoid embedding answer clues"],
  ["Media", "Visual/audio context", "Attached and readable", "Verify broken references in sample"],
];

const gateRows = [
  ["Comprehension", ">=90% sampled cards understandable", "Prompt format is ambiguous or noisy"],
  ["Duplicate rate", "<3% duplicate front prompts", "Batch has repeated definitions or headings"],
  ["Session load", "Session time increase <15% WoW", "Imported cards are too verbose"],
  ["Lapse trend", "Stable or improving by week 2", "Prompt quality is low for core topics"],
];

const scenarioRows = [
  [
    "Exam sprint (8-12 weeks)",
    "Keep daily completion stable",
    "Import only active decks, pause archive migration",
  ],
  [
    "Long-term language study",
    "Preserve sentence context",
    "CSV path with strict field normalization",
  ],
  [
    "Team migration",
    "Template consistency",
    "Publish one canonical mapping before bulk import",
  ],
  [
    "Archive cleanup",
    "Retire low-yield decks",
    "Migrate by topic and drop stale cards early",
  ],
];

const faqs = [
  {
    q: "Should I use APKG or CSV first?",
    a: "Use APKG first for fast structure transfer. Use CSV when you need strict field cleanup or template normalization before scale.",
  },
  {
    q: "How many decks should I migrate at once?",
    a: "Start with one active deck and stabilize for 7-14 days. Expand only when completion, session time, and lapse trend stay healthy.",
  },
  {
    q: "Can I keep Anki and Deckbase in parallel during migration?",
    a: "Yes. Many learners keep legacy decks in Anki while creating net-new cards in Deckbase, then consolidate once quality controls are stable.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": `${pageUrl}#webpage`,
      url: pageUrl,
      name: "Anki to Deckbase Migration Playbook",
      description:
        "Operational migration playbook with APKG/CSV paths, mapping matrix, and quality gates.",
      datePublished: publishedAt,
      dateModified: updatedAt,
      isPartOf: { "@type": "WebSite", name: "Deckbase", url: homeUrl },
      breadcrumb: {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: homeUrl },
          { "@type": "ListItem", position: 2, name: "Resources", item: absoluteUrl("/resources") },
          { "@type": "ListItem", position: 3, name: "Anki migration playbook", item: pageUrl },
        ],
      },
    },
    {
      "@type": "Article",
      "@id": `${pageUrl}#article`,
      mainEntityOfPage: { "@id": `${pageUrl}#webpage` },
      headline: "Anki to Deckbase Migration Playbook",
      description:
        "A practical rollout sequence for migrating Anki decks with minimal risk to review consistency.",
      author: { "@id": authorId },
      publisher: { "@id": orgId },
      datePublished: publishedAt,
      dateModified: updatedAt,
      image: absoluteUrl("/app_logo.webp"),
      about: ["Anki import", "Flashcard migration", "Spaced repetition workflow"],
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

export default function AnkiMigrationPlaybookPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ArticleShell>
        <ArticleBreadcrumb
          crumbs={[
            { label: "Home", href: "/" },
            { label: "Resources", href: "/resources" },
            { label: "Anki migration playbook" },
          ]}
        />
        <ArticleHeader
          kicker="Guide · Resources"
          title="Anki to Deckbase migration playbook"
          lead="A low-risk migration workflow for APKG and CSV paths, with explicit quality gates so import speed does not damage retention quality."
          author="Deckbase Editorial Team"
          readTime="8 min read"
        />

        <ArticleSection id="who-this-is-for">
          <ArticleH2>Who this playbook is for</ArticleH2>
          <ArticleBody>
            This guide is for learners who already have active Anki decks and want a structured move
            to Deckbase without breaking daily review consistency. If you are searching for <Code>anki
            import csv</Code>, this is the implementation path that separates quick transfer from
            quality stabilization.
          </ArticleBody>
        </ArticleSection>

        <ArticleSection id="pre-migration-checklist">
          <ArticleH2>Pre-migration checklist</ArticleH2>
          <ArticleSteps
            items={[
              "Back up every source deck before first import.",
              "List active decks from the last 30 days and migrate those first.",
              "Define pass/fail quality gates before scaling beyond one deck.",
              "Set a daily review floor (time-based or cards-based) to protect habit continuity.",
            ]}
          />
        </ArticleSection>

        <ArticleSection id="path-a-apkg">
          <ArticleH2>Path A: APKG-first migration</ArticleH2>
          <ArticleBody>
            Use APKG when speed and structure preservation matter most. This path is ideal for a first
            migration wave where the goal is continuity, not perfect cleanup.
          </ArticleBody>
          <ArticleList
            items={[
              "Import one active deck and inspect a 30-card sample immediately.",
              "Fix high-impact issues only: unreadable prompts, broken media, obvious duplicates.",
              "Resume review in the same day instead of pausing for large cosmetic edits.",
            ]}
          />
        </ArticleSection>

        <ArticleSection id="path-b-csv">
          <ArticleH2>Path B: CSV-first migration</ArticleH2>
          <ArticleBody>
            Use CSV when field-level normalization is required. CSV takes longer up front, but it is
            easier to enforce naming consistency, template rules, and deduplication at scale.
          </ArticleBody>
          <ArticleSteps
            items={[
              "Normalize field names and term formatting before import.",
              "Create one canonical mapping for prompt, answer, tags, and context.",
              "Import a pilot batch first and pass all quality gates before full rollout.",
            ]}
          />
        </ArticleSection>

        <ArticleSection id="mapping-matrix">
          <ArticleH2>Field mapping matrix</ArticleH2>
          <ArticleTable
            columns={[
              "Field",
              "Purpose",
              "Quality rule",
              "Operational note",
            ]}
            rows={mappingRows}
          />
        </ArticleSection>

        <ArticleSection id="quality-gates">
          <ArticleH2>Batch quality gates</ArticleH2>
          <ArticleBody>
            Run gates before every new import batch. If one gate fails, pause new imports and repair
            card quality first. This keeps problems small and prevents backlog debt.
          </ArticleBody>
          <ArticleTable
            columns={["Gate", "Pass threshold", "Fail signal"]}
            rows={gateRows}
          />
        </ArticleSection>

        <ArticleSection id="stabilization-plan">
          <ArticleH2>14-day stabilization protocol</ArticleH2>
          <ArticleSteps
            items={[
              "Days 1-3: migrate one active deck and restart daily reviews immediately.",
              "Days 4-7: repair top failing cards and deduplicate front prompts.",
              "Days 8-10: standardize tags/templates and validate session-time trend.",
              "Days 11-14: scale migration only if completion and lapse metrics remain healthy.",
            ]}
          />
        </ArticleSection>

        <ArticleSection id="scenario-guidance">
          <ArticleH2>Scenario-based migration guidance</ArticleH2>
          <ArticleTable
            columns={["Scenario", "Primary objective", "Recommended approach"]}
            rows={scenarioRows}
          />
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
              {
                href: "https://code-your-reality.ghost.io/how-to-import-your-anki-decks-into-deckbase-csv-excel-and-more/",
                label: "Published blog: How to import your Anki decks",
              },
              { href: "/deckbase-vs-anki", label: "Deckbase vs Anki" },
            ]}
          />
        </ArticleSection>

        <ArticleFooter>
          Need the top-level overview first? Read the published post on migration strategy, then come
          back to this playbook for execution. Start from{" "}
          <Link href="/resources/anki-import-export" className="text-accent hover:underline underline-offset-2">
            Anki import/export guide
          </Link>
          .
        </ArticleFooter>
      </ArticleShell>
    </>
  );
}
