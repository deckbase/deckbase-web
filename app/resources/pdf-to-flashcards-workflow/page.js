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

const PAGE_PATH = "/resources/pdf-to-flashcards-workflow";
const pageUrl = absoluteUrl(PAGE_PATH);
const homeUrl = absoluteUrl("/");
const publishedAt = "2026-04-03";
const updatedAt = "2026-04-03";
const orgId = `${homeUrl}/#organization`;
const authorId = `${homeUrl}/#deckbase-editorial`;

export const metadata = {
  title: "PDF to Flashcards Workflow (OCR Cleanup + Quality Gates)",
  description:
    "Operational workflow to convert PDFs into high-quality flashcards: OCR cleanup, chunking rules, card QA gates, and a weekly maintenance loop.",
  keywords: [
    "flashcard maker from pdf",
    "pdf to flashcards workflow",
    "ocr flashcards",
    "pdf flashcard quality gates",
    "study workflow pdf",
  ],
  alternates: defaultLanguageAlternates(PAGE_PATH),
  openGraph: {
    title: "PDF to Flashcards Workflow",
    description:
      "A repeatable OCR-to-card process with quality controls that protect review outcomes.",
    url: pageUrl,
    siteName: "Deckbase",
    images: [{ url: "/app_logo.webp", width: 512, height: 512, alt: "PDF to flashcards workflow" }],
    locale: "en_US",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "PDF to Flashcards Workflow",
    description: "OCR cleanup, chunking protocol, and card QA gates for high-retention decks.",
    site: "@DeckbaseApp",
    images: ["/app_logo.webp"],
  },
  robots: { index: true, follow: true },
};

const sourceRows = [
  ["Textbook PDF", "Headers, footers, page numbers", "Crop noise and merge sentence fragments"],
  ["Slide decks", "Bullet fragments and context loss", "Convert bullets to full statements before generation"],
  ["Scanned notes", "OCR ambiguity and symbol errors", "Use smaller chunks and manual correction for key terms"],
  ["Research PDFs", "Dense paragraphs and citation clutter", "Extract definitions/claims before examples"],
];

const gateRows = [
  ["Prompt clarity", "One recall target per card", "Split cards asking multiple questions"],
  ["Answer scope", "Short direct answer first", "Move long explanation to context field"],
  ["Duplicate control", "Duplicate prompts under 3%", "Deduplicate by normalized front text"],
  ["Session friction", "Stable daily session time", "Lower card intake and repair weak cards"],
  ["Lapse trend", "Improves by end of week 2", "Rebuild source chunk with cleaner OCR"],
];

const pilotRows = [
  ["Review completion", ">=80% planned days", "Your workflow is operationally sustainable"],
  ["Avg session time", "Flat or declining", "Card quality is not adding hidden load"],
  ["Rewrite ratio", "<20% of pilot cards", "Generation quality is acceptable for scale"],
  ["Lapse concentration", "Focused in few tags", "Targeted repair can recover quality"],
];

const faqs = [
  {
    q: "Can I run this as a free PDF-to-flashcards workflow?",
    a: "Yes for pilots. Free tiers are usually enough to validate chunking and quality gates. Scale often requires paid tiers for volume and throughput.",
  },
  {
    q: "Should I upload full chapters at once?",
    a: "No. Concept-sized chunks create cleaner cards and reduce rewrite effort. Large batches hide OCR noise until review sessions become expensive.",
  },
  {
    q: "When should I regenerate instead of editing cards?",
    a: "Regenerate when OCR introduces factual corruption, broken symbols, or mixed sections. Edit only when the source extraction is mostly correct.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": `${pageUrl}#webpage`,
      url: pageUrl,
      name: "PDF to Flashcards Workflow",
      description:
        "Operational guide for converting PDF and OCR inputs into review-ready flashcards.",
      datePublished: publishedAt,
      dateModified: updatedAt,
      isPartOf: { "@type": "WebSite", name: "Deckbase", url: homeUrl },
      breadcrumb: {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: homeUrl },
          { "@type": "ListItem", position: 2, name: "Resources", item: absoluteUrl("/resources") },
          { "@type": "ListItem", position: 3, name: "PDF to flashcards workflow", item: pageUrl },
        ],
      },
    },
    {
      "@type": "Article",
      "@id": `${pageUrl}#article`,
      mainEntityOfPage: { "@id": `${pageUrl}#webpage` },
      headline: "PDF to Flashcards Workflow",
      description:
        "A repeatable process for OCR cleanup, card generation, quality gating, and weekly maintenance.",
      author: { "@id": authorId },
      publisher: { "@id": orgId },
      datePublished: publishedAt,
      dateModified: updatedAt,
      image: absoluteUrl("/app_logo.webp"),
      about: ["PDF to flashcards", "OCR study workflow", "Spaced repetition quality"],
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

export default function PdfToFlashcardsWorkflowPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ArticleShell>
        <ArticleBreadcrumb
          crumbs={[
            { label: "Home", href: "/" },
            { label: "Resources", href: "/resources" },
            { label: "PDF to flashcards workflow" },
          ]}
        />
        <ArticleHeader
          kicker="Guide · Resources"
          title="PDF to flashcards workflow: OCR to review-ready cards"
          lead="A practical system for converting PDFs into high-retention flashcards without flooding your review queue with noisy cards."
          author="Deckbase Editorial Team"
          readTime="8 min read"
        />

        <ArticleSection id="when-it-works">
          <ArticleH2>When PDF conversion works (and when it fails)</ArticleH2>
          <ArticleBody>
            The workflow succeeds when source quality is controlled, chunk size is small, and every
            batch passes explicit QA gates. Most failures come from importing large OCR blocks without
            cleanup, then trying to repair card quality during daily reviews.
          </ArticleBody>
          <ArticleBody>
            If you found this while searching for <Code>flashcard maker from pdf</Code>, treat
            generation as draft creation. The retention gains come from gating and maintenance, not
            from one-click conversion alone.
          </ArticleBody>
        </ArticleSection>

        <ArticleSection id="input-requirements">
          <ArticleH2>Input quality requirements</ArticleH2>
          <ArticleTable
            columns={["Source type", "Common issue", "Recommended preparation"]}
            rows={sourceRows}
          />
        </ArticleSection>

        <ArticleSection id="chunking-protocol">
          <ArticleH2>Chunking protocol (concept units, not chapters)</ArticleH2>
          <ArticleSteps
            items={[
              "Split source by concept block before generation.",
              "Keep each chunk narrow enough to produce 5-30 focused cards.",
              "Avoid mixed-topic chunks that create ambiguous prompts.",
              "Attach source tags (chapter/topic) at generation time.",
            ]}
          />
        </ArticleSection>

        <ArticleSection id="generation-pattern">
          <ArticleH2>Generation settings and prompt pattern</ArticleH2>
          <ArticleBody>
            For stable output, request one concept per card, direct answer-first responses, and short
            context fields. If prompts are long or mixed, quality will drop even with good OCR input.
          </ArticleBody>
          <ArticleList
            items={[
              "Prompt: one recall question only.",
              "Answer: concise and specific before examples.",
              "Context: optional short support note, not hidden answer text.",
              "Tags: source + topic for fast failure analysis.",
            ]}
          />
        </ArticleSection>

        <ArticleSection id="quality-gates">
          <ArticleH2>Card quality gates</ArticleH2>
          <ArticleTable
            columns={["Gate", "Pass criterion", "Fix action"]}
            rows={gateRows}
          />
        </ArticleSection>

        <ArticleSection id="seven-day-pilot">
          <ArticleH2>7-day pilot with pass/fail metrics</ArticleH2>
          <ArticleSteps
            items={[
              "Days 1-2: convert one active topic (target under 120 cards).",
              "Days 3-5: run normal daily review and repair top failing cards.",
              "Days 6-7: evaluate pilot metrics before expanding source volume.",
            ]}
          />
          <ArticleTable
            columns={["Metric", "Healthy signal", "Why it matters"]}
            rows={pilotRows}
          />
        </ArticleSection>

        <ArticleSection id="maintenance-loop">
          <ArticleH2>Weekly maintenance loop</ArticleH2>
          <ArticleBody>
            Protect long-term quality with a fixed weekly loop. Without maintenance, deck quality
            drifts and session length grows even when your scheduler is strong.
          </ArticleBody>
          <ArticleSteps
            items={[
              "Review top failed tags and rewrite weak prompts.",
              "Deduplicate newly added cards by normalized front text.",
              "Archive low-yield cards that repeatedly fail despite edits.",
              "Document one source-cleanup improvement for next batch.",
            ]}
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
              { href: "/resources/ocr-study-workflows", label: "OCR study workflows" },
              {
                href: "https://code-your-reality.ghost.io/how-to-convert-pdf-to-flashcards-with-ai/",
                label: "Published blog: How to convert PDF to flashcards with AI",
              },
              { href: "/ai-flashcards", label: "AI flashcards product page" },
            ]}
          />
        </ArticleSection>

        <ArticleFooter>
          Need the shorter decision version first? Read the published blog, then use this workflow as
          your execution checklist. See{" "}
          <Link href="/resources/ocr-study-workflows" className="text-accent hover:underline underline-offset-2">
            OCR study workflows
          </Link>
          .
        </ArticleFooter>
      </ArticleShell>
    </>
  );
}
