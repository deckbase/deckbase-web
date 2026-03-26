"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, BookOpen, ChevronRight } from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const docPages = [
  { href: "/docs", label: "Overview" },
  { href: "/docs/mcp-server", label: "MCP Server" },
];

const docsIndexAnchors = [{ id: "documentation", label: "Documentation" }];

const mcpServerAnchors = [
  { id: "endpoints", label: "Endpoints" },
  { id: "tools", label: "Tools" },
  { id: "resources", label: "Resources" },
  { id: "example", label: "Example" },
  { id: "technical-details", label: "Technical details" },
];

export default function DocsLayoutClient({ children }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeAnchor, setActiveAnchor] = useState(null);

  const isMcpServer = pathname === "/docs/mcp-server";
  const isDocsIndex = pathname === "/docs";
  const sidebarAnchors = isMcpServer
    ? mcpServerAnchors
    : isDocsIndex
      ? docsIndexAnchors
      : [];

  // Track active anchor via IntersectionObserver
  useEffect(() => {
    if (sidebarAnchors.length === 0) return;
    const observers = [];
    sidebarAnchors.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActiveAnchor(id);
        },
        { rootMargin: "-20% 0px -70% 0px" }
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, [pathname]);

  return (
    <div className="min-h-screen bg-black pt-24 pb-20 text-white">
      <div className="flex max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Desktop sidebar */}
        <aside className="hidden lg:flex flex-col w-52 flex-shrink-0 pt-10">
          <div className="sticky top-28 flex flex-col gap-7">

            {/* Nav pages */}
            <div>
              <div className="flex items-center gap-2 mb-3 px-2">
                <BookOpen className="w-3.5 h-3.5 text-white/30" />
                <span className="text-[11px] font-semibold uppercase tracking-widest text-white/30">
                  Docs
                </span>
              </div>
              <ul className="space-y-0.5">
                {docPages.map((page) => {
                  const active = pathname === page.href;
                  return (
                    <li key={page.href}>
                      <Link
                        href={page.href}
                        className={`flex items-center gap-2 px-2 py-2 rounded-lg text-sm transition-all duration-150 ${
                          active
                            ? "text-white font-medium bg-white/[0.06]"
                            : "text-white/45 hover:text-white/80 hover:bg-white/[0.03]"
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

            {/* On this page */}
            {sidebarAnchors.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-white/30 mb-3 px-2">
                  On this page
                </p>
                <ul className="space-y-0.5 border-l border-white/[0.07] ml-2">
                  {sidebarAnchors.map((item) => {
                    const active = activeAnchor === item.id;
                    return (
                      <li key={item.id}>
                        <a
                          href={`#${item.id}`}
                          className={`block pl-3 pr-2 py-1.5 text-[13px] transition-all duration-150 border-l-2 -ml-px ${
                            active
                              ? "border-accent text-white"
                              : "border-transparent text-white/35 hover:text-white/70"
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
            <span>
              {isMcpServer ? "MCP Server" : isDocsIndex ? "Overview" : "Docs"}
            </span>
            <ChevronRight className={`w-3.5 h-3.5 transition-transform ${sidebarOpen ? "rotate-90" : ""}`} />
          </button>
        </div>

        {/* Mobile dropdown menu */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              className="lg:hidden fixed top-[110px] left-4 right-4 z-40 rounded-xl border border-white/[0.08] bg-[#0d0d0d] shadow-2xl overflow-hidden"
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
            >
              <div className="p-3">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30 px-2 mb-2">
                  Documentation
                </p>
                {docPages.map((page) => {
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
                      {active && <span className="w-1 h-1 rounded-full bg-accent" />}
                      {page.label}
                    </Link>
                  );
                })}
                {sidebarAnchors.length > 0 && (
                  <>
                    <div className="border-t border-white/[0.06] my-2" />
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30 px-2 mb-2">
                      On this page
                    </p>
                    {sidebarAnchors.map((item) => (
                      <a
                        key={item.id}
                        href={`#${item.id}`}
                        onClick={() => setSidebarOpen(false)}
                        className="block px-3 py-2 rounded-lg text-sm text-white/50 hover:text-white hover:bg-white/[0.04] transition-colors"
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
        <main className="flex-1 min-w-0 pt-10 lg:pt-10 lg:pl-10 mt-12 lg:mt-0">
          {children}
        </main>
      </div>
    </div>
  );
}
