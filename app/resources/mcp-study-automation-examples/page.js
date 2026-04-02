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
  CodeBlock,
} from "@/components/resources/ArticleLayout";

const PAGE_PATH = "/resources/mcp-study-automation-examples";
const pageUrl = absoluteUrl(PAGE_PATH);
const homeUrl = absoluteUrl("/");
const publishedAt = "2026-03-27";
const updatedAt = "2026-03-27";
const orgId = `${homeUrl}/#organization`;
const authorId = `${homeUrl}/#deckbase-editorial`;

export const metadata = {
  title: "MCP Study Automation Examples: Practical Deck and Card Workflows",
  description:
    "Real MCP workflow examples for study automation: list decks, inspect template schemas, and create cards safely with consistent structure.",
  keywords: [
    "MCP study automation",
    "MCP flashcard examples",
    "Deckbase MCP workflows",
    "create cards with MCP",
    "template schema MCP",
  ],
  alternates: defaultLanguageAlternates(PAGE_PATH),
  openGraph: {
    title: "MCP Study Automation Examples",
    description:
      "Practical examples for creating and managing flashcards through MCP-based automation.",
    url: pageUrl,
    siteName: "Deckbase",
    images: [{ url: "/app_logo.webp", width: 512, height: 512, alt: "MCP study automation examples" }],
    locale: "en_US",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "MCP Study Automation Examples",
    description: "Concrete MCP examples for reliable deck and card automation.",
    site: "@DeckbaseApp",
    images: ["/app_logo.webp"],
  },
  robots: { index: true, follow: true },
};

const faqs = [
  {
    q: "What is the safest MCP pattern before writing cards?",
    a: "Always run list_templates and get_template_schema first, then map your content to required block IDs before create_card or create_cards.",
  },
  {
    q: "Can I automate bulk card creation?",
    a: "Yes, but use batches and validate outputs to avoid polluting decks with malformed or repetitive cards.",
  },
  {
    q: "Do MCP automations replace manual review?",
    a: "No. MCP speeds up creation; learners still need quality control and daily review discipline for retention.",
  },
];

const automationModes = [
  ["Pilot mode", "10-25 cards", "Validate schema mapping and review quality"],
  ["Weekly production mode", "25-75 cards", "Keep duplicate rate low and spot-check outputs"],
  ["Bulk migration mode", "75-200 cards", "Require staged rollouts and strict failure logging"],
  ["Maintenance mode", "As needed", "Repair weak cards and update templates incrementally"],
];

const guardrailRows = [
  ["Template validation", "Wrong block mapping writes unusable cards", "Always run get_template_schema before writes"],
  ["Deck targeting", "Cards land in wrong deck", "Explicitly pass deckId and verify against list_decks"],
  ["Dedupe control", "Repeated prompts pollute reviews", "Check prompt uniqueness inside each batch"],
  ["Post-write sampling", "Silent quality regressions", "Manual sample 10-20% of newly created cards"],
  ["Failure logging", "Hard to fix recurring mapper bugs", "Persist failed records with source + error reason"],
];

const failureRows = [
  ["Schema mismatch errors", "Template changed but mapper did not", "Refresh schema and remap required block IDs"],
  ["Cards created with blank fields", "Source normalization missing", "Add preflight validation for required values"],
  ["High duplicate prompt rate", "Weak dedupe logic", "Hash normalized front-side text before create_cards"],
  ["Low retention after automation", "Prompts too broad or low-context", "Introduce card-quality lint rules"],
  ["Deck clutter after large runs", "No rollout gates", "Use staged batches and pause on quality threshold failure"],
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": `${pageUrl}#webpage`,
      url: pageUrl,
      name: "MCP Study Automation Examples",
      description: "Examples for deck and card automation workflows using MCP.",
      datePublished: publishedAt,
      dateModified: updatedAt,
      isPartOf: { "@type": "WebSite", name: "Deckbase", url: homeUrl },
      breadcrumb: {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: homeUrl },
          { "@type": "ListItem", position: 2, name: "Resources", item: absoluteUrl("/resources") },
          { "@type": "ListItem", position: 3, name: "MCP automation examples", item: pageUrl },
        ],
      },
    },
    {
      "@type": "Article",
      "@id": `${pageUrl}#article`,
      mainEntityOfPage: { "@id": `${pageUrl}#webpage` },
      headline: "MCP Study Automation Examples: Practical Deck and Card Workflows",
      description:
        "Operational examples for reliable study automation with template-safe MCP workflows.",
      author: { "@id": authorId },
      publisher: { "@id": orgId },
      datePublished: publishedAt,
      dateModified: updatedAt,
      image: absoluteUrl("/app_logo.webp"),
      about: ["MCP", "Automation", "Flashcards"],
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

export default function McpStudyAutomationExamplesPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ArticleShell>
        <ArticleBreadcrumb
          crumbs={[
            { label: "Home", href: "/" },
            { label: "Resources", href: "/resources" },
            { label: "MCP automation examples" },
          ]}
        />
        <ArticleHeader
          kicker="Guide · Resources"
          title="MCP study automation examples that are actually production-safe"
          lead="Good MCP automations do more than 'create cards.' They verify deck context, template schema, and field mapping before writes."
          author="Deckbase Editorial Team"
          readTime="6 min read"
        />

        <ArticleSection id="flow">
          <ArticleH2>Recommended automation flow</ArticleH2>
          <ArticleSteps
            items={[
              "List decks and choose an explicit deck target instead of relying on defaults.",
              "List templates and fetch schema for the selected template.",
              "Map source content to required fields and normalize tone/length.",
              "Create cards in small batches, then run spot checks before large runs.",
            ]}
          />
          <CodeBlock>{`# Typical tool-call sequence
list_decks
list_templates
get_template_schema(templateId)
create_cards(deckId, templateId, cards[])`}</CodeBlock>
        </ArticleSection>

        <ArticleSection id="examples">
          <ArticleH2>Three high-value automation examples</ArticleH2>
          <ArticleSteps
            items={[
              "Weekly article-to-cards digest for language or exam prep topics.",
              "PDF chapter conversion pipeline with dedupe and card-length constraints.",
              "Incorrect-card repair job that rewrites low-quality prompts after review sessions.",
            ]}
          />
          <ArticleBody>
            These patterns work because they combine automation with explicit constraints instead of
            trusting model output blindly.
          </ArticleBody>
        </ArticleSection>

        <ArticleSection id="validation">
          <ArticleH2>Validation checks before and after create_cards</ArticleH2>
          <ArticleBody>
            Reliable automation uses a guardrail contract, not only a prompt. Before writes, verify
            deckId and templateId exist and ensure each card contains required fields. After writes,
            sample-check new cards for duplicated prompts and malformed answers.
          </ArticleBody>
          <CodeBlock>{`{
  "preflight": {
    "deck_exists": true,
    "template_exists": true,
    "required_fields_present": true,
    "batch_size": 25
  },
  "post_write": {
    "created": 25,
    "failed": 0,
    "spot_check_count": 5,
    "duplicate_prompt_rate": "<2%"
  }
}`}</CodeBlock>
          <ArticleBody>
            Keeping batch size between 20 and 50 cards limits blast radius when a mapping bug slips
            through and makes rollback easier.
          </ArticleBody>
        </ArticleSection>

        <ArticleSection id="failure-handling">
          <ArticleH2>Failure handling pattern for production runs</ArticleH2>
          <ArticleSteps
            items={[
              "Stop on schema mismatch; do not retry with guessed fields.",
              "Log failed records with source snippet and error reason.",
              "Patch mapper rules, then rerun only failed records.",
              "Run a final spot-check before enabling the next full batch.",
            ]}
          />
          <ArticleBody>
            This pattern keeps data quality high and prevents silent corruption of established study
            decks.
          </ArticleBody>
        </ArticleSection>

        <ArticleSection id="automation-modes">
          <ArticleH2>Automation modes by workload</ArticleH2>
          <ArticleBody>
            A common mistake is using the same MCP strategy for every workload. Reliable systems use
            different operating modes based on risk and volume. Small pilot batches optimize learning,
            while larger production runs prioritize safety and observability.
          </ArticleBody>
          <ArticleTable
            columns={["Mode", "Typical batch size", "Primary objective"]}
            rows={automationModes}
          />
          <ArticleBody>
            Start in pilot mode until your prompt format and template mapping are stable. Scale only
            when sampled card quality remains consistently high.
          </ArticleBody>
        </ArticleSection>

        <ArticleSection id="guardrails">
          <ArticleH2>Guardrails that keep MCP card automation reliable</ArticleH2>
          <ArticleBody>
            Production-safe automation is mostly guardrails. Model output quality can vary across runs,
            so deterministic checks are essential before and after write operations.
          </ArticleBody>
          <ArticleTable
            columns={["Guardrail", "Why it matters", "Implementation"]}
            rows={guardrailRows}
          />
          <ArticleBody>
            These controls reduce silent failure modes and protect active study decks from malformed
            imports.
          </ArticleBody>
        </ArticleSection>

        <ArticleSection id="quality-linting">
          <ArticleH2>Card-quality linting rules before create_cards</ArticleH2>
          <ArticleBody>
            Treat card generation like a content pipeline with linting. If a card fails lint rules,
            reject it before write. This improves downstream retention and reduces manual cleanup.
          </ArticleBody>
          <ArticleSteps
            items={[
              "Enforce one recall target per card; reject prompts that ask two questions at once.",
              "Cap front-side prompt length to avoid overloaded recall steps.",
              "Require non-empty answer fields and context tags for ambiguous terms.",
              "Block cards with near-identical prompts in the same batch.",
              "Sample and rate a subset before promoting batch to main deck.",
            ]}
          />
          <CodeBlock>{`# pseudo validation contract
if (!deckId || !templateId) reject("missing target")
if (!requiredFieldsPresent(card)) reject("schema violation")
if (isDuplicatePrompt(card.front)) reject("duplicate")
if (card.front.length > 180) reject("prompt too long")`}</CodeBlock>
        </ArticleSection>

        <ArticleSection id="failure-matrix">
          <ArticleH2>Failure matrix for fast incident response</ArticleH2>
          <ArticleBody>
            When a run goes wrong, fast classification is more important than perfect diagnosis.
            Categorize errors, fix one class at a time, and rerun only failed records.
          </ArticleBody>
          <ArticleTable
            columns={["Failure signal", "Likely root cause", "First recovery action"]}
            rows={failureRows}
          />
          <ArticleBody>
            This pattern keeps your MCP workflows resilient while preserving study continuity for
            learners already using the affected decks.
          </ArticleBody>
        </ArticleSection>

        <ArticleSection id="weekly-ops">
          <ArticleH2>Weekly operations routine for MCP automation</ArticleH2>
          <ArticleSteps
            items={[
              "Audit last week’s failed records and patch mapper rules where needed.",
              "Review duplicate and blank-field rates across recent batches.",
              "Spot-check 20 newly generated cards for clarity and retention suitability.",
              "Retire weak prompt patterns and update generation instructions.",
              "Document one measurable improvement for next week’s run.",
            ]}
          />
          <ArticleBody>
            Weekly operations are what make automation sustainable. Without this layer, batch quality
            tends to drift and review performance declines over time.
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
              { href: "/resources/mcp", label: "Deckbase MCP for flashcards" },
              { href: "/resources/ocr-study-workflows", label: "OCR study workflows" },
              { href: "/docs/mcp-server", label: "MCP server reference docs" },
            ]}
          />
        </ArticleSection>

        <ArticleFooter>
          Last updated March 2026. Start with setup at{" "}
          <Link href="/mcp" className="text-accent hover:underline underline-offset-2">
            /mcp
          </Link>{" "}
          and use docs for tool-level parameters.
        </ArticleFooter>
      </ArticleShell>
    </>
  );
}
