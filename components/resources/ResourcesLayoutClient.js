"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Link2, BookOpen } from "lucide-react";
import { useState } from "react";

const resourceNav = [
  { href: "/resources", label: "Overview" },
  { href: "/mcp", label: "MCP setup" },
  { href: "/download", label: "Download" },
  { href: "/contact-us", label: "Contact" },
  { href: "/anki-alternatives", label: "Anki alternatives" },
  { href: "/best-flashcard-apps", label: "Best flashcard apps" },
];

/** In-page anchors for long guides (must match `id` on sections). */
const pageAnchors = {
  "/resources": [{ id: "quick-links", label: "Quick links" }],
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
    ? "block py-2 px-3 rounded-lg text-sm font-medium text-accent"
    : "block py-2 px-3 rounded-lg text-sm text-neutral-300 hover:text-white";

export default function ResourcesLayoutClient({ children }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const anchors = pageAnchors[pathname] ?? [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-950 via-neutral-950 to-black pt-24 pb-20">
      <div className="flex max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <aside className="hidden lg:block w-56 flex-shrink-0 pt-12">
          <div className="sticky top-28 space-y-6">
            <div>
              <Link
                href="/resources"
                className="flex items-center gap-2 text-white/70 hover:text-white mb-4"
              >
                <Link2 className="w-4 h-4" />
                <span className="text-sm font-medium">Resources</span>
              </Link>
              <ul className="space-y-1">
                {resourceNav.map((page) => (
                  <li key={page.href}>
                    <Link href={page.href} className={navLink(pathname === page.href)}>
                      {page.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-2 border-t border-neutral-800">
              <Link
                href="/docs"
                className="flex items-center gap-2 text-xs text-white/50 hover:text-white/80 transition-colors px-3"
              >
                <BookOpen className="w-3.5 h-3.5" />
                Technical docs
              </Link>
            </div>

            {anchors.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 px-3">
                  On this page
                </p>
                <ul className="space-y-1">
                  {anchors.map((item) => (
                    <li key={item.id}>
                      <a
                        href={`#${item.id}`}
                        className="block py-2 px-3 rounded-lg text-sm text-neutral-300 hover:text-white"
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

        <div className="lg:hidden fixed top-20 left-4 right-4 z-30 flex items-center py-2 border-b border-neutral-800">
          <button
            type="button"
            onClick={() => setSidebarOpen((o) => !o)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-neutral-200"
            aria-expanded={sidebarOpen}
            aria-controls="resources-mobile-nav"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            <span>{sidebarOpen ? "Close" : "Resources menu"}</span>
          </button>
        </div>

        {sidebarOpen && (
          <div
            className="lg:hidden fixed inset-0 z-40 pt-28 pb-8 px-4 bg-black"
            id="resources-mobile-nav"
            onClick={() => setSidebarOpen(false)}
            aria-hidden
          >
            <div
              className="max-w-xs w-full max-h-[calc(100vh-8rem)] overflow-y-auto border-l border-neutral-800 pl-4"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">
                Resources
              </p>
              <ul className="space-y-1 mb-4">
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
                className="flex items-center gap-2 text-xs text-white/60 hover:text-white mb-4 px-3"
              >
                <BookOpen className="w-3.5 h-3.5" />
                Technical docs
              </Link>
              {anchors.length > 0 && (
                <>
                  <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 px-3">
                    On this page
                  </p>
                  <ul className="space-y-1">
                    {anchors.map((item) => (
                      <li key={item.id}>
                        <a
                          href={`#${item.id}`}
                          onClick={() => setSidebarOpen(false)}
                          className="block py-2 px-3 rounded-lg text-sm text-neutral-300 hover:text-white"
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

        <main className="flex-1 min-w-0 pt-12 lg:pt-12 lg:pl-8">{children}</main>
      </div>
    </div>
  );
}
