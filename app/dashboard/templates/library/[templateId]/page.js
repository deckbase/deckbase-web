"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, BookMarked, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { createTemplate } from "@/utils/firestore";
import {
  getLibraryTemplateById,
  cloneLibraryBlocksForSaveCopy,
} from "@/lib/default-template-library";
import { buildLibraryTemplatePreviewModel } from "@/lib/library-template-card-preview";
import { LIBRARY_TEMPLATE_PHONE_STYLE } from "@/lib/phone-preview-frame";
import { usePhonePreviewLayoutDebug } from "@/lib/phone-preview-layout-debug";
import CardPreviewContent from "@/components/CardPreviewContent";
import PreviewModePill from "@/components/PreviewModePill";

export default function LibraryTemplatePreviewPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const templateId = params?.templateId;
  const [saving, setSaving] = useState(false);

  const template = useMemo(
    () => (templateId ? getLibraryTemplateById(String(templateId)) : null),
    [templateId],
  );

  const phoneShellRef = useRef(null);
  const phoneBodyRef = useRef(null);
  const phoneScrollRef = useRef(null);
  const phoneInnerRef = useRef(null);
  const phonePreviewContentRef = useRef(null);
  usePhonePreviewLayoutDebug("library-template-preview", {
    phoneRef: phoneShellRef,
    bodyRef: phoneBodyRef,
    scrollRef: phoneScrollRef,
    innerRef: phoneInnerRef,
    contentRef: phonePreviewContentRef,
  });

  const { blocksSnapshot, getValue, mediaCache } = useMemo(() => {
    if (!template) {
      return {
        blocksSnapshot: [],
        getValue: () => undefined,
        mediaCache: {},
      };
    }
    return buildLibraryTemplatePreviewModel(template);
  }, [template]);

  const handleSaveCopy = async () => {
    if (!user || !template) return;
    setSaving(true);
    try {
      await createTemplate(
        user.uid,
        `${template.name} (Copy)`,
        template.description || "",
        cloneLibraryBlocksForSaveCopy(template.blocks),
      );
      router.push("/dashboard/templates");
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  if (!template) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p className="text-white/70 mb-6">This built-in template was not found.</p>
        <Link
          href="/dashboard/templates/library"
          className="text-accent hover:underline"
        >
          Back to template library
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] min-h-0 flex-col overflow-hidden">
      <div className="max-w-7xl mx-auto w-full px-4 pt-4 pb-2 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/dashboard/templates/library"
              className="p-2 hover:bg-white/10 rounded-lg transition-colors shrink-0"
              aria-label="Back to template library"
            >
              <ArrowLeft className="w-5 h-5 text-white/70" />
            </Link>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                {template.emoji && (
                  <span className="text-2xl shrink-0" aria-hidden>
                    {template.emoji}
                  </span>
                )}
                <h1 className="text-lg sm:text-xl font-semibold text-white truncate">
                  {template.name}
                </h1>
              </div>
              {template.description && (
                <p className="text-white/45 text-xs sm:text-sm mt-1 line-clamp-2">
                  {template.description}
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 sm:justify-end">
            <button
              type="button"
              disabled={!user || saving}
              onClick={handleSaveCopy}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-accent hover:bg-accent/90 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <BookMarked className="w-4 h-4" />
              )}
              Save to my templates
            </button>
            <Link
              href="/dashboard/templates/library"
              className="inline-flex items-center justify-center px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Cancel
            </Link>
          </div>
        </div>
      </div>

      {/* Same phone frame + scroll behavior as /dashboard/deck/.../card/.../preview */}
      <div className="flex flex-1 min-h-0 flex-col overflow-hidden px-3 pt-1 pb-[max(env(safe-area-inset-bottom),0.5rem)]">
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-1">
          <motion.div
            ref={phoneShellRef}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
            style={LIBRARY_TEMPLATE_PHONE_STYLE}
            className="flex min-h-0 max-h-full shrink-0 flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.025] shadow-xl shadow-black/25"
          >
            <div className="flex-shrink-0 flex items-center gap-1.5 sm:gap-2 px-3 py-2.5 border-b border-white/[0.06]">
              <Link
                href="/dashboard/templates/library"
                className="flex items-center gap-1.5 p-1.5 rounded-lg border border-white/[0.07] bg-white/[0.03] hover:bg-white/[0.07] text-white/40 hover:text-white/80 transition-all flex-shrink-0 min-w-0"
                title="Back to template library"
                aria-label="Back to template library"
              >
                <ArrowLeft className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="hidden sm:inline text-[11px] font-medium text-white/45 truncate max-w-[6rem]">
                  Library
                </span>
              </Link>
              <span className="min-w-0 flex-1 truncate text-[12px] text-white/35">
                {template.name}
              </span>
              <PreviewModePill className="flex-shrink-0" />
            </div>

            {/* flex-1 min-h-0 on scroll fills space between header + footer (full card view height) */}
            <div ref={phoneBodyRef} className="flex min-h-0 flex-1 flex-col overflow-hidden p-4">
              <div
                ref={phoneScrollRef}
                className="mx-auto grid min-h-0 w-full min-w-0 flex-1 grid-rows-[minmax(0,1fr)] overflow-x-hidden overflow-y-auto overscroll-y-contain"
              >
                <div
                  ref={phoneInnerRef}
                  className="flex min-h-0 min-w-0 flex-col self-stretch justify-self-stretch"
                >
                  <CardPreviewContent
                    libraryPreview
                    contentRef={phonePreviewContentRef}
                    blocks={blocksSnapshot}
                    getValue={getValue}
                    mediaCache={mediaCache}
                    forceImageAspectRatio={9 / 16}
                  />
                </div>
              </div>
            </div>

            <p className="flex-shrink-0 px-3 py-2 text-center text-[10px] text-white/25 border-t border-white/[0.05]">
              Sample content only · matches card preview layout
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
