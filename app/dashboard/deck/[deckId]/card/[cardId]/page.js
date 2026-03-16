"use client";

import { useEffect, useState, useCallback, useRef, Fragment } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Check,
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
import { ELEVENLABS_VOICES, ELEVENLABS_SAMPLE_PHRASE } from "@/lib/elevenlabs-voices";
import { parseAudioBlockConfig } from "@/lib/audio-block-config";
import { getBlockValidationErrors as getBlockValidationErrorsFromValidators } from "@/lib/block-validators";
import { checkStorageBeforeUpload } from "@/lib/storage-check-client";
import { getCropAspectFromConfig, getCropStateFromConfig, CROP_ASPECT_OPTIONS, DEFAULT_CROP_ASPECT } from "@/lib/image-block-config";
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
  const num = typeof type === "number" ? type : /^\d+$/.test(String(type)) ? Number(type) : NaN;
  if (!Number.isNaN(num) && BlockTypeNames[num] != null) return BlockTypeNames[num];
  return type;
};

const normalizeBlocks = (blocks) =>
  (blocks || []).map((b) => ({ ...b, type: normalizeBlockType(b.type) }));

const isImageBlock = (b) => {
  const t = b?.type;
  return t === "image" || t === 6 || (typeof t === "string" && t === "6");
};

function ensureImageBlockConfig(blocks) {
  if (!blocks?.length) return blocks;
  return blocks.map((b) => {
    if (!isImageBlock(b)) return b;
    if (b.configJson != null || b.config_json != null) return b;
    return { ...b, configJson: JSON.stringify({ cropAspect: DEFAULT_CROP_ASPECT }) };
  });
}

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

function getDefaultValuesForBlocks(blocks) {
  const v = {};
  (blocks || DEFAULT_BLOCKS).forEach((block) => {
    const type = typeof block.type === "number" && BlockTypeNames[block.type] != null ? BlockTypeNames[block.type] : block.type;
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

export default function CardEditorPage() {
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
  const [values, setValues] = useState(() => getDefaultValuesForBlocks(DEFAULT_BLOCKS));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showBlockPicker, setShowBlockPicker] = useState(false);
  const [mediaCache, setMediaCache] = useState({});
  const [mainBlockId, setMainBlockId] = useState(null);
  const [subBlockId, setSubBlockId] = useState(null);
  const [generatingAudioBlockId, setGeneratingAudioBlockId] = useState(null);
  const [playingSampleVoiceId, setPlayingSampleVoiceId] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
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
        console.log("[RATIO] debounce saving — blocksRef image blocks", imageBlocksInRef.map((x) => ({ blockId: x.blockId, configJson: x.configJson })));
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
          const normalized = normalizeBlocks(cardData.blocksSnapshot) || DEFAULT_BLOCKS;
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
            setMainBlockId(cardData.mainBlockId ?? template?.mainBlockId ?? null);
            setSubBlockId(cardData.subBlockId ?? template?.subBlockId ?? null);
          } else {
            setMainBlockId(cardData.mainBlockId ?? null);
            setSubBlockId(cardData.subBlockId ?? null);
          }

          // Fetch media for image/audio blocks (display + original so Edit image can load original)
          for (const value of cardData.values || []) {
            const mediaIds = value.mediaIds || [];
            const originalMediaIds = value.originalMediaIds || [];
            const idsToFetch = [...new Set([...mediaIds, ...originalMediaIds])].filter(Boolean);
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
      console.log("[RATIO] updateBlockConfig", { blockId, cropAspect, configJsonLength: str.length, configJson: str });
    }
    setBlocks((prev) => {
      const next = prev.map((b) =>
        b.blockId === blockId
          ? { ...b, configJson: JSON.stringify(config) }
          : b
      );
      // Save ratio to card immediately so it's not lost (debounce may use stale ref)
      if (cropAspect != null && !isNewCard) {
        setSaving(true);
        persistCard(next, valuesRef.current, { redirect: false }).catch((err) => console.error("[RATIO] immediate save failed", err)).finally(() => setSaving(false));
      }
      return next;
    });
    scheduleTextAutoSave();
  };

  // Add a new block
  const addBlock = (type) => {
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
        if (dragScrollIntervalRef.current) clearInterval(dragScrollIntervalRef.current);
        dragScrollIntervalRef.current = setInterval(() => window.scrollBy({ top: -SCROLL_SPEED, behavior: "auto" }), 16);
      } else if (y > bottomZone) {
        if (dragScrollIntervalRef.current) clearInterval(dragScrollIntervalRef.current);
        dragScrollIntervalRef.current = setInterval(() => window.scrollBy({ top: SCROLL_SPEED, behavior: "auto" }), 16);
      } else {
        if (dragScrollIntervalRef.current) {
          clearInterval(dragScrollIntervalRef.current);
          dragScrollIntervalRef.current = null;
        }
      }
    };
    return () => {
      if (dragScrollIntervalRef.current) clearInterval(dragScrollIntervalRef.current);
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
      document.addEventListener("dragover", dragScrollHandlerRef.current, { passive: true });
    }
  }, []);

  // Handle image upload (with progress). Used after crop or for non-cropped files. Auto-saves when done.
  const handleImageUpload = async (blockId, files) => {
    const fileList = files?.length != null ? Array.from(files) : files ? [files] : [];
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
          onProgress: (percent) => setImageUploadProgress((p) => (p?.blockId === blockId ? { ...p, progress: percent } : p)),
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
    setImageCropPending({ blockId, files: arr, imageSrc, defaultAspect, initialCrop: cropState?.crop, initialZoom: cropState?.zoom, allowRatioChange });
  };

  // Edit existing image: load original (uncropped) when available, otherwise the display image so re-crop always works.
  const handleEditImage = useCallback(async (blockId, mediaId) => {
    const currentValue = values[blockId];
    const mediaIds = currentValue?.mediaIds || [];
    const originalMediaIds = currentValue?.originalMediaIds || [];
    const index = mediaIds.indexOf(mediaId);
    const originalMediaId = index >= 0 ? originalMediaIds[index] : null;
    const mediaIdToLoad = (originalMediaId && originalMediaId !== mediaId) ? originalMediaId : mediaId;
    let media = mediaCache[mediaIdToLoad];
    if (!media?.downloadUrl) {
      try {
        media = await getMedia(user.uid, mediaIdToLoad);
        if (media) setMediaCache((prev) => ({ ...prev, [mediaIdToLoad]: media }));
      } catch (e) {
        console.warn("[TRACE] handleEditImage: fetch media failed", mediaIdToLoad, e);
      }
    }
    if (!media?.downloadUrl) {
      console.warn("[TRACE] handleEditImage: no media in cache", { mediaIdToLoad, cacheKeys: Object.keys(mediaCache) });
      window.alert("Could not load image for editing. Try refreshing the page.");
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
      console.log("[RATIO] handleEditImage opening crop modal", { blockId, mediaId, defaultAspect, allowRatioChange });
      setImageCropPending({ blockId, imageSrc, defaultAspect, mediaIdToReplace: mediaId, initialCrop: cropState?.crop, initialZoom: cropState?.zoom, allowRatioChange });
    } catch (err) {
      console.error("[TRACE] handleEditImage failed", err);
      window.alert("Could not load image for editing. Please try again.");
    } finally {
      setImageEditLoading(null);
    }
  }, [mediaCache, blocks, values, user]);

  const handleCropComplete = async (blob, aspectUsedInModal, cropState) => {
    if (!imageCropPending) return;
    const { blockId, files, imageSrc, mediaIdToReplace } = imageCropPending;
    console.log("[RATIO] handleCropComplete", { blockId, mediaIdToReplace, aspectUsedInModal });
    URL.revokeObjectURL(imageSrc);

    const mergeCropConfig = (prev) => {
      const base = typeof prev === "string" ? safeJsonParse(prev) || {} : prev || {};
      const next = { ...base };
      if (aspectUsedInModal != null) next.cropAspect = aspectUsedInModal;
      if (cropState?.crop && typeof cropState.crop.x === "number" && typeof cropState.crop.y === "number") {
        next.cropX = cropState.crop.x;
        next.cropY = cropState.crop.y;
      }
      if (typeof cropState?.zoom === "number" && cropState.zoom >= 1 && cropState.zoom <= 3) next.cropZoom = cropState.zoom;
      return JSON.stringify(next);
    };

    if (mediaIdToReplace != null) {
      setImageCropPending(null);
      const oldMedia = mediaCache[mediaIdToReplace];
      const oldStoragePath = oldMedia?.storagePath ?? null;
      const croppedFile = new File([blob], "image.png", { type: blob.type || "image/png" });
      const replaceCheck = await checkStorageBeforeUpload(user, croppedFile.size);
      if (!replaceCheck.allowed) {
        window.alert(replaceCheck.message || "Cloud backup limit reached.");
        return;
      }
      try {
        setImageUploadProgress({ blockId, progress: 0 });
        const media = await uploadImage(user.uid, croppedFile, {
          onProgress: (percent) => setImageUploadProgress((p) => (p?.blockId === blockId ? { ...p, progress: percent } : p)),
        });
        setMediaCache((prev) => ({ ...prev, [media.mediaId]: media }));
        const currentValue = values[blockId];
        const mediaIds = (currentValue?.mediaIds || []).map((id) => (id === mediaIdToReplace ? media.mediaId : id));
        const originalMediaIds = currentValue?.originalMediaIds || [];

        const nextBlocks =
          (aspectUsedInModal != null || cropState)
            ? blocks.map((b) => (b.blockId === blockId ? { ...b, configJson: mergeCropConfig(b.configJson) } : b))
            : blocks;
        const nextValues = { ...values, [blockId]: { ...currentValue, mediaIds, originalMediaIds } };
        if (aspectUsedInModal != null || cropState) {
          console.log("[RATIO] handleCropComplete saving aspect/crop to block", { blockId, aspectUsedInModal, cropState: !!cropState });
          setBlocks(nextBlocks);
        }
        setValues(nextValues);

        const pathToDelete = oldStoragePath ?? (await getMedia(user.uid, mediaIdToReplace))?.storagePath ?? null;
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
          await persistCard((aspectUsedInModal != null || cropState) ? nextBlocks : blocks, nextValues, { redirect: false });
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

    const croppedFile = new File([blob], "image.png", { type: blob.type || "image/png" });
    const originalFile = files?.[0];
    setImageCropPending(null);
    console.log("[RATIO] handleCropComplete first-add flow", { blockId, aspectUsedInModal });

    if (originalFile) {
      let nextValues = { ...values };
      const currentValue = nextValues[blockId] || { blockId, type: "image" };
      let mediaIds = currentValue.mediaIds || [];
      let originalMediaIds = currentValue.originalMediaIds || [];

      const nextBlocks =
        aspectUsedInModal != null || cropState
          ? blocks.map((b) => (b.blockId === blockId ? { ...b, configJson: mergeCropConfig(b.configJson) } : b))
          : blocks;
      if (aspectUsedInModal != null || cropState) {
        console.log("[RATIO] handleCropComplete first-add saving aspect/crop to block", { blockId, aspectUsedInModal, cropState: !!cropState });
        setBlocks(nextBlocks);
      }

      const firstCheck = await checkStorageBeforeUpload(user, (originalFile?.size || 0) + (croppedFile?.size || 0));
      if (!firstCheck.allowed) {
        window.alert(firstCheck.message || "Cloud backup limit reached.");
        return;
      }
      try {
        setImageUploadProgress({ blockId, progress: 0 });
        const originalMedia = await uploadImage(user.uid, originalFile, {
          onProgress: (p) => setImageUploadProgress((prev) => (prev?.blockId === blockId ? { ...prev, progress: Math.min(50, p / 2) } : prev)),
        });
        setMediaCache((prev) => ({ ...prev, [originalMedia.mediaId]: originalMedia }));

        setImageUploadProgress({ blockId, progress: 50 });
        const displayMedia = await uploadImage(user.uid, croppedFile, {
          onProgress: (p) => setImageUploadProgress((prev) => (prev?.blockId === blockId ? { ...prev, progress: 50 + p / 2 } : prev)),
        });
        setMediaCache((prev) => ({ ...prev, [displayMedia.mediaId]: displayMedia }));

        mediaIds = [...mediaIds, displayMedia.mediaId];
        originalMediaIds = [...originalMediaIds, originalMedia.mediaId];
        nextValues = { ...nextValues, [blockId]: { ...currentValue, mediaIds, originalMediaIds } };
        setValues(nextValues);

        for (let i = 1; i < files.length; i++) {
          const file = files[i];
          const extraCheck = await checkStorageBeforeUpload(user, file.size);
          if (!extraCheck.allowed) {
            window.alert(extraCheck.message || "Cloud backup limit reached.");
            break;
          }
          setImageUploadProgress({ blockId, progress: 80 * (i / files.length) });
          const m = await uploadImage(user.uid, file, {
            onProgress: (p) => setImageUploadProgress((prev) => (prev?.blockId === blockId ? { ...prev, progress: 80 + (20 * p) / 100 } : prev)),
          });
          setMediaCache((prev) => ({ ...prev, [m.mediaId]: m }));
          mediaIds = [...mediaIds, m.mediaId];
          originalMediaIds = [...originalMediaIds, m.mediaId];
          nextValues = { ...nextValues, [blockId]: { ...nextValues[blockId], mediaIds, originalMediaIds } };
          setValues(nextValues);
        }

        setSaving(true);
        try {
          await persistCard((aspectUsedInModal != null || cropState) ? nextBlocks : blocks, nextValues, { redirect: false });
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

    const toUpload = files?.length > 1 ? [croppedFile, ...files.slice(1)] : [croppedFile];
    await handleImageUpload(blockId, toUpload);
  };

  const handleCropCancel = () => {
    if (imageCropPending?.imageSrc) URL.revokeObjectURL(imageCropPending.imageSrc);
    setImageCropPending(null);
  };

  // Remove image from block (and delete from Firestore + Storage)
  const removeImage = async (blockId, mediaId) => {
    const currentValue = values[blockId];
    const mediaIds = currentValue?.mediaIds || [];
    const originalMediaIds = currentValue?.originalMediaIds || [];
    const index = mediaIds.indexOf(mediaId);
    const originalMediaId = index >= 0 && originalMediaIds[index] ? originalMediaIds[index] : null;

    const toDelete = originalMediaId && originalMediaId !== mediaId ? [mediaId, originalMediaId] : [mediaId];
    for (const id of toDelete) {
      try {
        const media = mediaCache[id];
        const storagePath = media?.storagePath ?? (await getMedia(user.uid, id))?.storagePath;
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
      const newOriginalMediaIds = (cur.originalMediaIds || []).filter((_, i) => cur.mediaIds[i] !== mediaId);
      return {
        ...prev,
        [blockId]: {
          ...cur,
          mediaIds: newMediaIds,
          originalMediaIds: newOriginalMediaIds.length ? newOriginalMediaIds : undefined,
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
        const msg = err.error || res.statusText || "Sample failed";
        throw new Error(msg);
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
      const msg = error?.message || "Could not play sample";
      if (msg.includes("ELEVENLABS_API_KEY") || msg.includes("not configured")) {
        alert("Voice samples are not available. Add ELEVENLABS_API_KEY to .env.local to enable them.");
      } else {
        alert(msg);
      }
    } finally {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setPlayingSampleVoiceId(null);
    }
  }, []);

  // Persist card (optionally redirect after save). Ensure image blocks have configJson so crop aspect is saved.
  const persistCard = async (blocksToSave, valuesObj, options = {}) => {
    const { redirect = false } = options;
    const imageBefore = (blocksToSave || []).filter((x) => isImageBlock(x)).map((x) => ({ blockId: x.blockId, configJson: x.configJson }));
    const blocksWithImageConfig = ensureImageBlockConfig(blocksToSave || []);
    const imageAfter = blocksWithImageConfig.filter((x) => isImageBlock(x)).map((x) => ({ blockId: x.blockId, configJson: x.configJson }));
    if (imageBefore.length || imageAfter.length) {
      console.log("[RATIO] persistCard", { imageBlocksBefore: imageBefore, imageBlocksAfter: imageAfter });
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
        subBlockId ?? null
      );
      if (redirect) {
        router.push(`/dashboard/deck/${deckId}`);
      } else {
        router.replace(`/dashboard/deck/${deckId}/card/${created.cardId}`);
      }
    } else {
      await updateCard(user.uid, cardId, deckId, valuesArray, blocksWithImageConfig, mainBlockId ?? null, subBlockId ?? null);
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
      await persistCard(blocks, values, { redirect: true });
    } catch (error) {
      console.error("Error saving card:", error);
    } finally {
      setSaving(false);
    }
  };

  const cardValidation = getBlockValidationErrorsFromValidators(blocks, values, {
    resolveBlockType,
    getBlockConfig,
  });
  const isCardValid = cardValidation.valid;

  if (typeof window !== "undefined" && window.__DEBUG_CARD_VALIDATION__) {
    const blocksWithResolved = blocks.map((b) => ({ blockId: b.blockId, rawType: b.type, resolvedType: resolveBlockType(b), label: b.label, required: b.required }));
    console.log("[VALIDATION] card-editor", { valid: cardValidation.valid, errorCount: cardValidation.errors?.length ?? 0, errors: cardValidation.errors });
  }

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
          <button
            type="button"
            onClick={() => setShowPreviewModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/20 text-white/90 hover:bg-white/10 hover:border-white/30 transition-colors"
            title="Preview card"
          >
            <Eye className="w-4 h-4" />
            <span className="hidden sm:inline">Preview</span>
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
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

      {cardValidation.errors.length > 0 && (
        <div
          role="alert"
          className="mb-6 rounded-lg border-2 border-amber-500 bg-amber-500/25 text-amber-200 text-sm px-4 py-4 shadow-lg ring-2 ring-amber-400/30"
        >
          <p className="font-semibold mb-1">
            Please fix the {cardValidation.errors.length} error{cardValidation.errors.length === 1 ? "" : "s"} below before saving.
          </p>
          <p className="text-amber-200/90 text-xs mb-2">
            See the message under each block that has an error.
          </p>
          <ul className="list-disc list-inside text-amber-200/95 space-y-0.5">
            {cardValidation.errors.slice(0, 8).map((msg, i) => (
              <li key={i}>{msg}</li>
            ))}
          </ul>
        </div>
      )}

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
          const audioConfig = isAudio
            ? parseAudioBlockConfig(block.configJson, { mainBlockId })
            : {};
          const defaultVoiceId = audioConfig.defaultVoiceId || undefined;
          const defaultSourceBlockId = audioConfig.defaultSourceBlockId || undefined;
          const isDragging = draggedBlockIndex === index;
          const showDropDivider = dragOverBlockIndex === index;

          return (
            <Fragment key={block.blockId || `block-${index}`}>
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
                  e.dataTransfer.setData("text/plain", String(index));
                  setDraggedBlockIndex(index);
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
                  setDragOverBlockIndex(index);
                }}
                onDragLeave={() => setDragOverBlockIndex((i) => (i === index ? null : i))}
                onDrop={(e) => {
                  e.preventDefault();
                  const from = draggedBlockIndex;
                  if (from != null && from !== index) moveBlock(from, index);
                  setDraggedBlockIndex(null);
                  setDragOverBlockIndex(null);
                }}
                className={`rounded-xl transition-colors cursor-grab active:cursor-grabbing ${isDragging ? "opacity-60" : ""}`}
              >
              {((cardValidation.errorsByBlockId ?? {})[block.blockId] || []).length > 0 && (
                <div className="mb-2 rounded-lg border border-amber-500/50 bg-amber-500/10 text-amber-200 text-sm px-3 py-2">
                  <ul className="list-disc list-inside space-y-0.5">
                    {(cardValidation.errorsByBlockId ?? {})[block.blockId].map((msg, i) => (
                      <li key={i}>{msg}</li>
                    ))}
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
                onImageFileSelect={(files) => handleImageFileSelect(block.blockId, files)}
                onImageUpload={(files) => handleImageUpload(block.blockId, files)}
                onImageEdit={(mediaId) => handleEditImage(block.blockId, mediaId)}
                onImageRemove={(mediaId) => removeImage(block.blockId, mediaId)}
                imageUploadProgress={imageUploadProgress}
                imageEditLoading={imageEditLoading}
                onAudioUpload={(files) => handleAudioUpload(block.blockId, files)}
                onAudioRemove={(mediaId) => removeAudio(block.blockId, mediaId)}
                onGenerateAudio={audioProEntitled ? (text, voiceId) => handleGenerateAudio(block.blockId, text, voiceId) : undefined}
                generateAudioProRequired={isProduction && !audioProEntitled}
                onPlayVoiceSample={handlePlayVoiceSample}
                playingSampleVoiceId={playingSampleVoiceId}
                voiceOptions={ELEVENLABS_VOICES}
                defaultVoiceId={defaultVoiceId}
                defaultSourceBlockId={defaultSourceBlockId}
                generatingAudio={generatingAudioBlockId === block.blockId}
                onConfigChange={(config) => updateBlockConfig(block.blockId, config)}
              />
              </div>
            </Fragment>
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
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowPreviewModal(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-zinc-900 border border-white/10 rounded-xl shadow-2xl w-full max-w-md max-h-[85vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/10">
              <h2 className="text-sm font-medium text-white/90">Preview</h2>
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors"
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

  const [audioBlobUrls, setAudioBlobUrls] = useState({});
  const [loadingAudioMediaIds, setLoadingAudioMediaIds] = useState(() => new Set());
  const audioObjectUrlsRef = useRef({});

  useEffect(() => {
    const mediaIds = value?.mediaIds ?? [];
    const hasAllMedia = mediaIds.length > 0 && mediaIds.every((id) => mediaCache[id]?.downloadUrl);
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
      Object.values(audioObjectUrlsRef.current).forEach((u) => URL.revokeObjectURL(u));
      audioObjectUrlsRef.current = {};
    };
  }, [
    blockType,
    value?.mediaIds?.join(","),
    (value?.mediaIds ?? []).map((id) => (mediaCache[id]?.downloadUrl ? "1" : "0")).join(","),
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

      case "image": {
        const isUploading = imageUploadProgress?.blockId === block.blockId;
        const progress = imageUploadProgress?.progress ?? 0;
        const imageBlockConfig = getBlockConfig(block) || {};
        const imageCropAspect = getCropAspectFromConfig(imageBlockConfig);
        return (
          <div>
            {/* Image block settings: display aspect (applies to all images in block; no crop/zoom) */}
            <div className="mb-3">
              <span className="text-white/60 text-xs block mb-1.5">Display aspect</span>
              <div className="flex flex-wrap gap-2">
                {CROP_ASPECT_OPTIONS.map((opt) => (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => {
                      const nextConfig = { ...imageBlockConfig, cropAspect: opt.value };
                      console.log("[RATIO] button clicked", { blockId: block.blockId, cropAspect: opt.value, label: opt.label, hasOnConfigChange: !!onConfigChange, nextConfig });
                      onConfigChange?.(nextConfig);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      imageCropAspect === opt.value
                        ? "bg-accent/20 text-accent"
                        : "bg-white/5 text-white/70 hover:bg-white/10"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            {/* Image Preview Grid (centered) */}
            {value?.mediaIds && value.mediaIds.length > 0 && (
              <div className="flex justify-center mb-3">
                <div className={`gap-2 ${value.mediaIds.length === 1 ? "w-full max-w-[280px]" : "grid grid-cols-2 sm:grid-cols-3 w-full max-w-[320px] sm:max-w-md"}`}>
                {value.mediaIds.map((mediaId) => {
                  const media = mediaCache[mediaId];
                  if (!media?.downloadUrl) return null;
                  const isEditLoading = imageEditLoading === mediaId;
                  return (
                    <div
                      key={mediaId}
                      className="relative group w-full overflow-hidden rounded-xl"
                      style={{ aspectRatio: imageCropAspect }}
                    >
                      <Image
                        src={media.downloadUrl}
                        alt=""
                        fill
                        className="object-cover rounded-xl"
                      />
                      <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {onImageEdit && (
                          <button
                            type="button"
                            onClick={() => onImageEdit(mediaId)}
                            disabled={isEditLoading}
                            className="p-1 bg-white/20 hover:bg-white/30 rounded-full transition-colors disabled:opacity-50"
                            title="Edit / re-crop"
                          >
                            {isEditLoading ? (
                              <span className="inline-block w-3 h-3 border-2 border-white/80 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Pencil className="w-3 h-3 text-white" />
                            )}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onImageRemove(mediaId)}
                          className="p-1 bg-red-500 rounded-full hover:bg-red-600 transition-colors"
                          title="Remove"
                        >
                          <X className="w-3 h-3 text-white" />
                        </button>
                      </div>
                    </div>
                  );
                })}
                </div>
              </div>
            )}

            {/* Upload progress bar */}
            {isUploading && (
              <div className="mb-3">
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent transition-all duration-300"
                    style={{ width: `${Math.min(100, progress)}%` }}
                  />
                </div>
                <p className="text-white/60 text-xs mt-1">Uploading… {Math.round(progress)}%</p>
              </div>
            )}

            {/* Upload Area */}
            <label className={`flex items-center justify-center gap-2 py-4 border-2 border-dashed border-white/20 hover:border-accent/50 rounded-lg cursor-pointer transition-colors ${isUploading ? "pointer-events-none opacity-60" : ""}`}>
              <Upload className="w-5 h-5 text-white/50" />
              <span className="text-white/50 text-sm">
                Click to upload images (crop before upload)
              </span>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => {
                  const files = e.target.files;
                  if (files?.length) onImageFileSelect(files);
                  e.target.value = "";
                }}
                className="hidden"
              />
            </label>
          </div>
        );
      }

      case "audio": {
        const audioMediaIds = value?.mediaIds || [];
        return (
          <div>
            {audioMediaIds.length > 0 && (
              <div className="space-y-2 mb-3">
                {audioMediaIds.map((mediaId) => {
                  const media = mediaCache[mediaId];
                  if (!media?.downloadUrl) return null;
                  const isLoading = loadingAudioMediaIds.has(mediaId);
                  const src = audioBlobUrls[mediaId];
                  return (
                    <div key={mediaId} className="flex items-center gap-2">
                      {isLoading && (
                        <span className="w-4 h-4 border-2 border-white/50 border-t-transparent rounded-full animate-spin flex-shrink-0" aria-hidden />
                      )}
                      <audio
                        src={src ?? undefined}
                        controls
                        className="flex-1 rounded-lg bg-white/5 h-10 min-w-0"
                        style={{ minWidth: 0 }}
                      />
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
                  {generateAudioProRequired ? (
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                  <span className="text-amber-200/90 text-xs font-medium flex items-center gap-1.5 mb-2">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    Generate with AI (Pro)
                  </span>
                  <Link
                    href="/dashboard/subscription"
                    className="text-amber-400 hover:text-amber-300 text-sm font-medium"
                  >
                    Upgrade to Pro to generate audio
                  </Link>
                </div>
              ) : onGenerateAudio ? (
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
              ) : null}
            </div>
          </div>
        );
      }

      case "divider":
        return <hr className="border-white/20" />;

      case "space": {
        const spaceConfig = getBlockConfig(block) || { height: 32 };
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
        const qConfig = getBlockConfig(block) || {
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
        const qConfig = getBlockConfig(block) || {
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
                Options — check to mark correct
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
                    className={`w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                      correct.has(option) && option
                        ? "border-accent bg-accent text-white"
                        : "border-white/30 text-transparent"
                    }`}
                  >
                    {correct.has(option) && option && <Check className="w-3 h-3" strokeWidth={2.5} />}
                  </button>
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
        const qConfig = getBlockConfig(block) || {
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
