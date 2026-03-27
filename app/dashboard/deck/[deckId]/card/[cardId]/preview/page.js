"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Edit2 } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { getDeck, getCard, getMedia } from "@/utils/firestore";
import CardPreviewContent from "@/components/CardPreviewContent";
import PreviewModePill from "@/components/PreviewModePill";

const ENTRY_VALUES = new Set(["editor", "deck", "fileToAi"]);

function resolveEntry(fromParam, draftMatchesRoute, draft) {
  if (ENTRY_VALUES.has(fromParam)) return fromParam;
  if (draftMatchesRoute && ENTRY_VALUES.has(draft?.entry)) return draft.entry;
  return "deck";
}

function CardPreviewPageInner() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromQuery = searchParams.get("from");
  const { user } = useAuth();
  const deckId = params.deckId;
  const cardId = params.cardId;

  const [deck, setDeck] = useState(null);
  const [card, setCard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mediaCache, setMediaCache] = useState({});
  const [entrySource, setEntrySource] = useState("deck");

  useEffect(() => {
    if (!user || !deckId || !cardId) return;

    const loadMediaForValues = async (valuesArray) => {
      for (const value of valuesArray || []) {
        if (value.mediaIds && value.mediaIds.length > 0) {
          for (const mediaId of value.mediaIds) {
            const media = await getMedia(user.uid, mediaId);
            if (media) setMediaCache((prev) => ({ ...prev, [mediaId]: media }));
          }
        }
      }
    };

    const fetchData = async () => {
      const deckData = await getDeck(user.uid, deckId);
      if (!deckData || deckData.isDeleted) {
        router.push("/dashboard");
        return;
      }
      setDeck(deckData);

      let draft = null;
      try {
        const rawDraft = sessionStorage.getItem(`card-preview-draft-${deckId}`);
        draft = rawDraft ? JSON.parse(rawDraft) : null;
      } catch {
        draft = null;
      }

      const draftMatchesRoute =
        draft?.blocks?.length &&
        (cardId === "new"
          ? draft.targetCardId == null || draft.targetCardId === "new"
          : draft.targetCardId === cardId);

      setEntrySource(resolveEntry(fromQuery, draftMatchesRoute, draft));

      if (draftMatchesRoute) {
        const valuesArray = Object.entries(draft.values || {}).map(([bid, v]) => ({
          ...v,
          blockId: bid,
        }));
        setCard({ blocksSnapshot: draft.blocks, values: valuesArray });
        await loadMediaForValues(valuesArray);
        setLoading(false);
        return;
      }

      if (cardId === "new") {
        router.replace(`/dashboard/deck/${deckId}/card/new`);
        return;
      }

      const cardData = await getCard(user.uid, cardId);
      if (cardData && !cardData.isDeleted) {
        setCard(cardData);
        await loadMediaForValues(cardData.values || []);
      } else {
        router.push(`/dashboard/deck/${deckId}`);
        return;
      }

      setLoading(false);
    };

    fetchData();
  }, [user, deckId, cardId, router, fromQuery]);

  const getValue = (blockId) => card?.values?.find((v) => v.blockId === blockId);

  const nav = useMemo(() => {
    const deckPath = `/dashboard/deck/${deckId}`;
    const cardEditPath = `/dashboard/deck/${deckId}/card/${cardId}`;

    if (entrySource === "editor") {
      return {
        backHref: cardEditPath,
        backLabel: "Editor",
        backTitle: "Back to editor",
        editHref: deckPath,
        editLabel: "Deck",
        editTitle: "Open deck",
      };
    }
    if (entrySource === "fileToAi") {
      return {
        backHref: deckPath,
        backLabel: "Deck",
        backTitle: "Back to deck",
        editHref: cardEditPath,
        editLabel: cardId === "new" ? "Use in editor" : "Edit",
        editTitle: cardId === "new" ? "Open card editor" : "Edit card",
      };
    }
    return {
      backHref: deckPath,
      backLabel: "Deck",
      backTitle: "Back to deck",
      editHref: cardEditPath,
      editLabel: cardId === "new" ? "Back to edit" : "Edit",
      editTitle: cardId === "new" ? "Back to new card" : "Edit card",
    };
  }, [entrySource, deckId, cardId]);

  if (loading) {
    return (
      <div className="flex h-[calc(100dvh-3.5rem)] min-h-0 items-start justify-center px-3 pt-2">
        <div
          className="rounded-2xl border border-white/[0.07] bg-white/[0.02] overflow-hidden flex flex-col animate-pulse"
          style={{
            aspectRatio: "9 / 16",
            width: "min(96vw, calc((100dvh - 5.5rem) * 9 / 16))",
            maxWidth: "32rem",
          }}
        >
          <div className="flex-shrink-0 flex items-center gap-2 px-3 py-2.5 border-b border-white/[0.06]">
            <div className="w-7 h-7 rounded-lg bg-white/[0.05]" />
            <div className="flex-1 h-3 bg-white/[0.04] rounded" />
            <div className="w-16 h-5 rounded-full bg-white/[0.05]" />
          </div>
          <div className="flex-1 p-4 space-y-3">
            <div className="h-6 w-2/3 bg-white/[0.06] rounded-lg" />
            <div className="h-4 w-full bg-white/[0.04] rounded" />
            <div className="h-4 w-5/6 bg-white/[0.04] rounded" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] min-h-0 flex-col overflow-hidden px-3 pt-2 pb-[max(env(safe-area-inset-bottom),0.5rem)]">
      <div className="flex flex-1 min-h-0 items-start justify-center">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          style={{
            aspectRatio: "9 / 16",
            width: "min(96vw, calc((100dvh - 5.5rem) * 9 / 16))",
            maxWidth: "32rem",
          }}
          className="rounded-2xl border border-white/[0.08] bg-white/[0.025] overflow-hidden shadow-xl shadow-black/20 flex flex-col max-h-full"
        >
          <div className="flex-shrink-0 flex items-center gap-1.5 sm:gap-2 px-3 py-2.5 border-b border-white/[0.06]">
            <Link
              href={nav.backHref}
              className="flex items-center gap-1.5 p-1.5 rounded-lg border border-white/[0.07] bg-white/[0.03] hover:bg-white/[0.07] text-white/40 hover:text-white/80 transition-all flex-shrink-0 min-w-0"
              title={nav.backTitle}
              aria-label={nav.backTitle}
            >
              <ArrowLeft className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="hidden sm:inline text-[11px] font-medium text-white/45 truncate max-w-[5.5rem]">
                {nav.backLabel}
              </span>
            </Link>
            {entrySource === "editor" ? (
              <span className="min-w-0 flex-1" aria-hidden />
            ) : (
              <span className="min-w-0 flex-1 truncate text-[12px] text-white/35">{deck?.title}</span>
            )}
            <PreviewModePill className="flex-shrink-0" />
            {entrySource !== "editor" && (
              <Link
                href={nav.editHref}
                className="flex shrink-0 items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2 py-1.5 text-[12px] font-medium text-white/55 transition-all hover:bg-white/[0.07] hover:text-white/90"
                title={nav.editTitle}
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{nav.editLabel}</span>
              </Link>
            )}
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-4 [scrollbar-gutter:stable]">
            <CardPreviewContent
              blocks={card?.blocksSnapshot}
              getValue={getValue}
              mediaCache={mediaCache}
              forceImageAspectRatio={9 / 16}
            />
          </div>

          {cardId !== "new" && (card?.createdAt != null || card?.updatedAt != null) && (
            <p className="flex-shrink-0 px-3 py-2 text-center text-[10px] text-white/20 border-t border-white/[0.05]">
              {card?.createdAt != null ? new Date(card.createdAt).toLocaleDateString() : "—"}
              {card?.updatedAt != null && ` · Updated ${new Date(card.updatedAt).toLocaleDateString()}`}
            </p>
          )}
        </motion.div>
      </div>
    </div>
  );
}

export default function CardPreviewPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[calc(100dvh-3.5rem)] min-h-0 items-center justify-center px-3">
          <div className="w-8 h-8 rounded-full border-2 border-white/[0.07] border-t-accent animate-spin" />
        </div>
      }
    >
      <CardPreviewPageInner />
    </Suspense>
  );
}
