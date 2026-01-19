"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
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
  Eye,
  EyeOff,
  Minus,
  Save,
  X,
  Upload,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import {
  getDeck,
  getCard,
  createCard,
  updateCard,
  uploadImage,
  getMedia,
} from "@/utils/firestore";
import { v4 as uuidv4 } from "uuid";

// Block type configurations
const BLOCK_TYPES = {
  header1: {
    label: "Header 1",
    icon: Heading1,
    placeholder: "Main heading...",
  },
  header2: { label: "Header 2", icon: Heading2, placeholder: "Subheading..." },
  header3: {
    label: "Header 3",
    icon: Heading3,
    placeholder: "Small heading...",
  },
  text: { label: "Text", icon: Type, placeholder: "Enter text..." },
  example: {
    label: "Example",
    icon: FileText,
    placeholder: "Example or quote...",
  },
  hiddenText: {
    label: "Hidden Text",
    icon: EyeOff,
    placeholder: "Hidden until revealed...",
  },
  image: { label: "Image", icon: ImageIcon, placeholder: "Add images..." },
  divider: { label: "Divider", icon: Minus, placeholder: "" },
};

// Default template for new cards
const DEFAULT_BLOCKS = [
  { blockId: "front", type: "header1", label: "Front", required: true },
  { blockId: "back", type: "text", label: "Back", required: true },
];

export default function CardEditorPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const deckId = params.deckId;
  const cardId = params.cardId; // "new" for create, or existing cardId

  const isNewCard = cardId === "new";

  const [deck, setDeck] = useState(null);
  const [blocks, setBlocks] = useState(DEFAULT_BLOCKS);
  const [values, setValues] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showBlockPicker, setShowBlockPicker] = useState(false);
  const [mediaCache, setMediaCache] = useState({});

  // Fetch deck and card data
  useEffect(() => {
    if (!user || !deckId) return;

    const fetchData = async () => {
      // Fetch deck
      const deckData = await getDeck(user.uid, deckId);
      if (!deckData || deckData.isDeleted) {
        router.push("/dashboard");
        return;
      }
      setDeck(deckData);

      // Fetch card if editing
      if (!isNewCard) {
        const cardData = await getCard(user.uid, cardId);
        if (cardData && !cardData.isDeleted) {
          setBlocks(cardData.blocksSnapshot || DEFAULT_BLOCKS);

          // Convert values array to object keyed by blockId
          const valuesObj = {};
          (cardData.values || []).forEach((v) => {
            valuesObj[v.blockId] = v;
          });
          setValues(valuesObj);

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
      } else {
        // Initialize empty values for default blocks
        const initialValues = {};
        DEFAULT_BLOCKS.forEach((block) => {
          initialValues[block.blockId] = {
            blockId: block.blockId,
            type: block.type,
            text: "",
          };
        });
        setValues(initialValues);
      }

      setLoading(false);
    };

    fetchData();
  }, [user, deckId, cardId, isNewCard, router]);

  // Update a block's value
  const updateBlockValue = (blockId, text) => {
    setValues((prev) => ({
      ...prev,
      [blockId]: {
        ...prev[blockId],
        blockId,
        type: blocks.find((b) => b.blockId === blockId)?.type,
        text,
      },
    }));
  };

  // Add a new block
  const addBlock = (type) => {
    const newBlockId = uuidv4();
    const newBlock = {
      blockId: newBlockId,
      type,
      label: BLOCK_TYPES[type]?.label || "Block",
      required: false,
    };

    setBlocks((prev) => [...prev, newBlock]);
    setValues((prev) => ({
      ...prev,
      [newBlockId]: {
        blockId: newBlockId,
        type,
        text: "",
        mediaIds: type === "image" ? [] : undefined,
      },
    }));
    setShowBlockPicker(false);
  };

  // Remove a block
  const removeBlock = (blockId) => {
    const block = blocks.find((b) => b.blockId === blockId);
    if (block?.required) return; // Can't remove required blocks

    setBlocks((prev) => prev.filter((b) => b.blockId !== blockId));
    setValues((prev) => {
      const newValues = { ...prev };
      delete newValues[blockId];
      return newValues;
    });
  };

  // Handle image upload
  const handleImageUpload = async (blockId, files) => {
    if (!files || files.length === 0) return;

    for (const file of files) {
      try {
        const media = await uploadImage(user.uid, file);

        setMediaCache((prev) => ({ ...prev, [media.mediaId]: media }));

        setValues((prev) => {
          const currentValue = prev[blockId] || { blockId, type: "image" };
          const currentMediaIds = currentValue.mediaIds || [];
          return {
            ...prev,
            [blockId]: {
              ...currentValue,
              mediaIds: [...currentMediaIds, media.mediaId],
            },
          };
        });
      } catch (error) {
        console.error("Error uploading image:", error);
      }
    }
  };

  // Remove image from block
  const removeImage = (blockId, mediaId) => {
    setValues((prev) => {
      const currentValue = prev[blockId];
      if (!currentValue?.mediaIds) return prev;

      return {
        ...prev,
        [blockId]: {
          ...currentValue,
          mediaIds: currentValue.mediaIds.filter((id) => id !== mediaId),
        },
      };
    });
  };

  // Save card
  const handleSave = async () => {
    setSaving(true);

    try {
      // Convert values object to array
      const valuesArray = Object.values(values);

      if (isNewCard) {
        await createCard(user.uid, deckId, blocks, valuesArray);
      } else {
        await updateCard(user.uid, cardId, deckId, valuesArray, blocks);
      }

      router.push(`/dashboard/deck/${deckId}`);
    } catch (error) {
      console.error("Error saving card:", error);
      setSaving(false);
    }
  };

  // Check if card has content
  const hasContent = () => {
    return Object.values(values).some(
      (v) => (v.text && v.text.trim()) || (v.mediaIds && v.mediaIds.length > 0)
    );
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
            <h1 className="text-xl font-bold text-white">
              {isNewCard ? "New Card" : "Edit Card"}
            </h1>
            <p className="text-white/50 text-sm">{deck?.title}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isNewCard && (
            <Link
              href={`/dashboard/deck/${deckId}/card/${cardId}/preview`}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="Preview"
            >
              <Eye className="w-5 h-5 text-white/70" />
            </Link>
          )}
          <button
            onClick={handleSave}
            disabled={saving || !hasContent()}
            className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent/90 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">
              {saving ? "Saving..." : "Save"}
            </span>
          </button>
        </div>
      </div>

      {/* Blocks */}
      <div className="space-y-4">
        {blocks.map((block, index) => (
          <BlockEditor
            key={block.blockId}
            block={block}
            value={values[block.blockId]}
            mediaCache={mediaCache}
            onValueChange={(text) => updateBlockValue(block.blockId, text)}
            onRemove={() => removeBlock(block.blockId)}
            onImageUpload={(files) => handleImageUpload(block.blockId, files)}
            onImageRemove={(mediaId) => removeImage(block.blockId, mediaId)}
          />
        ))}
      </div>

      {/* Add Block Button */}
      <div className="mt-6 relative">
        <button
          onClick={() => setShowBlockPicker(!showBlockPicker)}
          className="w-full py-3 border-2 border-dashed border-white/20 hover:border-accent/50 rounded-xl text-white/50 hover:text-accent transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Add Block
        </button>

        {/* Block Picker */}
        {showBlockPicker && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowBlockPicker(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute bottom-full left-0 right-0 mb-2 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl p-3 z-20"
            >
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {Object.entries(BLOCK_TYPES).map(([type, config]) => {
                  const Icon = config.icon;
                  return (
                    <button
                      key={type}
                      onClick={() => addBlock(type)}
                      className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-white/10 transition-colors"
                    >
                      <Icon className="w-5 h-5 text-accent" />
                      <span className="text-white/70 text-xs">
                        {config.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
}

// Block Editor Component
function BlockEditor({
  block,
  value,
  mediaCache,
  onValueChange,
  onRemove,
  onImageUpload,
  onImageRemove,
}) {
  const config = BLOCK_TYPES[block.type] || {};
  const Icon = config.icon || Type;

  const renderInput = () => {
    switch (block.type) {
      case "header1":
        return (
          <input
            type="text"
            value={value?.text || ""}
            onChange={(e) => onValueChange(e.target.value)}
            placeholder={config.placeholder}
            className="w-full bg-transparent text-2xl font-bold text-white placeholder-white/30 focus:outline-none"
          />
        );

      case "header2":
        return (
          <input
            type="text"
            value={value?.text || ""}
            onChange={(e) => onValueChange(e.target.value)}
            placeholder={config.placeholder}
            className="w-full bg-transparent text-xl font-semibold text-white placeholder-white/30 focus:outline-none"
          />
        );

      case "header3":
        return (
          <input
            type="text"
            value={value?.text || ""}
            onChange={(e) => onValueChange(e.target.value)}
            placeholder={config.placeholder}
            className="w-full bg-transparent text-lg font-medium text-white placeholder-white/30 focus:outline-none"
          />
        );

      case "text":
      case "hiddenText":
        return (
          <textarea
            value={value?.text || ""}
            onChange={(e) => onValueChange(e.target.value)}
            placeholder={config.placeholder}
            rows={3}
            className="w-full bg-transparent text-white placeholder-white/30 focus:outline-none resize-none"
          />
        );

      case "example":
        return (
          <div className="border-l-4 border-accent/50 pl-4">
            <textarea
              value={value?.text || ""}
              onChange={(e) => onValueChange(e.target.value)}
              placeholder={config.placeholder}
              rows={2}
              className="w-full bg-transparent text-white/80 italic placeholder-white/30 focus:outline-none resize-none"
            />
          </div>
        );

      case "image":
        return (
          <div>
            {/* Image Preview Grid */}
            {value?.mediaIds && value.mediaIds.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
                {value.mediaIds.map((mediaId) => {
                  const media = mediaCache[mediaId];
                  if (!media?.downloadUrl) return null;
                  return (
                    <div key={mediaId} className="relative group aspect-square">
                      <Image
                        src={media.downloadUrl}
                        alt=""
                        fill
                        className="object-cover rounded-lg"
                      />
                      <button
                        onClick={() => onImageRemove(mediaId)}
                        className="absolute top-1 right-1 p-1 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Upload Area */}
            <label className="flex items-center justify-center gap-2 py-4 border-2 border-dashed border-white/20 hover:border-accent/50 rounded-lg cursor-pointer transition-colors">
              <Upload className="w-5 h-5 text-white/50" />
              <span className="text-white/50 text-sm">
                Click to upload images
              </span>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => onImageUpload(e.target.files)}
                className="hidden"
              />
            </label>
          </div>
        );

      case "divider":
        return <hr className="border-white/20" />;

      default:
        return (
          <input
            type="text"
            value={value?.text || ""}
            onChange={(e) => onValueChange(e.target.value)}
            placeholder="Enter content..."
            className="w-full bg-transparent text-white placeholder-white/30 focus:outline-none"
          />
        );
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/5 border border-white/10 rounded-xl p-4 group"
    >
      <div className="flex items-start gap-3">
        {/* Drag Handle & Icon */}
        <div className="flex items-center gap-1 pt-1">
          <GripVertical className="w-4 h-4 text-white/20 cursor-grab" />
          <Icon className="w-4 h-4 text-white/40" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white/40 text-xs uppercase tracking-wide">
              {block.label}
              {block.required && <span className="text-accent ml-1">*</span>}
            </span>
            {!block.required && (
              <button
                onClick={onRemove}
                className="p-1 opacity-0 group-hover:opacity-100 hover:bg-white/10 rounded transition-all"
              >
                <Trash2 className="w-4 h-4 text-red-400" />
              </button>
            )}
          </div>
          {renderInput()}
        </div>
      </div>
    </motion.div>
  );
}
