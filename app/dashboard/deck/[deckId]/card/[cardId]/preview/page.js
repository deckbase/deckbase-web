"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Edit2, Trash2 } from "lucide-react";
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
            setCard({
              blocksSnapshot: draft.blocks,
              values: valuesArray,
            });
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
            b.type === "quizSingleSelect" ||
            b.type === "quizMultiSelect" ||
            b.type === "quizTextAnswer" ||
            b.type === 8 ||
            b.type === 9 ||
            b.type === 10 ||
            (typeof b.type === "string" && /^(8|9|10)$/.test(b.type))
        );
        console.log("[CardPreview] cardId", cardId, "blocksSnapshot length", blocks.length, "quiz blocks", quizBlocks.length, quizBlocks.map((b) => ({ blockId: b.blockId, type: b.type, hasConfigJson: !!b.configJson, configKeys: b.configJson ? Object.keys(b.configJson) : [], question: b.configJson?.question?.slice?.(0, 40) })));
        setCard(cardData);

        for (const value of cardData.values || []) {
          if (value.mediaIds && value.mediaIds.length > 0) {
            for (const mediaId of value.mediaIds) {
              const media = await getMedia(user.uid, mediaId);
              if (media) {
                setMediaCache((prev) => ({ ...prev, [mediaId]: media }));
              }
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
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-accent"></div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-6">
      <div className="flex items-center gap-2 mb-4 text-white/80">
        <Link
          href={`/dashboard/deck/${deckId}`}
          className="p-1.5 -ml-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
          aria-label="Back to deck"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <span className="text-sm text-white/40 truncate flex-1 min-w-0">{deck?.title}</span>
        <Link
          href={`/dashboard/deck/${deckId}/card/${cardId}`}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm rounded-lg bg-white/10 hover:bg-white/15 text-white transition-colors shrink-0"
        >
          <Edit2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{cardId === "new" ? "Back to edit" : "Edit"}</span>
        </Link>
        {cardId !== "new" && (
          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="p-1.5 rounded-lg text-red-400/90 hover:bg-red-500/15 transition-colors shrink-0"
            aria-label="Delete card"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.04] p-5 overflow-hidden shadow-lg shadow-black/20">
        <CardPreviewContent
          blocks={card?.blocksSnapshot}
          getValue={getValue}
          mediaCache={mediaCache}
        />
      </div>

      {cardId !== "new" && (card?.createdAt != null || card?.updatedAt != null) && (
        <p className="mt-3 text-center text-white/25 text-xs">
          {card?.createdAt != null ? new Date(card.createdAt).toLocaleDateString() : "—"}
          {card?.updatedAt != null && ` · ${new Date(card.updatedAt).toLocaleDateString()}`}
        </p>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowDeleteModal(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-zinc-900 border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-white mb-2">Delete Card?</h2>
            <p className="text-white/60 mb-6">
              Are you sure you want to delete this card? This action cannot be
              undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
              >
                Delete
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
