"use client";

import {
  Suspense,
  useEffect,
  useState,
  useCallback,
  useRef,
  useMemo,
  Fragment,
} from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Check,
  Plus,
  Trash2,
  GripVertical,
  Image as ImageIcon,
  Type,
  Eye,
  EyeOff,
  Save,
  X,
  Upload,
  Sparkles,
  Pencil,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import { useRevenueCat } from "@/contexts/RevenueCatContext";
import {
  getDeck,
  getCard,
  createCard,
  updateCard,
  uploadImage,
  uploadAudio,
  getMedia,
  deleteMedia,
  getTemplate,
  BlockTypeNames,
} from "@/utils/firestore";
import { v4 as uuidv4 } from "uuid";
import { BLOCK_TYPES, TEXT_BLOCK_TYPES } from "@/components/blocks/blockTypes";
import ElevenlabsVoicePicker from "@/components/ElevenlabsVoicePicker";
import { parseAudioBlockConfig } from "@/lib/audio-block-config";
import { getBlockValidationErrors as getBlockValidationErrorsFromValidators } from "@/lib/block-validators";
import { checkStorageBeforeUpload } from "@/lib/storage-check-client";
import {
  getCropAspectFromConfig,
  getCropStateFromConfig,
  CROP_ASPECT_OPTIONS,
  DEFAULT_CROP_ASPECT,
} from "@/lib/image-block-config";
import CardPreviewContent from "@/components/CardPreviewContent";
import ImageCropModal from "@/components/ImageCropModal";

const safeJsonParse = (value) => {
  if (!value || typeof value !== "string") return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

// Get block config object; template/card may store configJson or config_json (Firestore), as string or object
const getBlockConfig = (block) => {
  const raw = block?.configJson ?? block?.config_json;
  if (raw == null) return null;
  return typeof raw === "object" ? raw : safeJsonParse(raw);
};

// Normalize block type: Firestore/template can return number (0-12) or string ("8", "11") — convert to name for UI and validators
const normalizeBlockType = (type) => {
  if (type == null) return type;
  const num =
    typeof type === "number"
      ? type
      : /^\d+$/.test(String(type))
        ? Number(type)
        : NaN;
  if (!Number.isNaN(num) && BlockTypeNames[num] != null)
    return BlockTypeNames[num];
  return type;
};

const normalizeBlocks = (blocks) =>
  (blocks || []).map((b) => ({ ...b, type: normalizeBlockType(b.type) }));

/** Template-driven face; missing side is treated as front. */
const effectiveCardBlockSide = (block) =>
  block?.side === "back" ? "back" : "front";

/** Insert index for a new block on the given face (flat array order). */
function insertionIndexForCardSide(blocks, side) {
  const list = blocks || [];
  if (side === "front") {
    let lastFront = -1;
    for (let i = 0; i < list.length; i++) {
      if (effectiveCardBlockSide(list[i]) === "front") lastFront = i;
    }
    return lastFront + 1;
  }
  return list.length;
}

const isImageBlock = (b) => {
  const t = b?.type;
  return t === "image" || t === 6 || (typeof t === "string" && t === "6");
};

function ensureImageBlockConfig(blocks) {
  if (!blocks?.length) return blocks;
  return blocks.map((b) => {
    if (!isImageBlock(b)) return b;
    if (b.configJson != null || b.config_json != null) return b;
    return {
      ...b,
      configJson: JSON.stringify({ cropAspect: DEFAULT_CROP_ASPECT }),
    };
  });
}

const normalizeValue = (v) =>
  v && typeof v.type === "number" && BlockTypeNames[v.type] != null
    ? { ...v, type: BlockTypeNames[v.type] }
    : v;

// Default template for new cards (same structure for "add card" and consistency with edit)
const DEFAULT_BLOCKS = [
  { blockId: "front", type: "header1", label: "Front", required: true, side: "front" },
  { blockId: "back", type: "text", label: "Back", required: true, side: "back" },
  { blockId: "audio", type: "audio", label: "Audio", required: false, side: "front" },
];

function getDefaultValuesForBlocks(blocks) {
  const v = {};
  (blocks || DEFAULT_BLOCKS).forEach((block) => {
    const type =
      typeof block.type === "number" && BlockTypeNames[block.type] != null
        ? BlockTypeNames[block.type]
        : block.type;
    v[block.blockId] = {
      blockId: block.blockId,
      type: block.type,
      text: "",
      mediaIds: type === "image" || type === "audio" ? [] : undefined,
    };
  });
  return v;
}

const isProduction = process.env.NODE_ENV === "production";

function CardEditorPageInner() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { isConfigured: rcConfigured, isPro } = useRevenueCat();
  const audioProEntitled = !isProduction || !rcConfigured || isPro;
  const deckId = params.deckId;
  const cardId = params.cardId; // "new" for create, or existing cardId
  const templateIdFromUrl = searchParams.get("templateId");

  const isNewCard = cardId === "new";

  const [deck, setDeck] = useState(null);
  const [blocks, setBlocks] = useState(DEFAULT_BLOCKS);
  const [values, setValues] = useState(() =>
    getDefaultValuesForBlocks(DEFAULT_BLOCKS),
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  /** null = closed; which face new blocks are added to */
  const [blockPickerSide, setBlockPickerSide] = useState(null);
  /** True after “Add back of card” until back blocks exist or user removes back */
  const [showBackSectionIntent, setShowBackSectionIntent] = useState(false);
  const prevBackBlockCountRef = useRef(0);
  const [mediaCache, setMediaCache] = useState({});
  const [mainBlockId, setMainBlockId] = useState(null);
  const [subBlockId, setSubBlockId] = useState(null);
  const [generatingAudioBlockId, setGeneratingAudioBlockId] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [saveSnackbarOpen, setSaveSnackbarOpen] = useState(false);
  const [imageCropPending, setImageCropPending] = useState(null);
  const [imageUploadProgress, setImageUploadProgress] = useState(null);
  const [imageEditLoading, setImageEditLoading] = useState(null);

  const valuesRef = useRef(values);
  const blocksRef = useRef(blocks);
  const saveDebounceRef = useRef(null);
  useEffect(() => {
    valuesRef.current = values;
    blocksRef.current = blocks;
  }, [values, blocks]);

  const DEBOUNCE_MS = 800;
  const scheduleTextAutoSave = useCallback(() => {
    if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current);
    saveDebounceRef.current = setTimeout(async () => {
      saveDebounceRef.current = null;
      const v = valuesRef.current;
      const b = blocksRef.current;
      const imageBlocksInRef = (b || []).filter((x) => isImageBlock(x));
      if (imageBlocksInRef.length) {
        console.log(
          "[RATIO] debounce saving — blocksRef image blocks",
          imageBlocksInRef.map((x) => ({
            blockId: x.blockId,
            configJson: x.configJson,
          })),
        );
      }
      setSaving(true);
      try {
        await persistCard(b, v, { redirect: false });
      } catch (err) {
        console.error("Auto-save after text edit:", err);
      } finally {
        setSaving(false);
      }
    }, DEBOUNCE_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current);
    };
  }, []);

  // Collapse empty “back section” intent when the last back block is removed
  useEffect(() => {
    const n = blocks.filter((b) => effectiveCardBlockSide(b) === "back").length;
    if (prevBackBlockCountRef.current > 0 && n === 0) {
      setShowBackSectionIntent(false);
    }
    prevBackBlockCountRef.current = n;
  }, [blocks]);

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
          const normalized =
            normalizeBlocks(cardData.blocksSnapshot) || DEFAULT_BLOCKS;
          const withImageConfig = ensureImageBlockConfig(normalized);
          setBlocks(withImageConfig);

          // Convert values array to object keyed by blockId (normalize type for consistency)
          const valuesObj = {};
          (cardData.values || []).forEach((v) => {
            const norm = normalizeValue(v);
            if (norm) valuesObj[norm.blockId] = norm;
          });
          setValues(valuesObj);

          // Prefer card's saved main/sub, then template's
          if (cardData.templateId) {
            const template = await getTemplate(user.uid, cardData.templateId);
            setMainBlockId(
              cardData.mainBlockId ?? template?.mainBlockId ?? null,
            );
            setSubBlockId(cardData.subBlockId ?? template?.subBlockId ?? null);
          } else {
            setMainBlockId(cardData.mainBlockId ?? null);
            setSubBlockId(cardData.subBlockId ?? null);
          }

          // Fetch media for image/audio blocks (display + original so Edit image can load original)
          for (const value of cardData.values || []) {
            const mediaIds = value.mediaIds || [];
            const originalMediaIds = value.originalMediaIds || [];
            const idsToFetch = [
              ...new Set([...mediaIds, ...originalMediaIds]),
            ].filter(Boolean);
            for (const mediaId of idsToFetch) {
              const media = await getMedia(user.uid, mediaId);
              if (media) {
                setMediaCache((prev) => ({ ...prev, [mediaId]: media }));
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
            const withImageConfig = ensureImageBlockConfig(templateBlocks);
            setBlocks(withImageConfig);
            setMainBlockId(
              template.mainBlockId || templateBlocks[0]?.blockId || null,
            );
            setSubBlockId(
              template.subBlockId || templateBlocks[1]?.blockId || null,
            );
            const initialValues = {};
            templateBlocks.forEach((block) => {
              initialValues[block.blockId] = {
                blockId: block.blockId,
                type: block.type,
                text: "",
                mediaIds:
                  block.type === "image" || block.type === "audio"
                    ? []
                    : undefined,
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
                mediaIds:
                  block.type === "image" || block.type === "audio"
                    ? []
                    : undefined,
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
              mediaIds:
                block.type === "image" || block.type === "audio"
                  ? []
                  : undefined,
            };
          });
          setValues(initialValues);
        }
      }

      setLoading(false);
    };

    fetchData();
  }, [user, deckId, cardId, isNewCard, templateIdFromUrl, router]);

  // Update a block's value (debounced auto-save is scheduled on each change)
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
    scheduleTextAutoSave();
  };

  // Update a block's configJson (quiz, space, image crop aspect, etc.); debounced auto-save scheduled
  const updateBlockConfig = (blockId, config) => {
    const cropAspect = config?.cropAspect ?? config?.crop_aspect;
    if (cropAspect != null) {
      const str = JSON.stringify(config);
      console.log("[RATIO] updateBlockConfig", {
        blockId,
        cropAspect,
        configJsonLength: str.length,
        configJson: str,
      });
    }
    setBlocks((prev) => {
      const next = prev.map((b) =>
        b.blockId === blockId
          ? { ...b, configJson: JSON.stringify(config) }
          : b,
      );
      // Save ratio to card immediately so it's not lost (debounce may use stale ref)
      if (cropAspect != null && !isNewCard) {
        setSaving(true);
        persistCard(next, valuesRef.current, { redirect: false })
          .catch((err) => console.error("[RATIO] immediate save failed", err))
          .finally(() => setSaving(false));
      }
      return next;
    });
    scheduleTextAutoSave();
  };

  // Add a new block (optionally on back face — matches template editor)
  const addBlock = (type, side = "front") => {
    const newBlockId = uuidv4();
    let configJson;
    if (type === "quizSingleSelect") {
      configJson = JSON.stringify({
        question: "",
        options: ["", ""],
        correctAnswerIndex: -1,
        correctAnswers: [],
      });
    } else if (type === "quizMultiSelect") {
      configJson = JSON.stringify({
        question: "",
        options: ["", ""],
        correctAnswerIndices: [],
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
    } else if (type === "image") {
      configJson = JSON.stringify({ cropAspect: 1 });
    }

    const face = side === "back" ? "back" : "front";
    const newBlock = {
      blockId: newBlockId,
      type,
      label: BLOCK_TYPES[type]?.label || "Block",
      required: false,
      configJson,
      side: face,
    };

    setBlocks((prev) => {
      const insertAt = insertionIndexForCardSide(prev, face);
      const next = [...prev];
      next.splice(insertAt, 0, newBlock);
      return next;
    });
    setValues((prev) => ({
      ...prev,
      [newBlockId]: {
        blockId: newBlockId,
        type,
        text: "",
        mediaIds: type === "image" || type === "audio" ? [] : undefined,
      },
    }));
    setBlockPickerSide(null);
  };

  const addBackOfCard = () => {
    setShowBackSectionIntent(true);
  };

  const removeBackSection = () => {
    const backIds = blocks
      .filter((b) => effectiveCardBlockSide(b) === "back")
      .map((b) => b.blockId);
    if (backIds.length > 0) {
      if (
        !confirm(
          "Remove the back of the card? All blocks on the back will be deleted.",
        )
      ) {
        return;
      }
      setBlocks((prev) =>
        prev.filter((b) => effectiveCardBlockSide(b) === "front"),
      );
      setValues((prev) => {
        const next = { ...prev };
        backIds.forEach((id) => {
          delete next[id];
        });
        return next;
      });
    }
    setShowBackSectionIntent(false);
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

  const dragScrollIntervalRef = useRef(null);
  const dragScrollHandlerRef = useRef(null);
  useEffect(() => {
    const EDGE_ZONE = 100;
    const SCROLL_SPEED = 10;
    dragScrollHandlerRef.current = (e) => {
      if (typeof window === "undefined") return;
      const y = e.clientY;
      const topZone = EDGE_ZONE;
      const bottomZone = window.innerHeight - EDGE_ZONE;
      if (y < topZone) {
        if (dragScrollIntervalRef.current)
          clearInterval(dragScrollIntervalRef.current);
        dragScrollIntervalRef.current = setInterval(
          () => window.scrollBy({ top: -SCROLL_SPEED, behavior: "auto" }),
          16,
        );
      } else if (y > bottomZone) {
        if (dragScrollIntervalRef.current)
          clearInterval(dragScrollIntervalRef.current);
        dragScrollIntervalRef.current = setInterval(
          () => window.scrollBy({ top: SCROLL_SPEED, behavior: "auto" }),
          16,
        );
      } else {
        if (dragScrollIntervalRef.current) {
          clearInterval(dragScrollIntervalRef.current);
          dragScrollIntervalRef.current = null;
        }
      }
    };
    return () => {
      if (dragScrollIntervalRef.current)
        clearInterval(dragScrollIntervalRef.current);
    };
  }, []);

  const clearDragScroll = useCallback(() => {
    if (dragScrollIntervalRef.current) {
      clearInterval(dragScrollIntervalRef.current);
      dragScrollIntervalRef.current = null;
    }
    if (dragScrollHandlerRef.current && typeof document !== "undefined") {
      document.removeEventListener("dragover", dragScrollHandlerRef.current);
    }
  }, []);

  const setupDragScroll = useCallback(() => {
    if (dragScrollHandlerRef.current && typeof document !== "undefined") {
      document.addEventListener("dragover", dragScrollHandlerRef.current, {
        passive: true,
      });
    }
  }, []);

  // Handle image upload (with progress). Used after crop or for non-cropped files. Auto-saves when done.
  const handleImageUpload = async (blockId, files) => {
    const fileList =
      files?.length != null ? Array.from(files) : files ? [files] : [];
    if (fileList.length === 0) return;

    let nextValues = { ...values };
    for (const file of fileList) {
      try {
        const storageCheck = await checkStorageBeforeUpload(user, file.size);
        if (!storageCheck.allowed) {
          window.alert(storageCheck.message || "Cloud backup limit reached.");
          return;
        }
        setImageUploadProgress({ blockId, progress: 0 });
        const media = await uploadImage(user.uid, file, {
          onProgress: (percent) =>
            setImageUploadProgress((p) =>
              p?.blockId === blockId ? { ...p, progress: percent } : p,
            ),
        });

        setMediaCache((prev) => ({ ...prev, [media.mediaId]: media }));
        const currentValue = nextValues[blockId] || { blockId, type: "image" };
        const currentMediaIds = currentValue.mediaIds || [];
        nextValues = {
          ...nextValues,
          [blockId]: {
            ...currentValue,
            mediaIds: [...currentMediaIds, media.mediaId],
          },
        };
        setValues(nextValues);
      } catch (error) {
        console.error("Error uploading image:", error);
      } finally {
        setImageUploadProgress((p) => (p?.blockId === blockId ? null : p));
      }
    }

    setSaving(true);
    try {
      await persistCard(blocks, nextValues, { redirect: false });
    } catch (err) {
      console.error("Auto-save after image upload:", err);
    } finally {
      setSaving(false);
    }
  };

  // User selected image file(s): open crop modal with the original file (never a cropped image). Crop aspect from block config.
  // Only allow ratio change when adding the first image; second+ use block aspect.
  const handleImageFileSelect = (blockId, files) => {
    if (!files?.length) return;
    const arr = Array.from(files);
    const first = arr[0]; // original file; crop modal always uses original
    const imageSrc = URL.createObjectURL(first);
    const block = blocks.find((b) => b.blockId === blockId);
    const config = getBlockConfig(block);
    const defaultAspect = getCropAspectFromConfig(config);
    const cropState = getCropStateFromConfig(config);
    const existingCount = values[blockId]?.mediaIds?.length ?? 0;
    const allowRatioChange = existingCount === 0;
    setImageCropPending({
      blockId,
      files: arr,
      imageSrc,
      defaultAspect,
      initialCrop: cropState?.crop,
      initialZoom: cropState?.zoom,
      allowRatioChange,
    });
  };

  // Edit existing image: load original (uncropped) when available, otherwise the display image so re-crop always works.
  const handleEditImage = useCallback(
    async (blockId, mediaId) => {
      const currentValue = values[blockId];
      const mediaIds = currentValue?.mediaIds || [];
      const originalMediaIds = currentValue?.originalMediaIds || [];
      const index = mediaIds.indexOf(mediaId);
      const originalMediaId = index >= 0 ? originalMediaIds[index] : null;
      const mediaIdToLoad =
        originalMediaId && originalMediaId !== mediaId
          ? originalMediaId
          : mediaId;
      let media = mediaCache[mediaIdToLoad];
      if (!media?.downloadUrl) {
        try {
          media = await getMedia(user.uid, mediaIdToLoad);
          if (media)
            setMediaCache((prev) => ({ ...prev, [mediaIdToLoad]: media }));
        } catch (e) {
          console.warn(
            "[TRACE] handleEditImage: fetch media failed",
            mediaIdToLoad,
            e,
          );
        }
      }
      if (!media?.downloadUrl) {
        console.warn("[TRACE] handleEditImage: no media in cache", {
          mediaIdToLoad,
          cacheKeys: Object.keys(mediaCache),
        });
        window.alert(
          "Could not load image for editing. Try refreshing the page.",
        );
        return;
      }
      setImageEditLoading(mediaId);
      try {
        const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(media.downloadUrl)}`;
        const res = await fetch(proxyUrl);
        if (!res.ok) throw new Error(res.statusText || "Failed to load image");
        const blob = await res.blob();
        const imageSrc = URL.createObjectURL(blob);
        const block = blocks.find((b) => b.blockId === blockId);
        const config = getBlockConfig(block);
        const defaultAspect = getCropAspectFromConfig(config);
        const cropState = getCropStateFromConfig(config);
        const allowRatioChange = mediaIds.length <= 1;
        console.log("[RATIO] handleEditImage opening crop modal", {
          blockId,
          mediaId,
          defaultAspect,
          allowRatioChange,
        });
        setImageCropPending({
          blockId,
          imageSrc,
          defaultAspect,
          mediaIdToReplace: mediaId,
          initialCrop: cropState?.crop,
          initialZoom: cropState?.zoom,
          allowRatioChange,
        });
      } catch (err) {
        console.error("[TRACE] handleEditImage failed", err);
        window.alert("Could not load image for editing. Please try again.");
      } finally {
        setImageEditLoading(null);
      }
    },
    [mediaCache, blocks, values, user],
  );

  const handleCropComplete = async (blob, aspectUsedInModal, cropState) => {
    if (!imageCropPending) return;
    const { blockId, files, imageSrc, mediaIdToReplace } = imageCropPending;
    console.log("[RATIO] handleCropComplete", {
      blockId,
      mediaIdToReplace,
      aspectUsedInModal,
    });
    URL.revokeObjectURL(imageSrc);

    const mergeCropConfig = (prev) => {
      const base =
        typeof prev === "string" ? safeJsonParse(prev) || {} : prev || {};
      const next = { ...base };
      if (aspectUsedInModal != null) next.cropAspect = aspectUsedInModal;
      if (
        cropState?.crop &&
        typeof cropState.crop.x === "number" &&
        typeof cropState.crop.y === "number"
      ) {
        next.cropX = cropState.crop.x;
        next.cropY = cropState.crop.y;
      }
      if (
        typeof cropState?.zoom === "number" &&
        cropState.zoom >= 1 &&
        cropState.zoom <= 3
      )
        next.cropZoom = cropState.zoom;
      return JSON.stringify(next);
    };

    if (mediaIdToReplace != null) {
      setImageCropPending(null);
      const oldMedia = mediaCache[mediaIdToReplace];
      const oldStoragePath = oldMedia?.storagePath ?? null;
      const croppedFile = new File([blob], "image.png", {
        type: blob.type || "image/png",
      });
      const replaceCheck = await checkStorageBeforeUpload(
        user,
        croppedFile.size,
      );
      if (!replaceCheck.allowed) {
        window.alert(replaceCheck.message || "Cloud backup limit reached.");
        return;
      }
      try {
        setImageUploadProgress({ blockId, progress: 0 });
        const media = await uploadImage(user.uid, croppedFile, {
          onProgress: (percent) =>
            setImageUploadProgress((p) =>
              p?.blockId === blockId ? { ...p, progress: percent } : p,
            ),
        });
        setMediaCache((prev) => ({ ...prev, [media.mediaId]: media }));
        const currentValue = values[blockId];
        const mediaIds = (currentValue?.mediaIds || []).map((id) =>
          id === mediaIdToReplace ? media.mediaId : id,
        );
        const originalMediaIds = currentValue?.originalMediaIds || [];

        const nextBlocks =
          aspectUsedInModal != null || cropState
            ? blocks.map((b) =>
                b.blockId === blockId
                  ? { ...b, configJson: mergeCropConfig(b.configJson) }
                  : b,
              )
            : blocks;
        const nextValues = {
          ...values,
          [blockId]: { ...currentValue, mediaIds, originalMediaIds },
        };
        if (aspectUsedInModal != null || cropState) {
          console.log(
            "[RATIO] handleCropComplete saving aspect/crop to block",
            { blockId, aspectUsedInModal, cropState: !!cropState },
          );
          setBlocks(nextBlocks);
        }
        setValues(nextValues);

        const pathToDelete =
          oldStoragePath ??
          (await getMedia(user.uid, mediaIdToReplace))?.storagePath ??
          null;
        try {
          await deleteMedia(user.uid, mediaIdToReplace, pathToDelete);
        } catch (e) {
          console.warn("Could not delete old crop after replace", e);
        }
        setMediaCache((prev) => {
          const next = { ...prev };
          delete next[mediaIdToReplace];
          return next;
        });

        setSaving(true);
        try {
          await persistCard(
            aspectUsedInModal != null || cropState ? nextBlocks : blocks,
            nextValues,
            { redirect: false },
          );
        } catch (err) {
          console.error("Auto-save after image edit:", err);
        } finally {
          setSaving(false);
        }
      } finally {
        setImageUploadProgress((p) => (p?.blockId === blockId ? null : p));
      }
      return;
    }

    const croppedFile = new File([blob], "image.png", {
      type: blob.type || "image/png",
    });
    const originalFile = files?.[0];
    setImageCropPending(null);
    console.log("[RATIO] handleCropComplete first-add flow", {
      blockId,
      aspectUsedInModal,
    });

    if (originalFile) {
      let nextValues = { ...values };
      const currentValue = nextValues[blockId] || { blockId, type: "image" };
      let mediaIds = currentValue.mediaIds || [];
      let originalMediaIds = currentValue.originalMediaIds || [];

      const nextBlocks =
        aspectUsedInModal != null || cropState
          ? blocks.map((b) =>
              b.blockId === blockId
                ? { ...b, configJson: mergeCropConfig(b.configJson) }
                : b,
            )
          : blocks;
      if (aspectUsedInModal != null || cropState) {
        console.log(
          "[RATIO] handleCropComplete first-add saving aspect/crop to block",
          { blockId, aspectUsedInModal, cropState: !!cropState },
        );
        setBlocks(nextBlocks);
      }

      const firstCheck = await checkStorageBeforeUpload(
        user,
        (originalFile?.size || 0) + (croppedFile?.size || 0),
      );
      if (!firstCheck.allowed) {
        window.alert(firstCheck.message || "Cloud backup limit reached.");
        return;
      }
      try {
        setImageUploadProgress({ blockId, progress: 0 });
        const originalMedia = await uploadImage(user.uid, originalFile, {
          onProgress: (p) =>
            setImageUploadProgress((prev) =>
              prev?.blockId === blockId
                ? { ...prev, progress: Math.min(50, p / 2) }
                : prev,
            ),
        });
        setMediaCache((prev) => ({
          ...prev,
          [originalMedia.mediaId]: originalMedia,
        }));

        setImageUploadProgress({ blockId, progress: 50 });
        const displayMedia = await uploadImage(user.uid, croppedFile, {
          onProgress: (p) =>
            setImageUploadProgress((prev) =>
              prev?.blockId === blockId
                ? { ...prev, progress: 50 + p / 2 }
                : prev,
            ),
        });
        setMediaCache((prev) => ({
          ...prev,
          [displayMedia.mediaId]: displayMedia,
        }));

        mediaIds = [...mediaIds, displayMedia.mediaId];
        originalMediaIds = [...originalMediaIds, originalMedia.mediaId];
        nextValues = {
          ...nextValues,
          [blockId]: { ...currentValue, mediaIds, originalMediaIds },
        };
        setValues(nextValues);

        for (let i = 1; i < files.length; i++) {
          const file = files[i];
          const extraCheck = await checkStorageBeforeUpload(user, file.size);
          if (!extraCheck.allowed) {
            window.alert(extraCheck.message || "Cloud backup limit reached.");
            break;
          }
          setImageUploadProgress({
            blockId,
            progress: 80 * (i / files.length),
          });
          const m = await uploadImage(user.uid, file, {
            onProgress: (p) =>
              setImageUploadProgress((prev) =>
                prev?.blockId === blockId
                  ? { ...prev, progress: 80 + (20 * p) / 100 }
                  : prev,
              ),
          });
          setMediaCache((prev) => ({ ...prev, [m.mediaId]: m }));
          mediaIds = [...mediaIds, m.mediaId];
          originalMediaIds = [...originalMediaIds, m.mediaId];
          nextValues = {
            ...nextValues,
            [blockId]: { ...nextValues[blockId], mediaIds, originalMediaIds },
          };
          setValues(nextValues);
        }

        setSaving(true);
        try {
          await persistCard(
            aspectUsedInModal != null || cropState ? nextBlocks : blocks,
            nextValues,
            { redirect: false },
          );
        } catch (err) {
          console.error("Auto-save after image upload:", err);
        } finally {
          setSaving(false);
        }
      } finally {
        setImageUploadProgress((p) => (p?.blockId === blockId ? null : p));
      }
      return;
    }

    const toUpload =
      files?.length > 1 ? [croppedFile, ...files.slice(1)] : [croppedFile];
    await handleImageUpload(blockId, toUpload);
  };

  const handleCropCancel = () => {
    if (imageCropPending?.imageSrc)
      URL.revokeObjectURL(imageCropPending.imageSrc);
    setImageCropPending(null);
  };

  // Remove image from block (and delete from Firestore + Storage)
  const removeImage = async (blockId, mediaId) => {
    const currentValue = values[blockId];
    const mediaIds = currentValue?.mediaIds || [];
    const originalMediaIds = currentValue?.originalMediaIds || [];
    const index = mediaIds.indexOf(mediaId);
    const originalMediaId =
      index >= 0 && originalMediaIds[index] ? originalMediaIds[index] : null;

    const toDelete =
      originalMediaId && originalMediaId !== mediaId
        ? [mediaId, originalMediaId]
        : [mediaId];
    for (const id of toDelete) {
      try {
        const media = mediaCache[id];
        const storagePath =
          media?.storagePath ?? (await getMedia(user.uid, id))?.storagePath;
        await deleteMedia(user.uid, id, storagePath ?? null);
      } catch (error) {
        console.error("Error deleting image from storage/Firestore:", error);
      }
      setMediaCache((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }

    setValues((prev) => {
      const cur = prev[blockId];
      if (!cur?.mediaIds) return prev;
      const newMediaIds = cur.mediaIds.filter((id) => id !== mediaId);
      const newOriginalMediaIds = (cur.originalMediaIds || []).filter(
        (_, i) => cur.mediaIds[i] !== mediaId,
      );
      return {
        ...prev,
        [blockId]: {
          ...cur,
          mediaIds: newMediaIds,
          originalMediaIds: newOriginalMediaIds.length
            ? newOriginalMediaIds
            : undefined,
        },
      };
    });
  };

  // Handle audio upload
  const handleAudioUpload = async (blockId, files) => {
    if (!files || files.length === 0) return;

    for (const file of files) {
      try {
        const storageCheck = await checkStorageBeforeUpload(user, file.size);
        if (!storageCheck.allowed) {
          window.alert(storageCheck.message || "Cloud backup limit reached.");
          return;
        }
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

  // Persist card (optionally redirect after save). Ensure image blocks have configJson so crop aspect is saved.
  const persistCard = async (blocksToSave, valuesObj, options = {}) => {
    const { redirect = false } = options;
    const imageBefore = (blocksToSave || [])
      .filter((x) => isImageBlock(x))
      .map((x) => ({ blockId: x.blockId, configJson: x.configJson }));
    const blocksWithImageConfig = ensureImageBlockConfig(blocksToSave || []);
    const imageAfter = blocksWithImageConfig
      .filter((x) => isImageBlock(x))
      .map((x) => ({ blockId: x.blockId, configJson: x.configJson }));
    if (imageBefore.length || imageAfter.length) {
      console.log("[RATIO] persistCard", {
        imageBlocksBefore: imageBefore,
        imageBlocksAfter: imageAfter,
      });
    }
    const valuesArray = Object.values(valuesObj);
    if (isNewCard) {
      const created = await createCard(
        user.uid,
        deckId,
        blocksWithImageConfig,
        valuesArray,
        templateIdFromUrl || null,
        mainBlockId ?? null,
        subBlockId ?? null,
      );
      if (redirect) {
        router.push(`/dashboard/deck/${deckId}`);
      } else {
        router.replace(`/dashboard/deck/${deckId}/card/${created.cardId}`);
      }
    } else {
      await updateCard(
        user.uid,
        cardId,
        deckId,
        valuesArray,
        blocksWithImageConfig,
        mainBlockId ?? null,
        subBlockId ?? null,
      );
      if (redirect) router.push(`/dashboard/deck/${deckId}`);
    }
  };

  // Generate audio with ElevenLabs AI and add to block
  const handleGenerateAudio = async (blockId, text, voiceId) => {
    if (!text?.trim()) return;
    setGeneratingAudioBlockId(blockId);
    try {
      const headers = { "Content-Type": "application/json" };
      if (isProduction && user) {
        const token = await user.getIdToken();
        if (token) headers.Authorization = `Bearer ${token}`;
      }
      const res = await fetch("/api/elevenlabs/text-to-speech", {
        method: "POST",
        headers,
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
      const storageCheck = await checkStorageBeforeUpload(user, file.size);
      if (!storageCheck.allowed) {
        throw new Error(storageCheck.message || "Cloud backup limit reached.");
      }
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

  const resolveBlockType = (block) => normalizeBlockType(block?.type);

  // Save card (always allow save so user can save draft even with validation errors)
  const handleSave = async () => {
    setSaving(true);
    try {
      await persistCard(blocks, values, { redirect: false });
      setSaveSnackbarOpen(true);
    } catch (error) {
      console.error("Error saving card:", error);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!saveSnackbarOpen) return;
    const t = setTimeout(() => setSaveSnackbarOpen(false), 3500);
    return () => clearTimeout(t);
  }, [saveSnackbarOpen]);

  const cardValidation = getBlockValidationErrorsFromValidators(
    blocks,
    values,
    {
      resolveBlockType,
      getBlockConfig,
    },
  );
  const isCardValid = cardValidation.valid;

  if (typeof window !== "undefined" && window.__DEBUG_CARD_VALIDATION__) {
    const blocksWithResolved = blocks.map((b) => ({
      blockId: b.blockId,
      rawType: b.type,
      resolvedType: resolveBlockType(b),
      label: b.label,
      required: b.required,
    }));
    console.log("[VALIDATION] card-editor", {
      valid: cardValidation.valid,
      errorCount: cardValidation.errors?.length ?? 0,
      errors: cardValidation.errors,
    });
  }

  const frontBlocks = useMemo(
    () => blocks.filter((b) => effectiveCardBlockSide(b) === "front"),
    [blocks],
  );
  const backBlocks = useMemo(
    () => blocks.filter((b) => effectiveCardBlockSide(b) === "back"),
    [blocks],
  );
  const hasBackBlocks = backBlocks.length > 0;
  const showBackPanel = hasBackBlocks || showBackSectionIntent;

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/[0.05] animate-pulse" />
            <div>
              <div className="h-5 w-24 bg-white/[0.06] rounded mb-1.5 animate-pulse" />
              <div className="h-3 w-32 bg-white/[0.04] rounded animate-pulse" />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="h-9 w-24 rounded-xl bg-white/[0.04] animate-pulse" />
            <div className="h-9 w-20 rounded-xl bg-accent/20 animate-pulse" />
          </div>
        </div>
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden animate-pulse mb-4">
          <div className="px-4 py-2.5 border-b border-white/[0.06] bg-white/[0.03]">
            <div className="h-3 w-12 bg-white/[0.06] rounded" />
          </div>
          <div className="p-4 space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 h-16" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const renderBlockRow = (block) => {
    const globalIndex = blocks.findIndex((b) => b.blockId === block.blockId);
    if (globalIndex < 0) return null;
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
    const audioConfig = isAudio
      ? parseAudioBlockConfig(block.configJson, { mainBlockId })
      : {};
    const defaultVoiceId = audioConfig.defaultVoiceId || undefined;
    const defaultSourceBlockId =
      audioConfig.defaultSourceBlockId || undefined;
    const isDragging = draggedBlockIndex === globalIndex;
    const showDropDivider = dragOverBlockIndex === globalIndex;

    return (
      <Fragment key={block.blockId || `block-${globalIndex}`}>
        {showDropDivider && (
          <div
            className="h-1 rounded-full bg-accent/80 my-1 flex-shrink-0"
            aria-hidden
          />
        )}
        <div
          draggable
          onDragStart={(e) => {
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/plain", String(globalIndex));
            setDraggedBlockIndex(globalIndex);
            setupDragScroll();
          }}
          onDragEnd={() => {
            setDraggedBlockIndex(null);
            setDragOverBlockIndex(null);
            clearDragScroll();
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            setDragOverBlockIndex(globalIndex);
          }}
          onDragLeave={() =>
            setDragOverBlockIndex((i) => (i === globalIndex ? null : i))
          }
          onDrop={(e) => {
            e.preventDefault();
            const from = draggedBlockIndex;
            if (from != null && from !== globalIndex) {
              const fromBlock = blocks[from];
              const toBlock = blocks[globalIndex];
              if (
                fromBlock &&
                toBlock &&
                effectiveCardBlockSide(fromBlock) !==
                  effectiveCardBlockSide(toBlock)
              ) {
                setDraggedBlockIndex(null);
                setDragOverBlockIndex(null);
                return;
              }
              moveBlock(from, globalIndex);
            }
            setDraggedBlockIndex(null);
            setDragOverBlockIndex(null);
          }}
          className={`rounded-xl transition-colors cursor-grab active:cursor-grabbing ${isDragging ? "opacity-60" : ""}`}
        >
          {((cardValidation.errorsByBlockId ?? {})[block.blockId] || [])
            .length > 0 && (
            <div className="mb-2 rounded-lg border border-amber-500/50 bg-amber-500/10 text-amber-200 text-sm px-3 py-2">
              <ul className="list-disc list-inside space-y-0.5">
                {(cardValidation.errorsByBlockId ?? {})[block.blockId].map(
                  (msg, i) => (
                    <li key={i}>{msg}</li>
                  ),
                )}
              </ul>
            </div>
          )}
          <BlockEditor
            block={block}
            value={values[block.blockId]}
            allBlocks={blocks}
            allValues={values}
            mediaCache={mediaCache}
            isMainBlock={mainBlockId === block.blockId}
            isSubBlock={subBlockId === block.blockId}
            onValueChange={(text) => updateBlockValue(block.blockId, text)}
            onRemove={() => removeBlock(block.blockId)}
            onImageFileSelect={(files) =>
              handleImageFileSelect(block.blockId, files)
            }
            onImageUpload={(files) => handleImageUpload(block.blockId, files)}
            onImageEdit={(mediaId) => handleEditImage(block.blockId, mediaId)}
            onImageRemove={(mediaId) => removeImage(block.blockId, mediaId)}
            imageUploadProgress={imageUploadProgress}
            imageEditLoading={imageEditLoading}
            onAudioUpload={(files) => handleAudioUpload(block.blockId, files)}
            onAudioRemove={(mediaId) => removeAudio(block.blockId, mediaId)}
            onGenerateAudio={
              audioProEntitled
                ? (text, voiceId) =>
                    handleGenerateAudio(block.blockId, text, voiceId)
                : undefined
            }
            generateAudioProRequired={isProduction && !audioProEntitled}
            defaultVoiceId={defaultVoiceId}
            defaultSourceBlockId={defaultSourceBlockId}
            generatingAudio={generatingAudioBlockId === block.blockId}
            onConfigChange={(config) => updateBlockConfig(block.blockId, config)}
          />
        </div>
      </Fragment>
    );
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard/deck/${deckId}`}
            className="p-2 rounded-xl border border-white/[0.07] bg-white/[0.03] hover:bg-white/[0.07] text-white/50 hover:text-white/90 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-[16px] font-semibold text-white tracking-tight">
              {isNewCard ? "New Card" : "Edit Card"}
            </h1>
            <p className="text-[12px] text-white/30 mt-0.5">{deck?.title}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPreviewModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-white/[0.08] bg-white/[0.03] text-[13px] text-white/60 hover:text-white/90 hover:bg-white/[0.07] transition-all"
            title="Preview card"
          >
            <Eye className="w-4 h-4" />
            <span className="hidden sm:inline">Preview</span>
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent/90 text-white text-[13px] font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(35,131,226,0.2)]"
          >
            {saving ? (
              <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">
              {saving ? "Saving…" : "Save"}
            </span>
          </button>
        </div>
      </div>

      {cardValidation.errors.length > 0 && (
        <div
          role="alert"
          className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/[0.07] px-4 py-4"
        >
          <p className="text-[13px] font-semibold text-amber-300 mb-1">
            {cardValidation.errors.length} error{cardValidation.errors.length === 1 ? "" : "s"} — fix before saving.
          </p>
          <ul className="space-y-0.5">
            {cardValidation.errors.slice(0, 8).map((msg, i) => (
              <li key={i} className="text-[12px] text-amber-200/70">{msg}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Blocks — front / back (same pattern as template editor) */}
      <div className="space-y-4 mb-6">
        {blocks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center rounded-2xl border border-white/[0.07] bg-white/[0.02]">
            <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-center mb-4">
              <Plus className="w-5 h-5 text-white/25" />
            </div>
            <h3 className="text-[15px] font-semibold text-white/60 mb-1.5">
              No blocks yet
            </h3>
            <p className="text-[13px] text-white/30 mb-5 max-w-xs leading-relaxed">
              Add blocks to fill this card. You can add a back face after the front is set up.
            </p>
            <button
              type="button"
              onClick={() => setBlockPickerSide("front")}
              className="px-4 py-2 rounded-xl bg-accent/[0.12] border border-accent/20 text-accent hover:bg-accent/[0.2] text-[13px] font-medium transition-colors"
            >
              Add block
            </button>
          </div>
        ) : (
          <>
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] overflow-hidden">
              <div className="px-4 py-2.5 border-b border-white/[0.06] bg-white/[0.03] flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-accent/50" />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-white/40">
                  Front
                </span>
              </div>
              <div className="p-4 space-y-3">
                {frontBlocks.map((block) => renderBlockRow(block))}
                <button
                  type="button"
                  onClick={() => setBlockPickerSide("front")}
                  className="w-full py-2.5 border border-dashed border-white/[0.12] hover:border-accent/35 rounded-xl text-[13px] text-white/35 hover:text-accent transition-colors flex items-center justify-center gap-2"
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
                className="w-full py-3 rounded-2xl border border-dashed border-white/[0.10] hover:border-white/[0.20] text-[13px] text-white/30 hover:text-white/60 transition-colors"
              >
                + Add back of card
              </button>
            ) : (
              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] overflow-hidden">
                <div className="px-4 py-2.5 border-b border-white/[0.06] bg-white/[0.03] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-white/25" />
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-white/40">
                      Back
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={removeBackSection}
                    className="text-[11px] text-red-400/50 hover:text-red-400 transition-colors"
                  >
                    Remove back
                  </button>
                </div>
                <div className="p-4 space-y-3">
                  {backBlocks.map((block) => renderBlockRow(block))}
                  <button
                    type="button"
                    onClick={() => setBlockPickerSide("back")}
                    className="w-full py-2.5 border border-dashed border-white/[0.12] hover:border-accent/35 rounded-xl text-[13px] text-white/35 hover:text-accent transition-colors flex items-center justify-center gap-2"
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

      {/* Block type picker */}
      <div className="relative mt-2">
        {blockPickerSide != null && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setBlockPickerSide(null)}
            />
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute bottom-full left-0 right-0 mb-2 bg-[#111111] border border-white/[0.09] rounded-2xl shadow-2xl p-4 z-20"
            >
              <p className="text-[11px] text-white/30 mb-3 uppercase tracking-wider font-medium">
                Adding to <span className="text-white/60">{blockPickerSide === "back" ? "Back" : "Front"}</span>
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {Object.entries(BLOCK_TYPES).map(([type, config]) => {
                  const Icon = config.icon;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => addBlock(type, blockPickerSide)}
                      className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-white/[0.07] border border-transparent hover:border-white/[0.07] transition-all"
                    >
                      <Icon className="w-4 h-4 text-accent/80" />
                      <span className="text-[11px] text-white/50 hover:text-white/80">
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

      {/* Image crop modal */}
      {imageCropPending && (
        <ImageCropModal
          imageSrc={imageCropPending.imageSrc}
          defaultAspect={imageCropPending.defaultAspect}
          initialCrop={imageCropPending.initialCrop}
          initialZoom={imageCropPending.initialZoom}
          allowRatioChange={imageCropPending.allowRatioChange === true}
          onComplete={handleCropComplete}
          onCancel={handleCropCancel}
        />
      )}

      {/* Preview modal */}
      {showPreviewModal && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4"
          onClick={() => setShowPreviewModal(false)}
        >
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", bounce: 0.15, duration: 0.35 }}
            className="bg-[#0e0e0e] border border-white/[0.08] rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.07]">
              <h2 className="text-[13px] font-semibold text-white/80">Preview</h2>
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="p-1.5 rounded-lg hover:bg-white/[0.07] text-white/30 hover:text-white/70 transition-all"
                aria-label="Close preview"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 overflow-x-hidden p-5">
              <CardPreviewContent
                blocks={blocks}
                getValue={(blockId) => values[blockId]}
                mediaCache={mediaCache}
              />
            </div>
          </motion.div>
        </div>
      )}

      <AnimatePresence>
        {saveSnackbarOpen && (
          <motion.div
            role="status"
            aria-live="polite"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 left-1/2 z-[100] flex -translate-x-1/2 items-center gap-2 rounded-xl border border-white/[0.09] bg-[#141414] px-4 py-3 text-[13px] text-white shadow-xl shadow-black/60"
          >
            <Check className="h-4 w-4 shrink-0 text-emerald-400" strokeWidth={2.5} />
            Card saved
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function CardEditorPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#080808] flex items-center justify-center">
          <div className="w-7 h-7 rounded-full border-2 border-white/[0.07] border-t-accent animate-spin" />
        </div>
      }
    >
      <CardEditorPageInner />
    </Suspense>
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
  onImageFileSelect,
  onImageUpload,
  onImageEdit,
  onImageRemove,
  imageUploadProgress,
  imageEditLoading,
  onAudioUpload,
  onAudioRemove,
  onGenerateAudio,
  generateAudioProRequired,
  generatingAudio,
  onConfigChange,
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
    () => defaultVoiceId || "",
  );

  useEffect(() => {
    setSelectedVoiceId(defaultVoiceId || "");
  }, [defaultVoiceId]);

  const [audioBlobUrls, setAudioBlobUrls] = useState({});
  const [loadingAudioMediaIds, setLoadingAudioMediaIds] = useState(
    () => new Set(),
  );
  const audioObjectUrlsRef = useRef({});

  useEffect(() => {
    const mediaIds = value?.mediaIds ?? [];
    const hasAllMedia =
      mediaIds.length > 0 &&
      mediaIds.every((id) => mediaCache[id]?.downloadUrl);
    if (blockType !== "audio" || !hasAllMedia) return;

    let cancelled = false;
    const prev = audioObjectUrlsRef.current;
    audioObjectUrlsRef.current = {};
    Object.values(prev).forEach((u) => URL.revokeObjectURL(u));

    const load = async () => {
      for (const mediaId of mediaIds) {
        const media = mediaCache[mediaId];
        if (!media?.downloadUrl || cancelled) continue;
        setLoadingAudioMediaIds((prev) => new Set(prev).add(mediaId));
        try {
          const res = await fetch("/api/proxy-media", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: media.downloadUrl }),
          });
          if (!res.ok || cancelled) return;
          const blob = await res.blob();
          if (cancelled) return;
          const objectUrl = URL.createObjectURL(blob);
          audioObjectUrlsRef.current[mediaId] = objectUrl;
          setAudioBlobUrls((prev) => ({ ...prev, [mediaId]: objectUrl }));
        } catch (err) {
          console.warn("[BlockEditor audio] preload failed", mediaId, err);
        } finally {
          if (!cancelled) {
            setLoadingAudioMediaIds((prev) => {
              const next = new Set(prev);
              next.delete(mediaId);
              return next;
            });
          }
        }
      }
    };
    load();

    return () => {
      cancelled = true;
      Object.values(audioObjectUrlsRef.current).forEach((u) =>
        URL.revokeObjectURL(u),
      );
      audioObjectUrlsRef.current = {};
    };
  }, [
    blockType,
    value?.mediaIds?.join(","),
    (value?.mediaIds ?? [])
      .map((id) => (mediaCache[id]?.downloadUrl ? "1" : "0"))
      .join(","),
  ]);

  const renderInput = () => {
    switch (blockType) {
      case "header1":
        return (
          <input
            type="text"
            value={value?.text || ""}
            onChange={(e) => onValueChange(e.target.value)}
            placeholder={config.placeholder}
            className="w-full bg-transparent text-2xl font-bold text-white placeholder-white/20 focus:outline-none leading-tight"
          />
        );

      case "header2":
        return (
          <input
            type="text"
            value={value?.text || ""}
            onChange={(e) => onValueChange(e.target.value)}
            placeholder={config.placeholder}
            className="w-full bg-transparent text-xl font-semibold text-white placeholder-white/20 focus:outline-none"
          />
        );

      case "header3":
        return (
          <input
            type="text"
            value={value?.text || ""}
            onChange={(e) => onValueChange(e.target.value)}
            placeholder={config.placeholder}
            className="w-full bg-transparent text-[15px] font-semibold text-white/90 placeholder-white/20 focus:outline-none"
          />
        );

      case "text":
        return (
          <textarea
            value={value?.text || ""}
            onChange={(e) => onValueChange(e.target.value)}
            placeholder={config.placeholder}
            rows={3}
            className="w-full bg-transparent text-[14px] text-white/85 placeholder-white/20 focus:outline-none resize-none leading-relaxed"
          />
        );

      case "hiddenText":
        return (
          <div className="rounded-lg bg-white/[0.03] border border-dashed border-white/[0.10] px-3 py-2.5">
            <div className="flex items-center gap-1.5 mb-2">
              <EyeOff className="w-3 h-3 text-white/25" />
              <span className="text-[10px] text-white/25 uppercase tracking-wider">Hidden until revealed</span>
            </div>
            <textarea
              value={value?.text || ""}
              onChange={(e) => onValueChange(e.target.value)}
              placeholder={config.placeholder}
              rows={2}
              className="w-full bg-transparent text-[14px] text-white/70 placeholder-white/20 focus:outline-none resize-none leading-relaxed"
            />
          </div>
        );

      case "example":
        return (
          <div className="border-l-2 border-accent/30 pl-3">
            <textarea
              value={value?.text || ""}
              onChange={(e) => onValueChange(e.target.value)}
              placeholder={config.placeholder}
              rows={2}
              className="w-full bg-transparent text-[14px] text-white/65 italic placeholder-white/20 focus:outline-none resize-none leading-relaxed"
            />
          </div>
        );

      case "image": {
        const isUploading = imageUploadProgress?.blockId === block.blockId;
        const progress = imageUploadProgress?.progress ?? 0;
        const imageBlockConfig = getBlockConfig(block) || {};
        const imageCropAspect = getCropAspectFromConfig(imageBlockConfig);
        return (
          <div className="space-y-3">
            {/* Display aspect pills */}
            <div>
              <span className="text-[11px] text-white/30 block mb-2 uppercase tracking-wider">Display aspect</span>
              <div className="flex flex-wrap gap-1.5">
                {CROP_ASPECT_OPTIONS.map((opt) => (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => {
                      const nextConfig = { ...imageBlockConfig, cropAspect: opt.value };
                      console.log("[RATIO] button clicked", { blockId: block.blockId, cropAspect: opt.value, label: opt.label, hasOnConfigChange: !!onConfigChange, nextConfig });
                      onConfigChange?.(nextConfig);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[12px] font-medium transition-all ${
                      imageCropAspect === opt.value
                        ? "bg-accent/[0.15] border border-accent/30 text-accent"
                        : "bg-white/[0.04] border border-white/[0.07] text-white/45 hover:text-white/70 hover:bg-white/[0.07]"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Image preview grid */}
            {value?.mediaIds && value.mediaIds.length > 0 && (
              <div className="flex justify-center">
                <div className={`gap-2 ${value.mediaIds.length === 1 ? "w-full max-w-[260px]" : "grid grid-cols-2 sm:grid-cols-3 w-full max-w-[320px] sm:max-w-md"}`}>
                  {value.mediaIds.map((mediaId) => {
                    const media = mediaCache[mediaId];
                    if (!media?.downloadUrl) return null;
                    const isEditLoading = imageEditLoading === mediaId;
                    return (
                      <div key={mediaId} className="relative group w-full overflow-hidden rounded-xl border border-white/[0.07]" style={{ aspectRatio: imageCropAspect }}>
                        <Image src={media.downloadUrl} alt="" fill className="object-cover" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-xl" />
                        <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {onImageEdit && (
                            <button type="button" onClick={() => onImageEdit(mediaId)} disabled={isEditLoading}
                              className="p-1.5 bg-black/60 hover:bg-black/80 rounded-lg transition-colors disabled:opacity-50" title="Edit / re-crop">
                              {isEditLoading
                                ? <span className="inline-block w-3 h-3 border-2 border-white/80 border-t-transparent rounded-full animate-spin" />
                                : <Pencil className="w-3 h-3 text-white" />}
                            </button>
                          )}
                          <button type="button" onClick={() => onImageRemove(mediaId)}
                            className="p-1.5 bg-red-500/80 hover:bg-red-500 rounded-lg transition-colors" title="Remove">
                            <X className="w-3 h-3 text-white" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Upload progress */}
            {isUploading && (
              <div>
                <div className="h-1 bg-white/[0.07] rounded-full overflow-hidden mb-1">
                  <div className="h-full bg-accent transition-all duration-300 rounded-full" style={{ width: `${Math.min(100, progress)}%` }} />
                </div>
                <p className="text-[12px] text-white/40">Uploading… {Math.round(progress)}%</p>
              </div>
            )}

            {/* Upload area */}
            <label className={`flex flex-col items-center justify-center gap-2 py-5 border border-dashed border-white/[0.12] hover:border-accent/35 rounded-xl cursor-pointer transition-colors group ${isUploading ? "pointer-events-none opacity-50" : ""}`}>
              <div className="w-8 h-8 rounded-xl bg-white/[0.04] group-hover:bg-accent/[0.08] flex items-center justify-center transition-colors">
                <Upload className="w-4 h-4 text-white/30 group-hover:text-accent/70 transition-colors" />
              </div>
              <span className="text-[12px] text-white/30 group-hover:text-white/50 transition-colors">Click to upload images</span>
              <input type="file" accept="image/*" multiple onChange={(e) => { const files = e.target.files; if (files?.length) onImageFileSelect(files); e.target.value = ""; }} className="hidden" />
            </label>
          </div>
        );
      }

      case "audio": {
        const audioMediaIds = value?.mediaIds || [];
        return (
          <div className="space-y-3">
            {/* Existing audio tracks */}
            {audioMediaIds.length > 0 && (
              <div className="space-y-2">
                {audioMediaIds.map((mediaId) => {
                  const media = mediaCache[mediaId];
                  if (!media?.downloadUrl) return null;
                  const isLoading = loadingAudioMediaIds.has(mediaId);
                  const src = audioBlobUrls[mediaId];
                  return (
                    <div key={mediaId} className="flex items-center gap-2 p-2 rounded-xl bg-white/[0.03] border border-white/[0.07]">
                      {isLoading && (
                        <span className="w-4 h-4 border-2 border-white/40 border-t-transparent rounded-full animate-spin flex-shrink-0" aria-hidden />
                      )}
                      <audio src={src ?? undefined} controls className="flex-1 rounded-lg h-8 min-w-0" style={{ minWidth: 0 }} />
                      <button onClick={() => onAudioRemove(mediaId)}
                        className="p-1.5 bg-red-500/[0.12] hover:bg-red-500/25 border border-red-500/20 rounded-lg flex-shrink-0 transition-colors">
                        <X className="w-3 h-3 text-red-400" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Upload area */}
            <label className="flex flex-col items-center justify-center gap-2 py-4 border border-dashed border-white/[0.12] hover:border-accent/35 rounded-xl cursor-pointer transition-colors group">
              <div className="w-8 h-8 rounded-xl bg-white/[0.04] group-hover:bg-accent/[0.08] flex items-center justify-center transition-colors">
                <Upload className="w-4 h-4 text-white/30 group-hover:text-accent/70 transition-colors" />
              </div>
              <span className="text-[12px] text-white/30 group-hover:text-white/50 transition-colors">Click to upload audio</span>
              <input type="file" accept="audio/*" multiple onChange={(e) => onAudioUpload(e.target.files)} className="hidden" />
            </label>

            {/* AI generate section */}
            {generateAudioProRequired ? (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.05] p-3.5">
                <span className="text-[12px] text-amber-300/80 font-medium flex items-center gap-1.5 mb-2">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Generate with AI (Pro)
                </span>
                <Link href="/dashboard/subscription" className="text-[13px] text-amber-400 hover:text-amber-300 font-medium transition-colors">
                  Upgrade to Pro →
                </Link>
              </div>
            ) : onGenerateAudio ? (
              <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3.5 space-y-3">
                <span className="text-[11px] text-white/40 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  Generate with AI
                </span>

                {/* Voice picker */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[12px] text-white/40 shrink-0">Voice</span>
                  <div className="flex-1 min-w-[12rem]">
                    <ElevenlabsVoicePicker value={selectedVoiceId} onChange={setSelectedVoiceId} size="sm" disabled={generatingAudio} />
                  </div>
                </div>

                {/* Copy from block */}
                {allBlocks && allValues && (() => {
                  const norm = (t) => typeof t === "number" && BlockTypeNames[t] != null ? BlockTypeNames[t] : t;
                  const otherBlocks = (allBlocks || []).filter((b) => b.blockId !== block.blockId && TEXT_BLOCK_TYPES.has(norm(b.type)));
                  if (otherBlocks.length === 0) return null;
                  return (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[12px] text-white/35">Copy from:</span>
                      <select
                        value=""
                        onChange={(e) => {
                          const bid = e.target.value;
                          if (!bid) return;
                          e.target.value = "";
                          const t = (allValues[bid]?.text || "").trim();
                          if (t) setGenerateAudioText((prev) => prev ? prev + "\n\n" + t : t);
                        }}
                        className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 py-1 text-[12px] text-white/60 focus:outline-none focus:border-accent/50 transition-colors"
                      >
                        <option value="">— Choose block —</option>
                        {otherBlocks.map((b) => (
                          <option key={b.blockId} value={b.blockId}>{b.label}</option>
                        ))}
                      </select>
                    </div>
                  );
                })()}

                <textarea
                  value={generateAudioText}
                  onChange={(e) => setGenerateAudioText(e.target.value)}
                  placeholder="Enter text to convert to speech…"
                  rows={3}
                  className="w-full bg-white/[0.03] border border-white/[0.07] rounded-xl px-3 py-2.5 text-[13px] text-white/80 placeholder-white/20 focus:outline-none focus:border-accent/40 resize-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => onGenerateAudio(generateAudioText, selectedVoiceId)}
                  disabled={generatingAudio || !generateAudioText.trim()}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-600/90 hover:bg-amber-500 text-white text-[13px] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {generatingAudio ? (
                    <><span className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />Generating…</>
                  ) : (
                    <><Sparkles className="w-3.5 h-3.5" />Generate audio</>
                  )}
                </button>
              </div>
            ) : null}
          </div>
        );
      }

      case "divider":
        return (
          <div className="py-1 flex items-center gap-3">
            <div className="flex-1 h-px bg-white/[0.10]" />
            <div className="w-1 h-1 rounded-full bg-white/20" />
            <div className="flex-1 h-px bg-white/[0.10]" />
          </div>
        );

      case "space": {
        const spaceConfig = getBlockConfig(block) || { height: 32 };
        return (
          <div className="flex items-center gap-3">
            <span className="text-[12px] text-white/35">Height</span>
            <input
              type="number"
              min={8}
              max={200}
              value={spaceConfig.height || 32}
              onChange={(e) => onConfigChange({ ...spaceConfig, height: Number(e.target.value) })}
              className="w-16 bg-white/[0.04] border border-white/[0.08] text-white text-[13px] rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-accent/50 transition-colors"
            />
            <span className="text-[12px] text-white/30">px</span>
          </div>
        );
      }

      case "quizSingleSelect": {
        const qConfig = getBlockConfig(block) || { question: "", options: ["", ""], correctAnswers: [] };
        const options = qConfig.options || ["", ""];
        const correct = qConfig.correctAnswers || [];
        return (
          <div className="space-y-3">
            <input
              type="text"
              value={qConfig.question || ""}
              onChange={(e) => onConfigChange({ ...qConfig, question: e.target.value })}
              placeholder="Question…"
              className="w-full bg-transparent text-[14px] text-white placeholder-white/20 focus:outline-none border-b border-white/[0.10] pb-2 focus:border-white/25 transition-colors"
            />
            <div className="space-y-1.5">
              <span className="text-[11px] text-white/30 uppercase tracking-wider block">Options — tap circle to mark correct</span>
              {options.map((option, i) => {
                const isCorrect = correct.includes(option) && option;
                return (
                  <div key={i} className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border transition-colors ${isCorrect ? "bg-accent/[0.07] border-accent/25" : "bg-white/[0.02] border-white/[0.07]"}`}>
                    <button
                      type="button"
                      onClick={() => onConfigChange({ ...qConfig, options, correctAnswers: [option] })}
                      className={`w-4 h-4 rounded-full border-2 flex-shrink-0 transition-all ${isCorrect ? "border-accent bg-accent shadow-[0_0_8px_rgba(35,131,226,0.4)]" : "border-white/25 hover:border-white/50"}`}
                    />
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => {
                        const newOptions = [...options];
                        const wasCorrect = correct.includes(option);
                        newOptions[i] = e.target.value;
                        onConfigChange({ ...qConfig, options: newOptions, correctAnswers: wasCorrect ? [e.target.value] : correct });
                      }}
                      placeholder={`Option ${i + 1}`}
                      className="flex-1 bg-transparent text-[14px] text-white placeholder-white/20 focus:outline-none"
                    />
                    {options.length > 2 && (
                      <button type="button"
                        onClick={() => { const newOptions = options.filter((_, idx) => idx !== i); onConfigChange({ ...qConfig, options: newOptions, correctAnswers: correct.filter((a) => a !== option) }); }}
                        className="p-1 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/[0.08] transition-all">
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                );
              })}
              <button type="button" onClick={() => onConfigChange({ ...qConfig, options: [...options, ""] })}
                className="flex items-center gap-1.5 text-[12px] text-accent/70 hover:text-accent transition-colors mt-1 px-1">
                <Plus className="w-3 h-3" /> Add option
              </button>
            </div>
            <input
              type="text"
              value={qConfig.hint || ""}
              onChange={(e) => onConfigChange({ ...qConfig, hint: e.target.value })}
              placeholder="Hint (optional)…"
              className="w-full bg-transparent text-[13px] text-white/40 placeholder-white/15 focus:outline-none"
            />
          </div>
        );
      }

      case "quizMultiSelect": {
        const qConfig = getBlockConfig(block) || { question: "", options: ["", ""], correctAnswers: [] };
        const options = qConfig.options || ["", ""];
        const correct = new Set(qConfig.correctAnswers || []);
        return (
          <div className="space-y-3">
            <input
              type="text"
              value={qConfig.question || ""}
              onChange={(e) => onConfigChange({ ...qConfig, question: e.target.value })}
              placeholder="Question…"
              className="w-full bg-transparent text-[14px] text-white placeholder-white/20 focus:outline-none border-b border-white/[0.10] pb-2 focus:border-white/25 transition-colors"
            />
            <div className="space-y-1.5">
              <span className="text-[11px] text-white/30 uppercase tracking-wider block">Options — check to mark correct</span>
              {options.map((option, i) => {
                const isCorrect = correct.has(option) && option;
                return (
                  <div key={i} className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border transition-colors ${isCorrect ? "bg-accent/[0.07] border-accent/25" : "bg-white/[0.02] border-white/[0.07]"}`}>
                    <button
                      type="button"
                      onClick={() => {
                        const next = new Set(correct);
                        if (next.has(option)) next.delete(option); else next.add(option);
                        onConfigChange({ ...qConfig, options, correctAnswers: Array.from(next) });
                      }}
                      className={`w-4 h-4 rounded flex-shrink-0 flex items-center justify-center transition-all ${isCorrect ? "bg-accent border-2 border-accent shadow-[0_0_8px_rgba(35,131,226,0.4)]" : "border-2 border-white/25 hover:border-white/50"}`}
                    >
                      {isCorrect && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                    </button>
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => {
                        const newOptions = [...options];
                        const wasCorrect = correct.has(option);
                        newOptions[i] = e.target.value;
                        const newCorrect = new Set(correct);
                        if (wasCorrect) { newCorrect.delete(option); newCorrect.add(e.target.value); }
                        onConfigChange({ ...qConfig, options: newOptions, correctAnswers: Array.from(newCorrect) });
                      }}
                      placeholder={`Option ${i + 1}`}
                      className="flex-1 bg-transparent text-[14px] text-white placeholder-white/20 focus:outline-none"
                    />
                    {options.length > 2 && (
                      <button type="button"
                        onClick={() => { const newOptions = options.filter((_, idx) => idx !== i); const newCorrect = new Set(correct); newCorrect.delete(option); onConfigChange({ ...qConfig, options: newOptions, correctAnswers: Array.from(newCorrect) }); }}
                        className="p-1 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/[0.08] transition-all">
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                );
              })}
              <button type="button" onClick={() => onConfigChange({ ...qConfig, options: [...options, ""] })}
                className="flex items-center gap-1.5 text-[12px] text-accent/70 hover:text-accent transition-colors mt-1 px-1">
                <Plus className="w-3 h-3" /> Add option
              </button>
            </div>
            <input
              type="text"
              value={qConfig.hint || ""}
              onChange={(e) => onConfigChange({ ...qConfig, hint: e.target.value })}
              placeholder="Hint (optional)…"
              className="w-full bg-transparent text-[13px] text-white/40 placeholder-white/15 focus:outline-none"
            />
          </div>
        );
      }

      case "quizTextAnswer": {
        const qConfig = getBlockConfig(block) || { question: "", correctAnswer: "", hint: "", caseSensitive: false };
        return (
          <div className="space-y-3">
            <input
              type="text"
              value={qConfig.question || ""}
              onChange={(e) => onConfigChange({ ...qConfig, question: e.target.value })}
              placeholder="Question…"
              className="w-full bg-transparent text-[14px] text-white placeholder-white/20 focus:outline-none border-b border-white/[0.10] pb-2 focus:border-white/25 transition-colors"
            />
            <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04]">
              <Check className="w-3.5 h-3.5 text-emerald-400/60 flex-shrink-0" />
              <input
                type="text"
                value={qConfig.correctAnswer || ""}
                onChange={(e) => onConfigChange({ ...qConfig, correctAnswer: e.target.value })}
                placeholder="Correct answer…"
                className="flex-1 bg-transparent text-[14px] text-white/80 placeholder-white/20 focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={qConfig.hint || ""}
                onChange={(e) => onConfigChange({ ...qConfig, hint: e.target.value })}
                placeholder="Hint (optional)…"
                className="flex-1 bg-transparent text-[13px] text-white/40 placeholder-white/15 focus:outline-none"
              />
              <label className="flex items-center gap-1.5 text-[12px] text-white/35 cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={qConfig.caseSensitive || false}
                  onChange={(e) => onConfigChange({ ...qConfig, caseSensitive: e.target.checked })}
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
            placeholder="Enter content…"
            className="w-full bg-transparent text-[14px] text-white placeholder-white/20 focus:outline-none"
          />
        );
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/[0.025] border border-white/[0.07] hover:border-white/[0.11] rounded-xl p-4 group transition-colors"
    >
      <div className="flex items-start gap-3">
        {/* Drag Handle & Icon */}
        <div className="flex items-center gap-1.5 pt-0.5 flex-shrink-0">
          <GripVertical className="w-4 h-4 text-white/15 cursor-grab active:cursor-grabbing" />
          <div className="w-6 h-6 rounded-lg bg-white/[0.05] flex items-center justify-center">
            <Icon className="w-3.5 h-3.5 text-white/35" />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-medium text-white/35 uppercase tracking-wider">
                {block.label}
                {block.required && <span className="text-accent/70 ml-0.5">*</span>}
              </span>
              {isMainBlock && (
                <span className="px-1.5 py-0.5 bg-accent/[0.12] border border-accent/20 text-accent text-[10px] rounded-md font-medium">
                  Main
                </span>
              )}
              {isSubBlock && (
                <span className="px-1.5 py-0.5 bg-purple-500/[0.12] border border-purple-500/20 text-purple-400 text-[10px] rounded-md font-medium">
                  Sub
                </span>
              )}
            </div>
            {!block.required && (
              <button
                onClick={onRemove}
                className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-red-500/[0.08] rounded-lg transition-all"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-400/60 hover:text-red-400" />
              </button>
            )}
          </div>
          {renderInput()}
        </div>
      </div>
    </motion.div>
  );
}
