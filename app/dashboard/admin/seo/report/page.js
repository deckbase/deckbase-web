"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, BarChart2, Loader2, Download } from "lucide-react";
import { useAdminFetch } from "@/hooks/useAdminFetch";

export default function SEOReportPage() {
  const adminFetch = useAdminFetch();
  const [report, setReport] = useState(null);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    adminFetch("/api/seo/report")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else {
          setReport(d.report);
          setMessage(d.message);
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [adminFetch]);

  const downloadHtml = () => {
    if (!report) return;
    const rows = (report.opportunities || [])
      .map(
        (o) =>
          `<tr><td>${escapeHtml(o.keyword)}</td><td>${o.search_volume != null ? o.search_volume.toLocaleString() : "—"}</td><td>${o.position != null ? o.position : "—"}</td><td>${o.opportunity_flag || ""}</td><td>${o.intent || ""}</td><td>${o.quick_win ? "Yes" : ""}</td><td>${o.strategic_build ? "Yes" : ""}</td><td>${o.competition ?? "—"}</td></tr>`
      )
      .join("");
    const audit = report.auditSummary;
    const auditSection = audit
      ? `<section><h2>Technical audit</h2><p>URL: ${escapeHtml(audit.url)}</p><p>Errors: ${audit.errorCount}, Warnings: ${audit.warningCount}. Word count: ${audit.wordCount}, H1×${audit.h1Count}, H2×${audit.h2Count}.</p><ul>${(audit.issues || []).map((i) => `<li>[${i.severity}] ${escapeHtml(i.message)}</li>`).join("")}</ul></section>`
      : "";
    const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><title>SEO Step 4 Report – ${escapeHtml(report.domain || "deckbase.co")}</title><style>body{font-family:system-ui,sans-serif;max-width:900px;margin:2rem auto;padding:0 1rem;} table{border-collapse:collapse;width:100%;} th,td{border:1px solid #ddd;padding:6px 10px;text-align:left;} th{background:#f5f5f5;} .opportunity{background:#fff3cd;} section{margin-top:2rem;}</style></head>
<body>
<h1>Step 4: SERP opportunity mapping report</h1>
<p>Domain: <strong>${escapeHtml(report.domain || "")}</strong>. Run: ${report.created_at ? new Date(report.created_at).toLocaleString() : "—"}. Opportunities: <strong>${report.opportunityCount ?? 0}</strong> of ${(report.opportunities || []).length} keywords.</p>
<table>
<thead><tr><th>Keyword</th><th>Monthly volume</th><th>Rank</th><th>Opportunity</th><th>Intent</th><th>Quick win</th><th>Strategic build</th><th>Competition</th></tr></thead>
<tbody>${rows}</tbody>
</table>
${auditSection}
</body>
</html>`;
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `seo-step4-report-${report.domain || "deckbase"}-${Date.now()}.html`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  function escapeHtml(s) {
    if (s == null) return "";
    const str = String(s);
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Link
        href="/dashboard/admin/seo"
        className="inline-flex items-center gap-2 text-white/60 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to SEO Command Center
      </Link>

      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-xl bg-accent/20 border border-accent/30 flex items-center justify-center">
          <BarChart2 className="w-6 h-6 text-accent" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Step 4: SERP opportunity report</h1>
          <p className="text-white/50 text-sm">
            Persistent table and strategic summary from the last pipeline run
          </p>
        </div>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-white/60">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading report…
        </div>
      )}

      {error && (
        <p className="text-amber-400/90 mb-4">{error}</p>
      )}

      {!loading && !report && message && (
        <p className="text-white/70 mb-4">{message}</p>
      )}

      {!loading && report && (
        <>
          <div className="mb-4 flex items-center justify-between gap-4 flex-wrap">
            <p className="text-white/70 text-sm">
              Domain: <strong className="text-white">{report.domain || "—"}</strong>.
              Run at: {report.created_at ? new Date(report.created_at).toLocaleString() : "—"}.
              <strong className="text-white"> {report.opportunityCount ?? 0}</strong> opportunities of {(report.opportunities || []).length} keywords.
            </p>
            <button
              type="button"
              onClick={downloadHtml}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 text-white text-sm hover:bg-white/15"
            >
              <Download className="w-4 h-4" />
              Download HTML report
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-white/10 mb-8">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <th className="px-3 py-2 text-left text-white/80">Keyword</th>
                  <th className="px-3 py-2 text-left text-white/80">Monthly volume</th>
                  <th className="px-3 py-2 text-left text-white/80">Rank</th>
                  <th className="px-3 py-2 text-left text-white/80">Opportunity</th>
                  <th className="px-3 py-2 text-left text-white/80">Intent</th>
                  <th className="px-3 py-2 text-left text-white/80">Quick win</th>
                  <th className="px-3 py-2 text-left text-white/80">Strategic build</th>
                  <th className="px-3 py-2 text-left text-white/80">Competition</th>
                </tr>
              </thead>
              <tbody>
                {(report.opportunities || []).map((o, i) => (
                  <tr key={i} className={`border-b border-white/5 ${o.isOpportunity ? "bg-amber-500/5" : ""}`}>
                    <td className="px-3 py-2 text-white/90">{o.keyword}</td>
                    <td className="px-3 py-2 text-white/80">{o.search_volume != null ? o.search_volume.toLocaleString() : "—"}</td>
                    <td className="px-3 py-2 text-white/80">{o.position != null ? o.position : "—"}</td>
                    <td className="px-3 py-2 text-white/80">{o.opportunity_flag || (o.isOpportunity ? "Yes" : "No")}</td>
                    <td className="px-3 py-2 text-white/80">{o.intent || "—"}</td>
                    <td className="px-3 py-2 text-white/80">{o.quick_win ? "Yes" : "—"}</td>
                    <td className="px-3 py-2 text-white/80">{o.strategic_build ? "Yes" : "—"}</td>
                    <td className="px-3 py-2 text-white/80">{o.competition ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {report.auditSummary && (
            <div className="p-5 rounded-xl bg-white/5 border border-white/10">
              <h2 className="text-lg font-semibold text-white mb-3">Technical audit summary</h2>
              <p className="text-white/70 text-sm mb-2">
                URL: {report.auditSummary.url}. Errors: <strong className="text-white">{report.auditSummary.errorCount}</strong>, Warnings: <strong className="text-white">{report.auditSummary.warningCount}</strong>.
                Word count: {report.auditSummary.wordCount}, H1×{report.auditSummary.h1Count}, H2×{report.auditSummary.h2Count}.
              </p>
              {(report.auditSummary.issues || []).length > 0 && (
                <ul className="text-sm text-white/60 space-y-1 list-disc list-inside">
                  {report.auditSummary.issues.map((issue, j) => (
                    <li key={j} className={issue.severity === "error" ? "text-red-400/90" : ""}>
                      [{issue.severity}] {issue.message}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
