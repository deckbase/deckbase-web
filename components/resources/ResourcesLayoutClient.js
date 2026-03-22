"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Link2, BookOpen } from "lucide-react";
import { useState } from "react";

const resourceNav = [
  { href: "/resources", label: "Overview" },
  { href: "/resources/mcp", label: "MCP for flashcards" },
  { href: "/anki-alternatives", label: "Anki alternatives" },
  { href: "/best-flashcard-apps", label: "Best flashcard apps" },
];

/** In-page anchors for long guides (must match `id` on sections). */
const pageAnchors = {
  "/resources": [{ id: "quick-links", label: "Quick links" }],
  "/resources/mcp": [
    { id: "overview", label: "Overview" },
    { id: "comparison", label: "Comparison" },
    { id: "create-cards-workflow", label: "Create cards" },
    { id: "example-prompt", label: "Example prompts" },
    { id: "requirements", label: "Requirements" },
    { id: "faq", label: "FAQ" },
    { id: "related", label: "Related" },
  ],
  "/anki-alternatives": [
    { id: "who-looks", label: "Who looks for alternatives" },
    { id: "apps-at-a-glance", label: "Apps at a glance" },
    { id: "why-deckbase", label: "Why Deckbase" },
    { id: "try-deckbase", label: "Try Deckbase" },
    { id: "faq", label: "FAQ" },
    { id: "related", label: "Related" },
  ],
  "/best-flashcard-apps": [
    { id: "how-to-choose", label: "How to choose" },
    { id: "shortlist", label: "Shortlist" },
    { id: "try-deckbase", label: "Try Deckbase" },
    { id: "faq", label: "FAQ" },
    { id: "related", label: "Related" },
  ],
};

const navLink = (active) =>
  active
    ? "block rounded-lg px-3 py-2 text-sm font-medium text-accent bg-accent/[0.12] ring-1 ring-inset ring-accent/25"
    : "block rounded-lg px-3 py-2 text-sm text-neutral-400 transition-colors hover:bg-white/[0.04] hover:text-neutral-100";

const anchorLink =
  "block rounded-md px-3 py-1.5 text-[13px] leading-snug text-neutral-500 transition-colors hover:bg-white/[0.03] hover:text-neutral-200";

export default function ResourcesLayoutClient({ children }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const anchors = pageAnchors[pathname] ?? [];

  return (
    <div className="min-h-screen bg-[#070707] pt-24 pb-28 text-neutral-200 antialiased [min-height:100dvh]">
      <div className="mx-auto flex max-w-7xl px-4 sm:px-6 lg:px-8">
        <aside className="hidden w-60 flex-shrink-0 self-start pt-10 lg:block">
          <div className="sticky top-24 max-h-[calc(100vh-7rem)] space-y-8 overflow-y-auto overflow-x-hidden overscroll-contain pr-1 [-webkit-overflow-scrolling:touch] lg:top-28 lg:max-h-[calc(100vh-8.5rem)]">
            <div>
              <Link
                href="/resources"
                className="mb-5 flex items-center gap-2 text-neutral-500 transition-colors hover:text-neutral-200"
              >
                <Link2 className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">Resources</span>
              </Link>
              <nav aria-label="Resources section">
                <ul className="space-y-0.5">
                  {resourceNav.map((page) => (
                    <li key={page.href}>
                      <Link href={page.href} className={navLink(pathname === page.href)}>
                        {page.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            </div>

            <div className="border-t border-neutral-800/80 pt-6">
              <Link
                href="/docs"
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-neutral-500 transition-colors hover:bg-white/[0.04] hover:text-neutral-300"
              >
                <BookOpen className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
                Technical docs
              </Link>
            </div>

            {anchors.length > 0 && (
              <div className="border-t border-neutral-800/80 pt-6">
                <p className="mb-3 px-3 text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-neutral-600">
                  On this page
                </p>
                <ul className="space-y-0.5 border-l border-neutral-800 pl-3">
                  {anchors.map((item) => (
                    <li key={item.id}>
                      <a href={`#${item.id}`} className={anchorLink}>
                        {item.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </aside>

        <div className="fixed left-4 right-4 top-20 z-30 flex items-center border-b border-neutral-800/90 bg-[#070707]/95 py-2 backdrop-blur-sm lg:hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen((o) => !o)}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-neutral-200 transition-colors hover:bg-white/[0.06]"
            aria-expanded={sidebarOpen}
            aria-controls="resources-mobile-nav"
          >
            {sidebarOpen ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
            <span>{sidebarOpen ? "Close" : "Resources menu"}</span>
          </button>
        </div>

        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/80 px-4 pb-8 pt-28 backdrop-blur-sm lg:hidden"
            id="resources-mobile-nav"
            onClick={() => setSidebarOpen(false)}
            role="presentation"
          >
            <div
              className="mx-auto max-h-[calc(100vh-8rem)] w-full max-w-sm overflow-y-auto rounded-xl border border-neutral-800 bg-[#0c0c0c] p-5 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="mb-4 text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-neutral-500">
                Resources
              </p>
              <ul className="mb-6 space-y-0.5">
                {resourceNav.map((page) => (
                  <li key={page.href}>
                    <Link
                      href={page.href}
                      onClick={() => setSidebarOpen(false)}
                      className={navLink(pathname === page.href)}
                    >
                      {page.label}
                    </Link>
                  </li>
                ))}
              </ul>
              <Link
                href="/docs"
                onClick={() => setSidebarOpen(false)}
                className="mb-6 flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-neutral-500 transition-colors hover:bg-white/[0.04] hover:text-neutral-300"
              >
                <BookOpen className="h-3.5 w-3.5" aria-hidden />
                Technical docs
              </Link>
              {anchors.length > 0 && (
                <>
                  <p className="mb-3 px-3 text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-neutral-600">
                    On this page
                  </p>
                  <ul className="space-y-0.5 border-l border-neutral-800 pl-3">
                    {anchors.map((item) => (
                      <li key={item.id}>
                        <a
                          href={`#${item.id}`}
                          onClick={() => setSidebarOpen(false)}
                          className={anchorLink}
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

        <main className="min-w-0 flex-1 overflow-x-auto border-neutral-800/60 pt-[4.75rem] sm:pt-16 lg:border-l lg:pl-12 lg:pt-10">
          {children}
        </main>
      </div>
    </div>
  );
}
