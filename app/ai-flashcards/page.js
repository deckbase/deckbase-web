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
  ArticleCardGrid,
  ArticleCard,
  ArticleFaq,
  ArticleCta,
  ArticleRelated,
  ArticleFooter,
} from "@/components/resources/ArticleLayout";

const PAGE_PATH = "/ai-flashcards";
const pageUrl = absoluteUrl(PAGE_PATH);
const homeUrl = absoluteUrl("/");
const resourcesUrl = absoluteUrl("/resources");
const publishedAt = "2026-03-29";
const updatedAt = "2026-03-29";
const orgId = `${homeUrl}/#organization`;
const authorId = `${homeUrl}/#deckbase-editorial`;

export const metadata = {
  title: "AI Flashcard Maker — Generate Flashcards from PDFs, Notes & Books",
  description:
    "Deckbase is an AI flashcard maker and generator: turn PDFs, lecture notes, and articles into study-ready cards. FSRS spaced repetition, iOS and Android apps, optional MCP for Cursor and Claude. Free tier for manual cards; AI generation is a paid feature.",
  keywords: [
    "AI flashcard maker",
    "AI flashcards",
    "ai flashcard generator",
    "flashcard maker",
    "flash card generator",
    "PDF to flashcards",
    "PDF to flashcards AI",
    "flashcards from notes",
    "ai flashcard app",
    "spaced repetition flashcards",
    "anki alternative",
    "Deckbase",
  ],
  alternates: defaultLanguageAlternates(PAGE_PATH),
  openGraph: {
    title: "AI Flashcard Maker — PDFs, Notes & Books to Cards | Deckbase",
    description:
      "Generate AI flashcards from your materials, review with FSRS, study on iOS and Android, and connect editors via MCP.",
    url: pageUrl,
    siteName: "Deckbase",
    images: [
      {
        url: "/app_logo.webp",
        width: 512,
        height: 512,
        alt: "Deckbase AI flashcard maker",
      },
    ],
    locale: "en_US",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Flashcard Maker — Deckbase",
    description:
      "AI-generated flashcards from PDFs and notes, FSRS scheduling, mobile sync, optional MCP for AI tools.",
    site: "@DeckbaseApp",
    images: ["/app_logo.webp"],
  },
  robots: { index: true, follow: true },
};

const pillars = [
  {
    title: "Flashcard maker from real material",
    body: "Use Deckbase as a flashcard maker and generator: upload PDFs, paste notes, or scan pages — AI-assisted creation (on paid plans) proposes cards aligned to your deck templates so you edit, then review.",
  },
  {
    title: "Retention-first scheduling",
    body: "FSRS-style spaced repetition adapts intervals to what you actually remember, reducing cram and forgotten decks.",
  },
  {
    title: "Study where you are",
    body: "Web dashboard plus iOS and Android apps keep queues and media in sync for daily review.",
  },
  {
    title: "MCP for power users",
    body: "Pro and VIP can use hosted MCP at /api/mcp so Cursor, VS Code, and Claude Code can list decks and create cards from your editor — still synced to the app.",
  },
];

const faqs = [
  {
    q: "Is Deckbase a free AI flashcard generator?",
    a: (
      <>
        You can use Deckbase on a free tier with manual cards and core study flows.
        AI-powered card generation and other premium capabilities require a paid plan
        (Basic or Pro). See{" "}
        <Link href="/premium">Pricing</Link>{" "}
        for current limits.
      </>
    ),
    answerPlain:
      "You can use Deckbase on a free tier with manual cards and core study flows. AI-powered card generation and other premium capabilities require a paid plan (Basic or Pro). See the Pricing page for current limits.",
  },
  {
    q: "Is Deckbase an AI flashcard generator and flashcard maker?",
    a: "Yes. Subscribers can generate flashcards from text and documents using AI, organized into decks and templates you control. You can edit cards anytime before review.",
    answerPlain:
      "Yes. Subscribers can generate flashcards from text and documents using AI, organized into decks and templates you control. You can edit cards anytime before review.",
  },
  {
    q: "Can I make flashcards from a PDF?",
    a: "Yes. Upload PDFs and other supported sources (per plan) and use Deckbase as a PDF-to-flashcards workflow: proposed cards open in the editor so you confirm wording before study.",
    answerPlain:
      "Yes. Upload PDFs and other supported sources (per plan) and use Deckbase as a PDF-to-flashcards workflow: proposed cards open in the editor so you confirm wording before study.",
  },
  {
    q: "Is there an AI flashcard app for iPhone or Android?",
    a: (
      <>
        Yes. Deckbase has iOS and Android apps plus a web dashboard so your decks and
        review queue stay in sync. Get the apps from our{" "}
        <Link href="/download">download page</Link>
        .
      </>
    ),
    answerPlain:
      "Yes. Deckbase has iOS and Android apps plus a web dashboard so your decks and review queue stay in sync. Get the apps from the official download page.",
  },
  {
    q: "Is Deckbase an Anki alternative?",
    a: (
      <>
        Many learners use Deckbase alongside or instead of Anki for AI-assisted creation
        and mobile-first study. We support Anki import paths for migration. Read{" "}
        <Link href="/anki-alternatives">Anki alternatives</Link> and{" "}
        <Link href="/deckbase-vs-anki">Deckbase vs Anki</Link>{" "}
        for an honest comparison.
      </>
    ),
    answerPlain:
      "Many learners use Deckbase alongside or instead of Anki for AI-assisted creation and mobile-first study. We support Anki import paths for migration. See Anki alternatives and Deckbase vs Anki for an honest comparison.",
  },
  {
    q: "How is this different from Quizlet AI flashcards?",
    a: (
      <>
        Deckbase emphasizes FSRS-style scheduling, deep mobile workflows, optional MCP for
        developers, and Anki-friendly migration paths. For a direct comparison, see{" "}
        <Link href="/deckbase-vs-quizlet">Deckbase vs Quizlet</Link>
        .
      </>
    ),
    answerPlain:
      "Deckbase emphasizes FSRS-style scheduling, deep mobile workflows, optional MCP for developers, and Anki-friendly migration paths. For a direct comparison, see Deckbase vs Quizlet.",
  },
  {
    q: "What is MCP in Deckbase?",
    a: (
      <>
        Model Context Protocol lets supported AI tools call Deckbase’s HTTP MCP endpoint
        with your API key to manage decks and cards. Start on{" "}
        <Link href="/mcp">/mcp</Link> or read{" "}
        <Link href="/resources/mcp">Deckbase MCP for flashcards</Link>
        .
      </>
    ),
    answerPlain:
      "Model Context Protocol lets supported AI tools call Deckbase’s HTTP MCP endpoint with your API key to manage decks and cards. Setup and comparison guides live on /mcp and /resources/mcp.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": pageUrl,
      url: pageUrl,
      name: "AI Flashcard Maker — Deckbase",
      description:
        "AI flashcard maker with FSRS scheduling, mobile apps, and optional MCP for AI coding tools.",
      datePublished: publishedAt,
      dateModified: updatedAt,
      breadcrumb: {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: homeUrl },
          { "@type": "ListItem", position: 2, name: "Resources", item: resourcesUrl },
          { "@type": "ListItem", position: 3, name: "AI flashcards", item: pageUrl },
        ],
      },
    },
    {
      "@type": "Article",
      "@id": `${pageUrl}#article`,
      mainEntityOfPage: { "@id": pageUrl },
      headline: "AI Flashcard Maker — Generate Flashcards from PDFs, Notes & Books",
      description:
        "Product overview of Deckbase as an AI flashcard maker with spaced repetition and optional MCP.",
      author: { "@id": authorId },
      publisher: { "@id": orgId },
      datePublished: publishedAt,
      dateModified: updatedAt,
      image: absoluteUrl("/app_logo.webp"),
      about: [
        "AI flashcards",
        "Flashcard maker",
        "PDF to flashcards",
        "Spaced repetition",
        "Model Context Protocol",
      ],
    },
    {
      "@type": "Organization",
      "@id": orgId,
      name: "Deckbase",
      url: homeUrl,
      logo: absoluteUrl("/app_logo.webp"),
    },
    {
      "@type": "Person",
      "@id": authorId,
      name: "Deckbase Editorial Team",
      url: homeUrl,
    },
    {
      "@type": "FAQPage",
      mainEntity: faqs.map(({ q, answerPlain }) => ({
        "@type": "Question",
        name: q,
        acceptedAnswer: { "@type": "Answer", text: answerPlain },
      })),
    },
  ],
};

export default function AiFlashcardsPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <ArticleShell>
        <ArticleBreadcrumb
          crumbs={[
            { label: "Home", href: "/" },
            { label: "Resources", href: "/resources" },
            { label: "AI flashcards" },
          ]}
        />

        <ArticleHeader
          kicker="Product · Updated March 2026"
          title="AI flashcard maker for real study workflows"
          lead="Use Deckbase as an AI flashcard maker and generator: turn notes, PDFs, and articles into cards you can refine, then review with FSRS-style spaced repetition on web, iPhone, and Android. Optional MCP connects Cursor, VS Code, and Claude Code to the same library."
          readTime="6 min read"
        />

        <ArticleSection id="why">
          <ArticleH2>Built for creation speed and long-term retention</ArticleH2>
          <ArticleCardGrid cols={2}>
            {pillars.map((p) => (
              <ArticleCard key={p.title} title={p.title}>
                {p.body}
              </ArticleCard>
            ))}
          </ArticleCardGrid>
          <ArticleBody>
            For a broader market view (not only Deckbase), see{" "}
            <Link
              href="/best-flashcard-apps"
              className="text-accent hover:underline underline-offset-2"
            >
              Best flashcard apps
            </Link>{" "}
            and{" "}
            <Link
              href="/quizlet-alternatives"
              className="text-accent hover:underline underline-offset-2"
            >
              Quizlet alternatives
            </Link>
            .
          </ArticleBody>
        </ArticleSection>

        <ArticleSection id="pdf-notes">
          <ArticleH2>PDF and notes to flashcards</ArticleH2>
          <ArticleBody>
            People search for a{" "}
            <strong>flashcard maker from PDF</strong> or a{" "}
            <strong>PDF-to-flashcards</strong> workflow — Deckbase is built around
            turning lecture PDFs and notes into draft cards, then letting you edit
            before they enter your review queue. Paste text, upload documents, or
            combine sources; keep quality high by treating AI output as a starting
            point, not the final answer.
          </ArticleBody>
        </ArticleSection>

        <ArticleSection id="app-web">
          <ArticleH2>AI flashcard app: web, iOS, and Android</ArticleH2>
          <ArticleBody>
            Deckbase works as an <strong>AI flashcard app</strong> on phones and in
            the browser: same decks, sync, and scheduling whether you create on
            desktop or review on the go. Grab the{" "}
            <Link href="/download" className="text-accent hover:underline underline-offset-2">
              iOS and Android apps
            </Link>{" "}
            or sign in on the web — your study session should not depend on a single
            device.
          </ArticleBody>
        </ArticleSection>

        <ArticleSection id="anki-bridge">
          <ArticleH2>From Anki, Quizlet, or other tools</ArticleH2>
          <ArticleBody>
            If you are comparing an <strong>Anki alternative</strong> or moving from
            Quizlet, Deckbase fits learners who want AI-assisted creation with FSRS
            scheduling and strong mobile review. Start with{" "}
            <Link
              href="/anki-alternatives"
              className="text-accent hover:underline underline-offset-2"
            >
              Anki alternatives
            </Link>
            , then dive into{" "}
            <Link
              href="/deckbase-vs-anki"
              className="text-accent hover:underline underline-offset-2"
            >
              Deckbase vs Anki
            </Link>{" "}
            or{" "}
            <Link
              href="/deckbase-vs-quizlet"
              className="text-accent hover:underline underline-offset-2"
            >
              Deckbase vs Quizlet
            </Link>{" "}
            for feature-level trade-offs.
          </ArticleBody>
        </ArticleSection>

        <ArticleSection id="mcp">
          <ArticleH2>MCP + flashcards</ArticleH2>
          <ArticleBody>
            If you use AI coding assistants, Deckbase exposes a{" "}
            <strong>Model Context Protocol</strong> server so tools can read docs and manage decks
            and cards over HTTP — the same data syncs to the Deckbase app. Start at{" "}
            <Link href="/mcp" className="text-accent hover:underline underline-offset-2">
              /mcp
            </Link>{" "}
            or read the deeper comparison on{" "}
            <Link
              href="/resources/mcp"
              className="text-accent hover:underline underline-offset-2"
            >
              Deckbase MCP for flashcards
            </Link>
            .
          </ArticleBody>
        </ArticleSection>

        <ArticleSection id="cta">
          <ArticleCta
            title="Try Deckbase"
            description="Free tier includes unlimited cards. Upgrade when you want AI generation, MCP, and more."
            primaryHref="/download"
            primaryLabel="Download"
            secondaryHref="/features"
            secondaryLabel="Features"
          />
        </ArticleSection>

        <ArticleSection id="faq">
          <ArticleH2>Frequently asked questions</ArticleH2>
          <ArticleFaq items={faqs} />
        </ArticleSection>

        <ArticleSection id="related">
          <ArticleH2>Related</ArticleH2>
          <ArticleRelated
            links={[
              { href: "/anki-alternatives", label: "Anki alternatives" },
              { href: "/mcp", label: "Connect Deckbase MCP" },
              { href: "/resources/mcp", label: "MCP for flashcards (guide)" },
              { href: "/deckbase-vs-quizlet", label: "Deckbase vs Quizlet" },
              { href: "/deckbase-vs-anki", label: "Deckbase vs Anki" },
              { href: "/features", label: "All features" },
            ]}
          />
        </ArticleSection>

        <ArticleFooter>
          Last updated March 2026. Features and plans change — see in-app and pricing for current limits.
        </ArticleFooter>
      </ArticleShell>
    </>
  );
}
