import Link from "next/link";
import { defaultLanguageAlternates } from "@/lib/language-alternates";
import { absoluteUrl } from "@/lib/site-url";
import { mediumArticle, M } from "@/components/resources/MediumArticle";
import { ResourceDataTable } from "@/components/resources";
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

export const metadata = {
  title: "Deckbase MCP for Flashcards: vs Other MCP Servers & How to Create Cards",
  description:
    "How Deckbase’s Model Context Protocol (MCP) compares to typical docs and code MCP servers, and how Pro/VIP users create decks and cards from Cursor, Claude Code, or VS Code — synced to the Deckbase app.",
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
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Deckbase MCP for flashcards" }],
    locale: "en_US",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Deckbase MCP for Flashcards: Comparison & How to Create Cards",
    description:
      "MCP comparison for SEO and learners: how Deckbase connects AI tools to your flashcard library.",
    site: "@DeckbaseApp",
    images: ["/og.png"],
  },
};

const comparisonRows = [
  {
    name: "Docs & knowledge MCPs",
    focus: "Read wikis, Notion, or internal docs inside the chat context.",
    decks: "No — they don’t create or sync flashcard decks.",
    deckbase:
      "Deckbase MCP is purpose-built for your Deckbase library: decks, templates, and cards that show up in the app.",
  },
  {
    name: "Repo & filesystem MCPs",
    focus: "Search code, read files, run terminal-style workflows.",
    decks: "No — great for engineering work, not spaced-repetition content.",
    deckbase:
      "Use Deckbase MCP when the model should add or update study material, not source code.",
  },
  {
    name: "General study apps (no MCP)",
    focus: "Manual or in-app AI card creation inside one product.",
    decks: "Usually locked to that app’s UI — no standard MCP bridge to your editor.",
    deckbase:
      "Hosted HTTP MCP at /api/mcp with tools like list_decks, get_template_schema, create_card — plus mobile sync.",
  },
  {
    name: "Deckbase MCP",
    focus: "Connect Cursor, Claude Code, VS Code, and other MCP clients to your account.",
    decks: "Yes — list/create decks and cards using your real templates.",
    deckbase:
      "Cards follow your template schema; changes sync to the Deckbase web dashboard and mobile apps (Pro/VIP, API key).",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": `${pageUrl}#webpage`,
      url: pageUrl,
      name: "Deckbase MCP for Flashcards: Comparison & How to Create Cards",
      description:
        "SEO guide comparing Deckbase MCP to typical MCP servers and explaining how users create flashcards via MCP from AI tools.",
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
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "What makes Deckbase MCP different from other MCP servers?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Most MCP servers expose documents, repositories, or browser automation. Deckbase MCP exposes your flashcard library: tools to list decks and templates, fetch template schemas, and create or update cards that sync to the Deckbase app — not just text snippets in chat.",
          },
        },
        {
          "@type": "Question",
          name: "How do I create cards with Deckbase MCP?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Use a Pro or VIP API key from the dashboard, connect your MCP client to the hosted endpoint, then call tools such as list_templates, get_template_schema for block IDs, and create_card or create_cards with deckId and the text fields your template expects. Cards appear in your Deckbase library and on mobile.",
          },
        },
        {
          "@type": "Question",
          name: "Is Deckbase MCP the same as the MCP setup page?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "The setup page shows JSON config for Cursor, VS Code, and Claude Code. This resource page focuses on SEO-friendly comparison and the card-creation workflow; full protocol details are in Docs under MCP Server.",
          },
        },
      ],
    },
  ],
};

/** Example MCP dialogue (edited for clarity). IDs shortened with an ellipsis. */
const exampleTurns = [
  {
    role: "user",
    body: "Can you check my current decks on Deckbase?",
  },
  {
    role: "assistant",
    body: `You have 2 decks on Deckbase:

1. English Phrases (ID: b7ba3351…) — has a default template assigned
2. Distinction1 (ID: d80019c9…) — no default template`,
  },
  {
    role: "user",
    body: "Can you create a new deck?",
  },
  {
    role: "assistant",
    body: "What would you like to name the new deck? And optionally, a description?",
  },
  {
    role: "user",
    body: "Test",
  },
  {
    role: "assistant",
    body: 'Created! New deck "Test" (ID: 0c3cbbfb…) is ready to use.',
  },
  {
    role: "user",
    body: "I'm learning Ukrainian. Can you add some basic vocabulary to Test?",
  },
  {
    role: "assistant",
    body: `No Ukrainian template exists yet, but an English vocabulary–style template can work well (Ukrainian on the front, English on the back). I’ll check its schema first.`,
  },
  {
    role: "user",
    body: "Can you create a new template for Ukrainian?",
  },
  {
    role: "assistant",
    body: `I’ll create a Ukrainian vocabulary template with: Ukrainian word, pronunciation, English meaning (hidden), and an example sentence.

Template created — Ukrainian Vocabulary (ID: c1970944…) with 4 blocks:
• Ukrainian Word (header)
• Pronunciation (visible)
• English Meaning (hidden — revealed on flip)
• Example Sentence (quote)

Now I’ll add cards to your Test deck.`,
  },
  {
    role: "assistant",
    body: `Got the block IDs. Creating 10 basic Ukrainian vocabulary cards.

10 cards added to Test. Sample vocabulary:

Each card shows Ukrainian + pronunciation on the front; English meaning stays hidden until you flip; plus an example sentence. Удачі (good luck) with your studies!`,
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

export default function ResourcesMcpPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <article className={`${mediumArticle} flex flex-col gap-10`}>
        <nav className={M.breadcrumb} aria-label="Breadcrumb">
          <ol className="flex flex-wrap gap-x-2 gap-y-1">
            <li>
              <Link href="/">Home</Link>
            </li>
            <li aria-hidden="true" className="text-neutral-400">
              /
            </li>
            <li>
              <Link href="/resources">Resources</Link>
            </li>
            <li aria-hidden="true" className="text-neutral-400">
              /
            </li>
            <li className={M.breadcrumbCurrent}>Deckbase MCP</li>
          </ol>
        </nav>

        <header>
          <p className={M.kicker}>Guide · Resources</p>
          <h1 className={M.title}>Deckbase MCP for flashcards: how it compares — and how to create cards</h1>
          <p className={M.lead}>
            Model Context Protocol connects AI assistants to external tools. Most MCP servers help with docs or code;
            Deckbase MCP connects your assistant to{" "}
            <strong className="font-semibold text-neutral-200">your decks and cards</strong>, with the same content
            you study in the Deckbase app.
          </p>
          <p className={M.byline}>
            <span className={M.bylineBrand}>Deckbase</span>
            <span aria-hidden="true">·</span>
            <span>7 min read</span>
          </p>
        </header>

        <section id="overview" className="scroll-mt-28">
          <h2 className={M.h2}>Why this page exists</h2>
          <p className={M.bodyMuted}>
            If you’re searching for{" "}
            <span className="text-neutral-300">MCP flashcards</span>,{" "}
            <span className="text-neutral-300">spaced repetition MCP</span>, or{" "}
            <span className="text-neutral-300">create Anki-style cards from Cursor</span>, you want two things: a
            fair comparison to other MCP patterns, and a clear workflow to actually{" "}
            <strong className="text-neutral-200">create cards</strong> from your editor. Below is both — with links to
            setup and technical docs.
          </p>
        </section>

        <section id="comparison" className="scroll-mt-28">
          <h2 className={M.h2}>Deckbase MCP vs typical MCP servers (and study apps)</h2>
          <p className={`${M.bodyMuted} -mt-2 mb-6`}>
            MCP is a <em>protocol</em>; each server decides what “tools” it exposes. Here’s how Deckbase fits next to
            common patterns — without naming unrelated products as if they shipped the same flashcard API.
          </p>
          <ResourceDataTable
            columns={["Approach", "Typical use", "Deck & card CRUD", "Deckbase angle"]}
            rows={comparisonRows.map((row) => [row.name, row.focus, row.decks, row.deckbase])}
          />
        </section>

        <section id="create-cards-workflow" className="scroll-mt-28">
          <h2 className={M.h2}>How Deckbase users create cards using MCP</h2>
          <p className={`${M.bodyMuted} -mt-2 mb-4`}>
            Production MCP is <strong className="text-neutral-200">hosted HTTP</strong>. Send each request to the
            endpoint below with a bearer token (API key from the dashboard, or an OAuth access token if enabled). Pro
            and VIP subscribers can create API keys in the dashboard. Then your AI client calls tools in a predictable
            order:
          </p>
          <pre className={`${M.codeBlock} mb-6 overflow-x-auto`}>
            <code>
              {`POST /api/mcp
Authorization: Bearer <API_KEY>`}
            </code>
          </pre>
          <ol className={`${M.bodyMuted} list-outside space-y-4 pl-6 marker:text-neutral-500`}>
            <li className="pl-2">
              <strong className="text-neutral-100">Connect the client</strong> — Add the Deckbase MCP server URL and
              bearer token in <code className={M.code}>Cursor</code>, <code className={M.code}>Claude Code</code>,{" "}
              <code className={M.code}>VS Code</code>, or any MCP-compatible client (
              <Link href="/mcp" className={M.linkPlain}>
                step-by-step setup
              </Link>
              ).
            </li>
            <li className="pl-2">
              <strong className="text-neutral-100">Discover structure</strong> — Use{" "}
              <code className={M.code}>list_decks</code> and <code className={M.code}>list_templates</code>. If you need
              block types or JSON shapes, use <code className={M.code}>list_template_block_types</code> or{" "}
              <code className={M.code}>list_block_schemas</code> as documented.
            </li>
            <li className="pl-2">
              <strong className="text-neutral-100">Get the schema for the card you’re building</strong> — Call{" "}
              <code className={M.code}>get_template_schema</code> with a <code className={M.code}>templateId</code> (or
              deck-only if the deck has a default template). You’ll get exact <code className={M.code}>blockId</code>{" "}
              keys for <code className={M.code}>block_text</code> in <code className={M.code}>create_card</code>.
            </li>
            <li className="pl-2">
              <strong className="text-neutral-100">Create one or many cards</strong> — Call{" "}
              <code className={M.code}>create_card</code> or <code className={M.code}>create_cards</code> with{" "}
              <code className={M.code}>deckId</code>, optional <code className={M.code}>templateId</code> when needed,
              and the text fields the template requires. Optional audio and TTS parameters apply when your template
              includes audio blocks.
            </li>
            <li className="pl-2">
              <strong className="text-neutral-100">Study everywhere</strong> — New cards appear in the web dashboard and
              sync to the Deckbase mobile apps like cards you created manually.
            </li>
          </ol>
          <p className={`${M.bodyMuted} mt-6`}>
            For a concise protocol list (tools, resources, examples), see{" "}
            <Link href="/docs/mcp-server" className={M.linkPlain}>
              MCP Server in Docs
            </Link>{" "}
            and the public <Link href="/docs" className={M.linkPlain}>
              documentation index
            </Link>
            .
          </p>
        </section>

        <section id="example-prompt" className="scroll-mt-28">
          <h2 className={M.h2}>Example prompts &amp; conversation</h2>
          <p className={`${M.bodyMuted} -mt-2 mb-5 max-w-prose`}>
            Once MCP is connected, you can ask in plain language. The block below is styled like a terminal session — same
            content as a real chat, with deck and template IDs truncated for privacy.
          </p>
          <p className={`${M.bodyMuted} mb-4 max-w-prose`}>
            Your assistant may call tools such as <code className={M.code}>list_decks</code>,{" "}
            <code className={M.code}>create_deck</code>, <code className={M.code}>create_template</code>,{" "}
            <code className={M.code}>get_template_schema</code>, and <code className={M.code}>create_cards</code> under
            the hood.
          </p>

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
        </section>

        <section id="requirements" className="scroll-mt-28">
          <h2 className={M.h2}>Requirements &amp; honesty check</h2>
          <ul className={`${M.bodyMuted} list-inside list-disc space-y-2`}>
            <li>
              <strong className="text-neutral-100">Subscription:</strong> Hosted deck/card tools expect a valid{" "}
              <strong className="text-neutral-100">Pro or VIP</strong> account and API access as described on the
              pricing and dashboard pages.
            </li>
            <li>
              <strong className="text-neutral-100">Clients:</strong> Any MCP client that supports HTTP transport and
              custom headers can work; we document Cursor, VS Code, and Claude Code on{" "}
              <Link href="/mcp" className={M.linkPlain}>
                /mcp
              </Link>
              .
            </li>
            <li>
              <strong className="text-neutral-100">Not a substitute for pedagogy:</strong> MCP automates{" "}
              <em>creation</em>; you still choose decks, templates, and what to memorize.
            </li>
          </ul>
        </section>

        <section id="faq" className="scroll-mt-28">
          <h2 className={M.h2}>FAQ</h2>
          <div className={M.faqWrap}>
            {faqs.map((item) => (
              <div key={item.q} className={M.faqItem}>
                <h3 className={M.faqQ}>{item.q}</h3>
                <p className={M.faqA}>{item.a}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="related" className="scroll-mt-28">
          <h2 className={M.h2}>Related</h2>
          <ul className={`${M.bodyMuted} flex flex-col gap-3`}>
            <li>
              <Link href="/mcp" className={M.linkPlain}>
                Connecting to Deckbase MCP (config snippets)
              </Link>
            </li>
            <li>
              <Link href="/docs/mcp-server" className={M.linkPlain}>
                MCP Server reference (Docs)
              </Link>
            </li>
            <li>
              <Link href="/deckbase-vs-anki" className={M.linkPlain}>
                Deckbase vs Anki
              </Link>{" "}
              ·{" "}
              <Link href="/deckbase-vs-quizlet" className={M.linkPlain}>
                Deckbase vs Quizlet
              </Link>
            </li>
          </ul>
        </section>

        <p className={M.footerNote}>
          Last updated March 2026. Product and API details may change; the{" "}
          <Link href="/docs/mcp-server" className={M.linkPlain}>
            MCP Server
          </Link>{" "}
          doc is the source of truth for tool names and parameters.
        </p>
      </article>
    </>
  );
}
