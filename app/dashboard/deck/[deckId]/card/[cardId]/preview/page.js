"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Edit2, Trash2, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import { getDeck, getCard, getMedia, deleteCard } from "@/utils/firestore";

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
  const [revealedBlocks, setRevealedBlocks] = useState({});
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    if (!user || !deckId || !cardId) return;

    const fetchData = async () => {
      // Fetch deck
      const deckData = await getDeck(user.uid, deckId);
      if (!deckData || deckData.isDeleted) {
        router.push("/dashboard");
        return;
      }
      setDeck(deckData);

      // Fetch card
      const cardData = await getCard(user.uid, cardId);
      if (cardData && !cardData.isDeleted) {
        setCard(cardData);

        // Fetch media for image blocks
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

  const toggleReveal = (blockId) => {
    setRevealedBlocks((prev) => ({
      ...prev,
      [blockId]: !prev[blockId],
    }));
  };

  const handleDelete = async () => {
    try {
      await deleteCard(user.uid, cardId, deckId);
      router.push(`/dashboard/deck/${deckId}`);
    } catch (error) {
      console.error("Error deleting card:", error);
    }
  };

  // Get value for a block
  const getValue = (blockId) => {
    return card?.values?.find((v) => v.blockId === blockId);
  };

  // Render a block based on its type
  const renderBlock = (block, index) => {
    const value = getValue(block.blockId);
    if (!value) return null;

    switch (block.type) {
      case "header1":
        return (
          <motion.h1
            key={block.blockId}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="text-3xl font-bold text-white mb-4"
          >
            {value.text}
          </motion.h1>
        );

      case "header2":
        return (
          <motion.h2
            key={block.blockId}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="text-2xl font-semibold text-white mb-3"
          >
            {value.text}
          </motion.h2>
        );

      case "header3":
        return (
          <motion.h3
            key={block.blockId}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="text-xl font-medium text-white mb-2"
          >
            {value.text}
          </motion.h3>
        );

      case "text":
        return (
          <motion.p
            key={block.blockId}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="text-white/80 mb-4 whitespace-pre-wrap"
          >
            {value.text}
          </motion.p>
        );

      case "example":
        return (
          <motion.blockquote
            key={block.blockId}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="border-l-4 border-accent/50 pl-4 text-white/70 italic mb-4"
          >
            {value.text}
          </motion.blockquote>
        );

      case "hiddenText":
        const isRevealed = revealedBlocks[block.blockId];
        return (
          <motion.div
            key={block.blockId}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="mb-4"
          >
            <button
              onClick={() => toggleReveal(block.blockId)}
              className="flex items-center gap-2 text-accent hover:text-accent/80 transition-colors mb-2"
            >
              {isRevealed ? (
                <>
                  <EyeOff className="w-4 h-4" />
                  <span className="text-sm">Hide</span>
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4" />
                  <span className="text-sm">Reveal</span>
                </>
              )}
            </button>
            <div
              className={`transition-all duration-300 ${
                isRevealed
                  ? "opacity-100 max-h-[500px]"
                  : "opacity-0 max-h-0 overflow-hidden"
              }`}
            >
              <p className="text-white/80 bg-accent/10 p-3 rounded-lg whitespace-pre-wrap">
                {value.text}
              </p>
            </div>
          </motion.div>
        );

      case "image":
        if (!value.mediaIds || value.mediaIds.length === 0) return null;
        return (
          <motion.div
            key={block.blockId}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="grid grid-cols-2 gap-2 mb-4"
          >
            {value.mediaIds.map((mediaId) => {
              const media = mediaCache[mediaId];
              if (!media?.downloadUrl) return null;
              return (
                <div key={mediaId} className="relative aspect-video">
                  <Image
                    src={media.downloadUrl}
                    alt=""
                    fill
                    className="object-cover rounded-lg"
                  />
                </div>
              );
            })}
          </motion.div>
        );

      case "divider":
        return (
          <motion.hr
            key={block.blockId}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: index * 0.05 }}
            className="border-white/20 my-6"
          />
        );

      default:
        return value.text ? (
          <motion.p
            key={block.blockId}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="text-white/80 mb-4"
          >
            {value.text}
          </motion.p>
        ) : null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-accent"></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link
            href={`/dashboard/deck/${deckId}`}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-white/70" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white">Card Preview</h1>
            <p className="text-white/50 text-sm">{deck?.title}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/deck/${deckId}/card/${cardId}`}
            className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors"
          >
            <Edit2 className="w-4 h-4" />
            <span className="hidden sm:inline">Edit</span>
          </Link>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="flex items-center gap-2 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">Delete</span>
          </button>
        </div>
      </div>

      {/* Card Preview */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 sm:p-8">
        {card?.blocksSnapshot?.map((block, index) => renderBlock(block, index))}
      </div>

      {/* Card Metadata */}
      <div className="mt-6 text-center text-white/30 text-sm">
        <p>
          Created: {new Date(card?.createdAt).toLocaleDateString()} • Updated:{" "}
          {new Date(card?.updatedAt).toLocaleDateString()}
        </p>
      </div>

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
