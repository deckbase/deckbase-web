"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  LayoutTemplate,
  MoreVertical,
  Edit2,
  Trash2,
  Copy,
  X,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import {
  subscribeToTemplates,
  deleteTemplate,
  createTemplate,
  getTemplate,
} from "@/utils/firestore";

export default function TemplatesPage() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [actionMenuTemplateId, setActionMenuTemplateId] = useState(null);
  const [duplicating, setDuplicating] = useState(false);

  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeToTemplates(user.uid, (fetchedTemplates) => {
      setTemplates(fetchedTemplates);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleDeleteTemplate = async () => {
    if (!selectedTemplate) return;

    try {
      await deleteTemplate(user.uid, selectedTemplate.templateId);
      setShowDeleteModal(false);
      setSelectedTemplate(null);
    } catch (error) {
      console.error("Error deleting template:", error);
    }
  };

  const handleDuplicateTemplate = async (template) => {
    setDuplicating(true);
    setActionMenuTemplateId(null);

    try {
      // Fetch the full template to get all data
      const fullTemplate = await getTemplate(user.uid, template.templateId);
      if (fullTemplate) {
        await createTemplate(
          user.uid,
          `${fullTemplate.name} (Copy)`,
          fullTemplate.description,
          fullTemplate.blocks,
          fullTemplate.rendering
        );
      }
    } catch (error) {
      console.error("Error duplicating template:", error);
    } finally {
      setDuplicating(false);
    }
  };

  const openDeleteModal = (template) => {
    setSelectedTemplate(template);
    setShowDeleteModal(true);
    setActionMenuTemplateId(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-white/70" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Card Templates</h1>
            <p className="text-white/60">
              {templates.length} {templates.length === 1 ? "template" : "templates"}
            </p>
          </div>
        </div>
        <Link
          href="/dashboard/templates/new"
          className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent/90 text-white rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span className="hidden sm:inline">New Template</span>
        </Link>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-accent"></div>
        </div>
      )}

      {/* Empty State */}
      {!loading && templates.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
            <LayoutTemplate className="w-10 h-10 text-white/30" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">
            No templates yet
          </h2>
          <p className="text-white/60 mb-6 max-w-md">
            Create custom flashcard templates with different block types like
            headers, text, images, and quizzes.
          </p>
          <Link
            href="/dashboard/templates/new"
            className="flex items-center gap-2 px-6 py-3 bg-accent hover:bg-accent/90 text-white rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            Create Your First Template
          </Link>
        </motion.div>
      )}

      {/* Template Grid */}
      {!loading && templates.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <AnimatePresence>
            {templates.map((template, index) => (
              <motion.div
                key={template.templateId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: index * 0.05 }}
                className="relative group"
              >
                <Link href={`/dashboard/templates/${template.templateId}`}>
                  <div className="bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl p-5 transition-all cursor-pointer h-full">
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-accent/20 to-purple-600/20 flex items-center justify-center">
                        <LayoutTemplate className="w-6 h-6 text-accent" />
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-1 line-clamp-2">
                      {template.name}
                    </h3>
                    {template.description && (
                      <p className="text-white/50 text-sm mb-3 line-clamp-2">
                        {template.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between mt-auto pt-3 border-t border-white/5">
                      <span className="text-white/40 text-sm">
                        {template.blocks?.length || 0} blocks
                      </span>
                      <span className="text-white/30 text-xs">
                        v{template.version || 1}
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
                      setActionMenuTemplateId(
                        actionMenuTemplateId === template.templateId
                          ? null
                          : template.templateId
                      );
                    }}
                    className="p-1.5 rounded-lg bg-black/50 opacity-0 group-hover:opacity-100 hover:bg-white/10 transition-all"
                  >
                    <MoreVertical className="w-4 h-4 text-white/70" />
                  </button>

                  {/* Action Menu Dropdown */}
                  <AnimatePresence>
                    {actionMenuTemplateId === template.templateId && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -5 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -5 }}
                        className="absolute right-0 top-10 w-40 bg-zinc-900 border border-white/10 rounded-lg shadow-xl overflow-hidden z-10"
                      >
                        <Link
                          href={`/dashboard/templates/${template.templateId}`}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white/80 hover:bg-white/10 transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                          Edit
                        </Link>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleDuplicateTemplate(template);
                          }}
                          disabled={duplicating}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white/80 hover:bg-white/10 transition-colors disabled:opacity-50"
                        >
                          <Copy className="w-4 h-4" />
                          Duplicate
                        </button>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            openDeleteModal(template);
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

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <Modal onClose={() => setShowDeleteModal(false)}>
            <h2 className="text-xl font-bold text-white mb-2">
              Delete Template?
            </h2>
            <p className="text-white/60 mb-6">
              Are you sure you want to delete &quot;{selectedTemplate?.name}
              &quot;? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteTemplate}
                className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
              >
                Delete
              </button>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* Click outside to close action menu */}
      {actionMenuTemplateId && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setActionMenuTemplateId(null)}
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
        className="bg-zinc-900 border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl relative"
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
