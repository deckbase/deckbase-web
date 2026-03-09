"use client";

import { motion } from "framer-motion";
import { Cpu, ChevronDown, ChevronUp, Copy, Check } from "lucide-react";
import { useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRevenueCat } from "@/contexts/RevenueCatContext";
import Link from "next/link";
import Image from "next/image";
import { siCursor } from "simple-icons";

/** Render a simple-icons icon as an inline SVG (currentColor). */
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

/** Platform icon from public/icons - consistent size */
function PlatformIcon({ src, className = "w-6 h-6 flex-shrink-0" }) {
  return (
    <Image
      src={src}
      alt=""
      width={24}
      height={24}
      className={className}
      aria-hidden
    />
  );
}

const configSnippet = (mcpUrl) => `{
  "mcpServers": {
    "deckbase": {
      "url": "${mcpUrl}",
      "headers": {
        "Authorization": "Bearer YOUR_API_KEY"
      }
    }
  }
}`;

export default function McpPage() {
  const [showProjectConfig, setShowProjectConfig] = useState(false);
  const [showOtherTools, setShowOtherTools] = useState(false);
  const { user, loading } = useAuth();
  const { isPro } = useRevenueCat();
  const canUseMcp = !!user && isPro;

  const baseUrl =
    typeof window !== "undefined" && !window.location.origin.startsWith("http://localhost")
      ? window.location.origin
      : "https://www.deckbase.co";
  const mcpUrl = `${baseUrl}/api/mcp`;

  const [copiedId, setCopiedId] = useState(null);
  const handleCopy = useCallback(async (text, id) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // ignore
    }
  }, []);

  const cursorSnippet = configSnippet(mcpUrl);
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

  const claudeCodeCommand = `claude mcp add --transport http deckbase ${mcpUrl}`;

  // Cursor one-click install: config is the server entry (base64), see https://cursor.com/docs/mcp/install-links
  const cursorInstallConfig = {
    deckbase: {
      url: mcpUrl,
      headers: {
        Authorization: "Bearer YOUR_API_KEY",
      },
    },
  };
  const configJson = JSON.stringify(cursorInstallConfig);
  const configBase64 =
    typeof window !== "undefined"
      ? btoa(configJson)
      : (typeof Buffer !== "undefined" ? Buffer.from(configJson).toString("base64") : "");
  const cursorInstallUrl = `cursor://anysphere.cursor-deeplink/mcp/install?name=deckbase&config=${encodeURIComponent(configBase64)}`;

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-950 via-neutral-950 to-black pt-24 pb-20">
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-12"
        >
          {/* Hero */}
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-accent/15 border border-accent/30 text-accent text-sm font-medium mb-6">
              <Cpu className="w-4 h-4" aria-hidden />
              Model Context Protocol
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight mb-4">
              Connecting to Deckbase MCP
            </h1>
            <p className="text-base sm:text-lg text-white/85 max-w-2xl leading-relaxed">
              Connect your AI tool to Deckbase with the Model Context Protocol. Use{" "}
              <code className="px-1.5 py-0.5 rounded bg-white/15 text-accent font-mono text-sm">list_docs</code> and{" "}
              <code className="px-1.5 py-0.5 rounded bg-white/15 text-accent font-mono text-sm">read_doc</code> with an API key in the <code className="px-1.5 py-0.5 rounded bg-white/15 text-accent font-mono text-sm">Authorization</code> header.
            </p>
          </div>

          {/* API keys */}
          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
            <h2 className="text-xl font-semibold text-white mb-2">
              API keys (recommended)
            </h2>
            <p className="text-white/80 text-sm sm:text-base mb-6 max-w-xl">
              API keys don&apos;t expire. Create and manage them in the dashboard and use one in your MCP config so you don&apos;t have to refresh every hour.
            </p>
          {!loading && user && (
            <>
              {!isPro && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-5 mb-4">
                  <p className="text-amber-200 font-medium mb-2">
                    MCP is available for Pro and VIP subscribers
                  </p>
                  <p className="text-white/75 text-sm mb-4">
                    Upgrade to create API keys and connect Cursor to Deckbase.
                  </p>
                  <Link
                    href="/dashboard/subscription"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-accent hover:bg-accent/90 text-white font-medium transition-colors"
                  >
                    View subscription
                  </Link>
                </div>
              )}
              {canUseMcp && (
                <div className="rounded-xl border border-white/10 bg-white/[0.04] p-5">
                  <Link
                    href="/dashboard/api-keys"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-accent hover:bg-accent/90 text-white font-medium transition-colors"
                  >
                    Create & manage API keys
                  </Link>
                </div>
              )}
            </>
          )}
          {!loading && !user && (
            <p className="text-white/70">
              Log in to create and manage API keys in the dashboard.
            </p>
          )}
          </section>

          {/* Cursor */}
          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <SimpleIconSvg icon={siCursor} className="w-6 h-6 flex-shrink-0" />
            Cursor
          </h2>
          <p className="text-white/80 text-sm mb-4">
            Install in one click, then add your API key in Cursor Settings → MCP.
          </p>
          <a
            href={cursorInstallUrl}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0d1117] hover:bg-[#161b22] text-white font-medium border border-white/20 transition-colors mb-6"
            target="_blank"
            rel="noopener noreferrer"
          >
            <SimpleIconSvg icon={siCursor} className="w-5 h-5" />
            Add to Cursor
          </a>
          <p className="text-white/70 text-sm font-medium mb-2">Or add the configuration manually:</p>
          <ol className="list-decimal list-inside space-y-3 text-white/85 text-sm sm:text-base mb-4">
            <li>
              Use an API key (create one in the dashboard above). The API accepts only API keys; Firebase tokens are not used.
            </li>
            <li>
              Open <strong>Cursor Settings</strong> → <strong>MCP</strong> →{" "}
              <strong>Add new global MCP server</strong> (or edit your existing MCP config).
            </li>
            <li>
              Paste the configuration below. Replace{" "}
              <code className="px-1.5 py-0.5 rounded bg-white/15 text-accent font-mono text-sm">YOUR_API_KEY</code> with your API key.
            </li>
          </ol>
          <div className="relative rounded-xl overflow-hidden border border-white/15 bg-neutral-900/80">
          <pre className="p-4 sm:p-5 pr-14 text-white/90 text-sm sm:text-base overflow-x-auto font-mono leading-relaxed">
            {cursorSnippet}
          </pre>
          <button
            type="button"
            onClick={() => handleCopy(cursorSnippet, "cursor")}
            className="absolute top-3 right-3 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-medium transition-colors border border-white/10"
            aria-label="Copy"
          >
            {copiedId === "cursor" ? (
              <>
                <Check className="w-3.5 h-3.5" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Copy
              </>
            )}
          </button>
          </div>
          <button
            type="button"
            onClick={() => setShowProjectConfig(!showProjectConfig)}
            className="flex items-center gap-2 text-white/85 hover:text-white py-2 text-sm font-medium"
          >
            {showProjectConfig ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
            <span>Project-level configuration</span>
          </button>
          {showProjectConfig && (
            <>
              <p className="text-white/70 text-sm mb-3">
                To share with your team, create{" "}
                <code className="px-1.5 py-0.5 rounded bg-white/15 text-accent font-mono text-sm">.cursor/mcp.json</code> in your project root with the same JSON:
              </p>
              <div className="relative rounded-xl overflow-hidden border border-white/15 bg-neutral-900/80">
              <pre className="p-4 sm:p-5 pr-14 text-white/90 text-sm sm:text-base overflow-x-auto font-mono leading-relaxed">
                {cursorSnippet}
              </pre>
              <button
                type="button"
                onClick={() => handleCopy(cursorSnippet, "cursor-project")}
                className="absolute top-3 right-3 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-medium transition-colors border border-white/10"
                aria-label="Copy"
              >
                {copiedId === "cursor-project" ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copy
                  </>
                )}
              </button>
              </div>
            </>
          )}
          <p className="text-white/70 text-sm mt-4">
            Use an API key (create one in the dashboard). API keys don&apos;t expire. On 401, check that the key is correct and that the header is <code className="text-accent font-mono text-sm">Authorization: Bearer YOUR_API_KEY</code>.
          </p>
          </section>

          {/* VS Code (GitHub Copilot) */}
          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <PlatformIcon src="/icons/vscode.png" className="w-6 h-6 flex-shrink-0" />
            VS Code (GitHub Copilot)
          </h2>
          <ol className="list-decimal list-inside space-y-3 text-white/85 text-sm sm:text-base mb-4">
            <li>
              Create a <code className="px-1.5 py-0.5 rounded bg-white/15 text-accent font-mono text-sm">.vscode/mcp.json</code> file in your workspace.
            </li>
            <li>
              Add the configuration below (replace{" "}
              <code className="px-1.5 py-0.5 rounded bg-white/15 text-accent font-mono text-sm">YOUR_API_KEY</code> with your API key).
            </li>
            <li>
              Open the Command Palette (<code className="px-1.5 py-0.5 rounded bg-white/15 font-mono text-sm">Cmd+Shift+P</code> / <code className="px-1.5 py-0.5 rounded bg-white/15 font-mono text-sm">Ctrl+Shift+P</code>) and run <strong>MCP: List Servers</strong>; start the Deckbase server.
            </li>
          </ol>
          <div className="relative rounded-xl overflow-hidden border border-white/15 bg-neutral-900/80">
          <pre className="p-4 sm:p-5 pr-14 text-white/90 text-sm sm:text-base overflow-x-auto font-mono leading-relaxed">
            {vscodeSnippet}
          </pre>
          <button
            type="button"
            onClick={() => handleCopy(vscodeSnippet, "vscode")}
            className="absolute top-3 right-3 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-medium transition-colors border border-white/10"
            aria-label="Copy"
          >
            {copiedId === "vscode" ? (
              <>
                <Check className="w-3.5 h-3.5" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Copy
              </>
            )}
          </button>
          </div>
          <p className="text-white/70 text-sm mt-4">
            For user-level config across workspaces, run <strong>MCP: Open User Configuration</strong> from the Command Palette and add the server there.
          </p>
          </section>

          {/* Claude Code */}
          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <PlatformIcon src="/icons/claude.svg" className="w-6 h-6 flex-shrink-0" />
            Claude Code
          </h2>
          <ol className="list-decimal list-inside space-y-3 text-white/85 text-sm sm:text-base mb-4">
            <li>
              In your terminal, run:{" "}
              <span className="relative inline-block w-full mt-2">
                <code className="block w-full py-3 pl-4 pr-14 rounded-xl bg-neutral-900/80 border border-white/15 text-white/90 font-mono text-sm overflow-x-auto">
                  {claudeCodeCommand}
                </code>
                <button
                  type="button"
                  onClick={() => handleCopy(claudeCodeCommand, "claude-code")}
                  className="absolute top-2 right-2 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs transition-colors border border-white/10"
                  aria-label="Copy"
                >
                  {copiedId === "claude-code" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </span>
            </li>
            <li>
              When prompted, configure the <code className="px-1.5 py-0.5 rounded bg-white/15 text-accent font-mono text-sm">Authorization</code> header with your API key (e.g. <code className="px-1.5 py-0.5 rounded bg-white/15 font-mono text-sm">Bearer YOUR_API_KEY</code>), if your client supports custom headers.
            </li>
          </ol>
          <p className="text-white/70 text-sm">
            Use <code className="px-1.5 py-0.5 rounded bg-white/15 font-mono text-sm">--scope local</code> (default), <code className="px-1.5 py-0.5 rounded bg-white/15 font-mono text-sm">--scope project</code> (shared via <code className="px-1.5 py-0.5 rounded bg-white/15 font-mono text-sm">.mcp.json</code>), or <code className="px-1.5 py-0.5 rounded bg-white/15 font-mono text-sm">--scope user</code> for all projects.
          </p>
          </section>

          {/* Claude Desktop */}
          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <PlatformIcon src="/icons/claude.svg" className="w-6 h-6 flex-shrink-0" />
            Claude Desktop
          </h2>
          <ol className="list-decimal list-inside space-y-3 text-white/85 text-sm sm:text-base mb-4">
            <li>
              Open <strong>Settings</strong> → <strong>Connectors</strong>.
            </li>
            <li>
              Click <strong>Add Connector</strong> and enter the URL:
            </li>
          </ol>
          <div className="relative rounded-xl overflow-hidden border border-white/15 bg-neutral-900/80 mb-4">
            <pre className="p-4 sm:p-5 pr-14 text-white/90 text-sm sm:text-base overflow-x-auto font-mono">
              {mcpUrl}
            </pre>
            <button
              type="button"
              onClick={() => handleCopy(mcpUrl, "claude-desktop")}
              className="absolute top-3 right-3 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-medium transition-colors border border-white/10"
              aria-label="Copy"
            >
              {copiedId === "claude-desktop" ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Copy
                </>
              )}
            </button>
          </div>
          <ol start={3} className="list-decimal list-inside space-y-3 text-white/85 text-sm sm:text-base">
            <li>
              If your client allows custom headers, set <code className="px-1.5 py-0.5 rounded bg-white/15 text-accent font-mono text-sm">Authorization: Bearer YOUR_API_KEY</code> with your API key.
            </li>
          </ol>
          </section>

          {/* Windsurf */}
          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <PlatformIcon src="/icons/windsurf.jpg" className="w-6 h-6 flex-shrink-0" />
            Windsurf
          </h2>
          <ol className="list-decimal list-inside space-y-3 text-white/85 text-sm sm:text-base mb-4">
            <li>
              Open <strong>Windsurf Settings</strong> (<code className="px-1.5 py-0.5 rounded bg-white/15 font-mono text-sm">Cmd+,</code> on Mac) and search for <strong>MCP</strong>.
            </li>
            <li>
              Click <strong>View raw config</strong> to open <code className="px-1.5 py-0.5 rounded bg-white/15 text-accent font-mono text-sm">mcp_config.json</code>.
            </li>
            <li>
              Add the Deckbase server configuration (replace{" "}
              <code className="px-1.5 py-0.5 rounded bg-white/15 text-accent font-mono text-sm">YOUR_TOKEN_OR_API_KEY</code>):
            </li>
          </ol>
          <div className="relative rounded-xl overflow-hidden border border-white/15 bg-neutral-900/80">
          <pre className="p-4 sm:p-5 pr-14 text-white/90 text-sm sm:text-base overflow-x-auto font-mono leading-relaxed">
            {windsurfSnippet}
          </pre>
          <button
            type="button"
            onClick={() => handleCopy(windsurfSnippet, "windsurf")}
            className="absolute top-3 right-3 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-medium transition-colors border border-white/10"
            aria-label="Copy"
          >
            {copiedId === "windsurf" ? (
              <>
                <Check className="w-3.5 h-3.5" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Copy
              </>
            )}
          </button>
          </div>
          </section>

          {/* ChatGPT */}
          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <PlatformIcon src="/icons/chatgtp.webp" className="w-6 h-6 flex-shrink-0" />
            ChatGPT
          </h2>
          <ol className="list-decimal list-inside space-y-3 text-white/85 text-sm sm:text-base mb-4">
            <li>
              Go to <strong>chatgpt.com/#settings/Connectors</strong> (requires login).
            </li>
            <li>
              Click <strong>Add Connector</strong> and enter the URL:
            </li>
          </ol>
          <div className="relative rounded-xl overflow-hidden border border-white/15 bg-neutral-900/80 mb-4">
            <pre className="p-4 sm:p-5 pr-14 text-white/90 text-sm sm:text-base overflow-x-auto font-mono">
              {mcpUrl}
            </pre>
            <button
              type="button"
              onClick={() => handleCopy(mcpUrl, "chatgpt")}
              className="absolute top-3 right-3 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-medium transition-colors border border-white/10"
              aria-label="Copy"
            >
              {copiedId === "chatgpt" ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Copy
                </>
              )}
            </button>
          </div>
          <ol start={3} className="list-decimal list-inside space-y-3 text-white/85 text-sm sm:text-base">
            <li>
              If the connector supports custom headers, add <code className="px-1.5 py-0.5 rounded bg-white/15 text-accent font-mono text-sm">Authorization: Bearer YOUR_API_KEY</code> with your API key.
            </li>
          </ol>
          </section>

          {/* Codex */}
          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <PlatformIcon src="/icons/codex.png" className="w-6 h-6 flex-shrink-0" />
            Codex
          </h2>
          <ol className="list-decimal list-inside space-y-3 text-white/85 text-sm sm:text-base mb-4">
            <li>
              Add the Deckbase server to your Codex config at <code className="px-1.5 py-0.5 rounded bg-white/15 text-accent font-mono text-sm">~/.codex/config.toml</code>:
            </li>
          </ol>
          <div className="relative rounded-xl overflow-hidden border border-white/15 bg-neutral-900/80">
          <pre className="p-4 sm:p-5 pr-14 text-white/90 text-sm sm:text-base overflow-x-auto font-mono leading-relaxed">
            {codexSnippet}
          </pre>
          <button
            type="button"
            onClick={() => handleCopy(codexSnippet, "codex")}
            className="absolute top-3 right-3 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-medium transition-colors border border-white/10"
            aria-label="Copy"
          >
            {copiedId === "codex" ? (
              <>
                <Check className="w-3.5 h-3.5" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Copy
              </>
            )}
          </button>
          </div>
          <p className="text-white/80 text-sm sm:text-base mb-3">
            Configure the <code className="px-1.5 py-0.5 rounded bg-white/15 text-accent font-mono text-sm">Authorization</code> header with your API key per Codex&apos;s MCP documentation (e.g. environment variable or auth plugin).
          </p>
          <p className="text-white/70 text-sm">
            To share with your team, create a <code className="px-1.5 py-0.5 rounded bg-white/15 font-mono text-sm">.codex/config.toml</code> file in your project root with the same server block.
          </p>
          </section>

          {/* Other tools */}
          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
          <h2 className="text-xl font-semibold text-white mb-4">Other tools</h2>
          <p className="text-white/80 text-sm sm:text-base mb-4">
            If your AI tool isn&apos;t listed above but supports MCP, use the Deckbase MCP endpoint and send your API key in the <code className="text-accent">Authorization: Bearer</code> header.
          </p>
          <div className="overflow-x-auto rounded-xl border border-white/15 mb-4">
            <table className="w-full text-sm sm:text-base text-left text-white/85">
              <thead>
                <tr className="bg-white/5 border-b border-white/10">
                  <th className="px-4 py-3 font-semibold text-white">Transport</th>
                  <th className="px-4 py-3 font-semibold text-white">URL</th>
                  <th className="px-4 py-3 font-semibold text-white">Notes</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-white/10 last:border-0">
                  <td className="px-4 py-3">Streamable HTTP</td>
                  <td className="px-4 py-3 font-mono text-accent break-all text-sm">{mcpUrl}</td>
                  <td className="px-4 py-3">
                    Send <code className="px-1.5 py-0.5 rounded bg-white/15 text-accent font-mono text-sm">Authorization: Bearer &lt;API key&gt;</code> with every request.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <button
            type="button"
            onClick={() => setShowOtherTools(!showOtherTools)}
            className="flex items-center gap-2 text-white/85 hover:text-white py-2 text-sm font-medium"
          >
            {showOtherTools ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
            <span>JSON configuration format</span>
          </button>
          {showOtherTools && (
            <div className="relative rounded-xl overflow-hidden border border-white/15 bg-neutral-900/80 mt-4">
            <pre className="p-4 sm:p-5 pr-14 text-white/90 text-sm sm:text-base overflow-x-auto font-mono leading-relaxed">
              {cursorSnippet}
            </pre>
            <button
              type="button"
              onClick={() => handleCopy(cursorSnippet, "other")}
              className="absolute top-3 right-3 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-medium transition-colors border border-white/10"
              aria-label="Copy"
            >
              {copiedId === "other" ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Copy
                </>
              )}
            </button>
            </div>
          )}

          <p className="text-white/60 text-sm mt-8">
            Full technical details:{" "}
            <code className="px-1.5 py-0.5 rounded bg-white/15 text-accent font-mono text-sm">mcp-server/README.md</code> in the repo.
          </p>
          </section>
        </motion.div>
      </section>
    </div>
  );
}
