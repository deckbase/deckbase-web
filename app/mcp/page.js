"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  Cpu,
  Copy,
  Check,
  Terminal,
  ExternalLink,
  BookOpen,
  PlusCircle,
  List,
  ChevronDown,
  ChevronUp,
  FileSearch,
  Pencil,
  Link2,
  Download,
  Trash2,
} from "lucide-react";
import { useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { siCursor } from "simple-icons";

function SimpleIconSvg({ icon, className = "w-5 h-5", ...props }) {
  if (!icon?.path) return null;
  return (
    <svg
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      fill="currentColor"
      aria-hidden
      {...props}
    >
      <path d={icon.path} />
    </svg>
  );
}

function PlatformIcon({ src, className = "w-5 h-5 flex-shrink-0" }) {
  return (
    <Image
      src={src}
      alt=""
      width={20}
      height={20}
      className={className}
      aria-hidden
    />
  );
}

/** Code block with filename bar + copy */
function CodeBlock({ code, id, filename, copiedId, onCopy }) {
  const copied = copiedId === id;
  return (
    <div className="rounded-xl overflow-hidden border border-white/[0.09] bg-[#0d0d0d]">
      {filename && (
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06] bg-white/[0.02]">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-white/10" />
              <span className="w-2.5 h-2.5 rounded-full bg-white/10" />
              <span className="w-2.5 h-2.5 rounded-full bg-white/10" />
            </div>
            <span className="text-[11px] font-mono text-white/30 ml-1">
              {filename}
            </span>
          </div>
          <button
            type="button"
            onClick={() => onCopy(code, id)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all duration-200 ${
              copied
                ? "text-emerald-400 bg-emerald-400/10"
                : "text-white/40 hover:text-white/80 hover:bg-white/[0.06]"
            }`}
          >
            {copied ? (
              <Check className="w-3 h-3" />
            ) : (
              <Copy className="w-3 h-3" />
            )}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      )}
      <div className="relative">
        <pre className="p-4 sm:p-5 text-[13px] text-white/80 overflow-x-auto font-mono leading-relaxed">
          {code}
        </pre>
        {!filename && (
          <button
            type="button"
            onClick={() => onCopy(code, id)}
            className={`absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-200 ${
              copied
                ? "text-emerald-400 bg-emerald-400/10 border border-emerald-400/20"
                : "text-white/40 hover:text-white/80 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.07]"
            }`}
          >
            {copied ? (
              <Check className="w-3 h-3" />
            ) : (
              <Copy className="w-3 h-3" />
            )}
            {copied ? "Copied" : "Copy"}
          </button>
        )}
      </div>
    </div>
  );
}

/** Numbered step */
function Step({ number, children }) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center gap-1 flex-shrink-0">
        <span className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-accent border border-accent/30 bg-accent/[0.08] flex-shrink-0 mt-0.5">
          {number}
        </span>
        <div className="w-px flex-1 bg-white/[0.06] min-h-[16px]" />
      </div>
      <div className="pb-5 flex-1 min-w-0">{children}</div>
    </div>
  );
}

/** Inline code */
function InlineCode({ children }) {
  return (
    <code className="px-1.5 py-0.5 rounded-md bg-white/[0.07] text-accent font-mono text-[13px] border border-white/[0.06]">
      {children}
    </code>
  );
}

/** Must stay in sync with tool names in lib/mcp-handlers.js (handleToolsList). */
const ALL_MCP_TOOLS = [
  "list_docs",
  "read_doc",
  "list_template_block_types",
  "list_block_schemas",
  "list_elevenlabs_voices",
  "list_decks",
  "list_templates",
  "get_template_schema",
  "create_deck",
  "update_deck",
  "update_card",
  "delete_card",
  "delete_cards",
  "create_card",
  "create_cards",
  "attach_audio_to_card",
  "export_deck",
  "create_template",
  "update_template",
];

const MCP_TOOLS_PREVIEW = [
  "list_docs",
  "read_doc",
  "list_decks",
  "create_deck",
  "create_card",
];

function McpToolIcon({ name }) {
  const c = "w-3.5 h-3.5 text-accent/70 flex-shrink-0";
  if (name.startsWith("list_")) return <List className={c} aria-hidden />;
  if (name.startsWith("read_")) return <BookOpen className={c} aria-hidden />;
  if (name.startsWith("get_")) return <FileSearch className={c} aria-hidden />;
  if (name.startsWith("create_")) return <PlusCircle className={c} aria-hidden />;
  if (name.startsWith("update_")) return <Pencil className={c} aria-hidden />;
  if (name.startsWith("attach_")) return <Link2 className={c} aria-hidden />;
  if (name.startsWith("export_")) return <Download className={c} aria-hidden />;
  if (name.startsWith("delete_")) return <Trash2 className={c} aria-hidden />;
  return <Terminal className={c} aria-hidden />;
}

export default function McpPage() {
  const [activeTab, setActiveTab] = useState("cursor");
  const [copiedId, setCopiedId] = useState(null);
  const [showProjectConfig, setShowProjectConfig] = useState(false);
  const [showAllMcpTools, setShowAllMcpTools] = useState(false);

  const baseUrl =
    typeof window !== "undefined" &&
    !window.location.origin.startsWith("http://localhost")
      ? window.location.origin
      : "https://www.deckbase.co";
  const mcpUrl = `${baseUrl}/api/mcp`;

  const handleCopy = useCallback(async (text, id) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {}
  }, []);

  const cursorSnippet = `{
  "mcpServers": {
    "deckbase": {
      "url": "${mcpUrl}",
      "headers": {
        "Authorization": "Bearer YOUR_API_KEY"
      }
    }
  }
}`;

  const vscodeSnippet = `{
  "servers": {
    "deckbase": {
      "type": "http",
      "url": "${mcpUrl}",
      "headers": {
        "Authorization": "Bearer YOUR_API_KEY"
      }
    }
  }
}`;

  const windsurfSnippet = `{
  "mcpServers": {
    "deckbase": {
      "serverUrl": "${mcpUrl}",
      "headers": {
        "Authorization": "Bearer YOUR_API_KEY"
      }
    }
  }
}`;

  const codexSnippet = `[mcp_servers.deckbase]
url = "${mcpUrl}"`;

  const claudeCodeCommand = `claude mcp add --transport http deckbase ${mcpUrl} --header "Authorization: Bearer YOUR_API_KEY"`;

  const cursorInstallConfig = {
    url: mcpUrl,
    headers: { Authorization: "Bearer YOUR_API_KEY" },
  };
  const configBase64 =
    typeof window !== "undefined"
      ? btoa(JSON.stringify(cursorInstallConfig))
      : typeof Buffer !== "undefined"
        ? Buffer.from(JSON.stringify(cursorInstallConfig), "utf8").toString(
            "base64",
          )
        : "";
  const cursorInstallUrl = `cursor://anysphere.cursor-deeplink/mcp/install?name=deckbase&config=${encodeURIComponent(configBase64)}`;

  const platforms = [
    {
      id: "cursor",
      label: "Cursor",
      icon: <SimpleIconSvg icon={siCursor} className="w-4 h-4" />,
    },
    {
      id: "vscode",
      label: "VS Code",
      icon: <PlatformIcon src="/icons/vscode.png" className="w-4 h-4" />,
    },
    {
      id: "claude-code",
      label: "Claude Code",
      icon: <PlatformIcon src="/icons/claude.svg" className="w-4 h-4" />,
    },
    {
      id: "claude-desktop",
      label: "Claude Desktop",
      icon: <PlatformIcon src="/icons/claude.svg" className="w-4 h-4" />,
    },
    {
      id: "windsurf",
      label: "Windsurf",
      icon: (
        <PlatformIcon
          src="/icons/windsurf.jpg"
          className="w-4 h-4 rounded-sm"
        />
      ),
    },
    {
      id: "chatgpt",
      label: "ChatGPT",
      icon: <PlatformIcon src="/icons/chatgtp.webp" className="w-4 h-4" />,
    },
    {
      id: "codex",
      label: "Codex",
      icon: <PlatformIcon src="/icons/codex.png" className="w-4 h-4" />,
    },
    {
      id: "other",
      label: "Other",
      icon: <Terminal className="w-4 h-4" />,
    },
  ];

  return (
    <div className="min-h-screen bg-black pt-24 pb-28 text-white">
      <div className="max-w-[800px] mx-auto px-5 md:px-8">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.25, 0.1, 0.25, 1] }}
          className="mb-14"
        >
          {/* Ambient glow */}
          <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-24 w-[600px] h-[300px] rounded-full bg-accent/[0.07] blur-[100px] -z-10" />

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold tracking-widest uppercase text-accent border border-accent/25 bg-accent/[0.07] mb-6">
            <Cpu className="w-3.5 h-3.5" />
            Model Context Protocol
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-5">
            Connect your AI to Deckbase flashcards
          </h1>

          <p className="text-white/55 text-base sm:text-lg leading-relaxed max-w-[600px] mb-8">
            Add the Deckbase MCP server to your AI tool to read docs and manage
            flashcard decks — directly from your coding environment.
          </p>

          <div className="rounded-xl border border-white/[0.1] bg-white/[0.03] px-4 py-3.5 mb-8 max-w-[600px]">
            <p className="text-sm text-white/70 leading-relaxed">
              <span className="text-white/90 font-medium">Flashcards + MCP:</span>{" "}
              same decks sync to the Deckbase app and mobile. For positioning vs
              other MCP servers and card workflows, see{" "}
              <Link
                href="/resources/mcp"
                className="text-accent hover:underline underline-offset-2"
              >
                MCP for flashcards
              </Link>{" "}
              or the{" "}
              <Link
                href="/ai-flashcards"
                className="text-accent hover:underline underline-offset-2"
              >
                AI flashcard maker
              </Link>{" "}
              overview.
            </p>
          </div>

          {/* Available tools */}
          <div className="space-y-3">
            <p className="text-xs font-semibold tracking-widest uppercase text-white/30">
              Available tools
            </p>
            <div className="flex flex-wrap gap-2">
              {(showAllMcpTools ? ALL_MCP_TOOLS : MCP_TOOLS_PREVIEW).map(
                (name) => (
                  <span
                    key={name}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[12px] font-mono text-white/60 bg-white/[0.04] border border-white/[0.07]"
                  >
                    <McpToolIcon name={name} />
                    {name}
                  </span>
                ),
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowAllMcpTools(!showAllMcpTools)}
              className="inline-flex items-center gap-1.5 text-sm text-accent/90 hover:text-accent transition-colors"
              aria-expanded={showAllMcpTools}
            >
              {showAllMcpTools ? (
                <>
                  <ChevronUp className="w-4 h-4" aria-hidden />
                  Show fewer tools
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" aria-hidden />
                  See all {ALL_MCP_TOOLS.length} tools
                </>
              )}
            </button>
            {showAllMcpTools && (
              <p className="text-xs text-white/35 max-w-[560px] leading-relaxed">
                Full parameter reference and behavior notes are in the{" "}
                <Link
                  href="/docs/mcp-server"
                  className="text-accent/80 hover:underline underline-offset-2"
                >
                  MCP server docs
                </Link>
                .
              </p>
            )}
          </div>
        </motion.div>

        {/* Platform Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <p className="text-xs font-semibold tracking-widest uppercase text-white/30 mb-3">
            Select your tool
          </p>
          <div className="flex flex-wrap gap-2 mb-8">
            {platforms.map((p) => {
              const active = activeTab === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setActiveTab(p.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                    active
                      ? "bg-white/[0.1] text-white border border-white/[0.15]"
                      : "bg-white/[0.03] text-white/45 border border-white/[0.06] hover:text-white/80 hover:bg-white/[0.06]"
                  }`}
                >
                  <span className={active ? "text-white" : "text-white/40"}>
                    {p.icon}
                  </span>
                  {p.label}
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 sm:p-8"
            >
              {/* CURSOR */}
              {activeTab === "cursor" && (
                <div className="space-y-0">
                  <div className="flex items-center gap-3 mb-6">
                    <SimpleIconSvg
                      icon={siCursor}
                      className="w-5 h-5 text-white/80"
                    />
                    <h2 className="text-lg font-semibold">Cursor</h2>
                  </div>

                  <Step number={1}>
                    <p className="text-sm text-white/60 mb-3">
                      One-click install — then add your API key in{" "}
                      <strong className="text-white/80">
                        Cursor Settings → MCP
                      </strong>
                      .
                    </p>
                    <a
                      href={cursorInstallUrl}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-white text-sm font-medium border border-white/[0.1] transition-colors"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <SimpleIconSvg icon={siCursor} className="w-4 h-4" />
                      Add to Cursor
                      <ExternalLink className="w-3.5 h-3.5 text-white/40" />
                    </a>
                  </Step>

                  <Step number={2}>
                    <p className="text-sm text-white/60 mb-3">
                      Or add manually — open{" "}
                      <strong className="text-white/80">
                        Cursor Settings → MCP → Add new global MCP server
                      </strong>{" "}
                      and paste:
                    </p>
                    <CodeBlock
                      code={cursorSnippet}
                      id="cursor"
                      filename="~/.cursor/mcp.json"
                      copiedId={copiedId}
                      onCopy={handleCopy}
                    />
                  </Step>

                  <Step number={3}>
                    <p className="text-sm text-white/60">
                      Replace <InlineCode>YOUR_API_KEY</InlineCode> with a key
                      from the{" "}
                      <Link
                        href="/dashboard/api-keys"
                        className="text-accent hover:underline"
                      >
                        dashboard
                      </Link>
                      . API keys don&apos;t expire. On 401, verify the header is{" "}
                      <InlineCode>
                        Authorization: Bearer YOUR_API_KEY
                      </InlineCode>
                      .
                    </p>
                  </Step>

                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={() => setShowProjectConfig(!showProjectConfig)}
                      className="text-sm text-white/40 hover:text-white/70 transition-colors flex items-center gap-1.5"
                    >
                      <span className="text-xs">
                        {showProjectConfig ? "▲" : "▼"}
                      </span>
                      Project-level config
                    </button>
                    {showProjectConfig && (
                      <div className="mt-3">
                        <p className="text-sm text-white/50 mb-3">
                          To share with your team, create{" "}
                          <InlineCode>.cursor/mcp.json</InlineCode> in your
                          project root:
                        </p>
                        <CodeBlock
                          code={cursorSnippet}
                          id="cursor-project"
                          filename=".cursor/mcp.json"
                          copiedId={copiedId}
                          onCopy={handleCopy}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* VS CODE */}
              {activeTab === "vscode" && (
                <div className="space-y-0">
                  <div className="flex items-center gap-3 mb-6">
                    <PlatformIcon src="/icons/vscode.png" className="w-5 h-5" />
                    <h2 className="text-lg font-semibold">
                      VS Code (GitHub Copilot)
                    </h2>
                  </div>

                  <Step number={1}>
                    <p className="text-sm text-white/60">
                      Create a <InlineCode>.vscode/mcp.json</InlineCode> file in
                      your workspace.
                    </p>
                  </Step>

                  <Step number={2}>
                    <p className="text-sm text-white/60 mb-3">
                      Add the config below — replace{" "}
                      <InlineCode>YOUR_API_KEY</InlineCode> with a key from the{" "}
                      <Link
                        href="/dashboard/api-keys"
                        className="text-accent hover:underline"
                      >
                        dashboard
                      </Link>
                      .
                    </p>
                    <CodeBlock
                      code={vscodeSnippet}
                      id="vscode"
                      filename=".vscode/mcp.json"
                      copiedId={copiedId}
                      onCopy={handleCopy}
                    />
                  </Step>

                  <Step number={3}>
                    <p className="text-sm text-white/60">
                      Open the Command Palette{" "}
                      <InlineCode>Cmd+Shift+P</InlineCode> and run{" "}
                      <strong className="text-white/80">
                        MCP: List Servers
                      </strong>
                      , then start the Deckbase server.
                    </p>
                  </Step>

                  <div className="mt-2 pt-4 border-t border-white/[0.06]">
                    <p className="text-sm text-white/35">
                      For user-level config across all workspaces, run{" "}
                      <strong className="text-white/60">
                        MCP: Open User Configuration
                      </strong>{" "}
                      from the Command Palette.
                    </p>
                  </div>
                </div>
              )}

              {/* CLAUDE CODE */}
              {activeTab === "claude-code" && (
                <div className="space-y-0">
                  <div className="flex items-center gap-3 mb-6">
                    <PlatformIcon src="/icons/claude.svg" className="w-5 h-5" />
                    <h2 className="text-lg font-semibold">Claude Code</h2>
                  </div>

                  <Step number={1}>
                    <p className="text-sm text-white/60 mb-3">
                      Create an API key in the{" "}
                      <Link
                        href="/dashboard/api-keys"
                        className="text-accent hover:underline"
                      >
                        dashboard
                      </Link>
                      , then run this command — replacing{" "}
                      <InlineCode>YOUR_API_KEY</InlineCode>:
                    </p>
                    <CodeBlock
                      code={claudeCodeCommand}
                      id="claude-code"
                      filename="terminal"
                      copiedId={copiedId}
                      onCopy={handleCopy}
                    />
                  </Step>

                  <Step number={2}>
                    <p className="text-sm text-white/60">
                      Optional: add <InlineCode>--scope project</InlineCode> or{" "}
                      <InlineCode>--scope user</InlineCode> before the URL to
                      set the scope (default is <InlineCode>local</InlineCode>).
                    </p>
                  </Step>

                  <Step number={3}>
                    <p className="text-sm text-white/60">
                      If Deckbase was already added without a header, remove it
                      first:
                    </p>
                    <div className="mt-2">
                      <CodeBlock
                        code="claude mcp remove deckbase"
                        id="claude-code-remove"
                        copiedId={copiedId}
                        onCopy={handleCopy}
                      />
                    </div>
                    <p className="text-sm text-white/35 mt-2">
                      The <InlineCode>--header</InlineCode> flag is required —
                      without it every request returns 401.
                    </p>
                  </Step>

                  <div className="mt-2 pt-4 border-t border-white/[0.06]">
                    <p className="text-sm text-white/35">
                      Don&apos;t commit real API keys. For project scope, prefer
                      env-based config if your team uses shared templates.
                    </p>
                  </div>
                </div>
              )}

              {/* CLAUDE DESKTOP */}
              {activeTab === "claude-desktop" && (
                <div className="space-y-0">
                  <div className="flex items-center gap-3 mb-6">
                    <PlatformIcon src="/icons/claude.svg" className="w-5 h-5" />
                    <h2 className="text-lg font-semibold">Claude Desktop</h2>
                  </div>

                  <Step number={1}>
                    <p className="text-sm text-white/60">
                      Open{" "}
                      <strong className="text-white/80">
                        Settings → Connectors
                      </strong>{" "}
                      and click{" "}
                      <strong className="text-white/80">Add Connector</strong>.
                    </p>
                  </Step>

                  <Step number={2}>
                    <p className="text-sm text-white/60 mb-3">
                      Enter the MCP URL:
                    </p>
                    <CodeBlock
                      code={mcpUrl}
                      id="claude-desktop"
                      copiedId={copiedId}
                      onCopy={handleCopy}
                    />
                  </Step>

                  <Step number={3}>
                    <p className="text-sm text-white/60">
                      If your client supports custom headers, set{" "}
                      <InlineCode>
                        Authorization: Bearer YOUR_API_KEY
                      </InlineCode>{" "}
                      with your API key from the{" "}
                      <Link
                        href="/dashboard/api-keys"
                        className="text-accent hover:underline"
                      >
                        dashboard
                      </Link>
                      .
                    </p>
                  </Step>
                </div>
              )}

              {/* WINDSURF */}
              {activeTab === "windsurf" && (
                <div className="space-y-0">
                  <div className="flex items-center gap-3 mb-6">
                    <PlatformIcon
                      src="/icons/windsurf.jpg"
                      className="w-5 h-5 rounded-sm"
                    />
                    <h2 className="text-lg font-semibold">Windsurf</h2>
                  </div>

                  <Step number={1}>
                    <p className="text-sm text-white/60">
                      Open{" "}
                      <strong className="text-white/80">
                        Windsurf Settings
                      </strong>{" "}
                      (<InlineCode>Cmd+,</InlineCode> on Mac), search for{" "}
                      <strong className="text-white/80">MCP</strong>, and click{" "}
                      <strong className="text-white/80">View raw config</strong>{" "}
                      to open <InlineCode>mcp_config.json</InlineCode>.
                    </p>
                  </Step>

                  <Step number={2}>
                    <p className="text-sm text-white/60 mb-3">
                      Add the Deckbase server — replace{" "}
                      <InlineCode>YOUR_API_KEY</InlineCode>:
                    </p>
                    <CodeBlock
                      code={windsurfSnippet}
                      id="windsurf"
                      filename="mcp_config.json"
                      copiedId={copiedId}
                      onCopy={handleCopy}
                    />
                  </Step>
                </div>
              )}

              {/* CHATGPT */}
              {activeTab === "chatgpt" && (
                <div className="space-y-0">
                  <div className="flex items-center gap-3 mb-6">
                    <PlatformIcon
                      src="/icons/chatgtp.webp"
                      className="w-5 h-5"
                    />
                    <h2 className="text-lg font-semibold">ChatGPT</h2>
                  </div>

                  <Step number={1}>
                    <p className="text-sm text-white/60">
                      Go to{" "}
                      <strong className="text-white/80">
                        chatgpt.com/#settings/Connectors
                      </strong>{" "}
                      (requires login) and click{" "}
                      <strong className="text-white/80">Add Connector</strong>.
                    </p>
                  </Step>

                  <Step number={2}>
                    <p className="text-sm text-white/60 mb-3">
                      Enter <strong className="text-white/80">Client ID</strong>
                      : <InlineCode>deckbase</InlineCode>
                    </p>
                    <p className="text-sm text-white/60 mb-3">
                      Enter the{" "}
                      <strong className="text-white/80">MCP URL</strong>:
                    </p>
                    <CodeBlock
                      code={mcpUrl}
                      id="chatgpt"
                      copiedId={copiedId}
                      onCopy={handleCopy}
                    />
                  </Step>

                  <Step number={3}>
                    <p className="text-sm text-white/60">
                      Complete the browser login flow and authorize Deckbase
                      access.
                    </p>
                  </Step>
                </div>
              )}

              {/* CODEX */}
              {activeTab === "codex" && (
                <div className="space-y-0">
                  <div className="flex items-center gap-3 mb-6">
                    <PlatformIcon src="/icons/codex.png" className="w-5 h-5" />
                    <h2 className="text-lg font-semibold">Codex</h2>
                  </div>

                  <Step number={1}>
                    <p className="text-sm text-white/60 mb-3">
                      Add the server to{" "}
                      <InlineCode>~/.codex/config.toml</InlineCode>:
                    </p>
                    <CodeBlock
                      code={codexSnippet}
                      id="codex"
                      filename="~/.codex/config.toml"
                      copiedId={copiedId}
                      onCopy={handleCopy}
                    />
                  </Step>

                  <Step number={2}>
                    <p className="text-sm text-white/60">
                      Configure the <InlineCode>Authorization</InlineCode>{" "}
                      header with your API key per Codex&apos;s MCP documentation
                      (e.g. environment variable or auth plugin).
                    </p>
                  </Step>

                  <div className="mt-2 pt-4 border-t border-white/[0.06]">
                    <p className="text-sm text-white/35">
                      To share with your team, create{" "}
                      <InlineCode>.codex/config.toml</InlineCode> in your
                      project root with the same server block.
                    </p>
                  </div>
                </div>
              )}

              {/* OTHER */}
              {activeTab === "other" && (
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <Terminal className="w-5 h-5 text-white/60" />
                    <h2 className="text-lg font-semibold">Other tools</h2>
                  </div>

                  <p className="text-sm text-white/60 mb-5">
                    Any MCP-compatible tool can connect to Deckbase. Send your
                    API key in the{" "}
                    <InlineCode>Authorization: Bearer</InlineCode> header on
                    every request.
                  </p>

                  <div className="rounded-xl border border-white/[0.08] overflow-hidden mb-6">
                    <table className="w-full text-sm text-left">
                      <thead>
                        <tr className="bg-white/[0.03] border-b border-white/[0.07]">
                          <th className="px-4 py-3 font-semibold text-white/50 text-xs uppercase tracking-wider">
                            Transport
                          </th>
                          <th className="px-4 py-3 font-semibold text-white/50 text-xs uppercase tracking-wider">
                            URL
                          </th>
                          <th className="px-4 py-3 font-semibold text-white/50 text-xs uppercase tracking-wider">
                            Auth
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="px-4 py-3 text-white/70">
                            Streamable HTTP
                          </td>
                          <td className="px-4 py-3 font-mono text-accent text-xs break-all">
                            {mcpUrl}
                          </td>
                          <td className="px-4 py-3 text-white/50 text-xs">
                            <InlineCode>
                              Authorization: Bearer &lt;key&gt;
                            </InlineCode>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <p className="text-sm text-white/50 mb-3">
                    Generic JSON configuration:
                  </p>
                  <CodeBlock
                    code={cursorSnippet}
                    id="other"
                    filename="mcp.json"
                    copiedId={copiedId}
                    onCopy={handleCopy}
                  />

                  <p className="text-sm text-white/30 mt-6">
                    Full technical details:{" "}
                    <InlineCode>mcp-server/README.md</InlineCode> in the repo.
                  </p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </motion.div>

        <motion.section
          className="mt-10 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 sm:p-6"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-lg sm:text-xl font-semibold text-white mb-3">
            Operational checklist for stable MCP workflows
          </h2>
          <p className="text-sm text-white/55 leading-relaxed mb-3">
            Treat Deckbase MCP as a production integration, not only a prompt convenience layer.
            Teams that run schema preflight checks, staged writes, and post-write sampling usually
            keep card quality high while scaling throughput. Teams that skip these steps often see
            duplicate prompts, malformed fields, and unnecessary review fatigue.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            {[
              {
                title: "Before write",
                body: "Verify deckId, templateId, and required block IDs with list_decks/list_templates/get_template_schema.",
              },
              {
                title: "During write",
                body: "Use small batches first and apply dedupe checks to front-side prompt text before create_cards.",
              },
              {
                title: "After write",
                body: "Sample new cards for clarity and retention suitability before increasing batch size.",
              },
              {
                title: "Weekly ops",
                body: "Review failed records, patch mapper rules, and document one quality improvement for next run.",
              },
            ].map((item) => (
              <article key={item.title} className="rounded-xl border border-white/[0.07] bg-black/25 p-3.5">
                <h3 className="text-sm font-semibold text-white/85 mb-1.5">{item.title}</h3>
                <p className="text-[12px] text-white/45 leading-relaxed">{item.body}</p>
              </article>
            ))}
          </div>
          <p className="text-xs text-white/35 leading-relaxed">
            If you need implementation-level details for tools and parameters, use the
            <Link href="/docs/mcp-server" className="text-accent hover:underline underline-offset-2 ml-1">
              MCP server reference
            </Link>
            .
          </p>
        </motion.section>

        {/* Bottom CTA */}
        <motion.div
          className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-2xl border border-white/[0.06] bg-white/[0.02]"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
        >
          <div>
            <p className="text-sm font-semibold text-white/80">
              Need an API key?
            </p>
            <p className="text-xs text-white/35 mt-0.5">
              Create one in the dashboard — keys don&apos;t expire.
            </p>
          </div>
          <Link
            href="/dashboard/api-keys"
            className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent hover:bg-accent/90 text-white text-sm font-semibold transition-colors"
          >
            Open dashboard
            <ExternalLink className="w-3.5 h-3.5 opacity-70" />
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
