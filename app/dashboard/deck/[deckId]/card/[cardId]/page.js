"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Plus,
  Trash2,
  GripVertical,
  Image as ImageIcon,
  Type,
  Eye,
  Save,
  X,
  Upload,
  Sparkles,
  Volume2,
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
  uploadAudio,
  getMedia,
  getTemplate,
  BlockTypeNames,
} from "@/utils/firestore";
import { v4 as uuidv4 } from "uuid";
import { BLOCK_TYPES, TEXT_BLOCK_TYPES } from "@/components/blocks/blockTypes";
import { ELEVENLABS_VOICES, ELEVENLABS_SAMPLE_PHRASE } from "@/lib/elevenlabs-voices";

const safeJsonParse = (value) => {
  if (!value || typeof value !== "string") return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

// Normalize block type so edit (Firestore/template numeric) and create (string) use same UI
const normalizeBlockType = (type) =>
  typeof type === "number" && BlockTypeNames[type] != null
    ? BlockTypeNames[type]
    : type;

const normalizeBlocks = (blocks) =>
  (blocks || []).map((b) => ({ ...b, type: normalizeBlockType(b.type) }));

const normalizeValue = (v) =>
  v && typeof v.type === "number" && BlockTypeNames[v.type] != null
    ? { ...v, type: BlockTypeNames[v.type] }
    : v;

// Default template for new cards (same structure for "add card" and consistency with edit)
const DEFAULT_BLOCKS = [
  { blockId: "front", type: "header1", label: "Front", required: true },
  { blockId: "back", type: "text", label: "Back", required: true },
  { blockId: "audio", type: "audio", label: "Audio", required: false },
];

export default function CardEditorPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const deckId = params.deckId;
  const cardId = params.cardId; // "new" for create, or existing cardId
  const templateIdFromUrl = searchParams.get("templateId");

  const isNewCard = cardId === "new";

  const [deck, setDeck] = useState(null);
  const [blocks, setBlocks] = useState(DEFAULT_BLOCKS);
  const [values, setValues] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showBlockPicker, setShowBlockPicker] = useState(false);
  const [mediaCache, setMediaCache] = useState({});
  const [mainBlockId, setMainBlockId] = useState(null);
  const [subBlockId, setSubBlockId] = useState(null);
  const [generatingAudioBlockId, setGeneratingAudioBlockId] = useState(null);
  const [playingSampleVoiceId, setPlayingSampleVoiceId] = useState(null);

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
          setBlocks(normalizeBlocks(cardData.blocksSnapshot) || DEFAULT_BLOCKS);

          // Convert values array to object keyed by blockId (normalize type for consistency)
          const valuesObj = {};
          (cardData.values || []).forEach((v) => {
            const norm = normalizeValue(v);
            if (norm) valuesObj[norm.blockId] = norm;
          });
          setValues(valuesObj);

          // Fetch template to get main/sub block IDs
          if (cardData.templateId) {
            const template = await getTemplate(user.uid, cardData.templateId);
            if (template) {
              setMainBlockId(template.mainBlockId);
              setSubBlockId(template.subBlockId);
            }
          }

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
        // For new cards: use template from URL if provided, else create from blank (DEFAULT_BLOCKS)
        if (templateIdFromUrl) {
          const template = await getTemplate(user.uid, templateIdFromUrl);
          if (template?.blocks?.length) {
            const templateBlocks = normalizeBlocks(template.blocks);
            setBlocks(templateBlocks);
            setMainBlockId(template.mainBlockId || templateBlocks[0]?.blockId || null);
            setSubBlockId(template.subBlockId || templateBlocks[1]?.blockId || null);
            const initialValues = {};
            templateBlocks.forEach((block) => {
              initialValues[block.blockId] = {
                blockId: block.blockId,
                type: block.type,
                text: "",
                mediaIds: block.type === "image" || block.type === "audio" ? [] : undefined,
              };
            });
            setValues(initialValues);
          } else {
            // Template not found, fall back to blank
            setMainBlockId(DEFAULT_BLOCKS[0]?.blockId || null);
            setSubBlockId(DEFAULT_BLOCKS[1]?.blockId || null);
            const initialValues = {};
            DEFAULT_BLOCKS.forEach((block) => {
              initialValues[block.blockId] = {
                blockId: block.blockId,
                type: block.type,
                text: "",
                mediaIds: block.type === "image" || block.type === "audio" ? [] : undefined,
              };
            });
            setValues(initialValues);
          }
        } else {
          // From blank: use default blocks
          setMainBlockId(DEFAULT_BLOCKS[0]?.blockId || null);
          setSubBlockId(DEFAULT_BLOCKS[1]?.blockId || null);
          const initialValues = {};
          DEFAULT_BLOCKS.forEach((block) => {
            initialValues[block.blockId] = {
              blockId: block.blockId,
              type: block.type,
              text: "",
              mediaIds: block.type === "image" || block.type === "audio" ? [] : undefined,
            };
          });
          setValues(initialValues);
        }
      }

      setLoading(false);
    };

    fetchData();
  }, [user, deckId, cardId, isNewCard, templateIdFromUrl, router]);

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

  // Update a block's configJson (for quiz/space blocks)
  const updateBlockConfig = (blockId, config) => {
    setBlocks((prev) =>
      prev.map((b) =>
        b.blockId === blockId
          ? { ...b, configJson: JSON.stringify(config) }
          : b
      )
    );
  };

  // Add a new block
  const addBlock = (type) => {
    const newBlockId = uuidv4();
    let configJson;
    if (type === "quizSingleSelect" || type === "quizMultiSelect") {
      configJson = JSON.stringify({
        question: "",
        options: ["", ""],
        correctAnswers: [],
      });
    } else if (type === "quizTextAnswer") {
      configJson = JSON.stringify({
        question: "",
        correctAnswer: "",
        hint: "",
        caseSensitive: false,
      });
    } else if (type === "space") {
      configJson = JSON.stringify({ height: 32 });
    }

    const newBlock = {
      blockId: newBlockId,
      type,
      label: BLOCK_TYPES[type]?.label || "Block",
      required: false,
      configJson,
    };

    setBlocks((prev) => [...prev, newBlock]);
    setValues((prev) => ({
      ...prev,
      [newBlockId]: {
        blockId: newBlockId,
        type,
        text: "",
        mediaIds: type === "image" || type === "audio" ? [] : undefined,
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

  // Handle audio upload
  const handleAudioUpload = async (blockId, files) => {
    if (!files || files.length === 0) return;

    for (const file of files) {
      try {
        const media = await uploadAudio(user.uid, file);

        setMediaCache((prev) => ({ ...prev, [media.mediaId]: media }));

        setValues((prev) => {
          const currentValue = prev[blockId] || { blockId, type: "audio" };
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
        console.error("Error uploading audio:", error);
      }
    }
  };

  // Remove audio from block
  const removeAudio = (blockId, mediaId) => {
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

  // Play a short sample of the selected voice. Prefer cached sample from Firebase to reduce API cost.
  const handlePlayVoiceSample = useCallback(async (voiceId) => {
    if (!voiceId) return;
    setPlayingSampleVoiceId(voiceId);
    let objectUrl = null;
    try {
      const sampleRes = await fetch(
        `/api/elevenlabs/voice-sample?voice_id=${encodeURIComponent(voiceId)}`
      );
      if (sampleRes.ok) {
        const { url } = await sampleRes.json();
        if (url) {
          const audio = new Audio(url);
          await new Promise((resolve, reject) => {
            audio.onended = () => resolve();
            audio.onerror = (e) => reject(e);
            audio.play().catch(reject);
          });
          return;
        }
      }
      // Fallback: generate sample via TTS API (e.g. when Firebase Admin not configured)
      const res = await fetch("/api/elevenlabs/text-to-speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: ELEVENLABS_SAMPLE_PHRASE,
          voice_id: voiceId,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || res.statusText || "Sample failed");
      }
      const blob = await res.blob();
      objectUrl = URL.createObjectURL(blob);
      const audio = new Audio(objectUrl);
      await new Promise((resolve, reject) => {
        audio.onended = () => resolve();
        audio.onerror = (e) => reject(e);
        audio.play().catch(reject);
      });
    } catch (error) {
      console.error("Voice sample error:", error);
      alert(error.message || "Could not play sample");
    } finally {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setPlayingSampleVoiceId(null);
    }
  }, []);

  // Persist card (optionally redirect after save)
  const persistCard = async (blocksToSave, valuesObj, options = {}) => {
    const { redirect = false } = options;
    const valuesArray = Object.values(valuesObj);
    if (isNewCard) {
      const created = await createCard(
        user.uid,
        deckId,
        blocksToSave,
        valuesArray,
        templateIdFromUrl || null
      );
      if (redirect) {
        router.push(`/dashboard/deck/${deckId}`);
      } else {
        router.replace(`/dashboard/deck/${deckId}/card/${created.cardId}`);
      }
    } else {
      await updateCard(user.uid, cardId, deckId, valuesArray, blocksToSave);
      if (redirect) router.push(`/dashboard/deck/${deckId}`);
    }
  };

  // Generate audio with ElevenLabs AI and add to block
  const handleGenerateAudio = async (blockId, text, voiceId) => {
    if (!text?.trim()) return;
    setGeneratingAudioBlockId(blockId);
    try {
      const res = await fetch("/api/elevenlabs/text-to-speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: text.trim(),
          ...(voiceId && { voice_id: voiceId }),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || res.statusText || "Generation failed");
      }
      const blob = await res.blob();
      const file = new File([blob], "generated.mp3", { type: "audio/mpeg" });
      const media = await uploadAudio(user.uid, file);
      setMediaCache((prev) => ({ ...prev, [media.mediaId]: media }));
      const newValues = (prev) => {
        const currentValue = prev[blockId] || { blockId, type: "audio" };
        const currentMediaIds = currentValue.mediaIds || [];
        return {
          ...prev,
          [blockId]: {
            ...currentValue,
            mediaIds: [...currentMediaIds, media.mediaId],
          },
        };
      };
      setValues(newValues);
      const valuesToSave = newValues(values);
      setSaving(true);
      try {
        await persistCard(blocks, valuesToSave, { redirect: false });
      } catch (saveErr) {
        console.error("Auto-save after generate audio:", saveErr);
      } finally {
        setSaving(false);
      }
    } catch (error) {
      console.error("Generate audio error:", error);
      alert(error.message || "Failed to generate audio");
    } finally {
      setGeneratingAudioBlockId(null);
    }
  };

  // Save card
  const handleSave = async () => {
    setSaving(true);
    try {
      await persistCard(blocks, values, { redirect: true });
    } catch (error) {
      console.error("Error saving card:", error);
    } finally {
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
        {blocks.map((block, index) => {
          const blockTypeNum =
            typeof block.type === "number"
              ? block.type
              : /^\d+$/.test(block.type)
                ? Number(block.type)
                : null;
          const isAudio =
            blockTypeNum !== null
              ? BlockTypeNames[blockTypeNum] === "audio"
              : block.type === "audio";
          const audioConfig = isAudio ? safeJsonParse(block.configJson) || {} : {};
          const defaultVoiceId = audioConfig.defaultVoiceId || undefined;
          const defaultSourceBlockId =
            audioConfig.defaultSourceBlockId || (isAudio ? mainBlockId ?? undefined : undefined);

          return (
            <BlockEditor
              key={block.blockId}
              block={block}
              value={values[block.blockId]}
              allBlocks={blocks}
              allValues={values}
              mediaCache={mediaCache}
              isMainBlock={mainBlockId === block.blockId}
              isSubBlock={subBlockId === block.blockId}
              onValueChange={(text) => updateBlockValue(block.blockId, text)}
              onRemove={() => removeBlock(block.blockId)}
              onImageUpload={(files) => handleImageUpload(block.blockId, files)}
              onImageRemove={(mediaId) => removeImage(block.blockId, mediaId)}
              onAudioUpload={(files) => handleAudioUpload(block.blockId, files)}
              onAudioRemove={(mediaId) => removeAudio(block.blockId, mediaId)}
              onGenerateAudio={(text, voiceId) => handleGenerateAudio(block.blockId, text, voiceId)}
              onPlayVoiceSample={handlePlayVoiceSample}
              playingSampleVoiceId={playingSampleVoiceId}
              voiceOptions={ELEVENLABS_VOICES}
              defaultVoiceId={defaultVoiceId}
              defaultSourceBlockId={defaultSourceBlockId}
              generatingAudio={generatingAudioBlockId === block.blockId}
              onConfigChange={(config) => updateBlockConfig(block.blockId, config)}
            />
          );
        })}
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
  allBlocks,
  allValues,
  mediaCache,
  isMainBlock,
  isSubBlock,
  onValueChange,
  onRemove,
  onImageUpload,
  onImageRemove,
  onAudioUpload,
  onAudioRemove,
  onGenerateAudio,
  onPlayVoiceSample,
  generatingAudio,
  playingSampleVoiceId,
  onConfigChange,
  voiceOptions = [],
  defaultVoiceId,
  defaultSourceBlockId,
}) {
  // Normalize so numeric (e.g. 7) or string "7" from templates matches "audio", etc.
  const blockType =
    typeof block.type === "number" && BlockTypeNames[block.type] != null
      ? BlockTypeNames[block.type]
      : typeof block.type === "string" && /^\d+$/.test(block.type)
        ? (BlockTypeNames[Number(block.type)] ?? block.type)
        : block.type;
  const config = BLOCK_TYPES[blockType] || {};
  const Icon = config.icon || Type;
  const [generateAudioText, setGenerateAudioText] = useState(() => {
    if (!defaultSourceBlockId || !allValues) return "";
    const t = allValues[defaultSourceBlockId]?.text;
    return typeof t === "string" && t.trim() ? t.trim() : "";
  });
  const [selectedVoiceId, setSelectedVoiceId] = useState(
    () =>
      (defaultVoiceId && voiceOptions.some((v) => v.id === defaultVoiceId) ? defaultVoiceId : null) ||
      voiceOptions[0]?.id ||
      ""
  );

  const renderInput = () => {
    switch (blockType) {
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

      case "audio": {
        const audioMediaIds = value?.mediaIds || [];
        return (
          <div>
            {audioMediaIds.length > 0 && (
              <div className="space-y-2 mb-3">
                {audioMediaIds.map((mediaId) => {
                  const media = mediaCache[mediaId];
                  if (!media?.downloadUrl) return null;
                  return (
                    <div key={mediaId} className="flex items-center gap-2">
                      <audio
                        controls
                        className="flex-1 rounded-lg bg-white/5 h-10"
                        style={{ minWidth: 0 }}
                      >
                        <source src={media.downloadUrl} />
                      </audio>
                      <button
                        onClick={() => onAudioRemove(mediaId)}
                        className="p-1 bg-red-500 rounded-full flex-shrink-0"
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="space-y-3">
              <label className="flex items-center justify-center gap-2 py-4 border-2 border-dashed border-white/20 hover:border-accent/50 rounded-lg cursor-pointer transition-colors">
                <Upload className="w-5 h-5 text-white/50" />
                <span className="text-white/50 text-sm">
                  Click to upload audio
                </span>
                <input
                  type="file"
                  accept="audio/*"
                  multiple
                  onChange={(e) => onAudioUpload(e.target.files)}
                  className="hidden"
                />
              </label>
                  {onGenerateAudio && (
                <div className="rounded-lg border border-white/10 bg-white/5 p-3 space-y-2">
                  <span className="text-white/60 text-xs font-medium uppercase tracking-wide flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    Generate with AI (ElevenLabs)
                  </span>
                  {/* Voice selection + sample playback */}
                  {voiceOptions.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-white/50 text-xs">Voice:</span>
                      <select
                        value={selectedVoiceId}
                        onChange={(e) => setSelectedVoiceId(e.target.value)}
                        className="bg-black/30 border border-white/10 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-accent/50"
                      >
                        {voiceOptions.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.label}
                          </option>
                        ))}
                      </select>
                      {onPlayVoiceSample && (
                        <button
                          type="button"
                          onClick={() => onPlayVoiceSample(selectedVoiceId)}
                          disabled={!selectedVoiceId || playingSampleVoiceId !== null}
                          title="Play voice sample"
                          className="flex items-center gap-1 px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-white/80 text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {playingSampleVoiceId === selectedVoiceId ? (
                            <>
                              <span className="animate-spin rounded-full h-3 w-3 border-2 border-white/50 border-t-transparent" />
                              Playing...
                            </>
                          ) : (
                            <>
                              <Volume2 className="w-3.5 h-3.5" />
                              Play sample
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  )}
                  {/* Copy text from other blocks */}
                  {allBlocks && allValues && (() => {
                    const norm = (t) =>
                      typeof t === "number" && BlockTypeNames[t] != null
                        ? BlockTypeNames[t]
                        : t;
                    const otherBlocks = (allBlocks || []).filter(
                      (b) =>
                        b.blockId !== block.blockId && TEXT_BLOCK_TYPES.has(norm(b.type))
                    );
                    if (otherBlocks.length === 0) return null;
                    return (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-white/50 text-xs">Copy from:</span>
                        <select
                          value=""
                          onChange={(e) => {
                            const bid = e.target.value;
                            if (!bid) return;
                            e.target.value = "";
                            const t = (allValues[bid]?.text || "").trim();
                            if (t) setGenerateAudioText((prev) => (prev ? prev + "\n\n" + t : t));
                          }}
                          className="bg-black/30 border border-white/10 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-accent/50"
                        >
                          <option value="">— Choose block —</option>
                          {otherBlocks.map((b) => (
                            <option key={b.blockId} value={b.blockId}>
                              {b.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  })()}
                  <textarea
                    value={generateAudioText}
                    onChange={(e) => setGenerateAudioText(e.target.value)}
                    placeholder="Enter text to convert to speech, or copy from a block above..."
                    rows={3}
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-accent/50 resize-none"
                  />
                  <button
                    type="button"
                    onClick={() => onGenerateAudio(generateAudioText, selectedVoiceId)}
                    disabled={generatingAudio || !generateAudioText.trim()}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {generatingAudio ? (
                      <>
                        <span className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        Generate audio
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      }

      case "divider":
        return <hr className="border-white/20" />;

      case "space": {
        const spaceConfig = safeJsonParse(block.configJson) || { height: 32 };
        return (
          <div className="flex items-center gap-3">
            <span className="text-white/40 text-sm">Height:</span>
            <input
              type="number"
              min={8}
              max={200}
              value={spaceConfig.height || 32}
              onChange={(e) =>
                onConfigChange({ ...spaceConfig, height: Number(e.target.value) })
              }
              className="w-20 bg-white/10 text-white text-sm rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent/50"
            />
            <span className="text-white/40 text-sm">px</span>
          </div>
        );
      }

      case "quizSingleSelect": {
        const qConfig = safeJsonParse(block.configJson) || {
          question: "",
          options: ["", ""],
          correctAnswers: [],
        };
        const options = qConfig.options || ["", ""];
        const correct = qConfig.correctAnswers || [];
        return (
          <div className="space-y-3">
            <input
              type="text"
              value={qConfig.question || ""}
              onChange={(e) =>
                onConfigChange({ ...qConfig, question: e.target.value })
              }
              placeholder="Question..."
              className="w-full bg-transparent text-white placeholder-white/30 focus:outline-none border-b border-white/20 pb-1"
            />
            <div className="space-y-2">
              <span className="text-white/40 text-xs uppercase tracking-wide">
                Options — click circle to mark correct
              </span>
              {options.map((option, i) => (
                <div key={i} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      onConfigChange({
                        ...qConfig,
                        options,
                        correctAnswers: [option],
                      })
                    }
                    className={`w-4 h-4 rounded-full border-2 flex-shrink-0 transition-colors ${
                      correct.includes(option) && option
                        ? "border-accent bg-accent"
                        : "border-white/30"
                    }`}
                  />
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => {
                      const newOptions = [...options];
                      const wasCorrect = correct.includes(option);
                      newOptions[i] = e.target.value;
                      onConfigChange({
                        ...qConfig,
                        options: newOptions,
                        correctAnswers: wasCorrect ? [e.target.value] : correct,
                      });
                    }}
                    placeholder={`Option ${i + 1}`}
                    className="flex-1 bg-transparent text-white placeholder-white/30 focus:outline-none"
                  />
                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => {
                        const newOptions = options.filter((_, idx) => idx !== i);
                        onConfigChange({
                          ...qConfig,
                          options: newOptions,
                          correctAnswers: correct.filter((a) => a !== option),
                        });
                      }}
                      className="text-white/30 hover:text-red-400"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  onConfigChange({ ...qConfig, options: [...options, ""] })
                }
                className="flex items-center gap-1 text-xs text-accent"
              >
                <Plus className="w-3 h-3" /> Add option
              </button>
            </div>
            <input
              type="text"
              value={qConfig.hint || ""}
              onChange={(e) =>
                onConfigChange({ ...qConfig, hint: e.target.value })
              }
              placeholder="Hint (optional)..."
              className="w-full bg-transparent text-white/50 text-sm placeholder-white/20 focus:outline-none"
            />
          </div>
        );
      }

      case "quizMultiSelect": {
        const qConfig = safeJsonParse(block.configJson) || {
          question: "",
          options: ["", ""],
          correctAnswers: [],
        };
        const options = qConfig.options || ["", ""];
        const correct = new Set(qConfig.correctAnswers || []);
        return (
          <div className="space-y-3">
            <input
              type="text"
              value={qConfig.question || ""}
              onChange={(e) =>
                onConfigChange({ ...qConfig, question: e.target.value })
              }
              placeholder="Question..."
              className="w-full bg-transparent text-white placeholder-white/30 focus:outline-none border-b border-white/20 pb-1"
            />
            <div className="space-y-2">
              <span className="text-white/40 text-xs uppercase tracking-wide">
                Options — check boxes to mark correct
              </span>
              {options.map((option, i) => (
                <div key={i} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const next = new Set(correct);
                      if (next.has(option)) {
                        next.delete(option);
                      } else {
                        next.add(option);
                      }
                      onConfigChange({
                        ...qConfig,
                        options,
                        correctAnswers: Array.from(next),
                      });
                    }}
                    className={`w-4 h-4 rounded border-2 flex-shrink-0 transition-colors ${
                      correct.has(option) && option
                        ? "border-accent bg-accent"
                        : "border-white/30"
                    }`}
                  />
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => {
                      const newOptions = [...options];
                      const wasCorrect = correct.has(option);
                      newOptions[i] = e.target.value;
                      const newCorrect = new Set(correct);
                      if (wasCorrect) {
                        newCorrect.delete(option);
                        newCorrect.add(e.target.value);
                      }
                      onConfigChange({
                        ...qConfig,
                        options: newOptions,
                        correctAnswers: Array.from(newCorrect),
                      });
                    }}
                    placeholder={`Option ${i + 1}`}
                    className="flex-1 bg-transparent text-white placeholder-white/30 focus:outline-none"
                  />
                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => {
                        const newOptions = options.filter((_, idx) => idx !== i);
                        const newCorrect = new Set(correct);
                        newCorrect.delete(option);
                        onConfigChange({
                          ...qConfig,
                          options: newOptions,
                          correctAnswers: Array.from(newCorrect),
                        });
                      }}
                      className="text-white/30 hover:text-red-400"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  onConfigChange({ ...qConfig, options: [...options, ""] })
                }
                className="flex items-center gap-1 text-xs text-accent"
              >
                <Plus className="w-3 h-3" /> Add option
              </button>
            </div>
            <input
              type="text"
              value={qConfig.hint || ""}
              onChange={(e) =>
                onConfigChange({ ...qConfig, hint: e.target.value })
              }
              placeholder="Hint (optional)..."
              className="w-full bg-transparent text-white/50 text-sm placeholder-white/20 focus:outline-none"
            />
          </div>
        );
      }

      case "quizTextAnswer": {
        const qConfig = safeJsonParse(block.configJson) || {
          question: "",
          correctAnswer: "",
          hint: "",
          caseSensitive: false,
        };
        return (
          <div className="space-y-3">
            <input
              type="text"
              value={qConfig.question || ""}
              onChange={(e) =>
                onConfigChange({ ...qConfig, question: e.target.value })
              }
              placeholder="Question..."
              className="w-full bg-transparent text-white placeholder-white/30 focus:outline-none border-b border-white/20 pb-1"
            />
            <input
              type="text"
              value={qConfig.correctAnswer || ""}
              onChange={(e) =>
                onConfigChange({ ...qConfig, correctAnswer: e.target.value })
              }
              placeholder="Correct answer..."
              className="w-full bg-transparent text-white/80 placeholder-white/30 focus:outline-none"
            />
            <div className="flex items-center gap-4">
              <input
                type="text"
                value={qConfig.hint || ""}
                onChange={(e) =>
                  onConfigChange({ ...qConfig, hint: e.target.value })
                }
                placeholder="Hint (optional)..."
                className="flex-1 bg-transparent text-white/50 text-sm placeholder-white/20 focus:outline-none"
              />
              <label className="flex items-center gap-1.5 text-white/40 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={qConfig.caseSensitive || false}
                  onChange={(e) =>
                    onConfigChange({
                      ...qConfig,
                      caseSensitive: e.target.checked,
                    })
                  }
                  className="accent-accent"
                />
                Case sensitive
              </label>
            </div>
          </div>
        );
      }

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
            <div className="flex items-center gap-2">
              <span className="text-white/40 text-xs uppercase tracking-wide">
                {block.label}
                {block.required && <span className="text-accent ml-1">*</span>}
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
