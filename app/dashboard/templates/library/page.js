"use client";

import { motion } from "framer-motion";
import { ArrowLeft, LayoutTemplate } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { listLibraryTemplatesBySection } from "@/lib/default-template-library";

export default function TemplateLibraryPage() {
  const { user } = useAuth();
  const generalLibrary = listLibraryTemplatesBySection("general");
  const languageLibrary = listLibraryTemplatesBySection("language");

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-10">
        <div className="flex items-start gap-4">
          <Link
            href="/dashboard/templates"
            className="p-2 hover:bg-white/10 rounded-lg transition-colors shrink-0"
          >
            <ArrowLeft className="w-5 h-5 text-white/70" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Template library</h1>
            <p className="text-white/60 max-w-2xl">
              Built-in starters shared with iOS and Android. Open a layout for a
              preview, then save a copy to edit it under My templates.
            </p>
          </div>
        </div>
        <Link
          href="/dashboard/templates"
          className="shrink-0 inline-flex items-center justify-center px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/90 text-sm font-medium transition-colors"
        >
          My templates
        </Link>
      </div>

      {!user && (
        <p className="text-white/50 text-sm mb-8">
          Sign in to save templates to your account.
        </p>
      )}

      <section className="mb-14">
        <h2 className="text-sm font-medium text-white/70 mb-3">General</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-10">
          {generalLibrary.map((t, index) => (
            <motion.div
              key={t.templateId}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.02 }}
            >
              <Link
                href={`/dashboard/templates/library/${t.templateId}`}
                className="block h-full"
              >
                <div className="bg-white/5 hover:bg-white/10 border border-white/10 hover:border-violet-500/30 rounded-xl p-5 transition-all h-full">
                  <div className="flex items-start gap-3 mb-2">
                    {t.emoji ? (
                      <span className="text-2xl shrink-0" aria-hidden>
                        {t.emoji}
                      </span>
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-violet-500/15 flex items-center justify-center shrink-0">
                        <LayoutTemplate className="w-5 h-5 text-violet-300" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <h3 className="text-base font-semibold text-white line-clamp-2">
                        {t.name}
                      </h3>
                      {t.description && (
                        <p className="text-white/45 text-xs mt-1 line-clamp-2">
                          {t.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-violet-300/90 text-xs font-medium mt-3">
                    Preview →
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        <h2 className="text-sm font-medium text-white/70 mb-3">Language</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {languageLibrary.map((t, index) => (
            <motion.div
              key={t.templateId}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.02 }}
            >
              <Link
                href={`/dashboard/templates/library/${t.templateId}`}
                className="block h-full"
              >
                <div className="bg-white/5 hover:bg-white/10 border border-white/10 hover:border-emerald-500/30 rounded-xl p-5 transition-all h-full">
                  <div className="flex items-start gap-3 mb-2">
                    {t.emoji ? (
                      <span className="text-2xl shrink-0" aria-hidden>
                        {t.emoji}
                      </span>
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-emerald-500/15 flex items-center justify-center shrink-0">
                        <LayoutTemplate className="w-5 h-5 text-emerald-300" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <h3 className="text-base font-semibold text-white line-clamp-2">
                        {t.name}
                      </h3>
                      {t.description && (
                        <p className="text-white/45 text-xs mt-1 line-clamp-2">
                          {t.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-emerald-300/90 text-xs font-medium mt-3">
                    Preview →
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}
