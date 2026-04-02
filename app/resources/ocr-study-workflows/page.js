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
} from "@/components/resources/ArticleLayout";

const PAGE_PATH = "/resources/ocr-study-workflows";
const pageUrl = absoluteUrl(PAGE_PATH);
const homeUrl = absoluteUrl("/");
const publishedAt = "2026-03-27";
const updatedAt = "2026-03-27";
const orgId = `${homeUrl}/#organization`;
const authorId = `${homeUrl}/#deckbase-editorial`;

export const metadata = {
  title: "OCR Study Workflows: Turn Books and PDFs Into Better Flashcards",
  description:
    "Practical OCR study workflow for learners: capture pages, clean extraction noise, generate cards, and keep a reliable spaced-repetition routine.",
  keywords: [
    "OCR flashcards",
    "scan textbook to flashcards",
    "PDF to flashcards workflow",
    "study workflow OCR",
    "AI flashcard OCR",
  ],
  alternates: defaultLanguageAlternates(PAGE_PATH),
  openGraph: {
    title: "OCR Study Workflows: Books and PDFs to Flashcards",
    description:
      "How to run OCR-based study workflows with fewer noisy cards and better retention outcomes.",
    url: pageUrl,
    siteName: "Deckbase",
    images: [{ url: "/app_logo.webp", width: 512, height: 512, alt: "OCR study workflow guide" }],
    locale: "en_US",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "OCR Study Workflows for Flashcards",
    description: "Capture, clean, generate, and review: a reliable OCR study pipeline.",
    site: "@DeckbaseApp",
    images: ["/app_logo.webp"],
  },
  robots: { index: true, follow: true },
};

const faqs = [
  {
    q: "What is the biggest OCR mistake in flashcard workflows?",
    a: "Skipping cleanup. Raw OCR output often includes headers, footers, and artifacts that create low-quality cards and waste review time.",
  },
  {
    q: "Should I scan full chapters at once?",
    a: "Usually no. Smaller chunks (one concept block at a time) produce cleaner cards and reduce correction effort.",
  },
  {
    q: "Do OCR workflows work for non-text subjects?",
    a: "Yes, but you should pair OCR text with context notes for diagrams, equations, or edge-case terminology.",
  },
];

const workflowScenarios = [
  [
    "Textbook-heavy exam prep",
    "High page volume, strict recall needs",
    "Scan chapter sections, clean noise first, cap daily new cards",
  ],
  [
    "Language learning",
    "Mixed phrases, examples, and edge cases",
    "Prefer sentence-level captures and keep bilingual context fields",
  ],
  [
    "Certification while working",
    "Limited daily study window",
    "Use short OCR batches, prioritize high-yield concepts only",
  ],
  [
    "Long-term reference building",
    "Durability over speed",
    "Tag by domain and run weekly cleanup of low-quality cards",
  ],
];

const qualityGates = [
  ["Legibility", "Text stays clear at normal zoom", "Rescan pages with blur or glare"],
  ["Extraction noise", "Headers/footers removed", "Strip repeated fragments before generation"],
  ["Prompt clarity", "One concept per card", "Split overloaded cards immediately"],
  ["Duplicate rate", "Under 2-3% in sampled batch", "Deduplicate by prompt + answer pair"],
  ["Review friction", "Session time stable week-over-week", "Lower new-card intake and improve weak cards"],
];

const troubleshootingRows = [
  ["Cards feel random or disconnected", "Chunks too large during OCR capture", "Capture by concept block, not full pages"],
  ["Too many near-duplicate cards", "Repeated headings and definitions from source", "Normalize and dedupe before import"],
  ["High lapse rate after one week", "Ambiguous prompts and weak context", "Rewrite top failing cards and add context tags"],
  ["Review sessions keep getting longer", "Unfiltered low-yield cards", "Archive low-value cards and enforce quality gate"],
  ["Math/notation cards break", "OCR errors on symbols", "Use manual correction or typed fallback for critical formulas"],
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": `${pageUrl}#webpage`,
      url: pageUrl,
      name: "OCR Study Workflows: Turn Books and PDFs Into Better Flashcards",
      description:
        "Operational guide for OCR-based learning workflows and flashcard quality control.",
      datePublished: publishedAt,
      dateModified: updatedAt,
      isPartOf: { "@type": "WebSite", name: "Deckbase", url: homeUrl },
      breadcrumb: {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: homeUrl },
          { "@type": "ListItem", position: 2, name: "Resources", item: absoluteUrl("/resources") },
          { "@type": "ListItem", position: 3, name: "OCR study workflows", item: pageUrl },
        ],
      },
    },
    {
      "@type": "Article",
      "@id": `${pageUrl}#article`,
      mainEntityOfPage: { "@id": `${pageUrl}#webpage` },
      headline: "OCR Study Workflows: Turn Books and PDFs Into Better Flashcards",
      description: "Practical process for capture, cleanup, generation, and review using OCR inputs.",
      author: { "@id": authorId },
      publisher: { "@id": orgId },
      datePublished: publishedAt,
      dateModified: updatedAt,
      image: absoluteUrl("/app_logo.webp"),
      about: ["OCR", "Flashcards", "Study workflow"],
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

export default function OcrStudyWorkflowsPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ArticleShell>
        <ArticleBreadcrumb
          crumbs={[
            { label: "Home", href: "/" },
            { label: "Resources", href: "/resources" },
            { label: "OCR study workflows" },
          ]}
        />
        <ArticleHeader
          kicker="Guide · Resources"
          title="OCR study workflows: from raw pages to reliable flashcards"
          lead="The fastest way to fail OCR learning is generating cards from noisy text. This guide gives a practical pipeline that keeps quality high and review load manageable."
          author="Deckbase Editorial Team"
          readTime="6 min read"
        />

        <ArticleSection id="pipeline">
          <ArticleH2>The 4-step OCR pipeline</ArticleH2>
          <ArticleSteps
            items={[
              "Capture clean input (good lighting, straight pages, avoid shadows and cropped margins).",
              "Remove OCR noise (headers, page numbers, repeated fragments, broken sentence tails).",
              "Generate draft cards and enforce one-concept-per-card structure.",
              "Review daily and fix bad cards immediately when they fail during recall.",
            ]}
          />
        </ArticleSection>

        <ArticleSection id="quality">
          <ArticleH2>Quality controls that matter most</ArticleH2>
          <ArticleBody>
            OCR-based workflows are high-throughput, so small quality issues scale quickly. Prioritize
            three checks: concept granularity, unambiguous prompts, and concise answers. If a card
            asks two questions at once, split it.
          </ArticleBody>
          <ArticleBody>
            For technical subjects, add one short context line (for example, &quot;cardiac physiology&quot;)
            so similar terms do not collide during reviews.
          </ArticleBody>
        </ArticleSection>

        <ArticleSection id="capture-scorecard">
          <ArticleH2>Capture quality scorecard (use before generation)</ArticleH2>
          <ArticleSteps
            items={[
              "Legibility: text is sharp at normal zoom, no motion blur, and no heavy glare patches.",
              "Framing: full lines are visible and page margins are not clipped by camera edges.",
              "Noise control: headers/footers and page numbers are isolated so they can be removed quickly.",
              "Chunk size: scan by concept block rather than whole chapters to reduce correction load.",
            ]}
          />
          <ArticleBody>
            If two or more checks fail, rescan before card generation. A 60-second rescan usually
            saves much more time than repairing dozens of low-quality cards later.
          </ArticleBody>
        </ArticleSection>

        <ArticleSection id="repair-rules">
          <ArticleH2>When to edit cards vs regenerate from source</ArticleH2>
          <ArticleBody>
            Edit the card when the extraction is mostly correct and the issue is phrasing or
            granularity. Regenerate from source when OCR introduces factual corruption, missing
            negations, broken formulas, or mixed sections from unrelated paragraphs.
          </ArticleBody>
          <ArticleBody>
            A simple rule works well: if you need more than 20-30 seconds to fix a single card,
            regenerate that batch from cleaner input and re-review with stricter chunking.
          </ArticleBody>
        </ArticleSection>

        <ArticleSection id="scenario-playbooks">
          <ArticleH2>Scenario playbooks for OCR study workflows</ArticleH2>
          <ArticleBody>
            OCR workflows should match your study objective, not just your source format. A student
            preparing for a licensing exam needs tighter card quality controls than a learner creating
            a long-term personal knowledge archive. Choose a workflow mode based on time pressure,
            recall risk, and available review capacity.
          </ArticleBody>
          <ArticleTable
            columns={["Scenario", "Primary constraint", "Recommended workflow"]}
            rows={workflowScenarios}
          />
          <ArticleBody>
            If you are unsure, start with a conservative mode: smaller OCR batches, stricter cleanup,
            and a slower new-card rate. This minimizes review fatigue while preserving recall quality.
          </ArticleBody>
        </ArticleSection>

        <ArticleSection id="quality-gates">
          <ArticleH2>Quality gates before cards enter daily review</ArticleH2>
          <ArticleBody>
            The most reliable OCR systems use explicit pass/fail gates. Without gates, low-quality
            cards leak into active decks, where they consume time and reduce trust in your review
            process. A 5-minute quality checkpoint can save hours of downstream cleanup.
          </ArticleBody>
          <ArticleTable
            columns={["Gate", "Pass condition", "If failed"]}
            rows={qualityGates}
          />
          <ArticleBody>
            Apply gates per batch before pushing cards into your main review queue. When a batch fails,
            pause ingestion, fix root causes, and rerun only affected cards.
          </ArticleBody>
        </ArticleSection>

        <ArticleSection id="weekly-operations">
          <ArticleH2>Weekly OCR operations checklist</ArticleH2>
          <ArticleBody>
            Treat OCR card creation as an operational pipeline. Weekly maintenance prevents drift in
            card quality as content volume grows.
          </ArticleBody>
          <ArticleSteps
            items={[
              "Review top 20 failed cards and classify cause: extraction noise, ambiguity, overload, or missing context.",
              "Deduplicate newly generated cards before they enter long-term decks.",
              "Update capture standards (lighting, crop, chunk size) based on recent failure patterns.",
              "Measure review time trend; if rising, reduce new cards and improve card quality first.",
              "Document one process improvement and test it in the next week.",
            ]}
          />
          <ArticleBody>
            This maintenance loop keeps throughput high without sacrificing recall quality. The goal is
            not maximum card count; it is maximum useful recall per minute reviewed.
          </ArticleBody>
        </ArticleSection>

        <ArticleSection id="failure-recovery">
          <ArticleH2>Failure recovery when OCR quality drops</ArticleH2>
          <ArticleBody>
            If your lapse rate spikes after a large OCR run, do not add more cards immediately. Run a
            structured recovery cycle to stabilize the deck.
          </ArticleBody>
          <ArticleSteps
            items={[
              "Stop new OCR imports for 3-5 days and focus on existing review completion.",
              "Sample 30-50 failing cards and identify the top two failure sources.",
              "Rewrite or regenerate only those failure clusters first.",
              "Resume imports in smaller batches and keep quality gates active.",
            ]}
          />
          <ArticleTable
            columns={["Symptom", "Likely cause", "First fix"]}
            rows={troubleshootingRows}
          />
          <ArticleBody>
            Most learners recover quickly when they reduce noise and tighten capture standards. Once
            batch quality is stable, you can scale volume safely again.
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
              { href: "/resources/fsrs-guide", label: "FSRS practical guide" },
              { href: "/resources/anki-import-export", label: "Anki import/export migration guide" },
              { href: "/resources/mcp-study-automation-examples", label: "MCP study automation examples" },
            ]}
          />
        </ArticleSection>

        <ArticleFooter>
          Last updated March 2026. For capture and generation capabilities, see{" "}
          <Link href="/features" className="text-accent hover:underline underline-offset-2">
            features
          </Link>
          .
        </ArticleFooter>
      </ArticleShell>
    </>
  );
}
