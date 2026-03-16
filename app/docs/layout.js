"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, BookOpen } from "lucide-react";
import { useState } from "react";

const docPages = [
  { href: "/docs", label: "Overview" },
  { href: "/docs/mcp-server", label: "MCP Server" },
];

const mcpServerAnchors = [
  { id: "endpoints", label: "Endpoints" },
  { id: "tools", label: "Tools" },
  { id: "resources", label: "Resources" },
  { id: "example", label: "Example" },
  { id: "technical-details", label: "Technical details" },
];

export default function DocsLayout({ children }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMcpServer = pathname === "/docs/mcp-server";

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-950 via-neutral-950 to-black pt-24 pb-20">
      <div className="flex max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block w-56 flex-shrink-0 pt-12">
          <div className="sticky top-28 space-y-6">
            <div>
              <Link
                href="/docs"
                className="flex items-center gap-2 text-white/70 hover:text-white mb-4"
              >
                <BookOpen className="w-4 h-4" />
                <span className="text-sm font-medium">Docs</span>
              </Link>
              <ul className="space-y-1">
                {docPages.map((page) => (
                  <li key={page.href}>
                    <Link
                      href={page.href}
                      className={`block py-2 px-3 rounded-lg text-sm transition-colors ${
                        pathname === page.href
                          ? "text-accent bg-accent/10"
                          : "text-white/75 hover:text-white hover:bg-white/10"
                      }`}
                    >
                      {page.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            {isMcpServer && (
              <div>
                <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 px-3">
                  On this page
                </p>
                <ul className="space-y-1">
                  {mcpServerAnchors.map((item) => (
                    <li key={item.id}>
                      <a
                        href={`#${item.id}`}
                        className="block py-2 px-3 rounded-lg text-sm text-white/75 hover:text-white hover:bg-white/10 transition-colors"
                      >
                        {item.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </aside>

        {/* Mobile sidebar toggle */}
        <div className="lg:hidden fixed top-20 left-4 right-4 z-30 flex items-center py-2 bg-neutral-950/95 backdrop-blur border-b border-white/10">
          <button
            type="button"
            onClick={() => setSidebarOpen((o) => !o)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-white/85 hover:bg-white/10"
            aria-expanded={sidebarOpen}
            aria-controls="docs-mobile-nav"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            <span>{sidebarOpen ? "Close" : "Docs menu"}</span>
          </button>
        </div>

        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div
            className="lg:hidden fixed inset-0 z-40 pt-28 pb-8 px-4 bg-black/80 backdrop-blur-sm"
            id="docs-mobile-nav"
            onClick={() => setSidebarOpen(false)}
            aria-hidden
          >
            <div
              className="max-w-xs w-full rounded-xl border border-white/10 bg-neutral-900/95 p-4 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">
                Documentation
              </p>
              <ul className="space-y-1 mb-4">
                {docPages.map((page) => (
                  <li key={page.href}>
                    <Link
                      href={page.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`block py-2 px-3 rounded-lg text-sm ${
                        pathname === page.href ? "text-accent bg-accent/10" : "text-white/85 hover:bg-white/10"
                      }`}
                    >
                      {page.label}
                    </Link>
                  </li>
                ))}
              </ul>
              {isMcpServer && (
                <>
                  <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 px-3">
                    On this page
                  </p>
                  <ul className="space-y-1">
                    {mcpServerAnchors.map((item) => (
                      <li key={item.id}>
                        <a
                          href={`#${item.id}`}
                          onClick={() => setSidebarOpen(false)}
                          className="block py-2 px-3 rounded-lg text-sm text-white/75 hover:bg-white/10"
                        >
                          {item.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </div>
        )}

        {/* Main content */}
        <main className="flex-1 min-w-0 pt-12 lg:pt-12 lg:pl-8">
          {children}
        </main>
      </div>
    </div>
  );
}
