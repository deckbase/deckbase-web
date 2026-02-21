"use client";

import { useMemo, useState } from "react";

export default function PhrasesTable({ phrases }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return phrases;
    return phrases.filter((p) => {
      return (
        p.japanese_translation.toLowerCase().includes(q) ||
        p.phrase.toLowerCase().includes(q) ||
        (p.category || "").toLowerCase().includes(q) ||
        (p.part_of_speech || "").toLowerCase().includes(q)
      );
    });
  }, [phrases, query]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by Japanese, phrase, category, or part of speech"
            className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder-white/40 focus:border-accent focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-3 justify-between sm:justify-end">
          <div className="text-xs text-white/40">
            Showing {filtered.length} of {phrases.length} phrases
          </div>
          <a
            href="/api/admin/phrases/export"
            className="inline-flex items-center rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent/90 transition-colors"
          >
            Export XLSX
          </a>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-white/10 bg-black/40">
        <div className="max-h-[70vh] overflow-auto">
          <table className="min-w-full text-left text-sm text-white/80">
            <thead className="sticky top-0 bg-black/70 backdrop-blur">
              <tr>
                <th className="border-b border-white/10 px-3 py-2 font-semibold">
                  Japanese
                </th>
                <th className="border-b border-white/10 px-3 py-2 font-semibold">
                  Phrase
                </th>
                <th className="border-b border-white/10 px-3 py-2 font-semibold">
                  Category
                </th>
                <th className="border-b border-white/10 px-3 py-2 font-semibold">
                  Part of speech
                </th>
                <th className="border-b border-white/10 px-3 py-2 font-semibold">
                  Explanation
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, idx) => (
                <tr
                  key={`${p.japanese_translation}-${p.phrase}-${idx}`}
                  className="odd:bg-white/5 even:bg-transparent hover:bg-white/10"
                >
                  <td className="align-top px-3 py-2 text-xs sm:text-sm">
                    {p.japanese_translation}
                  </td>
                  <td className="align-top px-3 py-2 text-xs sm:text-sm">
                    {p.phrase}
                  </td>
                  <td className="align-top px-3 py-2 text-xs sm:text-sm whitespace-nowrap">
                    {p.category}
                  </td>
                  <td className="align-top px-3 py-2 text-xs sm:text-sm whitespace-nowrap">
                    {p.part_of_speech || "—"}
                  </td>
                  <td className="align-top px-3 py-2 text-xs sm:text-sm">
                    <pre className="whitespace-pre-wrap font-sans text-white/75">
                      {p.explanation}
                    </pre>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

