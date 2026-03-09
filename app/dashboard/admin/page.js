"use client";

import Link from "next/link";
import { ArrowLeft, Settings, BookOpenText, BarChart2, Smartphone } from "lucide-react";

export default function AdminPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-white/60 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </Link>
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
          <Settings className="w-6 h-6 text-white/70" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Admin</h1>
          <p className="text-white/50 text-sm">Tools and settings</p>
        </div>
      </div>
      <div className="space-y-3">
        <Link
          href="/dashboard/admin/seo"
          className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-colors group"
        >
          <div className="w-12 h-12 rounded-lg bg-accent/20 flex items-center justify-center group-hover:bg-accent/30 transition-colors">
            <BarChart2 className="w-6 h-6 text-accent" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-white">SEO Command Center</h2>
            <p className="text-white/50 text-sm">
              Live SEO data, content health, keyword rankings, and programmatic strategy
            </p>
          </div>
        </Link>

        <Link
          href="/dashboard/admin/aso"
          className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-colors group"
        >
          <div className="w-12 h-12 rounded-lg bg-accent/20 flex items-center justify-center group-hover:bg-accent/30 transition-colors">
            <Smartphone className="w-6 h-6 text-accent" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-white">ASO Command Center</h2>
            <p className="text-white/50 text-sm">
              App Store Optimization: keyword discovery, filtering, and opportunities for iOS & Android
            </p>
          </div>
        </Link>

        <Link
          href="/dashboard/admin/phrases"
          className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-colors group"
        >
          <div className="w-12 h-12 rounded-lg bg-accent/20 flex items-center justify-center group-hover:bg-accent/30 transition-colors">
            <BookOpenText className="w-6 h-6 text-accent" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-white">Nic English Phrases</h2>
            <p className="text-white/50 text-sm">
              Scraped phrases table from nic-english.com/phrase for analysis and export
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}
