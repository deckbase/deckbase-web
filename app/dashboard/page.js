"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Layers, MoreVertical, Edit2, Trash2, X, ChevronRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  subscribeToDecks,
  createDeck,
  updateDeck,
  deleteDeck,
  getCardCount,
  getTemplates,
} from "@/utils/firestore";
import Link from "next/link";

// ---------------------------------------------------------------------------
// Input / Textarea / Select primitives
// ---------------------------------------------------------------------------

function Field({ label, hint, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[12px] font-medium text-white/40 uppercase tracking-wider">
        {label}
      </label>
      {children}
      {hint && <p className="text-[11px] text-white/25 leading-relaxed">{hint}</p>}
    </div>
  );
}

const inputCls =
  "w-full px-3.5 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-[14px] text-white placeholder-white/20 focus:outline-none focus:border-accent/50 focus:bg-white/[0.06] transition-colors";

// ---------------------------------------------------------------------------
// Modal
// ---------------------------------------------------------------------------

function Modal({ children, onClose, title }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 16 }}
        transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
        className="relative bg-[#0e0e0e] border border-white/[0.08] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/[0.06]">
          <h2 className="text-[15px] font-semibold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/[0.06] transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-5 py-5">{children}</div>
      </motion.div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Skeleton card
// ---------------------------------------------------------------------------

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 animate-pulse">
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 rounded-xl bg-white/[0.05]" />
      </div>
      <div className="h-4 bg-white/[0.05] rounded-md w-3/4 mb-2" />
      <div className="h-3 bg-white/[0.04] rounded-md w-1/2 mb-5" />
      <div className="flex items-center justify-between pt-3 border-t border-white/[0.05]">
        <div className="h-3 bg-white/[0.04] rounded w-16" />
        <div className="h-3 bg-white/[0.03] rounded w-20" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Deck card
// ---------------------------------------------------------------------------

function DeckCard({ deck, cardCount, onEdit, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const updatedAt = deck.updatedAt
    ? new Date(deck.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : null;

  return (
    <motion.div
      layout
      className="group relative"
    >
      <Link href={`/dashboard/deck/${deck.deckId}`} className="block">
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] hover:bg-white/[0.045] hover:border-white/[0.12] transition-all duration-200 p-5 h-full cursor-pointer">
          {/* Icon */}
          <div className="flex items-start justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-accent/[0.12] border border-accent/[0.15] flex items-center justify-center flex-shrink-0">
              <Layers className="w-5 h-5 text-accent/80" />
            </div>
            {/* spacer for menu button */}
            <div className="w-7 h-7 flex-shrink-0" />
          </div>

          {/* Title */}
          <h3 className="text-[14px] font-semibold text-white/90 mb-1 line-clamp-2 leading-snug">
            {deck.title}
          </h3>

          {/* Description */}
          {deck.description ? (
            <p className="text-[12px] text-white/35 leading-relaxed line-clamp-2 mb-4">
              {deck.description}
            </p>
          ) : (
            <div className="mb-4" />
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-white/[0.05]">
            <span className="text-[12px] text-white/35 font-medium">
              {cardCount ?? "—"} {cardCount === 1 ? "card" : "cards"}
            </span>
            {updatedAt && (
              <span className="text-[11px] text-white/20">{updatedAt}</span>
            )}
          </div>
        </div>
      </Link>

      {/* Action menu */}
      <div ref={menuRef} className="absolute top-3.5 right-3.5 z-10">
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setMenuOpen((v) => !v);
          }}
          className="p-1.5 rounded-lg text-white/0 group-hover:text-white/40 hover:!text-white/80 hover:bg-white/[0.07] opacity-0 group-hover:opacity-100 transition-all duration-150"
        >
          <MoreVertical className="w-4 h-4" />
        </button>

        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: -4 }}
              transition={{ duration: 0.12 }}
              className="absolute right-0 top-9 w-36 bg-[#141414] border border-white/[0.09] rounded-xl shadow-xl overflow-hidden"
            >
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setMenuOpen(false);
                  onEdit(deck);
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] text-white/60 hover:text-white/90 hover:bg-white/[0.06] transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5 flex-shrink-0" />
                Edit
              </button>
              <div className="h-px bg-white/[0.05]" />
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setMenuOpen(false);
                  onDelete(deck);
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] text-red-400/70 hover:text-red-400 hover:bg-red-500/[0.07] transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5 flex-shrink-0" />
                Delete
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const { user } = useAuth();
  const [decks, setDecks] = useState([]);
  const [cardCounts, setCardCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedDeck, setSelectedDeck] = useState(null);
  const [newDeckTitle, setNewDeckTitle] = useState("");
  const [newDeckDescription, setNewDeckDescription] = useState("");
  const [newDeckDefaultTemplateId, setNewDeckDefaultTemplateId] = useState("");
  const [createModalTemplates, setCreateModalTemplates] = useState([]);

  useEffect(() => {
    if (!user || !showCreateModal) return;
    getTemplates(user.uid).then(setCreateModalTemplates);
  }, [user, showCreateModal]);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToDecks(user.uid, async (fetchedDecks) => {
      setDecks(fetchedDecks);
      setLoading(false);
      const counts = {};
      for (const deck of fetchedDecks) {
        counts[deck.deckId] = await getCardCount(user.uid, deck.deckId);
      }
      setCardCounts(counts);
    });
    return () => unsubscribe();
  }, [user]);

  const handleCreateDeck = async (e) => {
    e.preventDefault();
    if (!newDeckTitle.trim()) return;
    try {
      await createDeck(user.uid, newDeckTitle.trim(), newDeckDescription.trim(), newDeckDefaultTemplateId || null);
      setNewDeckTitle("");
      setNewDeckDescription("");
      setNewDeckDefaultTemplateId("");
      setShowCreateModal(false);
    } catch (error) {
      console.error("Error creating deck:", error);
    }
  };

  const handleEditDeck = async (e) => {
    e.preventDefault();
    if (!newDeckTitle.trim() || !selectedDeck) return;
    try {
      await updateDeck(user.uid, selectedDeck.deckId, {
        title: newDeckTitle.trim(),
        description: newDeckDescription.trim(),
      });
      setShowEditModal(false);
      setSelectedDeck(null);
      setNewDeckTitle("");
      setNewDeckDescription("");
    } catch (error) {
      console.error("Error updating deck:", error);
    }
  };

  const handleDeleteDeck = async () => {
    if (!selectedDeck) return;
    try {
      await deleteDeck(user.uid, selectedDeck.deckId);
      setShowDeleteModal(false);
      setSelectedDeck(null);
    } catch (error) {
      console.error("Error deleting deck:", error);
    }
  };

  const openEditModal = (deck) => {
    setSelectedDeck(deck);
    setNewDeckTitle(deck.title);
    setNewDeckDescription(deck.description || "");
    setShowEditModal(true);
  };

  const openDeleteModal = (deck) => {
    setSelectedDeck(deck);
    setShowDeleteModal(true);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center justify-between mb-8"
      >
        <div>
          <h1 className="text-[22px] font-bold text-white tracking-tight">My Decks</h1>
          <p className="text-[13px] text-white/30 mt-0.5">
            {loading ? "Loading…" : `${decks.length} ${decks.length === 1 ? "deck" : "decks"}`}
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent/90 text-white text-[13px] font-semibold rounded-xl transition-colors shadow-[0_0_20px_rgba(35,131,226,0.2)]"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">New Deck</span>
        </button>
      </motion.div>

      {/* Loading skeletons */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && decks.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="flex flex-col items-center justify-center py-24 text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-center mb-5">
            <Layers className="w-7 h-7 text-white/20" />
          </div>
          <h2 className="text-[16px] font-semibold text-white/70 mb-2">No decks yet</h2>
          <p className="text-[13px] text-white/30 mb-6 max-w-xs leading-relaxed">
            Create your first deck to start building flashcards and organizing your learning.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-accent hover:bg-accent/90 text-white text-[13px] font-semibold rounded-xl transition-colors shadow-[0_0_20px_rgba(35,131,226,0.2)]"
          >
            <Plus className="w-4 h-4" />
            Create your first deck
          </button>
        </motion.div>
      )}

      {/* Deck grid */}
      {!loading && decks.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
        >
          <AnimatePresence mode="popLayout">
            {decks.map((deck, index) => (
              <motion.div
                key={deck.deckId}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: index * 0.04, duration: 0.25 }}
              >
                <DeckCard
                  deck={deck}
                  cardCount={cardCounts[deck.deckId]}
                  onEdit={openEditModal}
                  onDelete={openDeleteModal}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Create Deck Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <Modal
            title="New deck"
            onClose={() => {
              setShowCreateModal(false);
              setNewDeckTitle("");
              setNewDeckDescription("");
              setNewDeckDefaultTemplateId("");
            }}
          >
            <form onSubmit={handleCreateDeck} className="flex flex-col gap-4">
              <Field label="Title">
                <input
                  type="text"
                  value={newDeckTitle}
                  onChange={(e) => setNewDeckTitle(e.target.value)}
                  placeholder="e.g. Japanese N2 Vocab"
                  className={inputCls}
                  autoFocus
                  required
                />
              </Field>
              <Field label="Description">
                <textarea
                  value={newDeckDescription}
                  onChange={(e) => setNewDeckDescription(e.target.value)}
                  placeholder="Optional"
                  rows={2}
                  className={`${inputCls} resize-none`}
                />
              </Field>
              <Field
                label="Default template"
                hint="New cards in this deck will use this template by default."
              >
                <select
                  value={newDeckDefaultTemplateId}
                  onChange={(e) => setNewDeckDefaultTemplateId(e.target.value)}
                  className={`${inputCls} appearance-none`}
                >
                  <option value="">None</option>
                  {createModalTemplates.map((t) => (
                    <option key={t.templateId} value={t.templateId}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewDeckTitle("");
                    setNewDeckDescription("");
                    setNewDeckDefaultTemplateId("");
                  }}
                  className="flex-1 px-4 py-2.5 bg-white/[0.04] hover:bg-white/[0.08] text-white/60 hover:text-white text-[13px] font-medium rounded-xl border border-white/[0.07] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newDeckTitle.trim()}
                  className="flex-1 px-4 py-2.5 bg-accent hover:bg-accent/90 text-white text-[13px] font-semibold rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Create deck
                </button>
              </div>
            </form>
          </Modal>
        )}
      </AnimatePresence>

      {/* Edit Deck Modal */}
      <AnimatePresence>
        {showEditModal && (
          <Modal
            title="Edit deck"
            onClose={() => {
              setShowEditModal(false);
              setNewDeckTitle("");
              setNewDeckDescription("");
            }}
          >
            <form onSubmit={handleEditDeck} className="flex flex-col gap-4">
              <Field label="Title">
                <input
                  type="text"
                  value={newDeckTitle}
                  onChange={(e) => setNewDeckTitle(e.target.value)}
                  placeholder="Deck title"
                  className={inputCls}
                  autoFocus
                  required
                />
              </Field>
              <Field label="Description">
                <textarea
                  value={newDeckDescription}
                  onChange={(e) => setNewDeckDescription(e.target.value)}
                  placeholder="Optional"
                  rows={2}
                  className={`${inputCls} resize-none`}
                />
              </Field>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-2.5 bg-white/[0.04] hover:bg-white/[0.08] text-white/60 hover:text-white text-[13px] font-medium rounded-xl border border-white/[0.07] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newDeckTitle.trim()}
                  className="flex-1 px-4 py-2.5 bg-accent hover:bg-accent/90 text-white text-[13px] font-semibold rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Save changes
                </button>
              </div>
            </form>
          </Modal>
        )}
      </AnimatePresence>

      {/* Delete Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <Modal
            title="Delete deck?"
            onClose={() => setShowDeleteModal(false)}
          >
            <div className="flex flex-col gap-5">
              <p className="text-[13px] text-white/45 leading-relaxed">
                <span className="text-white/70 font-medium">&ldquo;{selectedDeck?.title}&rdquo;</span> and all its cards will be permanently deleted. This cannot be undone.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 px-4 py-2.5 bg-white/[0.04] hover:bg-white/[0.08] text-white/60 hover:text-white text-[13px] font-medium rounded-xl border border-white/[0.07] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteDeck}
                  className="flex-1 px-4 py-2.5 bg-red-500/90 hover:bg-red-500 text-white text-[13px] font-semibold rounded-xl transition-colors"
                >
                  Delete deck
                </button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}
