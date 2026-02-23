"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Plus,
  Trash2,
  GripVertical,
  Image as ImageIcon,
  Type,
  Heading1,
  Heading2,
  Heading3,
  FileText,
  EyeOff,
  Minus,
  Save,
  X,
  Quote,
  MoveVertical,
  CircleDot,
  CheckSquare,
  MessageSquare,
  ChevronUp,
  ChevronDown,
  Copy,
  Settings,
  Volume2,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import {
  getTemplate,
  createTemplate,
  updateTemplate,
  BlockType,
} from "@/utils/firestore";
import { v4 as uuidv4 } from "uuid";
import { ELEVENLABS_VOICES } from "@/lib/elevenlabs-voices";

// Block type configurations
const BLOCK_TYPE_CONFIG = {
  [BlockType.header1]: {
    label: "Header 1",
    icon: Heading1,
    description: "Large heading",
    category: "text",
  },
  [BlockType.header2]: {
    label: "Header 2",
    icon: Heading2,
    description: "Medium heading",
    category: "text",
  },
  [BlockType.header3]: {
    label: "Header 3",
    icon: Heading3,
    description: "Small heading",
    category: "text",
  },
  [BlockType.text]: {
    label: "Text",
    icon: Type,
    description: "Regular text",
    category: "text",
  },
  [BlockType.quote]: {
    label: "Quote",
    icon: Quote,
    description: "Example or quote",
    category: "text",
  },
  [BlockType.hiddenText]: {
    label: "Hidden Text",
    icon: EyeOff,
    description: "Hidden until revealed",
    category: "text",
  },
  [BlockType.image]: {
    label: "Image",
    icon: ImageIcon,
    description: "Image block",
    category: "media",
  },
  [BlockType.audio]: {
    label: "Audio",
    icon: Volume2,
    description: "Audio / text-to-speech",
    category: "media",
  },
  [BlockType.divider]: {
    label: "Divider",
    icon: Minus,
    description: "Visual separator",
    category: "layout",
  },
  [BlockType.space]: {
    label: "Space",
    icon: MoveVertical,
    description: "Vertical space",
    category: "layout",
  },
  [BlockType.quizSingleSelect]: {
    label: "Single Choice Quiz",
    icon: CircleDot,
    description: "One correct answer",
    category: "quiz",
  },
  [BlockType.quizMultiSelect]: {
    label: "Multi Choice Quiz",
    icon: CheckSquare,
    description: "Multiple correct answers",
    category: "quiz",
  },
  [BlockType.quizTextAnswer]: {
    label: "Text Answer Quiz",
    icon: MessageSquare,
    description: "Type the answer",
    category: "quiz",
  },
};

// Get block type number from string key (for add block picker)
const getBlockTypeValue = (key) => {
  return BlockType[key] ?? key;
};

// Normalize block.type (may be number from Firestore or string "7" / "audio") for config lookup
const getBlockTypeForConfig = (type) => {
  if (type == null) return null;
  if (typeof type === "number") return type;
  if (typeof type === "string") {
    if (type === "example") return BlockType.quote;
    // Picker uses string keys like "7" for audio; convert to number for BLOCK_TYPE_CONFIG lookup
    if (/^\d+$/.test(type)) return Number(type);
    return BlockType[type] ?? null;
  }
  return null;
};

export default function TemplateEditorPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const templateId = params.templateId;
  const isNewTemplate = templateId === "new";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [blocks, setBlocks] = useState([]);
  const [existingTemplate, setExistingTemplate] = useState(null);
  const [showBlockPicker, setShowBlockPicker] = useState(false);
  const [mainBlockId, setMainBlockId] = useState(null);
  const [subBlockId, setSubBlockId] = useState(null);

  // Fetch template data
  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      if (!isNewTemplate) {
        const template = await getTemplate(user.uid, templateId);
        if (template && !template.isDeleted) {
          setExistingTemplate(template);
          setName(template.name);
          setDescription(template.description || "");
          setBlocks(template.blocks || []);
          // Load main/sub block IDs directly from template
          if (template.mainBlockId) {
            setMainBlockId(template.mainBlockId);
          }
          if (template.subBlockId) {
            setSubBlockId(template.subBlockId);
          }
        } else {
          router.push("/dashboard/templates");
          return;
        }
      }
      setLoading(false);
    };

    fetchData();
  }, [user, templateId, isNewTemplate, router]);

  // Add a new block
  const addBlock = (typeKey) => {
    const type = getBlockTypeValue(typeKey);
    const newBlockId = uuidv4();
    const config = BLOCK_TYPE_CONFIG[type];

    let configJson = null;
    // Initialize quiz blocks with default options
    if (type === BlockType.quizSingleSelect || type === BlockType.quizMultiSelect) {
      configJson = JSON.stringify({
        question: "",
        options: ["", "", "", ""],
        correctAnswerIndex: 0,
        correctAnswerIndices: [],
      });
    } else if (type === BlockType.quizTextAnswer) {
      configJson = JSON.stringify({
        question: "",
        correctAnswer: "",
        caseSensitive: false,
      });
    }

    const newBlock = {
      blockId: newBlockId,
      type,
      label: config?.label || "Block",
      required: false,
      configJson,
    };

    setBlocks((prev) => [...prev, newBlock]);
    setShowBlockPicker(false);
  };

  // Remove a block
  const removeBlock = (blockId) => {
    setBlocks((prev) => prev.filter((b) => b.blockId !== blockId));
    // Clear main/sub if removed
    if (mainBlockId === blockId) setMainBlockId(null);
    if (subBlockId === blockId) setSubBlockId(null);
  };

  // Move block up
  const moveBlockUp = (index) => {
    if (index === 0) return;
    setBlocks((prev) => {
      const newBlocks = [...prev];
      [newBlocks[index - 1], newBlocks[index]] = [newBlocks[index], newBlocks[index - 1]];
      return newBlocks;
    });
  };

  // Move block down
  const moveBlockDown = (index) => {
    if (index === blocks.length - 1) return;
    setBlocks((prev) => {
      const newBlocks = [...prev];
      [newBlocks[index], newBlocks[index + 1]] = [newBlocks[index + 1], newBlocks[index]];
      return newBlocks;
    });
  };

  // Duplicate a block
  const duplicateBlock = (index) => {
    const originalBlock = blocks[index];
    const typeNum = getBlockTypeForConfig(originalBlock.type);
    // Don't duplicate quiz blocks
    if (
      typeNum === BlockType.quizSingleSelect ||
      typeNum === BlockType.quizMultiSelect ||
      typeNum === BlockType.quizTextAnswer
    ) {
      return;
    }

    const newBlock = {
      ...originalBlock,
      blockId: uuidv4(),
    };

    setBlocks((prev) => {
      const newBlocks = [...prev];
      newBlocks.splice(index + 1, 0, newBlock);
      return newBlocks;
    });
  };

  // Update block label
  const updateBlockLabel = (blockId, label) => {
    setBlocks((prev) =>
      prev.map((b) => (b.blockId === blockId ? { ...b, label } : b))
    );
  };

  // Update block config
  const updateBlockConfig = (blockId, config) => {
    setBlocks((prev) =>
      prev.map((b) =>
        b.blockId === blockId ? { ...b, configJson: JSON.stringify(config) } : b
      )
    );
  };

  // Check if template has a quiz block
  const hasQuizBlock = () => {
    return blocks.some((b) => {
      const n = getBlockTypeForConfig(b.type);
      return (
        n === BlockType.quizSingleSelect ||
        n === BlockType.quizMultiSelect ||
        n === BlockType.quizTextAnswer
      );
    });
  };

  // Check if a block type is text-based (accept number or string)
  const isTextBlock = (type) => {
    const n = getBlockTypeForConfig(type);
    return n != null && [
      BlockType.header1,
      BlockType.header2,
      BlockType.header3,
      BlockType.text,
      BlockType.quote,
      BlockType.hiddenText,
    ].includes(n);
  };

  // Get effective main/sub block IDs
  const getEffectiveMainSubBlocks = () => {
    const textBlocks = blocks.filter((b) => isTextBlock(b.type));
    const effectiveMainBlockId = mainBlockId || (textBlocks[0]?.blockId ?? null);
    const effectiveSubBlockId = subBlockId || (textBlocks[1]?.blockId ?? null);
    return { effectiveMainBlockId, effectiveSubBlockId };
  };

  // Save template
  const handleSave = async () => {
    if (!name.trim()) {
      alert("Please enter a template name");
      return;
    }

    if (blocks.length === 0) {
      alert("Please add at least one block");
      return;
    }

    setSaving(true);

    try {
      const { effectiveMainBlockId, effectiveSubBlockId } = getEffectiveMainSubBlocks();

      // Build rendering config
      const frontBlockIds = [];
      if (effectiveMainBlockId) frontBlockIds.push(effectiveMainBlockId);
      if (effectiveSubBlockId) frontBlockIds.push(effectiveSubBlockId);

      const backBlockIds = blocks
        .filter((b) => !frontBlockIds.includes(b.blockId))
        .map((b) => b.blockId);

      const rendering = {
        frontBlockIds,
        backBlockIds,
      };

      if (isNewTemplate) {
        await createTemplate(
          user.uid,
          name.trim(),
          description.trim(),
          blocks,
          rendering,
          effectiveMainBlockId,
          effectiveSubBlockId
        );
      } else {
        await updateTemplate(user.uid, templateId, {
          name: name.trim(),
          description: description.trim(),
          blocks,
          rendering,
          mainBlockId: effectiveMainBlockId,
          subBlockId: effectiveSubBlockId,
        });
      }

      router.push("/dashboard/templates");
    } catch (error) {
      console.error("Error saving template:", error);
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-accent"></div>
      </div>
    );
  }

  const { effectiveMainBlockId, effectiveSubBlockId } = getEffectiveMainSubBlocks();

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/templates"
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-white/70" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white">
              {isNewTemplate ? "New Template" : "Edit Template"}
            </h1>
            {!isNewTemplate && existingTemplate && (
              <p className="text-white/50 text-sm">Version {existingTemplate.version}</p>
            )}
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving || !name.trim() || blocks.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent/90 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
          ) : (
            <Save className="w-4 h-4" />
          )}
          <span className="hidden sm:inline">{saving ? "Saving..." : "Save"}</span>
        </button>
      </div>

      {/* Template Info */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6">
        <div className="mb-4">
          <label className="block text-white/70 text-sm mb-2">Template Name *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter template name..."
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-accent text-lg font-semibold"
          />
        </div>
        <div>
          <label className="block text-white/70 text-sm mb-2">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add a description..."
            rows={2}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-accent resize-none"
          />
        </div>
      </div>

      {/* Blocks List */}
      <div className="space-y-4 mb-6">
        {blocks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center bg-white/5 border border-white/10 rounded-xl">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
              <Plus className="w-8 h-8 text-white/30" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">No blocks yet</h3>
            <p className="text-white/50 mb-4">Add blocks to define your template structure</p>
          </div>
        ) : (
          blocks.map((block, index) => {
            const otherTextBlocks = blocks.filter(
              (b) =>
                b.blockId !== block.blockId &&
                isTextBlock(getBlockTypeForConfig(b.type))
            );
            return (
              <BlockCard
                key={block.blockId}
                block={block}
                index={index}
                totalCount={blocks.length}
                isMainBlock={effectiveMainBlockId === block.blockId}
                isSubBlock={effectiveSubBlockId === block.blockId}
                canSetMainSub={isTextBlock(block.type)}
                otherTextBlocksForAudio={otherTextBlocks}
                onSetAsMain={() => {
                  if (subBlockId === block.blockId) {
                    setSubBlockId(mainBlockId);
                  }
                  setMainBlockId(block.blockId);
                }}
                onSetAsSub={() => {
                  if (mainBlockId === block.blockId) {
                    setMainBlockId(subBlockId);
                  }
                  setSubBlockId(block.blockId);
                }}
                onMoveUp={() => moveBlockUp(index)}
                onMoveDown={() => moveBlockDown(index)}
                onDuplicate={() => duplicateBlock(index)}
                onRemove={() => removeBlock(block.blockId)}
                onLabelChange={(label) => updateBlockLabel(block.blockId, label)}
                onConfigChange={(config) => updateBlockConfig(block.blockId, config)}
              />
            );
          })
        )}
      </div>

      {/* Add Block Button */}
      <div className="relative">
        <button
          onClick={() => setShowBlockPicker(!showBlockPicker)}
          className="w-full py-3 border-2 border-dashed border-white/20 hover:border-accent/50 rounded-xl text-white/50 hover:text-accent transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Add Block
        </button>

        {/* Block Picker */}
        <AnimatePresence>
          {showBlockPicker && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowBlockPicker(false)}
              />
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute bottom-full left-0 right-0 mb-2 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl p-4 z-20 max-h-80 overflow-y-auto"
              >
                {/* Text Blocks */}
                <div className="mb-4">
                  <h4 className="text-white/50 text-xs uppercase tracking-wider mb-2">Text</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {Object.entries(BLOCK_TYPE_CONFIG)
                      .filter(([_, config]) => config.category === "text")
                      .map(([typeKey, config]) => {
                        const Icon = config.icon;
                        return (
                          <button
                            key={typeKey}
                            onClick={() => addBlock(typeKey)}
                            className="flex items-center gap-2 p-3 rounded-lg hover:bg-white/10 transition-colors text-left"
                          >
                            <Icon className="w-4 h-4 text-accent shrink-0" />
                            <span className="text-white/70 text-sm">{config.label}</span>
                          </button>
                        );
                      })}
                  </div>
                </div>

                {/* Media Blocks */}
                <div className="mb-4">
                  <h4 className="text-white/50 text-xs uppercase tracking-wider mb-2">Media</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {Object.entries(BLOCK_TYPE_CONFIG)
                      .filter(([_, config]) => config.category === "media")
                      .map(([typeKey, config]) => {
                        const Icon = config.icon;
                        return (
                          <button
                            key={typeKey}
                            onClick={() => addBlock(typeKey)}
                            className="flex items-center gap-2 p-3 rounded-lg hover:bg-white/10 transition-colors text-left"
                          >
                            <Icon className="w-4 h-4 text-accent shrink-0" />
                            <span className="text-white/70 text-sm">{config.label}</span>
                          </button>
                        );
                      })}
                  </div>
                </div>

                {/* Layout Blocks */}
                <div className="mb-4">
                  <h4 className="text-white/50 text-xs uppercase tracking-wider mb-2">Layout</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {Object.entries(BLOCK_TYPE_CONFIG)
                      .filter(([_, config]) => config.category === "layout")
                      .map(([typeKey, config]) => {
                        const Icon = config.icon;
                        return (
                          <button
                            key={typeKey}
                            onClick={() => addBlock(typeKey)}
                            className="flex items-center gap-2 p-3 rounded-lg hover:bg-white/10 transition-colors text-left"
                          >
                            <Icon className="w-4 h-4 text-accent shrink-0" />
                            <span className="text-white/70 text-sm">{config.label}</span>
                          </button>
                        );
                      })}
                  </div>
                </div>

                {/* Quiz Blocks */}
                <div>
                  <h4 className="text-white/50 text-xs uppercase tracking-wider mb-2">Quiz</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {Object.entries(BLOCK_TYPE_CONFIG)
                      .filter(([_, config]) => config.category === "quiz")
                      .map(([typeKey, config]) => {
                        const Icon = config.icon;
                        const disabled = hasQuizBlock();
                        return (
                          <button
                            key={typeKey}
                            onClick={() => !disabled && addBlock(typeKey)}
                            disabled={disabled}
                            className="flex items-center gap-2 p-3 rounded-lg hover:bg-white/10 transition-colors text-left disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <Icon className="w-4 h-4 text-accent shrink-0" />
                            <div>
                              <span className="text-white/70 text-sm block">{config.label}</span>
                              <span className="text-white/40 text-xs">{config.description}</span>
                            </div>
                          </button>
                        );
                      })}
                  </div>
                  {hasQuizBlock() && (
                    <p className="text-white/40 text-xs mt-2">
                      Only one quiz block allowed per template
                    </p>
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Block Card Component
function BlockCard({
  block,
  index,
  totalCount,
  isMainBlock,
  isSubBlock,
  canSetMainSub,
  otherTextBlocksForAudio = [],
  onSetAsMain,
  onSetAsSub,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onRemove,
  onLabelChange,
  onConfigChange,
}) {
  const [showSettings, setShowSettings] = useState(false);
  const typeForConfig = getBlockTypeForConfig(block.type);
  const config = (typeForConfig != null && BLOCK_TYPE_CONFIG[typeForConfig]) || {};
  const Icon = config.icon || Type;

  const isQuizBlock =
    typeForConfig === BlockType.quizSingleSelect ||
    typeForConfig === BlockType.quizMultiSelect ||
    typeForConfig === BlockType.quizTextAnswer;

  const isAudioBlock = typeForConfig === BlockType.audio;

  // Parse block config
  let blockConfig = {};
  if (block.configJson) {
    try {
      blockConfig = JSON.parse(block.configJson);
    } catch {}
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/5 border border-white/10 rounded-xl p-4 group"
    >
      <div className="flex items-start gap-3">
        {/* Drag Handle & Icon */}
        <div className="flex flex-col items-center gap-1 pt-1">
          <GripVertical className="w-4 h-4 text-white/20 cursor-grab" />
          <Icon className="w-4 h-4 text-white/40" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header Row */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-white/40 text-xs uppercase tracking-wide">
                {config.label || "Block"}
              </span>
              {isMainBlock && (
                <span className="px-2 py-0.5 bg-accent/20 text-accent text-xs rounded-full">
                  Main
                </span>
              )}
              {isSubBlock && (
                <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded-full">
                  Sub
                </span>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {index > 0 && (
                <button
                  onClick={onMoveUp}
                  className="p-1 hover:bg-white/10 rounded transition-colors"
                  title="Move up"
                >
                  <ChevronUp className="w-4 h-4 text-white/50" />
                </button>
              )}
              {index < totalCount - 1 && (
                <button
                  onClick={onMoveDown}
                  className="p-1 hover:bg-white/10 rounded transition-colors"
                  title="Move down"
                >
                  <ChevronDown className="w-4 h-4 text-white/50" />
                </button>
              )}
              {!isQuizBlock && (
                <button
                  onClick={onDuplicate}
                  className="p-1 hover:bg-white/10 rounded transition-colors"
                  title="Duplicate"
                >
                  <Copy className="w-4 h-4 text-white/50" />
                </button>
              )}
              {canSetMainSub && (
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="p-1 hover:bg-white/10 rounded transition-colors"
                  title="Settings"
                >
                  <Settings className="w-4 h-4 text-white/50" />
                </button>
              )}
              <button
                onClick={onRemove}
                className="p-1 hover:bg-white/10 rounded transition-colors"
                title="Remove"
              >
                <Trash2 className="w-4 h-4 text-red-400" />
              </button>
            </div>
          </div>

          {/* Label Input */}
          <input
            type="text"
            value={block.label}
            onChange={(e) => onLabelChange(e.target.value)}
            placeholder="Block label..."
            className="w-full bg-transparent text-white placeholder-white/30 focus:outline-none mb-2"
          />

          {/* Settings Panel */}
          <AnimatePresence>
            {showSettings && canSetMainSub && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="pt-3 mt-3 border-t border-white/10">
                  <p className="text-white/50 text-xs mb-2">Display settings:</p>
                  <div className="flex gap-2">
                    <button
                      onClick={onSetAsMain}
                      disabled={isMainBlock}
                      className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                        isMainBlock
                          ? "bg-accent/20 text-accent"
                          : "bg-white/5 text-white/70 hover:bg-white/10"
                      }`}
                    >
                      Set as Main
                    </button>
                    <button
                      onClick={onSetAsSub}
                      disabled={isSubBlock}
                      className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                        isSubBlock
                          ? "bg-purple-500/20 text-purple-400"
                          : "bg-white/5 text-white/70 hover:bg-white/10"
                      }`}
                    >
                      Set as Sub
                    </button>
                  </div>
                  <p className="text-white/40 text-xs mt-2">
                    Main and Sub blocks are shown on the front of the card
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Quiz Block Settings */}
          {isQuizBlock && (
            <QuizBlockSettings
              block={block}
              config={blockConfig}
              onConfigChange={onConfigChange}
            />
          )}

          {/* Audio Block Settings: default AI voice + default source block */}
          {isAudioBlock && (
            <AudioBlockSettings
              config={blockConfig}
              onConfigChange={onConfigChange}
              otherTextBlocks={otherTextBlocksForAudio ?? []}
            />
          )}
        </div>
      </div>
    </motion.div>
  );
}

// Audio Block Settings: default voice + default block to copy text from
function AudioBlockSettings({ config, onConfigChange, otherTextBlocks = [] }) {
  const defaultVoiceId = config.defaultVoiceId ?? "";
  const defaultSourceBlockId = config.defaultSourceBlockId ?? "";

  return (
    <div className="mt-3 pt-3 border-t border-white/10 space-y-4">
      <div>
        <label className="text-white/70 text-sm block mb-2">Default AI voice (Generate with AI)</label>
        <select
          value={defaultVoiceId}
          onChange={(e) =>
            onConfigChange({ ...config, defaultVoiceId: e.target.value || null })
          }
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-accent/50"
        >
          <option value="">— None (use first in list) —</option>
          {ELEVENLABS_VOICES.map((v) => (
            <option key={v.id} value={v.id}>
              {v.label} ({v.group})
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-white/70 text-sm block mb-2">Default block to copy text from</label>
        <select
          value={defaultSourceBlockId}
          onChange={(e) =>
            onConfigChange({
              ...config,
              defaultSourceBlockId: e.target.value || null,
            })
          }
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-accent/50"
        >
          <option value="">Main block (default)</option>
          {otherTextBlocks.map((b) => (
            <option key={b.blockId} value={b.blockId}>
              {b.label || b.blockId}
            </option>
          ))}
        </select>
        <p className="text-white/40 text-xs mt-1">
          Pre-fills the text area when editing a card
        </p>
      </div>
    </div>
  );
}

// Quiz Block Settings Component
function QuizBlockSettings({ block, config, onConfigChange }) {
  const optionCount = config.options?.length || 4;
  const typeNum = getBlockTypeForConfig(block.type);

  const updateOptionCount = (delta) => {
    const newCount = Math.max(2, Math.min(6, optionCount + delta));
    const newOptions = [...(config.options || [])];
    while (newOptions.length < newCount) newOptions.push("");
    while (newOptions.length > newCount) newOptions.pop();
    onConfigChange({ ...config, options: newOptions });
  };

  if (typeNum === BlockType.quizTextAnswer) {
    return (
      <div className="mt-3 pt-3 border-t border-white/10">
        <label className="flex items-center gap-2 text-white/70 text-sm">
          <input
            type="checkbox"
            checked={config.caseSensitive || false}
            onChange={(e) =>
              onConfigChange({ ...config, caseSensitive: e.target.checked })
            }
            className="rounded border-white/20 bg-white/5"
          />
          Case sensitive
        </label>
      </div>
    );
  }

  return (
    <div className="mt-3 pt-3 border-t border-white/10">
      <div className="flex items-center justify-between">
        <span className="text-white/70 text-sm">Number of options: {optionCount}</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => updateOptionCount(-1)}
            disabled={optionCount <= 2}
            className="p-1 hover:bg-white/10 rounded disabled:opacity-30"
          >
            <Minus className="w-4 h-4 text-white/50" />
          </button>
          <button
            onClick={() => updateOptionCount(1)}
            disabled={optionCount >= 6}
            className="p-1 hover:bg-white/10 rounded disabled:opacity-30"
          >
            <Plus className="w-4 h-4 text-white/50" />
          </button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 mt-2">
        {Array.from({ length: optionCount }).map((_, i) => (
          <span
            key={i}
            className="px-2 py-1 bg-white/5 border border-white/10 rounded text-white/50 text-xs"
          >
            {typeNum === BlockType.quizSingleSelect ? "○" : "☐"} Option {i + 1}
          </span>
        ))}
      </div>
    </div>
  );
}
