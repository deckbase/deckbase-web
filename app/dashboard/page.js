"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Layers, MoreVertical, Edit2, Trash2, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  subscribeToDecks,
  createDeck,
  updateDeck,
  deleteDeck,
  getCardCount,
} from "@/utils/firestore";
import Link from "next/link";

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
  const [actionMenuDeckId, setActionMenuDeckId] = useState(null);

  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeToDecks(user.uid, async (fetchedDecks) => {
      setDecks(fetchedDecks);
      setLoading(false);

      // Fetch card counts for each deck
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
      await createDeck(
        user.uid,
        newDeckTitle.trim(),
        newDeckDescription.trim()
      );
      setNewDeckTitle("");
      setNewDeckDescription("");
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
    setActionMenuDeckId(null);
  };

  const openDeleteModal = (deck) => {
    setSelectedDeck(deck);
    setShowDeleteModal(true);
    setActionMenuDeckId(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">My Decks</h1>
          <p className="text-white/60">
            {decks.length} {decks.length === 1 ? "deck" : "decks"}
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent/90 text-white rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span className="hidden sm:inline">New Deck</span>
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-accent"></div>
        </div>
      )}

      {/* Empty State */}
      {!loading && decks.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
            <Layers className="w-10 h-10 text-white/30" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">
            No decks yet
          </h2>
          <p className="text-white/60 mb-6 max-w-md">
            Create your first deck to start building flashcards and organizing
            your learning.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-accent hover:bg-accent/90 text-white rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            Create Your First Deck
          </button>
        </motion.div>
      )}

      {/* Deck Grid */}
      {!loading && decks.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <AnimatePresence>
            {decks.map((deck, index) => (
              <motion.div
                key={deck.deckId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: index * 0.05 }}
                className="relative group"
              >
                <Link href={`/dashboard/deck/${deck.deckId}`}>
                  <div className="bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl p-5 transition-all cursor-pointer h-full">
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-accent/20 to-purple-600/20 flex items-center justify-center">
                        <Layers className="w-6 h-6 text-accent" />
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-1 line-clamp-2">
                      {deck.title}
                    </h3>
                    {deck.description && (
                      <p className="text-white/50 text-sm mb-3 line-clamp-2">
                        {deck.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between mt-auto pt-3 border-t border-white/5">
                      <span className="text-white/40 text-sm">
                        {cardCounts[deck.deckId] || 0} cards
                      </span>
                      <span className="text-white/30 text-xs">
                        {new Date(deck.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </Link>

                {/* Action Menu Button */}
                <div className="absolute top-3 right-3">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setActionMenuDeckId(
                        actionMenuDeckId === deck.deckId ? null : deck.deckId
                      );
                    }}
                    className="p-1.5 rounded-lg bg-black/50 opacity-0 group-hover:opacity-100 hover:bg-white/10 transition-all"
                  >
                    <MoreVertical className="w-4 h-4 text-white/70" />
                  </button>

                  {/* Action Menu Dropdown */}
                  <AnimatePresence>
                    {actionMenuDeckId === deck.deckId && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -5 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -5 }}
                        className="absolute right-0 top-10 w-36 bg-zinc-900 border border-white/10 rounded-lg shadow-xl overflow-hidden z-10"
                      >
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            openEditModal(deck);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white/80 hover:bg-white/10 transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                          Edit
                        </button>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            openDeleteModal(deck);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Create Deck Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <Modal onClose={() => setShowCreateModal(false)}>
            <h2 className="text-xl font-bold text-white mb-4">
              Create New Deck
            </h2>
            <form onSubmit={handleCreateDeck}>
              <div className="mb-4">
                <label className="block text-white/70 text-sm mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={newDeckTitle}
                  onChange={(e) => setNewDeckTitle(e.target.value)}
                  placeholder="Enter deck title"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-accent"
                  autoFocus
                  required
                />
              </div>
              <div className="mb-6">
                <label className="block text-white/70 text-sm mb-2">
                  Description
                </label>
                <textarea
                  value={newDeckDescription}
                  onChange={(e) => setNewDeckDescription(e.target.value)}
                  placeholder="Optional description"
                  rows={3}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-accent resize-none"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newDeckTitle.trim()}
                  className="flex-1 px-4 py-2 bg-accent hover:bg-accent/90 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create Deck
                </button>
              </div>
            </form>
          </Modal>
        )}
      </AnimatePresence>

      {/* Edit Deck Modal */}
      <AnimatePresence>
        {showEditModal && (
          <Modal onClose={() => setShowEditModal(false)}>
            <h2 className="text-xl font-bold text-white mb-4">Edit Deck</h2>
            <form onSubmit={handleEditDeck}>
              <div className="mb-4">
                <label className="block text-white/70 text-sm mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={newDeckTitle}
                  onChange={(e) => setNewDeckTitle(e.target.value)}
                  placeholder="Enter deck title"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-accent"
                  autoFocus
                  required
                />
              </div>
              <div className="mb-6">
                <label className="block text-white/70 text-sm mb-2">
                  Description
                </label>
                <textarea
                  value={newDeckDescription}
                  onChange={(e) => setNewDeckDescription(e.target.value)}
                  placeholder="Optional description"
                  rows={3}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-accent resize-none"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newDeckTitle.trim()}
                  className="flex-1 px-4 py-2 bg-accent hover:bg-accent/90 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </Modal>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <Modal onClose={() => setShowDeleteModal(false)}>
            <h2 className="text-xl font-bold text-white mb-2">Delete Deck?</h2>
            <p className="text-white/60 mb-6">
              Are you sure you want to delete &quot;{selectedDeck?.title}&quot;?
              This will also delete all cards in this deck. This action cannot
              be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteDeck}
                className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
              >
                Delete
              </button>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* Click outside to close action menu */}
      {actionMenuDeckId && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setActionMenuDeckId(null)}
        />
      )}
    </div>
  );
}

// Modal Component
function Modal({ children, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-zinc-900 border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        {children}
      </motion.div>
    </motion.div>
  );
}
