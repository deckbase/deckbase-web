"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Edit2, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { getDeck, getCard, getMedia, deleteCard } from "@/utils/firestore";
import CardPreviewContent from "@/components/CardPreviewContent";

export default function CardPreviewPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const deckId = params.deckId;
  const cardId = params.cardId;

  const [deck, setDeck] = useState(null);
  const [card, setCard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mediaCache, setMediaCache] = useState({});
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    if (!user || !deckId || !cardId) return;

    const fetchData = async () => {
      const deckData = await getDeck(user.uid, deckId);
      if (!deckData || deckData.isDeleted) {
        router.push("/dashboard");
        return;
      }
      setDeck(deckData);

      if (cardId === "new") {
        try {
          const raw = sessionStorage.getItem(`card-preview-draft-${deckId}`);
          const draft = raw ? JSON.parse(raw) : null;
          if (draft?.blocks?.length) {
            const valuesArray = Object.entries(draft.values || {}).map(([blockId, v]) => ({ ...v, blockId }));
            setCard({ blocksSnapshot: draft.blocks, values: valuesArray });
          } else {
            router.replace(`/dashboard/deck/${deckId}/card/new`);
            return;
          }
        } catch {
          router.replace(`/dashboard/deck/${deckId}/card/new`);
          return;
        }
        setLoading(false);
        return;
      }

      const cardData = await getCard(user.uid, cardId);
      if (cardData && !cardData.isDeleted) {
        const blocks = cardData.blocksSnapshot || [];
        const quizBlocks = blocks.filter(
          (b) =>
            b.type === "quizSingleSelect" || b.type === "quizMultiSelect" || b.type === "quizTextAnswer" ||
            b.type === 8 || b.type === 9 || b.type === 10 ||
            (typeof b.type === "string" && /^(8|9|10)$/.test(b.type))
        );
        console.log("[CardPreview] cardId", cardId, "blocksSnapshot length", blocks.length, "quiz blocks", quizBlocks.length, quizBlocks.map((b) => ({ blockId: b.blockId, type: b.type, hasConfigJson: !!b.configJson, configKeys: b.configJson ? Object.keys(b.configJson) : [], question: b.configJson?.question?.slice?.(0, 40) })));
        setCard(cardData);

        for (const value of cardData.values || []) {
          if (value.mediaIds && value.mediaIds.length > 0) {
            for (const mediaId of value.mediaIds) {
              const media = await getMedia(user.uid, mediaId);
              if (media) setMediaCache((prev) => ({ ...prev, [mediaId]: media }));
            }
          }
        }
      } else {
        router.push(`/dashboard/deck/${deckId}`);
        return;
      }

      setLoading(false);
    };

    fetchData();
  }, [user, deckId, cardId, router]);

  const handleDelete = async () => {
    try {
      await deleteCard(user.uid, cardId, deckId);
      router.push(`/dashboard/deck/${deckId}`);
    } catch (error) {
      console.error("Error deleting card:", error);
    }
  };

  const getValue = (blockId) => card?.values?.find((v) => v.blockId === blockId);

  if (loading) {
    return (
      <div className="max-w-md mx-auto px-4 py-6">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-lg bg-white/[0.05] animate-pulse" />
          <div className="flex-1 h-3.5 bg-white/[0.04] rounded animate-pulse" />
          <div className="w-16 h-8 rounded-xl bg-white/[0.04] animate-pulse" />
        </div>
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6 space-y-4 animate-pulse">
          <div className="h-6 w-2/3 bg-white/[0.06] rounded-lg" />
          <div className="space-y-2">
            <div className="h-4 w-full bg-white/[0.04] rounded" />
            <div className="h-4 w-5/6 bg-white/[0.04] rounded" />
          </div>
          <div className="h-px bg-white/[0.06] rounded" />
          <div className="h-10 bg-white/[0.04] rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-6">
      {/* Header bar */}
      <div className="flex items-center gap-2 mb-5">
        <Link
          href={`/dashboard/deck/${deckId}`}
          className="p-2 rounded-xl border border-white/[0.07] bg-white/[0.03] hover:bg-white/[0.07] text-white/40 hover:text-white/80 transition-all flex-shrink-0"
          aria-label="Back to deck"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <span className="text-[13px] text-white/30 truncate flex-1 min-w-0">{deck?.title}</span>
        <Link
          href={`/dashboard/deck/${deckId}/card/${cardId}`}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.07] text-white/60 hover:text-white/90 transition-all shrink-0"
        >
          <Edit2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{cardId === "new" ? "Back to edit" : "Edit"}</span>
        </Link>
        {cardId !== "new" && (
          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="p-2 rounded-xl border border-white/[0.07] bg-white/[0.03] hover:bg-red-500/[0.08] hover:border-red-500/20 text-white/30 hover:text-red-400 transition-all shrink-0"
            aria-label="Delete card"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Card — height-constrained wrapper keeps it inside the viewport */}
      <div className="flex justify-center" style={{ maxHeight: "calc(100dvh - 160px)" }}>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="rounded-2xl border border-white/[0.08] bg-white/[0.025] overflow-hidden shadow-xl shadow-black/20 flex flex-col h-full"
        style={{ aspectRatio: "9/16" }}
      >
        {/* Top label */}
        <div className="px-5 pt-4 pb-0 flex items-center gap-2 flex-shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-accent/50" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-white/25">Preview</span>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <CardPreviewContent
            blocks={card?.blocksSnapshot}
            getValue={getValue}
            mediaCache={mediaCache}
          />
        </div>
      </motion.div>
      </div>

      {/* Meta */}
      {cardId !== "new" && (card?.createdAt != null || card?.updatedAt != null) && (
        <p className="mt-3 text-center text-[11px] text-white/20">
          {card?.createdAt != null ? new Date(card.createdAt).toLocaleDateString() : "—"}
          {card?.updatedAt != null && ` · Updated ${new Date(card.updatedAt).toLocaleDateString()}`}
        </p>
      )}

      {/* Delete Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center z-50 p-4"
            onClick={() => setShowDeleteModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
              className="bg-[#0e0e0e] border border-white/[0.08] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/[0.06]">
                <h2 className="text-[15px] font-semibold text-white">Delete card?</h2>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/[0.06] transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="px-5 py-5 flex flex-col gap-5">
                <p className="text-[13px] text-white/45 leading-relaxed">
                  This card will be permanently deleted and cannot be recovered.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="flex-1 px-4 py-2.5 bg-white/[0.04] hover:bg-white/[0.08] text-white/60 hover:text-white text-[13px] font-medium rounded-xl border border-white/[0.07] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    className="flex-1 px-4 py-2.5 bg-red-500/90 hover:bg-red-500 text-white text-[13px] font-semibold rounded-xl transition-colors"
                  >
                    Delete card
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
