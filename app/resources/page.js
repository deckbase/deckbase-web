"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  Cpu,
  Link2,
  Download,
  MessageCircle,
  ExternalLink,
} from "lucide-react";

const resourceGroups = [
  {
    title: "Quick links",
    items: [
      {
        title: "MCP setup",
        description: "Connect Cursor, Claude Code, VS Code, and other AI tools to Deckbase via the Model Context Protocol.",
        href: "/mcp",
        internal: true,
        icon: Cpu,
      },
      {
        title: "Download app",
        description: "Get the Deckbase app for iOS and Android.",
        href: "/download",
        internal: true,
        icon: Download,
      },
      {
        title: "Contact",
        description: "Get in touch for support or feedback.",
        href: "/contact-us",
        internal: true,
        icon: MessageCircle,
      },
    ],
  },
];

function ResourceCard({ item }) {
  const Icon = item.icon;
  const content = (
    <>
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center text-accent">
          <Icon className="w-5 h-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            {item.title}
            {!item.internal && (
              <ExternalLink className="w-4 h-4 text-white/50 flex-shrink-0" aria-hidden />
            )}
          </h3>
          <p className="text-white/75 text-sm mt-1">{item.description}</p>
        </div>
      </div>
    </>
  );

  if (item.internal) {
    return (
      <Link
        href={item.href}
        className="block rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-8 hover:bg-white/[0.06] hover:border-white/15 transition-colors"
      >
        {content}
      </Link>
    );
  }

  return (
    <a
      href={item.href}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-8 hover:bg-white/[0.06] hover:border-white/15 transition-colors"
    >
      {content}
    </a>
  );
}

export default function ResourcesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-950 via-neutral-950 to-black pt-24 pb-20">
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-12"
        >
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-accent/15 border border-accent/30 text-accent text-sm font-medium mb-6">
              <Link2 className="w-4 h-4" aria-hidden />
              Quick links
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight mb-4">
              Resources
            </h1>
            <p className="text-base sm:text-lg text-white/85 max-w-2xl leading-relaxed">
              Quick links for MCP setup, app download, and contact. For feature docs and API reference, see{" "}
              <Link href="/docs" className="text-accent hover:underline">Docs</Link>.
            </p>
          </div>

          {resourceGroups.map((group) => (
            <div key={group.title}>
              <h2 className="text-xl font-semibold text-white mb-4">{group.title}</h2>
              <ul className="space-y-4">
                {group.items.map((item) => (
                  <li key={item.title}>
                    <ResourceCard item={item} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </motion.div>
      </section>
    </div>
  );
}
