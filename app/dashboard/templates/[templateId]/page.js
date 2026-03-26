"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
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
import ElevenlabsVoicePicker from "@/components/ElevenlabsVoicePicker";
import { parseAudioBlockConfig } from "@/lib/audio-block-config";
import { CROP_ASPECT_OPTIONS, DEFAULT_CROP_ASPECT, getCropAspectFromConfig } from "@/lib/image-block-config";

const LOG_AUDIO_BLOCK = true; // set to false to reduce console noise
function logAudio(...args) {
  if (LOG_AUDIO_BLOCK) console.log("[TemplateEditor:audio]", ...args);
}

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

/** @param {{ side?: string }} b */
function effectiveTemplateSide(b) {
  return b?.side === "back" ? "back" : "front";
}

/** Insert index for a new block on the given face (flat array order). */
function insertionIndexForSide(blocks, side) {
  const list = blocks || [];
  if (side === "front") {
    let lastFront = -1;
    for (let i = 0; i < list.length; i++) {
      if (effectiveTemplateSide(list[i]) === "front") lastFront = i;
    }
    return lastFront + 1;
  }
  return list.length;
}

/** After changing side, move block to end of that face’s run. */
function reorderBlockToFaceEnd(blocks, blockId, targetSide) {
  const idx = blocks.findIndex((b) => b.blockId === blockId);
  if (idx < 0) return blocks;
  const block = { ...blocks[idx], side: targetSide };
  const others = blocks.filter((_, i) => i !== idx);
  let insertAt = others.length;
  if (targetSide === "back") {
    let lastBack = -1;
    for (let i = 0; i < others.length; i++) {
      if (effectiveTemplateSide(others[i]) === "back") lastBack = i;
    }
    if (lastBack >= 0) insertAt = lastBack + 1;
    else {
      let lastFront = -1;
      for (let i = 0; i < others.length; i++) {
        if (effectiveTemplateSide(others[i]) === "front") lastFront = i;
      }
      insertAt = lastFront + 1;
    }
  } else {
    let lastFront = -1;
    for (let i = 0; i < others.length; i++) {
      if (effectiveTemplateSide(others[i]) === "front") lastFront = i;
    }
    insertAt = lastFront + 1;
  }
  const out = [...others];
  out.splice(insertAt, 0, block);
  return out;
}

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
  /** null = closed; which face new blocks are added to */
  const [blockPickerSide, setBlockPickerSide] = useState(null);
  /** True after “Add back of card” until back blocks exist or user removes back */
  const [showBackSectionIntent, setShowBackSectionIntent] = useState(false);
  const [mainBlockId, setMainBlockId] = useState(null);
  const [subBlockId, setSubBlockId] = useState(null);
  const prevBackBlockCountRef = useRef(0);

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
          setBlocks(
            (template.blocks || []).map((b) => ({
              ...b,
              side: b.side === "back" ? "back" : "front",
            })),
          );
          setShowBackSectionIntent(false);
          logAudio("Template loaded from Firestore", {
            templateId: template.templateId,
            name: template.name,
            mainBlockId: template.mainBlockId,
            subBlockId: template.subBlockId,
            blocksCount: (template.blocks || []).length,
            blocks: (template.blocks || []).map((b, i) => ({
              index: i,
              blockId: b?.blockId,
              type: b?.type,
              label: b?.label,
              hasConfigJson: !!b?.configJson,
              configJsonLength: typeof b?.configJson === "string" ? b.configJson.length : 0,
            })),
          });
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

  // Collapse empty “back section” intent only when the last back block is removed (not when opening an empty back panel).
  useEffect(() => {
    const n = blocks.filter((b) => effectiveTemplateSide(b) === "back").length;
    if (prevBackBlockCountRef.current > 0 && n === 0) {
      setShowBackSectionIntent(false);
    }
    prevBackBlockCountRef.current = n;
  }, [blocks]);

  /**
   * @param {string} typeKey
   * @param {"front" | "back"} [side]
   * @param {string} [labelOverride] - if set (including ""), used instead of the type default label
   */
  const addBlock = (typeKey, side = "front", labelOverride) => {
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
    } else if (type === BlockType.image) {
      configJson = JSON.stringify({ cropAspect: DEFAULT_CROP_ASPECT });
    }

    const face = side === "back" ? "back" : "front";

    setBlocks((prev) => {
      const insertAt = insertionIndexForSide(prev, face);
      const isFirstBlock = prev.length === 0;
      const label =
        labelOverride !== undefined
          ? String(labelOverride)
          : config?.label || "Block";
      const newBlock = {
        blockId: newBlockId,
        type,
        label,
        required: isFirstBlock,
        configJson,
        side: face,
      };
      const next = [...prev];
      next.splice(insertAt, 0, newBlock);
      return next;
    });
    setBlockPickerSide(null);
  };

  /** Reveal Back section; user adds blocks via “Add block” (no default block). */
  const addBackOfCard = () => {
    setShowBackSectionIntent(true);
  };

  const removeBackSection = () => {
    const hasBackBlocks = blocks.some((b) => effectiveTemplateSide(b) === "back");
    if (hasBackBlocks) {
      if (
        !confirm(
          "Remove the back of the card? All blocks on the back will be deleted.",
        )
      ) {
        return;
      }
      setBlocks((prev) => prev.filter((b) => effectiveTemplateSide(b) === "front"));
    }
    setShowBackSectionIntent(false);
  };

  const moveBlockToSide = (blockId, targetSide) => {
    setBlocks((prev) => reorderBlockToFaceEnd(prev, blockId, targetSide));
  };

  // Remove a block
  const removeBlock = (blockId) => {
    setBlocks((prev) => prev.filter((b) => b.blockId !== blockId));
    // Clear main/sub if removed
    if (mainBlockId === blockId) setMainBlockId(null);
    if (subBlockId === blockId) setSubBlockId(null);
  };

  // Move block up within the same face only
  const moveBlockUp = (globalIndex) => {
    const side = effectiveTemplateSide(blocks[globalIndex]);
    for (let i = globalIndex - 1; i >= 0; i--) {
      if (effectiveTemplateSide(blocks[i]) === side) {
        moveBlock(globalIndex, i);
        return;
      }
    }
  };

  // Move block down within the same face only
  const moveBlockDown = (globalIndex) => {
    const side = effectiveTemplateSide(blocks[globalIndex]);
    for (let i = globalIndex + 1; i < blocks.length; i++) {
      if (effectiveTemplateSide(blocks[i]) === side) {
        moveBlock(globalIndex, i);
        return;
      }
    }
  };

  // Reorder block by drag-and-drop (fromIndex → toIndex)
  const moveBlock = (fromIndex, toIndex) => {
    if (fromIndex === toIndex) return;
    setBlocks((prev) => {
      const newBlocks = [...prev];
      const [removed] = newBlocks.splice(fromIndex, 1);
      newBlocks.splice(toIndex, 0, removed);
      return newBlocks;
    });
  };

  const [draggedBlockIndex, setDraggedBlockIndex] = useState(null);
  const [dragOverBlockIndex, setDragOverBlockIndex] = useState(null);

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
      side: effectiveTemplateSide(originalBlock) === "back" ? "back" : "front",
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

  // Get effective main/sub block IDs (front face text blocks only — AI / audio defaults)
  const getEffectiveMainSubBlocks = () => {
    const frontBlocksOnly = blocks.filter((b) => effectiveTemplateSide(b) === "front");
    const textBlocks = frontBlocksOnly.filter((b) => isTextBlock(b.type));
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

      const blocksWithSide = blocks.map((b) => ({
        ...b,
        side: effectiveTemplateSide(b) === "back" ? "back" : "front",
      }));

      if (isNewTemplate) {
        await createTemplate(
          user.uid,
          name.trim(),
          description.trim(),
          blocksWithSide,
          effectiveMainBlockId,
          effectiveSubBlockId,
        );
      } else {
        await updateTemplate(user.uid, templateId, {
          name: name.trim(),
          description: description.trim(),
          blocks: blocksWithSide,
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

  const frontBlocks = blocks.filter((b) => effectiveTemplateSide(b) === "front");
  const backBlocks = blocks.filter((b) => effectiveTemplateSide(b) === "back");
  const hasBackBlocks = backBlocks.length > 0;
  const showBackPanel = hasBackBlocks || showBackSectionIntent;

  const renderBlockRow = (block, sectionIndex, sectionLength, face) => {
    const globalIndex = blocks.findIndex((b) => b.blockId === block.blockId);
    const otherTextBlocks = blocks.filter(
      (b) =>
        b.blockId !== block.blockId &&
        effectiveTemplateSide(b) === "front" &&
        isTextBlock(getBlockTypeForConfig(b.type)),
    );
    logAudio(
      "Block list item",
      { globalIndex, blockId: block.blockId, type: block.type, label: block.label, face },
      "otherTextBlocks count:",
      otherTextBlocks.length,
    );
    return (
      <BlockCard
        key={block.blockId != null ? `${block.blockId}-${globalIndex}` : `block-${globalIndex}`}
        block={block}
        globalIndex={globalIndex}
        sectionIndex={sectionIndex}
        sectionLength={sectionLength}
        face={face}
        isMainBlock={effectiveMainBlockId === block.blockId}
        isSubBlock={effectiveSubBlockId === block.blockId}
        canSetMainSub={face === "front" && isTextBlock(block.type)}
        otherTextBlocksForAudio={otherTextBlocks}
        effectiveMainBlockId={effectiveMainBlockId}
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
        onMoveUp={() => moveBlockUp(globalIndex)}
        onMoveDown={() => moveBlockDown(globalIndex)}
        onMoveToBack={() => moveBlockToSide(block.blockId, "back")}
        onMoveToFront={() => moveBlockToSide(block.blockId, "front")}
        onDuplicate={() => duplicateBlock(globalIndex)}
        onRemove={() => removeBlock(block.blockId)}
        onLabelChange={(label) => updateBlockLabel(block.blockId, label)}
        onConfigChange={(config) => updateBlockConfig(block.blockId, config)}
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", String(globalIndex));
          setDraggedBlockIndex(globalIndex);
        }}
        onDragEnd={() => {
          setDraggedBlockIndex(null);
          setDragOverBlockIndex(null);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          setDragOverBlockIndex(globalIndex);
        }}
        onDragLeave={() => setDragOverBlockIndex((i) => (i === globalIndex ? null : i))}
        onDrop={(e) => {
          e.preventDefault();
          const from = draggedBlockIndex;
          if (from != null && from !== globalIndex) {
            if (effectiveTemplateSide(blocks[from]) !== effectiveTemplateSide(blocks[globalIndex])) {
              setDraggedBlockIndex(null);
              setDragOverBlockIndex(null);
              return;
            }
            moveBlock(from, globalIndex);
          }
          setDraggedBlockIndex(null);
          setDragOverBlockIndex(null);
        }}
        isDragging={draggedBlockIndex === globalIndex}
        isDragOver={dragOverBlockIndex === globalIndex}
      />
    );
  };

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

      {/* Blocks List — front / back */}
      <div className="space-y-4 mb-6">
        {blocks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center bg-white/5 border border-white/10 rounded-xl">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
              <Plus className="w-8 h-8 text-white/30" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">No blocks yet</h3>
            <p className="text-white/50 mb-4">Add blocks to define your template structure</p>
            <button
              type="button"
              onClick={() => setBlockPickerSide("front")}
              className="px-4 py-2 rounded-lg bg-accent/20 text-accent hover:bg-accent/30 text-sm font-medium"
            >
              Add block
            </button>
          </div>
        ) : (
          <>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden">
              <div className="px-4 py-2 border-b border-white/10 bg-white/[0.04]">
                <span className="text-xs font-semibold uppercase tracking-wider text-white/50">
                  Front
                </span>
              </div>
              <div className="p-4 space-y-4">
                {frontBlocks.map((block, sectionIndex) =>
                  renderBlockRow(block, sectionIndex, frontBlocks.length, "front"),
                )}
                <button
                  type="button"
                  onClick={() => setBlockPickerSide("front")}
                  className="w-full py-2.5 border border-dashed border-white/15 hover:border-accent/40 rounded-lg text-white/45 hover:text-accent text-sm transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add block
                </button>
              </div>
            </div>

            {!showBackPanel ? (
              <button
                type="button"
                onClick={addBackOfCard}
                className="w-full py-3 rounded-xl border-2 border-dashed border-white/20 hover:border-accent/50 text-white/50 hover:text-accent text-sm transition-colors"
              >
                + Add back of card
              </button>
            ) : (
              <div className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden">
                <div className="px-4 py-2 border-b border-white/10 bg-white/[0.04] flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-white/50">
                    Back
                  </span>
                  <button
                    type="button"
                    onClick={removeBackSection}
                    className="text-xs text-red-400/90 hover:text-red-300"
                  >
                    Remove back
                  </button>
                </div>
                <div className="p-4 space-y-4">
                  {backBlocks.map((block, sectionIndex) =>
                    renderBlockRow(block, sectionIndex, backBlocks.length, "back"),
                  )}
                  <button
                    type="button"
                    onClick={() => setBlockPickerSide("back")}
                    className="w-full py-2.5 border border-dashed border-white/15 hover:border-accent/40 rounded-lg text-white/45 hover:text-accent text-sm transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add block
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Block type picker (anchored to last “Add block” intent) */}
      <div className="relative">
        {/* Block Picker */}
        <AnimatePresence>
          {blockPickerSide != null && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setBlockPickerSide(null)}
              />
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute bottom-full left-0 right-0 mb-2 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl p-4 z-20 max-h-80 overflow-y-auto"
              >
                <p className="text-white/45 text-xs mb-3">
                  Adding to:{" "}
                  <span className="text-white/80 font-medium">
                    {blockPickerSide === "back" ? "Back" : "Front"}
                  </span>
                </p>
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
                            onClick={() => addBlock(typeKey, blockPickerSide)}
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
                            onClick={() => addBlock(typeKey, blockPickerSide)}
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
                            onClick={() => addBlock(typeKey, blockPickerSide)}
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
                            onClick={() => !disabled && addBlock(typeKey, blockPickerSide)}
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
  sectionIndex,
  sectionLength,
  face,
  isMainBlock,
  isSubBlock,
  canSetMainSub,
  otherTextBlocksForAudio = [],
  effectiveMainBlockId = null,
  onSetAsMain,
  onSetAsSub,
  onMoveUp,
  onMoveDown,
  onMoveToBack,
  onMoveToFront,
  onDuplicate,
  onRemove,
  onLabelChange,
  onConfigChange,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
  isDragging = false,
  isDragOver = false,
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
  const isImageBlock = typeForConfig === BlockType.image;

  // Parse block config (support camelCase and snake_case from Firestore/mobile). See docs/WEB_AUDIO_BLOCK_SETTINGS.md.
  // configJson may be string (from form) or object (from Firestore/transformBlockFromFirestore).
  let blockConfig = {};
  if (block.configJson != null) {
    if (typeof block.configJson === "object") {
      blockConfig = { ...block.configJson };
    } else {
      try {
        blockConfig = JSON.parse(block.configJson);
      } catch (e) {
        logAudio("Block config JSON parse error", block.blockId, e);
      }
    }
  }
  // For audio blocks: normalize so defaultVoiceId/defaultSourceBlockId work from Firestore (mobile may send snake_case)
  if (isAudioBlock) {
    const normalized = parseAudioBlockConfig(block.configJson, {
      mainBlockId: effectiveMainBlockId ?? undefined,
    });
    blockConfig = { ...blockConfig, ...normalized };
    logAudio("Audio block config", {
      blockId: block.blockId,
      rawConfigJson: block.configJson,
      parsedThenNormalized: blockConfig,
      effectiveMainBlockId,
      otherTextBlocksForAudioCount: otherTextBlocksForAudio?.length ?? 0,
      otherTextBlocksForAudio: (otherTextBlocksForAudio ?? []).map((b) => ({
        blockId: b.blockId,
        label: b.label,
      })),
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`bg-white/5 border rounded-xl p-4 group transition-colors ${
        isDragOver ? "border-accent/60 bg-accent/10 ring-1 ring-accent/30" : "border-white/10"
      } ${isDragging ? "opacity-60" : ""}`}
    >
      <div className="flex items-start gap-3">
        {/* Drag Handle & Icon */}
        <div className="flex flex-col items-center gap-1 pt-1 cursor-grab active:cursor-grabbing">
          <GripVertical className="w-4 h-4 text-white/20" />
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
              {sectionIndex > 0 && (
                <button
                  type="button"
                  onClick={onMoveUp}
                  className="p-1 hover:bg-white/10 rounded transition-colors"
                  title="Move up"
                >
                  <ChevronUp className="w-4 h-4 text-white/50" />
                </button>
              )}
              {sectionIndex < sectionLength - 1 && (
                <button
                  type="button"
                  onClick={onMoveDown}
                  className="p-1 hover:bg-white/10 rounded transition-colors"
                  title="Move down"
                >
                  <ChevronDown className="w-4 h-4 text-white/50" />
                </button>
              )}
              {face === "front" && (
                <button
                  type="button"
                  onClick={onMoveToBack}
                  className="p-1 hover:bg-white/10 rounded transition-colors flex items-center gap-0.5"
                  title="Move to back"
                >
                  <ArrowRight className="w-4 h-4 text-amber-400/90" />
                </button>
              )}
              {face === "back" && (
                <button
                  type="button"
                  onClick={onMoveToFront}
                  className="p-1 hover:bg-white/10 rounded transition-colors"
                  title="Move to front"
                >
                  <ArrowLeft className="w-4 h-4 text-amber-400/90" />
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

          {/* Image Block Settings: default crop aspect ratio (synced to Firebase; mobile can read cropAspect) */}
          {isImageBlock && (
            <ImageBlockSettings
              config={blockConfig}
              onConfigChange={onConfigChange}
            />
          )}
        </div>
      </div>
    </motion.div>
  );
}

// Audio Block Settings: default voice + default block to copy text from
function AudioBlockSettings({ config, onConfigChange, otherTextBlocks = [] }) {
  // Support both camelCase and snake_case when reading (mobile may send snake_case). See docs/WEB_AUDIO_BLOCK_SETTINGS.md.
  const defaultVoiceId = config.defaultVoiceId ?? config.default_voice_id ?? "";
  const defaultSourceBlockId = config.defaultSourceBlockId ?? config.default_source_block_id ?? "";

  logAudio("AudioBlockSettings render", {
    configKeys: config ? Object.keys(config) : [],
    defaultVoiceId,
    defaultSourceBlockId,
    otherTextBlocksCount: otherTextBlocks.length,
    otherTextBlocks: otherTextBlocks.map((b) => ({ blockId: b.blockId, label: b.label })),
  });

  return (
    <div className="mt-3 pt-3 border-t border-white/10 space-y-4">
      <div>
        <label className="text-white/70 text-sm block mb-2">Default AI voice (Generate with AI)</label>
        <p className="text-white/40 text-xs mb-2">
          Choose a voice from the Deckbase list (curated multilingual voices; see{" "}
          <code className="text-white/55">docs/api/ELEVENLABS_VOICES.md</code>
          ). TTS still requires <code className="text-white/55">ELEVENLABS_API_KEY</code> on the server.
        </p>
        <ElevenlabsVoicePicker
          allowEmpty
          value={defaultVoiceId}
          onChange={(id) =>
            onConfigChange({ ...config, defaultVoiceId: id || null })
          }
          size="md"
        />
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

// Image Block Settings: default crop aspect (synced via configJson; mobile reads cropAspect)
function ImageBlockSettings({ config, onConfigChange }) {
  const cropAspect = getCropAspectFromConfig(config);

  return (
    <div className="mt-3 pt-3 border-t border-white/10">
      <label className="text-white/70 text-sm block mb-2">Default crop aspect</label>
      <div className="flex flex-wrap gap-2">
        {CROP_ASPECT_OPTIONS.map((opt) => (
          <button
            key={opt.label}
            type="button"
            onClick={() => onConfigChange({ ...config, cropAspect: opt.value })}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              cropAspect === opt.value
                ? "bg-accent/20 text-accent"
                : "bg-white/5 text-white/70 hover:bg-white/10"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <p className="text-white/40 text-xs mt-1">
        Used when cropping images in cards. Synced to Firebase for mobile.
      </p>
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
