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
  ArticleNote,
  ArticleSteps,
  ArticleFaq,
  ArticleRelated,
  ArticleFooter,
  Code,
  CodeBlock,
} from "@/components/resources/ArticleLayout";
import {
  TerminalAssistantTurn,
  TerminalPromptSection,
  TerminalSessionDivider,
  TerminalUserTurn,
  TerminalWindow,
} from "@/components/resources/ResourceTerminal";

const PAGE_PATH = "/resources/mcp";
const pageUrl = absoluteUrl(PAGE_PATH);
const homeUrl = absoluteUrl("/");
const publishedAt = "2026-03-21";
const updatedAt = "2026-03-26";
const orgId = `${homeUrl}/#organization`;
const authorId = `${homeUrl}/#deckbase-editorial`;

export const metadata = {
  title: "Deckbase MCP for Flashcards: vs Other MCP Servers & How to Create Cards",
  description:
    "Compare Deckbase MCP with other MCP patterns and learn how Pro/VIP users create synced decks and cards from Cursor, Claude Code, and VS Code.",
  keywords: [
    "Deckbase MCP",
    "flashcard MCP",
    "Model Context Protocol flashcards",
    "create flashcards with Cursor",
    "MCP spaced repetition",
    "AI flashcards API",
    "Deckbase API key MCP",
  ],
  alternates: defaultLanguageAlternates(PAGE_PATH),
  openGraph: {
    title: "Deckbase MCP for Flashcards: Comparison & Create Cards from AI Tools",
    description:
      "Compare Deckbase MCP to typical MCP servers and learn how to create decks and cards from your AI editor — synced to mobile.",
    url: pageUrl,
    siteName: "Deckbase",
    images: [{ url: "/app_logo.webp", width: 512, height: 512, alt: "Deckbase MCP for flashcards" }],
    locale: "en_US",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Deckbase MCP for Flashcards: Comparison & How to Create Cards",
    description:
      "MCP comparison for SEO and learners: how Deckbase connects AI tools to your flashcard library.",
    site: "@DeckbaseApp",
    images: ["/app_logo.webp"],
  },
  robots: { index: true, follow: true },
};

const comparisonRows = [
  ["Docs & knowledge MCPs", "Read wikis, Notion, or internal docs inside chat context.", "No — they don't create or sync flashcard decks.", "Deckbase MCP is purpose-built for your library: decks, templates, and cards that show up in the app."],
  ["Repo & filesystem MCPs", "Search code, read files, run terminal-style workflows.", "No — great for engineering work, not spaced-repetition content.", "Use Deckbase MCP when the model should add or update study material, not source code."],
  ["General study apps (no MCP)", "Manual or in-app AI card creation inside one product.", "Usually locked to that app's UI — no standard MCP bridge to your editor.", "Hosted HTTP MCP at /api/mcp with tools like list_decks, get_template_schema, create_card — plus mobile sync."],
  ["Deckbase MCP", "Connect Cursor, Claude Code, VS Code, and other MCP clients to your account.", "Yes — list/create decks and cards using your real templates.", "Cards follow your template schema; changes sync to the Deckbase web dashboard and mobile apps (Pro/VIP, API key)."],
];

const exampleTurns = [
  { role: "user", body: "Can you check my current decks on Deckbase?" },
  { role: "assistant", body: `You have 2 decks on Deckbase:\n\n1. English Phrases (ID: b7ba3351…) — has a default template assigned\n2. Distinction1 (ID: d80019c9…) — no default template` },
  { role: "user", body: "Can you create a new deck?" },
  { role: "assistant", body: "What would you like to name the new deck? And optionally, a description?" },
  { role: "user", body: "Test" },
  { role: "assistant", body: 'Created! New deck "Test" (ID: 0c3cbbfb…) is ready to use.' },
  { role: "user", body: "I'm learning Ukrainian. Can you add some basic vocabulary to Test?" },
  { role: "assistant", body: `No Ukrainian template exists yet, but an English vocabulary–style template can work well (Ukrainian on the front, English on the back). I'll check its schema first.` },
  { role: "user", body: "Can you create a new template for Ukrainian?" },
  { role: "assistant", body: `I'll create a Ukrainian vocabulary template with: Ukrainian word, pronunciation, English meaning (hidden), and an example sentence.\n\nTemplate created — Ukrainian Vocabulary (ID: c1970944…) with 4 blocks:\n• Ukrainian Word (header)\n• Pronunciation (visible)\n• English Meaning (hidden — revealed on flip)\n• Example Sentence (quote)\n\nNow I'll add cards to your Test deck.` },
  {
    role: "assistant",
    body: `Got the block IDs. Creating 10 basic Ukrainian vocabulary cards.\n\n10 cards added to Test. Sample vocabulary:\n\nEach card shows Ukrainian + pronunciation on the front; English meaning stays hidden until you flip; plus an example sentence. Удачі (good luck) with your studies!`,
    table: {
      columns: ["Ukrainian", "Pronunciation", "English"],
      rows: [
        ["Привіт", "Pryvit", "Hello"],
        ["Дякую", "Dyakuyu", "Thank you"],
        ["Будь ласка", "Bud' laska", "Please / You're welcome"],
        ["Так", "Tak", "Yes"],
        ["Ні", "Ni", "No"],
        ["Вода", "Voda", "Water"],
        ["Хліб", "Khlib", "Bread"],
        ["Добрий день", "Dobryy den'", "Good day"],
        ["До побачення", "Do pobachennya", "Goodbye"],
        ["Вибачте", "Vybachte", "Excuse me / Sorry"],
      ],
    },
  },
];

const examplePromptsList = [
  "Can you check my current decks on Deckbase?",
  "Create a new deck called Test.",
  "I'm learning Ukrainian — add some basic vocabulary to that deck.",
  "Can you create a new template for Ukrainian vocabulary?",
];

const faqs = [
  {
    q: "What makes Deckbase MCP different from other MCP servers?",
    a: "Most MCP servers expose documents, repositories, or browser automation. Deckbase MCP exposes your flashcard library: tools to list decks and templates, fetch template schemas, and create or update cards that sync to the Deckbase app — not just text snippets in chat.",
  },
  {
    q: "How do I create cards with Deckbase MCP?",
    a: "Use a Pro or VIP API key from the dashboard, connect your MCP client to the hosted endpoint, then call list_templates, get_template_schema for block IDs, and create_card or create_cards with deckId and the text fields your template expects. Cards appear in your library and sync to mobile.",
  },
  {
    q: "Is Deckbase MCP the same as the MCP setup page?",
    a: "The setup page shows JSON config for Cursor, VS Code, and Claude Code. This guide compares Deckbase to other MCP patterns and walks through creating cards; technical reference is under Docs → MCP Server.",
  },
];

const evaluatorNotes = [
  "This comparison is written from the Deckbase product side and focuses on real card-creation workflows, not generic MCP demos.",
  "Examples prioritize tasks learners actually run: list decks, inspect template schema, and create cards that sync to mobile.",
  "References are aligned with the public MCP docs so implementation details stay verifiable.",
];

const rolloutRows = [
  ["Pilot", "10-25 cards", "Verify template mapping, answer quality, and deck routing"],
  ["Small batch", "25-50 cards", "Check duplicate prompts and malformed back-side fields"],
  ["Scaled run", "50-200 cards", "Track failure logs and rerun failed records only"],
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": `${pageUrl}#webpage`,
      url: pageUrl,
      name: "Deckbase MCP for Flashcards: Comparison & How to Create Cards",
      description: "SEO guide comparing Deckbase MCP to typical MCP servers and explaining how users create flashcards via MCP from AI tools.",
      datePublished: publishedAt,
      dateModified: updatedAt,
      isPartOf: { "@type": "WebSite", name: "Deckbase", url: homeUrl },
      breadcrumb: {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: homeUrl },
          { "@type": "ListItem", position: 2, name: "Resources", item: absoluteUrl("/resources") },
          { "@type": "ListItem", position: 3, name: "Deckbase MCP guide", item: pageUrl },
        ],
      },
    },
    {
      "@type": "Article",
      "@id": `${pageUrl}#article`,
      mainEntityOfPage: { "@id": `${pageUrl}#webpage` },
      headline: "Deckbase MCP for Flashcards: Comparison & How to Create Cards",
      description:
        "Operational guide to compare Deckbase MCP with common MCP patterns and create synced flashcards from AI tools.",
      author: { "@id": authorId },
      publisher: { "@id": orgId },
      datePublished: publishedAt,
      dateModified: updatedAt,
      image: absoluteUrl("/app_logo.webp"),
      about: ["Model Context Protocol", "Flashcards", "Spaced repetition"],
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
      mainEntity: faqs.map(({ q, a }) => ({
        "@type": "Question",
        name: q,
        acceptedAnswer: { "@type": "Answer", text: a },
      })),
    },
  ],
};

export default function ResourcesMcpPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <ArticleShell>
        <ArticleBreadcrumb
          crumbs={[
            { label: "Home", href: "/" },
            { label: "Resources", href: "/resources" },
            { label: "Deckbase MCP" },
          ]}
        />

        <ArticleHeader
          kicker="Guide · Resources"
          title="Deckbase MCP for flashcards: how it compares — and how to create cards"
          lead={
            <>
              Model Context Protocol connects AI assistants to external tools. Most MCP servers help
              with docs or code; Deckbase MCP connects your assistant to{" "}
              <strong className="text-white/75 font-semibold">your decks and cards</strong>, with
              the same content you study in the Deckbase app.
            </>
          }
          readTime="7 min read"
        />

        <ArticleSection id="overview">
          <ArticleH2>Why this page exists</ArticleH2>
          <ArticleBody>
            If you&apos;re searching for{" "}
            <span className="text-white/70">MCP flashcards</span>,{" "}
            <span className="text-white/70">spaced repetition MCP</span>, or{" "}
            <span className="text-white/70">create Anki-style cards from Cursor</span>, you want
            two things: a fair comparison to other MCP patterns, and a clear workflow to actually
            create cards from your editor. Below is both — with links to setup and technical docs.
          </ArticleBody>
          <ArticleBody>
            Most pages about MCP explain the protocol at a high level. This guide is intentionally
            operational: what changes when your assistant can write to a flashcard library with
            template constraints, deck IDs, and sync behavior.
          </ArticleBody>
        </ArticleSection>

        <ArticleSection id="evaluation-method">
          <ArticleH2>How this comparison is evaluated</ArticleH2>
          <ArticleBody>
            To avoid thin comparison content, we evaluate each MCP pattern by one practical
            question: does it complete end-to-end deck and card workflows that are ready for study
            in a spaced-repetition app?
          </ArticleBody>
          <ArticleSteps items={evaluatorNotes} />
        </ArticleSection>

        <ArticleSection id="comparison">
          <ArticleH2>Deckbase MCP vs typical MCP servers</ArticleH2>
          <ArticleBody>
            MCP is a <em>protocol</em>; each server decides what tools it exposes. Here&apos;s how
            Deckbase fits next to common patterns.
          </ArticleBody>
          <ArticleTable
            columns={["Approach", "Typical use", "Deck & card CRUD", "Deckbase angle"]}
            rows={comparisonRows}
          />
        </ArticleSection>

        <ArticleSection id="create-cards-workflow">
          <ArticleH2>How Deckbase users create cards using MCP</ArticleH2>
          <ArticleBody>
            Production MCP is <strong className="text-white/70">hosted HTTP</strong>. Send each
            request to the endpoint below with a bearer token (API key from the dashboard, or an
            OAuth access token if enabled). Pro and VIP subscribers can create API keys in the
            dashboard.
          </ArticleBody>
          <CodeBlock>{`POST /api/mcp\nAuthorization: Bearer <API_KEY>`}</CodeBlock>
          <ArticleSteps
            items={[
              <>
                <strong className="text-white/75">Connect the client</strong> — Add the Deckbase
                MCP server URL and bearer token in <Code>Cursor</Code>, <Code>Claude Code</Code>,{" "}
                <Code>VS Code</Code>, or any MCP-compatible client (
                <Link href="/mcp" className="text-accent hover:underline underline-offset-2">
                  step-by-step setup
                </Link>
                ).
              </>,
              <>
                <strong className="text-white/75">Discover structure</strong> — Use{" "}
                <Code>list_decks</Code> and <Code>list_templates</Code>. For block types or JSON
                shapes, use <Code>list_template_block_types</Code> or{" "}
                <Code>list_block_schemas</Code>.
              </>,
              <>
                <strong className="text-white/75">Get the template schema</strong> — Call{" "}
                <Code>get_template_schema</Code> with a <Code>templateId</Code> to get exact{" "}
                <Code>blockId</Code> keys for <Code>block_text</Code> in <Code>create_card</Code>.
              </>,
              <>
                <strong className="text-white/75">Create one or many cards</strong> — Call{" "}
                <Code>create_card</Code> or <Code>create_cards</Code> with <Code>deckId</Code>,
                optional <Code>templateId</Code>, and the text fields the template requires.
              </>,
              <>
                <strong className="text-white/75">Study everywhere</strong> — New cards appear in
                the web dashboard and sync to the Deckbase mobile apps like manually created cards.
              </>,
            ]}
          />
          <ArticleNote variant="info">
            For a concise protocol list (tools, resources, examples), see{" "}
            <Link href="/docs/mcp-server" className="text-accent hover:underline underline-offset-2">
              MCP Server in Docs
            </Link>
            .
          </ArticleNote>
          <ArticleBody>
            If your assistant returns tool-call success but you do not see cards in app, the first
            checks are usually wrong <Code>deckId</Code>, mismatched <Code>blockId</Code>, or
            missing required template fields. Running <Code>get_template_schema</Code> before write
            operations is the fastest way to prevent failed card writes.
          </ArticleBody>
        </ArticleSection>

        <ArticleSection id="example-prompt">
          <ArticleH2>Example prompts &amp; conversation</ArticleH2>
          <ArticleBody>
            Once MCP is connected, you can ask in plain language. The block below is a real chat
            session — deck and template IDs are truncated for privacy.
          </ArticleBody>
          <TerminalWindow title="deckbase — mcp-session">
            <TerminalPromptSection
              comment="# Example prompts (paste or adapt)"
              lines={examplePromptsList}
            />
            <TerminalSessionDivider />
            <div className="space-y-5">
              {exampleTurns.map((turn, i) => (
                <div key={i}>
                  {turn.role === "user" ? (
                    <TerminalUserTurn body={turn.body} />
                  ) : (
                    <TerminalAssistantTurn body={turn.body} table={turn.table} />
                  )}
                </div>
              ))}
            </div>
          </TerminalWindow>
        </ArticleSection>

        <ArticleSection id="requirements">
          <ArticleH2>Requirements &amp; honesty check</ArticleH2>
          <div className="flex flex-col gap-3">
            {[
              { label: "Subscription", body: <>Hosted deck/card tools require a valid <strong className="text-white/70">Pro or VIP</strong> account and API access as described on the pricing and dashboard pages.</> },
              { label: "Clients", body: <>Any MCP client that supports HTTP transport and custom headers can work. We document Cursor, VS Code, and Claude Code on <Link href="/mcp" className="text-accent hover:underline underline-offset-2">/mcp</Link>.</> },
              { label: "Pedagogy", body: "MCP automates creation; you still choose decks, templates, and what to memorize." },
            ].map(({ label, body }) => (
              <div key={label} className="flex items-start gap-3 p-4 rounded-xl border border-white/[0.07] bg-white/[0.02]">
                <span className="text-[11px] font-bold uppercase tracking-wider text-white/30 pt-0.5 flex-shrink-0 w-20">{label}</span>
                <p className="text-[13px] text-white/50 leading-relaxed flex-1">{body}</p>
              </div>
            ))}
          </div>
        </ArticleSection>

        <ArticleSection id="rollout-pattern">
          <ArticleH2>Production rollout pattern that prevents deck pollution</ArticleH2>
          <ArticleBody>
            Teams often fail with MCP by jumping from a successful single-card demo to large writes
            without quality gates. A better pattern is staged rollout with explicit checks at each
            batch size. This reduces cleanup cost and protects active decks used for daily review.
          </ArticleBody>
          <ArticleTable
            columns={["Stage", "Suggested batch size", "Primary validation goal"]}
            rows={rolloutRows}
          />
          <ArticleBody>
            Keep a simple acceptance rule before each stage: at least 90% of sampled cards are
            immediately usable without manual rewrite. If quality drops below that level, pause,
            patch mapping rules, and rerun only failed records instead of regenerating everything.
          </ArticleBody>
          <CodeBlock>{`# minimal guardrail checklist
1) list_decks -> confirm target deckId
2) get_template_schema -> validate required blockId fields
3) create_cards in small batch
4) spot-check random sample
5) scale only after acceptance threshold passes`}</CodeBlock>
        </ArticleSection>

        <ArticleSection id="faq">
          <ArticleH2>FAQ</ArticleH2>
          <ArticleFaq items={faqs} />
        </ArticleSection>

        <ArticleSection id="related">
          <ArticleH2>Related</ArticleH2>
          <ArticleRelated
            links={[
              { href: "/mcp", label: "Connecting to Deckbase MCP (config snippets)" },
              { href: "/docs/mcp-server", label: "MCP Server reference (Docs)" },
              { href: "/deckbase-vs-anki", label: "Deckbase vs Anki" },
              { href: "/deckbase-vs-quizlet", label: "Deckbase vs Quizlet" },
            ]}
          />
        </ArticleSection>

        <ArticleFooter>
          Last updated March 2026. Product and API details may change; the{" "}
          <Link href="/docs/mcp-server" className="text-accent hover:underline underline-offset-2">
            MCP Server doc
          </Link>{" "}
          is the source of truth for tool names and parameters.
        </ArticleFooter>
      </ArticleShell>
    </>
  );
}
