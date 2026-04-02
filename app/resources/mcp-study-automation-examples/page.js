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
