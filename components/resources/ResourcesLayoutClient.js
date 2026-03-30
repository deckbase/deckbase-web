"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, BookOpen, ChevronRight, Link2 } from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const resourceNav = [
  { href: "/resources", label: "Overview" },
  { href: "/ai-flashcards", label: "AI flashcards" },
  { href: "/resources/mcp", label: "MCP for flashcards" },
  { href: "/anki-alternatives", label: "Anki alternatives" },
  { href: "/quizlet-alternatives", label: "Quizlet alternatives" },
  { href: "/best-flashcard-apps", label: "Best flashcard apps" },
  { href: "/deckbase-vs-anki", label: "Deckbase vs Anki" },
  { href: "/deckbase-vs-quizlet", label: "Deckbase vs Quizlet" },
  { href: "/deckbase-vs-remnote", label: "Deckbase vs RemNote" },
];

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
  "/ai-flashcards": [
    { id: "why", label: "Why Deckbase" },
    { id: "pdf-notes", label: "PDF & notes" },
    { id: "app-web", label: "AI flashcard app" },
    { id: "anki-bridge", label: "Anki & Quizlet" },
    { id: "mcp", label: "MCP + flashcards" },
    { id: "cta", label: "Try Deckbase" },
    { id: "faq", label: "FAQ" },
    { id: "related", label: "Related" },
  ],
  "/deckbase-vs-anki": [
    { id: "summary", label: "Quick Summary" },
    { id: "feature-comparison", label: "Feature Comparison" },
    { id: "pricing", label: "Pricing" },
    { id: "deep-dive", label: "Deep Dive" },
    { id: "faq", label: "FAQ" },
    { id: "related", label: "Related" },
  ],
  "/deckbase-vs-quizlet": [
    { id: "summary", label: "Quick Summary" },
    { id: "feature-comparison", label: "Feature Comparison" },
    { id: "pricing", label: "Pricing" },
    { id: "deep-dive", label: "Deep Dive" },
    { id: "faq", label: "FAQ" },
    { id: "related", label: "Related" },
  ],
  "/deckbase-vs-remnote": [
    { id: "summary", label: "Quick Summary" },
    { id: "feature-comparison", label: "Feature Comparison" },
    { id: "pricing", label: "Pricing" },
    { id: "deep-dive", label: "Deep Dive" },
    { id: "faq", label: "FAQ" },
    { id: "related", label: "Related" },
  ],
  "/quizlet-alternatives": [
    { id: "who-looks", label: "Who looks for alternatives" },
    { id: "apps-at-a-glance", label: "Apps at a glance" },
    { id: "why-deckbase", label: "Why Deckbase" },
    { id: "try-deckbase", label: "Try Deckbase" },
    { id: "faq", label: "FAQ" },
    { id: "related", label: "Related" },
  ],
};

export default function ResourcesLayoutClient({ children }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeAnchor, setActiveAnchor] = useState(null);
  const anchors = pageAnchors[pathname] ?? [];

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (anchors.length === 0) return;
    const observers = [];
    anchors.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveAnchor(id); },
        { rootMargin: "-20% 0px -70% 0px" }
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, [pathname]);

  const currentPage = resourceNav.find((p) => p.href === pathname)?.label ?? "Resources";

  return (
    <div className="min-h-screen bg-black pt-24 pb-28 text-white antialiased">
      <div className="mx-auto flex max-w-7xl px-4 sm:px-6 lg:px-8">

        {/* Desktop sidebar */}
        <aside className="hidden lg:flex flex-col w-56 flex-shrink-0 self-start pt-10">
          <div className="sticky top-28 flex flex-col gap-7 max-h-[calc(100vh-8.5rem)] overflow-y-auto pr-1">

            {/* Section label */}
            <div>
              <div className="flex items-center gap-2 mb-3 px-2">
                <Link2 className="w-3.5 h-3.5 text-white/30" />
                <span className="text-[11px] font-semibold uppercase tracking-widest text-white/30">
                  Resources
                </span>
              </div>
              <ul className="space-y-0.5">
                {resourceNav.map((page) => {
                  const active = pathname === page.href;
                  return (
                    <li key={page.href}>
                      <Link
                        href={page.href}
                        className={`flex items-center gap-2 px-2 py-2 rounded-lg text-sm transition-all duration-150 ${
                          active
                            ? "text-white font-medium bg-white/[0.06]"
                            : "text-white/40 hover:text-white/80 hover:bg-white/[0.03]"
                        }`}
                      >
                        {active && (
                          <span className="w-1 h-1 rounded-full bg-accent flex-shrink-0" />
                        )}
                        {page.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Technical docs link */}
            <div className="border-t border-white/[0.06] pt-5">
              <Link
                href="/docs"
                className="flex items-center gap-2 px-2 py-2 rounded-lg text-sm text-white/30 hover:text-white/70 hover:bg-white/[0.03] transition-all duration-150"
              >
                <BookOpen className="w-3.5 h-3.5 flex-shrink-0" />
                Technical docs
              </Link>
            </div>

            {/* On this page */}
            {anchors.length > 0 && (
              <div className="border-t border-white/[0.06] pt-5">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-white/30 mb-3 px-2">
                  On this page
                </p>
                <ul className="space-y-0.5 border-l border-white/[0.07] ml-2">
                  {anchors.map((item) => {
                    const active = activeAnchor === item.id;
                    return (
                      <li key={item.id}>
                        <a
                          href={`#${item.id}`}
                          className={`block pl-3 pr-2 py-1.5 text-[13px] transition-all duration-150 border-l-2 -ml-px ${
                            active
                              ? "border-accent text-white"
                              : "border-transparent text-white/30 hover:text-white/70"
                          }`}
                        >
                          {item.label}
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        </aside>

        {/* Mobile top bar */}
        <div className="lg:hidden fixed top-[68px] left-0 right-0 z-30 bg-black/90 backdrop-blur-xl border-b border-white/[0.06] px-4">
          <button
            type="button"
            onClick={() => setSidebarOpen((o) => !o)}
            className="flex items-center gap-2 py-3 text-sm text-white/60 hover:text-white transition-colors"
            aria-expanded={sidebarOpen}
          >
            {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            <span>{currentPage}</span>
            <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-200 ${sidebarOpen ? "rotate-90" : ""}`} />
          </button>
        </div>

        {/* Mobile dropdown */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              className="lg:hidden fixed top-[110px] left-4 right-4 z-40 rounded-xl border border-white/[0.08] bg-[#0d0d0d] shadow-2xl overflow-hidden"
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
            >
              <div className="p-3 max-h-[70vh] overflow-y-auto">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30 px-2 mb-2">
                  Resources
                </p>
                {resourceNav.map((page) => {
                  const active = pathname === page.href;
                  return (
                    <Link
                      key={page.href}
                      href={page.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                        active
                          ? "text-white bg-white/[0.07] font-medium"
                          : "text-white/50 hover:text-white hover:bg-white/[0.04]"
                      }`}
                    >
                      {active && <span className="w-1 h-1 rounded-full bg-accent flex-shrink-0" />}
                      {page.label}
                    </Link>
                  );
                })}

                <div className="border-t border-white/[0.06] my-2" />
                <Link
                  href="/docs"
                  onClick={() => setSidebarOpen(false)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-white/40 hover:text-white hover:bg-white/[0.04] transition-colors"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  Technical docs
                </Link>

                {anchors.length > 0 && (
                  <>
                    <div className="border-t border-white/[0.06] my-2" />
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30 px-2 mb-2">
                      On this page
                    </p>
                    {anchors.map((item) => (
                      <a
                        key={item.id}
                        href={`#${item.id}`}
                        onClick={() => setSidebarOpen(false)}
                        className="block px-3 py-2 rounded-lg text-sm text-white/45 hover:text-white hover:bg-white/[0.04] transition-colors"
                      >
                        {item.label}
                      </a>
                    ))}
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main content */}
        <main className="min-w-0 flex-1 overflow-x-auto pt-[4.75rem] sm:pt-16 lg:border-l lg:border-white/[0.06] lg:pl-12 lg:pt-10 mt-0">
          {children}
        </main>
      </div>
    </div>
  );
}
