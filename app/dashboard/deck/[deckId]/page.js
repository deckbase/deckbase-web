"use client";

import { useCallback, useEffect, useState, useRef, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Plus,
  MoreVertical,
  Edit2,
  Trash2,
  Eye,
  Layers,
  X,
  Search,
  Upload,
  FileSpreadsheet,
  FileText,
  Table2,
  Check,
  Play,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Copy,
  Settings,
  Download,
  ChevronDown,
  Volume2,
  Pause,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import { useRevenueCat } from "@/contexts/RevenueCatContext";
import {
  getDeck,
  updateDeck,
  subscribeToCards,
  getCards,
  deleteCard,
  createCard,
  updateCard,
  getTemplates,
  getTemplate,
  createDefaultTemplates,
  uploadAudio,
  uploadImage,
  getMedia,
  BlockTypeNames,
} from "@/utils/firestore";
import { getBlockValidationErrors } from "@/lib/block-validators";
import { checkStorageBeforeUpload } from "@/lib/storage-check-client";
import { buildCardPrompt, buildImportQuizAudioPrompt } from "@/lib/card-ai-prompt";
import {
  parseFile,
  SpreadsheetFileType,
  getFileTypeFromPath,
} from "@/utils/spreadsheetParser";
import { exportApkgToBlob } from "@/utils/apkgExport";
import { deckTitleToExportFilenameBase } from "@/utils/exportFilename";
import { parseAudioBlockConfig } from "@/lib/audio-block-config";
import ExcelJS from "exceljs";

// Import steps matching mobile
const ImportStep = {
  loadFile: 1,
  selectRows: 2,
  mapColumns: 3,
  importing: 4,
};

/** Template/card blocks: missing side = front */
const effectiveBlockSide = (b) => (b?.side === "back" ? "back" : "front");

/** Anki CSV/APKG column headers often named "Front" / "Back" */
const inferColumnFaceFromHeader = (header) => {
  const s = String(header ?? "").trim().toLowerCase();
  if (s === "front" || s.startsWith("front ")) return "front";
  if (s === "back" || s.startsWith("back ")) return "back";
  return null;
};

const isProduction = process.env.NODE_ENV === "production";

export default function DeckDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { isConfigured: rcConfigured, isPro } = useRevenueCat();
  const aiEntitled = !isProduction || !rcConfigured || isPro;
  const deckId = params.deckId;

  const [deck, setDeck] = useState(null);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);
  const [actionMenuCardId, setActionMenuCardId] = useState(null);

  // Edit deck: edit mode for title/description + bulk delete
  const [deckEditMode, setDeckEditMode] = useState(false);
  const [editDeckTitle, setEditDeckTitle] = useState("");
  const [editDeckDescription, setEditDeckDescription] = useState("");
  const [savingDeck, setSavingDeck] = useState(false);
  /** After tapping Edit, delay swapping in "Done" so the same tap can't submit (pointer-up on new button). */
  const enterEditModeRafRef = useRef(null);

  // Bulk delete cards
  const [bulkSelectMode, setBulkSelectMode] = useState(false);
  const [selectedCardIds, setSelectedCardIds] = useState(new Set());
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Import state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importData, setImportData] = useState(null);
  const [importStep, setImportStep] = useState(ImportStep.loadFile);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // Step 2: Row selection
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [selectAllRows, setSelectAllRows] = useState(true);

  // Step 3: Template & mapping
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [columnMappings, setColumnMappings] = useState([]); // [{columnIndex, blockId, columnName, blockLabel, generateWithAI?}]
  const [pendingColumnIndex, setPendingColumnIndex] = useState(null); // For two-way selection
  const [pendingBlockId, setPendingBlockId] = useState(null); // For two-way selection

  // Step 4: Importing
  const [importing, setImporting] = useState(false);
  const [importAIGenerating, setImportAIGenerating] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importedCount, setImportedCount] = useState(0);
  const [importUseAILoading, setImportUseAILoading] = useState(false);
  const [importUseAIError, setImportUseAIError] = useState(null);
  const [importDevPromptCopied, setImportDevPromptCopied] = useState(false);
  const [importAIBatchProgress, setImportAIBatchProgress] = useState(null); // { current, total } when batching
  const [importAudioGenerating, setImportAudioGenerating] = useState(false); // true while calling ElevenLabs for current card
  const [importAudioCompleted, setImportAudioCompleted] = useState(0);
  const [importAudioFailed, setImportAudioFailed] = useState(0);

  // Add card with AI
  const [showAddWithAIModal, setShowAddWithAIModal] = useState(false);
  const [addWithAITemplateId, setAddWithAITemplateId] = useState("");
  const [addWithAICount, setAddWithAICount] = useState(1);
  const [addWithAIGenerating, setAddWithAIGenerating] = useState(false);
  const [addWithAIProgress, setAddWithAIProgress] = useState(null);
  const [addWithAIError, setAddWithAIError] = useState(null);
  const [addWithAIDevPrompt, setAddWithAIDevPrompt] = useState(null);
  const [showDevPrompt, setShowDevPrompt] = useState(false);
  const [addWithAISuccess, setAddWithAISuccess] = useState(null);
  const [addWithAIGeneratedCards, setAddWithAIGeneratedCards] = useState([]);
  const [addWithAISelectedIndices, setAddWithAISelectedIndices] = useState(new Set());
  const [addWithAIReferenceCardIds, setAddWithAIReferenceCardIds] = useState(new Set());
  const [editingGeneratedCardIndex, setEditingGeneratedCardIndex] = useState(null);
  const addWithAIAddingToDeckRef = useRef(false);
  const isDev = process.env.NODE_ENV === "development";
  const [addWithAIPreviewLoading, setAddWithAIPreviewLoading] = useState(false);
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [promptModalContent, setPromptModalContent] = useState(null);

  // Import from file (file → AI cards)
  const [showFileToAIModal, setShowFileToAIModal] = useState(false);
  const [fileToAIFile, setFileToAIFile] = useState(null);
  const [fileToAITemplateId, setFileToAITemplateId] = useState("");
  const [fileToAIMaxCards, setFileToAIMaxCards] = useState(15);
  const [fileToAILoading, setFileToAILoading] = useState(false);
  const [fileToAIError, setFileToAIError] = useState(null);
  const [fileToAIDragging, setFileToAIDragging] = useState(false);
  const [fileToAISuccessResult, setFileToAISuccessResult] = useState(null); // { cards, _devPrompt } after successful run
  const [fileToAIDevPromptCopied, setFileToAIDevPromptCopied] = useState(false);
  const [fileToAIDevPromptOpen, setFileToAIDevPromptOpen] = useState(true);
  const [fileToAIPreviewPrompt, setFileToAIPreviewPrompt] = useState(null); // { system, user } from Preview prompt (form view)
  const [fileToAIPreviewLoading, setFileToAIPreviewLoading] = useState(false);
  const [fileToAIPreviewPromptOpen, setFileToAIPreviewPromptOpen] = useState(false);
  const [fileToAIPreviewUrl, setFileToAIPreviewUrl] = useState(null); // object URL for image preview
  const [fileToAIReferenceCardIds, setFileToAIReferenceCardIds] = useState(new Set());
  const fileToAIFileInputRef = useRef(null);
  const fileToAIPreviewPromptBlockRef = useRef(null);

  // Create/revoke image preview URL when file changes
  useEffect(() => {
    if (!fileToAIFile || !FILE_TO_AI_IMAGE_MIMES.includes((fileToAIFile.type || "").toLowerCase())) {
      setFileToAIPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      return;
    }
    const url = URL.createObjectURL(fileToAIFile);
    setFileToAIPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [fileToAIFile]);

  const FILE_TO_AI_ACCEPT_EXT = [".pdf", ".docx", ".png", ".jpg", ".jpeg", ".webp"];
  const FILE_TO_AI_IMAGE_MIMES = ["image/png", "image/jpeg", "image/webp"];
  const isFileToAIAccepted = (file) => {
    if (!file) return false;
    if (file.type && FILE_TO_AI_IMAGE_MIMES.includes(file.type.toLowerCase())) return true;
    if (!file.name) return false;
    const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
    return FILE_TO_AI_ACCEPT_EXT.includes(ext);
  };

  // Add card (normal): template vs blank
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [addCardMode, setAddCardMode] = useState("template"); // "template" | "blank"
  const [addCardTemplateId, setAddCardTemplateId] = useState("");

  // Export as dropdown
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef(null);

  // Card carousel: image/audio preview URLs (cardId -> { imageUrl?, audioUrl? })
  const [cardMediaCache, setCardMediaCache] = useState({});
  const [playingCardId, setPlayingCardId] = useState(null);
  const deckAudioRef = useRef(null);
  const deckAudioObjectUrlRef = useRef(null);

  const handleDeckCardAudioClick = useCallback(async (e, cardId, audioUrl) => {
    e.preventDefault();
    e.stopPropagation();
    const audio = deckAudioRef.current;
    console.log("[DeckCardAudio] click", { cardId, audioUrl: !!audioUrl, audioUrlLength: audioUrl?.length, hasAudioRef: !!audio, playingCardId });
    if (!audio) {
      console.warn("[DeckCardAudio] no audio ref");
      return;
    }
    if (!audioUrl) {
      console.warn("[DeckCardAudio] no audioUrl");
      return;
    }
    if (playingCardId === cardId) {
      console.log("[DeckCardAudio] pause");
      audio.pause();
      if (deckAudioObjectUrlRef.current) {
        URL.revokeObjectURL(deckAudioObjectUrlRef.current);
        deckAudioObjectUrlRef.current = null;
      }
      setPlayingCardId(null);
      return;
    }
    if (deckAudioObjectUrlRef.current) {
      URL.revokeObjectURL(deckAudioObjectUrlRef.current);
      deckAudioObjectUrlRef.current = null;
    }
    try {
      console.log("[DeckCardAudio] fetch proxy");
      const res = await fetch("/api/proxy-media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: audioUrl }),
      });
      if (!res.ok) {
        console.warn("[DeckCardAudio] proxy failed", res.status, await res.text());
        setPlayingCardId(null);
        return;
      }
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      deckAudioObjectUrlRef.current = objectUrl;
      audio.src = objectUrl;
      const onEnded = () => {
        if (deckAudioObjectUrlRef.current) {
          URL.revokeObjectURL(deckAudioObjectUrlRef.current);
          deckAudioObjectUrlRef.current = null;
        }
        setPlayingCardId(null);
      };
      audio.addEventListener("ended", onEnded, { once: true });
      console.log("[DeckCardAudio] play start");
      await audio.play();
      console.log("[DeckCardAudio] play() resolved");
      setPlayingCardId(cardId);
    } catch (err) {
      console.warn("[DeckCardAudio] play() failed", err?.name, err?.message, err);
      if (deckAudioObjectUrlRef.current) {
        URL.revokeObjectURL(deckAudioObjectUrlRef.current);
        deckAudioObjectUrlRef.current = null;
      }
      setPlayingCardId(null);
    }
  }, [playingCardId]);

  // Most-used template in this deck (when no explicit default is set)
  const mostUsedTemplateId = useMemo(() => {
    if (!cards.length) return null;
    const counts = {};
    for (const card of cards) {
      const id = card.templateId ?? null;
      if (id != null) counts[id] = (counts[id] || 0) + 1;
    }
    const entries = Object.entries(counts);
    if (entries.length === 0) return null;
    entries.sort((a, b) => b[1] - a[1]);
    return entries[0][0];
  }, [cards]);

  // Effective default: explicit deck default, else most used in deck, else first template
  const effectiveDefaultTemplateId =
    (deck?.defaultTemplateId && templates.some((t) => t.templateId === deck.defaultTemplateId)
      ? deck.defaultTemplateId
      : null) ||
    (mostUsedTemplateId && templates.some((t) => t.templateId === mostUsedTemplateId)
      ? mostUsedTemplateId
      : null) ||
    templates[0]?.templateId ||
    null;

  useEffect(() => {
    if (showAddWithAIModal && templates.length > 0 && !addWithAITemplateId && effectiveDefaultTemplateId) {
      setAddWithAITemplateId(effectiveDefaultTemplateId);
    }
  }, [showAddWithAIModal, templates, addWithAITemplateId, effectiveDefaultTemplateId]);

  useEffect(() => {
    if (showAddWithAIModal && addWithAITemplateId && templates.length > 0) {
      const selected = templates.find((t) => t.templateId === addWithAITemplateId);
      if (selected) {
        console.log("[add-with-ai] template selected (UI / cache)", {
          templateId: selected.templateId,
          name: selected.name,
          blockCount: selected.blocks?.length,
          blockTypes: (selected.blocks || []).map((b) => ({ id: b.blockId?.slice(0, 8), type: b.type, label: b.label })),
        });
      }
    }
  }, [showAddWithAIModal, addWithAITemplateId, templates]);

  useEffect(() => {
    if (showFileToAIModal && templates.length > 0 && !fileToAITemplateId && effectiveDefaultTemplateId) {
      setFileToAITemplateId(effectiveDefaultTemplateId);
    }
  }, [showFileToAIModal, templates, fileToAITemplateId, effectiveDefaultTemplateId]);

  useEffect(() => {
    if (showAddCardModal && templates.length > 0 && !addCardTemplateId && effectiveDefaultTemplateId) {
      setAddCardTemplateId(effectiveDefaultTemplateId);
    }
  }, [showAddCardModal, templates, addCardTemplateId, effectiveDefaultTemplateId]);

  useEffect(() => {
    if (!user || !deckId) return;

    const fetchDeck = async () => {
      const deckData = await getDeck(user.uid, deckId);
      if (deckData && !deckData.isDeleted) {
        setDeck(deckData);
      } else {
        router.push("/dashboard");
      }
    };

    fetchDeck();

    const unsubscribe = subscribeToCards(user.uid, deckId, (fetchedCards) => {
      setCards(fetchedCards);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, deckId, router]);

  useEffect(() => {
    return () => {
      if (enterEditModeRafRef.current != null) {
        cancelAnimationFrame(enterEditModeRafRef.current);
        enterEditModeRafRef.current = null;
      }
    };
  }, []);

  // Sync inline edit fields when deck loads (skip while in edit mode so we don't overwrite user input)
  useEffect(() => {
    if (deck && !deckEditMode) {
      setEditDeckTitle(deck.title ?? "");
      setEditDeckDescription(deck.description ?? "");
    }
  }, [deck, deckEditMode]);

  // Load templates on page load (for card previews with main/sub blocks)
  useEffect(() => {
    if (user) {
      const loadTemplates = async () => {
        let userTemplates = await getTemplates(user.uid);
        if (userTemplates.length === 0) {
          userTemplates = await createDefaultTemplates(user.uid);
        }
        setTemplates(userTemplates);
      };
      loadTemplates();
    }
  }, [user]);

  const isImageBlock = (b) => b?.type === "image" || b?.type === 6;
  const isAudioBlockType = (b) => b?.type === "audio" || b?.type === 7 || b?.type === "7";

  // Load first image/audio media URL per card for carousel preview (parallel fetches)
  useEffect(() => {
    if (!user || !cards.length) return;
    let cancelled = false;
    const load = async () => {
      const cardsSlice = cards.slice(0, 50);
      const needs = []; // { cardId, imageMediaId?, audioMediaId? }
      for (const card of cardsSlice) {
        const blocks = card.blocksSnapshot || [];
        const values = card.values || [];
        const imageBlock = blocks.find(isImageBlock);
        const audioBlock = blocks.find(isAudioBlockType);
        const imageMediaId = imageBlock ? (values.find((v) => v.blockId === imageBlock.blockId)?.mediaIds || [])[0] : null;
        const audioMediaId = audioBlock ? (values.find((v) => v.blockId === audioBlock.blockId)?.mediaIds || [])[0] : null;
        if (imageMediaId || audioMediaId) {
          needs.push({ cardId: card.cardId, imageMediaId: imageMediaId || null, audioMediaId: audioMediaId || null });
        }
      }
      const mediaIds = [...new Set(needs.flatMap((n) => [n.imageMediaId, n.audioMediaId].filter(Boolean)))];
      const results = await Promise.all(
        mediaIds.map((id) => getMedia(user.uid, id).then((m) => ({ id, url: m?.downloadUrl || null })).catch(() => ({ id, url: null })))
      );
      if (cancelled) return;
      const urlByMediaId = Object.fromEntries(results.map((r) => [r.id, r.url]).filter(([, u]) => u));
      const unresolved = needs.flatMap(({ cardId, imageMediaId, audioMediaId }) => {
        const missing = [];
        if (imageMediaId && !urlByMediaId[imageMediaId]) {
          missing.push({ cardId, mediaId: imageMediaId, kind: "image" });
        }
        if (audioMediaId && !urlByMediaId[audioMediaId]) {
          missing.push({ cardId, mediaId: audioMediaId, kind: "audio" });
        }
        return missing;
      });
      if (unresolved.length > 0) {
        console.warn("[DeckMediaResolve] unresolved media for cards", {
          uid: user.uid,
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || null,
          count: unresolved.length,
          unresolved: unresolved.slice(0, 20),
        });
      }
      const next = {};
      for (const { cardId, imageMediaId, audioMediaId } of needs) {
        const imageUrl = imageMediaId ? urlByMediaId[imageMediaId] : null;
        const audioUrl = audioMediaId ? urlByMediaId[audioMediaId] : null;
        if (imageUrl || audioUrl) next[cardId] = { ...(next[cardId] || {}), ...(imageUrl && { imageUrl }), ...(audioUrl && { audioUrl }) };
      }
      if (Object.keys(next).some((id) => next[id].audioUrl)) {
        console.log("[DeckCardAudio] cache filled with audio", Object.entries(next).filter(([, v]) => v.audioUrl).map(([id, v]) => ({ cardId: id, audioUrlLen: v.audioUrl?.length })));
      }
      if (!cancelled) setCardMediaCache((prev) => ({ ...prev, ...next }));
    };
    load();
    return () => { cancelled = true; };
  }, [user, cards]);

  const handleDeleteCard = async () => {
    if (!selectedCard) return;
    try {
      await deleteCard(user.uid, selectedCard.cardId, deckId);
      setShowDeleteModal(false);
      setSelectedCard(null);
    } catch (error) {
      console.error("Error deleting card:", error);
    }
  };

  const handleSaveEditDeck = async (e) => {
    e?.preventDefault?.();
    if (!deck || !editDeckTitle.trim()) return;
    setSavingDeck(true);
    try {
      await updateDeck(user.uid, deckId, {
        title: editDeckTitle.trim(),
        description: editDeckDescription.trim(),
      });
      setDeck((prev) =>
        prev
          ? { ...prev, title: editDeckTitle.trim(), description: editDeckDescription.trim() }
          : prev
      );
      exitDeckEditMode();
    } catch (error) {
      console.error("Error updating deck:", error);
    } finally {
      setSavingDeck(false);
    }
  };

  const enterDeckEditMode = () => {
    if (enterEditModeRafRef.current != null) {
      cancelAnimationFrame(enterEditModeRafRef.current);
      enterEditModeRafRef.current = null;
    }
    setEditDeckTitle(deck?.title ?? "");
    setEditDeckDescription(deck?.description ?? "");
    // Defer turning on edit mode until after this pointer gesture completes; otherwise the
    // same tap can "click" the Done (submit) button that replaces Edit at the same screen position.
    enterEditModeRafRef.current = requestAnimationFrame(() => {
      enterEditModeRafRef.current = requestAnimationFrame(() => {
        enterEditModeRafRef.current = null;
        setDeckEditMode(true);
        setBulkSelectMode(true);
      });
    });
  };

  const exitDeckEditMode = () => {
    if (enterEditModeRafRef.current != null) {
      cancelAnimationFrame(enterEditModeRafRef.current);
      enterEditModeRafRef.current = null;
    }
    setDeckEditMode(false);
    setBulkSelectMode(false);
    setSelectedCardIds(new Set());
    setEditDeckTitle(deck?.title ?? "");
    setEditDeckDescription(deck?.description ?? "");
  };

  const toggleBulkSelectCard = (cardId) => {
    setSelectedCardIds((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) next.delete(cardId);
      else next.add(cardId);
      return next;
    });
  };

  const selectAllFilteredCards = () => {
    setSelectedCardIds(new Set(filteredCards.map((c) => c.cardId)));
  };

  const clearBulkSelection = () => {
    setSelectedCardIds(new Set());
    setBulkSelectMode(false);
  };

  const handleBulkDeleteCards = async () => {
    if (selectedCardIds.size === 0) return;
    setBulkDeleting(true);
    try {
      for (const cardId of selectedCardIds) {
        await deleteCard(user.uid, cardId, deckId);
      }
      setShowBulkDeleteModal(false);
      setSelectedCardIds(new Set());
      setBulkSelectMode(false);
    } catch (error) {
      console.error("Error bulk deleting cards:", error);
    } finally {
      setBulkDeleting(false);
    }
  };

  // ==================== Import Handlers ====================

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processImportFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const validExtensions = [".csv", ".xlsx", ".xls", ".apkg"];
    const fileExt = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
    if (!validExtensions.includes(fileExt)) {
      alert("Please drop a CSV, Excel (.xlsx), or Anki (.apkg) file.");
      return;
    }

    await processImportFile(file);
  };

  const processImportFile = async (file) => {
    try {
      const fileType = getFileTypeFromPath(file.name);
      const isExcelOrApkg =
        fileType === SpreadsheetFileType.apkg ||
        fileType === SpreadsheetFileType.xlsx ||
        fileType === SpreadsheetFileType.xls;
      if (isProduction && !aiEntitled && isExcelOrApkg) {
        alert("Pro subscription required to import Excel or Anki (.apkg) files.");
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      let data;

      if (fileType === SpreadsheetFileType.apkg) {
        const { parseApkgFile } = await import("@/utils/apkgParser");
        const apkgData = await parseApkgFile(file);
        data = apkgData.toSpreadsheetData();
      } else {
        data = await parseFile(file);
      }

      setImportData(data);
      setSelectedRows(new Set());
      setSelectAllRows(true);
      setImportStep(ImportStep.selectRows);
    } catch (error) {
      console.error("Error parsing file:", error);
      alert("Error parsing file: " + error.message);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Row selection
  const toggleRowSelection = (rowIndex) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(rowIndex)) {
      newSelected.delete(rowIndex);
    } else {
      newSelected.add(rowIndex);
    }
    setSelectedRows(newSelected);
    setSelectAllRows(false);
  };

  const toggleSelectAll = () => {
    if (selectAllRows) {
      setSelectAllRows(false);
      setSelectedRows(new Set());
    } else {
      setSelectAllRows(true);
      setSelectedRows(new Set());
    }
  };

  const getSelectedRowCount = () => {
    if (selectAllRows) return importData?.rowCount || 0;
    return selectedRows.size;
  };

  const getRowsToImport = () => {
    if (!importData) return [];
    if (selectAllRows) return importData.rows;
    return importData.rows.filter((_, idx) => selectedRows.has(idx));
  };

  // Close export menu on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target)) {
        setShowExportMenu(false);
      }
    };
    if (showExportMenu) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [showExportMenu]);

  // Export deck as CSV or XLSX
  const getExportColumns = useMemo(() => {
    if (!cards.length) return [];
    const blocks = cards[0].blocksSnapshot || [];
    return blocks.map((b) => {
      const base = b.label || b.blockId || "Block";
      const label =
        effectiveBlockSide(b) === "back" ? `[Back] ${base}` : `[Front] ${base}`;
      return { blockId: b.blockId, label };
    });
  }, [cards]);

  const buildExportRows = useCallback(() => {
    const cols = getExportColumns;
    if (!cols.length) return { headers: [], rows: [] };
    const headers = cols.map((c) => c.label);
    const rows = cards.map((card) => {
      const valueByBlockId = {};
      for (const v of card.values || []) {
        const isAudio = v.type === "audio" || v.type === 7 || v.type === "7";
        valueByBlockId[v.blockId] = isAudio && (v.mediaIds?.length > 0) ? "[Audio]" : (v.text || "");
      }
      const row = {};
      cols.forEach((c) => {
        row[c.label] = valueByBlockId[c.blockId] ?? "";
      });
      return row;
    });
    return { headers, rows };
  }, [cards, getExportColumns]);

  const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = () => {
    setShowExportMenu(false);
    if (!cards.length) {
      alert("No cards to export.");
      return;
    }
    const { headers, rows } = buildExportRows();
    if (!headers.length) {
      alert("No columns to export.");
      return;
    }
    const escape = (s) => {
      const t = String(s ?? "").replace(/"/g, '""');
      return t.includes(",") || t.includes("\n") || t.includes('"') ? `"${t}"` : t;
    };
    const line = (row) => headers.map((h) => escape(row[h])).join(",");
    const csv = "\uFEFF" + [headers.join(","), ...rows.map(line)].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    downloadBlob(blob, `${deckTitleToExportFilenameBase(deck?.title)}.csv`);
  };

  const handleExportXLSX = async () => {
    setShowExportMenu(false);
    if (isProduction && !aiEntitled) {
      alert("Pro subscription required to export as Excel (.xlsx).");
      return;
    }
    if (!cards.length) {
      alert("No cards to export.");
      return;
    }
    const { rows } = buildExportRows();
    if (!rows.length) {
      alert("No data to export.");
      return;
    }
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Cards");
    if (rows.length > 0) {
      worksheet.columns = Object.keys(rows[0]).map((key) => ({ header: key, key }));
      rows.forEach((row) => worksheet.addRow(row));
    }
    const buf = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    downloadBlob(blob, `${deckTitleToExportFilenameBase(deck?.title)}.xlsx`);
  };

  const [exportApkgLoading, setExportApkgLoading] = useState(false);
  const handleExportAPKG = async () => {
    setShowExportMenu(false);
    if (isProduction && !aiEntitled) {
      alert("Pro subscription required to export as Anki (.apkg).");
      return;
    }
    if (!cards.length) {
      alert("No cards to export.");
      return;
    }
    if (!user?.uid) {
      alert("You must be signed in to export.");
      return;
    }
    setExportApkgLoading(true);
    try {
      console.log("[APKG Export] start", { cardsCount: cards.length, deckTitle: deck?.title });
      const token = await user.getIdToken();
      console.log("[APKG Export] token", token ? "present" : "missing");
      const getMediaBytes = async (mediaId) => {
        const headers = { "Content-Type": "application/json" };
        if (token) headers.Authorization = `Bearer ${token}`;
        const res = await fetch("/api/media/bytes", {
          method: "POST",
          headers,
          body: JSON.stringify({ mediaId }),
        });
        if (!res.ok) {
          console.warn("[APKG Export] getMediaBytes failed", { mediaId, status: res.status });
          return null;
        }
        const buf = await res.arrayBuffer();
        const bytes = new Uint8Array(buf);
        console.log("[APKG Export] getMediaBytes ok", { mediaId, bytesLength: bytes.length });
        return bytes;
      };
      const blob = await exportApkgToBlob({
        deckName: deck?.title || "Deck",
        cards,
        getMediaBytes,
      });
      console.log("[APKG Export] done", { blobSize: blob?.size });
      downloadBlob(blob, `${deckTitleToExportFilenameBase(deck?.title)}.apkg`);
    } catch (err) {
      console.error("APKG export failed", err);
      alert(err?.message || "Export failed. Try again.");
    } finally {
      setExportApkgLoading(false);
    }
  };

  // Template & Column mapping
  const selectTemplate = (template) => {
    setSelectedTemplate(template);
    setColumnMappings([]);
    setPendingColumnIndex(null);
    setPendingBlockId(null);
  };

  const setMapping = (columnIndex, blockId) => {
    if (!importData || !selectedTemplate) return;

    const columnName =
      importData.headers[columnIndex] || `Column ${columnIndex + 1}`;
    const block = selectedTemplate.blocks.find((b) => b.blockId === blockId);
    if (!block) return;

    // Remove existing mapping for this column or block
    const filtered = columnMappings.filter(
      (m) => m.columnIndex !== columnIndex && m.blockId !== blockId
    );

    filtered.push({
      columnIndex,
      blockId,
      columnName,
      blockLabel: block.label,
      generateWithAI: false,
    });

    setColumnMappings(filtered);
    setPendingColumnIndex(null);
    setPendingBlockId(null);
  };

  const setMappingGenerateWithAI = (blockId) => {
    if (!selectedTemplate) return;
    const block = selectedTemplate.blocks.find((b) => b.blockId === blockId);
    if (!block || !isBlockEligibleForGenerateWithAI(block)) return;
    const filtered = columnMappings.filter((m) => m.blockId !== blockId);
    filtered.push({
      columnIndex: -1,
      blockId,
      columnName: "(AI)",
      blockLabel: block.label,
      generateWithAI: true,
    });
    setColumnMappings(filtered);
    setPendingBlockId(null);
    setPendingColumnIndex(null);
  };

  const removeMapping = (columnIndex) => {
    setColumnMappings(
      columnMappings.filter((m) => m.columnIndex !== columnIndex)
    );
  };

  const removeBlockMapping = (blockId) => {
    setColumnMappings(columnMappings.filter((m) => m.blockId !== blockId));
  };

  const handleColumnClick = (columnIndex) => {
    const existingMapping = getMappingForColumn(columnIndex);
    if (existingMapping) {
      // Already mapped - remove it
      removeMapping(columnIndex);
      return;
    }

    if (pendingBlockId !== null) {
      // Block was selected first - complete the mapping
      setMapping(columnIndex, pendingBlockId);
    } else {
      // Select this column, wait for block selection
      setPendingColumnIndex(columnIndex);
      setPendingBlockId(null);
    }
  };

  const handleBlockClick = (blockId) => {
    const existingMapping = getMappingForBlock(blockId);
    if (existingMapping) {
      removeBlockMapping(blockId);
      return;
    }

    if (pendingColumnIndex !== null) {
      setMapping(pendingColumnIndex, blockId);
      return;
    }

    // Tap selected block again to deselect
    if (pendingBlockId === blockId) {
      setPendingBlockId(null);
      setPendingColumnIndex(null);
      return;
    }

    setPendingBlockId(blockId);
    setPendingColumnIndex(null);
  };

  const getMappingForColumn = (columnIndex) => {
    return columnMappings.find((m) => m.columnIndex === columnIndex);
  };

  const getMappingForBlock = (blockId) => {
    return columnMappings.find((m) => m.blockId === blockId);
  };

  const isBlockEligibleForGenerateWithAI = (block) => {
    const t = block?.type;
    if (t == null) return false;
    if (t === "audio" || t === 7 || t === "7") return true;
    const tNum = typeof t === "string" && /^[0-9]+$/.test(t) ? parseInt(t, 10) : t;
    if (tNum === 8 || tNum === 9 || tNum === 10) return true;
    const tStr = String(t).toLowerCase();
    if (
      tStr === "quizsingleselect" ||
      tStr === "quizmultiselect" ||
      tStr === "quiztextanswer"
    )
      return true;
    return false;
  };

  // Check if can proceed
  const canProceedToNextStep = () => {
    switch (importStep) {
      case ImportStep.loadFile:
        return importData !== null;
      case ImportStep.selectRows:
        return getSelectedRowCount() > 0;
      case ImportStep.mapColumns:
        return selectedTemplate !== null && columnMappings.length > 0;
      default:
        return false;
    }
  };

  // Navigation
  const nextStep = () => {
    if (!canProceedToNextStep()) return;
    if (importStep < ImportStep.importing) {
      setImportStep(importStep + 1);
    }
  };

  const previousStep = () => {
    if (
      importStep > ImportStep.loadFile &&
      importStep !== ImportStep.importing
    ) {
      setImportStep(importStep - 1);
    }
  };

  // Import cards
  const handleImport = async () => {
    if (!importData || !selectedTemplate || columnMappings.length === 0) return;
    const hasAIMappings = columnMappings.some((m) => m.generateWithAI);
    if (hasAIMappings && !aiEntitled) {
      alert("Pro subscription required to use \"Generate with AI\" for template blocks.");
      return;
    }

    setImporting(true);
    setImportStep(ImportStep.importing);
    setImportProgress(0);
    setImportedCount(0);
    setImportAIGenerating(false);

    try {
      const rows = getRowsToImport();
      let aiCards = [];
      // Unified progress: quiz batches + card creation (0..1)
      let importTotalSteps = rows.length;
      let importCompletedBeforeCards = 0;

      if (hasAIMappings && rows.length > 0) {
        const headers = (importData.headers || []).slice();
        const tableRows = rows.map((r) =>
          (Array.isArray(r) ? r : []).map((c) => String(c ?? "").trim())
        );
        const CHUNK_SIZE = 30;
        const chunks = [];
        for (let i = 0; i < tableRows.length; i += CHUNK_SIZE) {
          chunks.push(tableRows.slice(i, i + CHUNK_SIZE));
        }
        // Claude generates quiz only. Audio "Use AI" uses row main text (TTS later).
        const quizBlockIds = (columnMappings || [])
          .filter((m) => m.generateWithAI)
          .filter((m) => {
            const b = selectedTemplate.blocks.find((bl) => bl.blockId === m.blockId);
            return b && isQuizBlock(b);
          })
          .map((m) => m.blockId);
        const allCards = [];
        if (quizBlockIds.length > 0) {
          importTotalSteps = chunks.length + rows.length;
          setImportAIGenerating(true);
          setImportAIBatchProgress({ current: 0, total: chunks.length });
          const reqHeaders = { "Content-Type": "application/json" };
          if (isProduction && user) {
            const token = await user.getIdToken();
            if (token) reqHeaders.Authorization = `Bearer ${token}`;
          }
          for (let c = 0; c < chunks.length; c++) {
            setImportAIBatchProgress({ current: c + 1, total: chunks.length });
            setImportProgress((c + 1) / importTotalSteps);
            const chunkRows = chunks[c];
            const textContent = [
              headers.join("\t"),
              ...chunkRows.map((r) => r.join("\t")),
            ].join("\n").slice(0, 50000);
            const res = await fetch("/api/cards/import-ai-blocks", {
              method: "POST",
              headers: reqHeaders,
              body: JSON.stringify({
                extractedContent: textContent,
                deckId,
                templateId: selectedTemplate.templateId,
                uid: user.uid,
                maxCards: chunkRows.length,
                blockIds: quizBlockIds,
              }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
              throw new Error(data.error || data.message || "AI generation failed");
            }
            const chunkCards = data.cards ?? [];
            allCards.push(...chunkCards);
          }
          importCompletedBeforeCards = chunks.length;
          setImportAIGenerating(false);
          setImportAIBatchProgress(null);
        }
        aiCards = allCards;
        console.log("[Import AI] import-ai-blocks batched", {
          hasAIMappings,
          rowsCount: rows.length,
          chunks: chunks.length,
          aiCardsCount: aiCards.length,
          firstCardKeys: aiCards[0] ? Object.keys(aiCards[0]) : [],
          firstCardBlocksSnapshotLength: aiCards[0]?.blocksSnapshot?.length ?? 0,
        });
        const aiMappingBlockIds = (columnMappings || [])
          .filter((m) => m.generateWithAI)
          .map((m) => m.blockId);
        if (aiCards[0]?.blocksSnapshot && aiMappingBlockIds.length > 0) {
          aiCards[0].blocksSnapshot.forEach((b) => {
            if (aiMappingBlockIds.includes(b.blockId)) {
              const cfg = b.configJson;
              const preview =
                typeof cfg === "string"
                  ? cfg.slice(0, 120)
                  : cfg
                    ? JSON.stringify(cfg).slice(0, 120)
                    : "(none)";
              console.log("[Import AI] first card block", b.blockId, "configJson preview", preview);
            }
          });
        }
      }

      let imported = 0;
      const templateBlocksSnapshot = selectedTemplate.blocks.map((block) => ({
        blockId: block.blockId,
        type: block.type,
        label: block.label,
        required: block.required,
        configJson: block.configJson,
        side: block.side === "back" ? "back" : "front",
      }));

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];

        // For audio "Use AI": use row's main text (Claude does not generate audio; TTS uses this later).
        const mainBlockId = selectedTemplate.mainBlockId;
        const mainMapping = columnMappings.find((m) => m.blockId === mainBlockId);
        const mainTextForRow =
          mainMapping && mainMapping.columnIndex >= 0 && mainMapping.columnIndex < row.length
            ? String(row[mainMapping.columnIndex] ?? "").trim()
            : columnMappings
                .filter((m) => m.columnIndex >= 0 && m.columnIndex < row.length)
                .map((m) => String(row[m.columnIndex] ?? "").trim())
                .find((t) => t) ?? "";

        const values = [];
        const importMedia = importData.media && typeof importData.media === "object" ? importData.media : {};
        const hasImportMedia = Object.keys(importMedia).length > 0;

        for (const mapping of columnMappings) {
          const block = selectedTemplate.blocks.find(
            (b) => b.blockId === mapping.blockId
          );
          if (!block) continue;

          let text = "";
          if (mapping.generateWithAI) {
            if (isAudioBlockType(block)) {
              text = mainTextForRow;
            } else {
              const aiCard = aiCards[i];
              if (aiCard?.values) {
                const v = aiCard.values.find((x) => x.blockId === mapping.blockId);
                text = (v?.text != null ? String(v.text) : "").trim();
              }
            }
          } else if (mapping.columnIndex >= 0 && mapping.columnIndex < row.length) {
            const cellValue = row[mapping.columnIndex];
            text = (cellValue != null ? String(cellValue) : "").trim();
          }

          let mediaIds = [];
          const isAudioBlock = isAudioBlockType(block);
          const isImageBlock = block?.type === "image" || block?.type === 6 || block?.type === "6";

          if (hasImportMedia && (isAudioBlock || isImageBlock) && text) {
            const audioRegex = /\[audio:\s*([^\]]+)\]/g;
            const imageRegex = /\[image:\s*([^\]]+)\]/g;
            if (isAudioBlock) {
              const matches = [...text.matchAll(audioRegex)];
              for (const m of matches) {
                const filename = m[1].trim();
                const bytes = importMedia[filename];
                if (bytes && (bytes instanceof Uint8Array || ArrayBuffer.isView(bytes) || bytes instanceof ArrayBuffer)) {
                  try {
                    const blob = new Blob([bytes], { type: "audio/mpeg" });
                    const file = new File([blob], filename || "audio.mp3", { type: "audio/mpeg" });
                    const storageCheck = await checkStorageBeforeUpload(user, file.size);
                    if (!storageCheck.allowed) continue;
                    const media = await uploadAudio(user.uid, file);
                    mediaIds.push(media.mediaId);
                  } catch (err) {
                    console.warn("[Import] upload audio from APKG failed", filename, err?.message);
                  }
                }
              }
              if (mediaIds.length > 0) {
                text = text.replace(audioRegex, "").trim().replace(/\s+/g, " ");
              }
            }
            if (isImageBlock) {
              const matches = [...text.matchAll(imageRegex)];
              for (const m of matches) {
                const filename = m[1].trim();
                const bytes = importMedia[filename];
                if (bytes && (bytes instanceof Uint8Array || ArrayBuffer.isView(bytes) || bytes instanceof ArrayBuffer)) {
                  try {
                    const ext = (filename.split(".").pop() || "jpg").toLowerCase();
                    const mime = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
                    const blob = new Blob([bytes], { type: mime });
                    const file = new File([blob], filename || "image.jpg", { type: mime });
                    const storageCheck = await checkStorageBeforeUpload(user, file.size);
                    if (!storageCheck.allowed) continue;
                    const media = await uploadImage(user.uid, file);
                    mediaIds.push(media.mediaId);
                  } catch (err) {
                    console.warn("[Import] upload image from APKG failed", filename, err?.message);
                  }
                }
              }
              if (mediaIds.length > 0) {
                text = text.replace(imageRegex, "").trim().replace(/\s+/g, " ");
              }
            }
          }

          values.push({
            blockId: mapping.blockId,
            type: block.type,
            text: text || "",
            ...(mediaIds.length > 0 && { mediaIds }),
          });
        }

        // Per-row blocksSnapshot: merge AI-generated block config (e.g. quiz question/options) for generateWithAI mappings
        let rowBlocksSnapshot = templateBlocksSnapshot.map((b) => ({ ...b }));
        if (hasAIMappings && aiCards[i]?.blocksSnapshot?.length) {
          const aiSnap = aiCards[i].blocksSnapshot;
          if (i === 0) {
            const wantBlockIds = columnMappings
              .filter((m) => m.generateWithAI)
              .map((m) => m.blockId);
            const gotBlockIds = aiSnap.map((b) => b.blockId);
            const match = wantBlockIds.every((id) => gotBlockIds.includes(id));
            console.log("[Import AI] row 0 merge", {
              aiSnapLength: aiSnap.length,
              aiSnapBlockIds: gotBlockIds,
              generateWithAIBlockIds: wantBlockIds,
              blockIdMatch: match,
              templateBlockIds: templateBlocksSnapshot.map((b) => b.blockId),
            });
          }
          rowBlocksSnapshot = rowBlocksSnapshot.map((templateBlock) => {
            const aiMapping = columnMappings.find(
              (m) => m.generateWithAI && m.blockId === templateBlock.blockId
            );
            if (!aiMapping) return templateBlock;
            const aiBlock = aiSnap.find(
              (ab) => ab.blockId === templateBlock.blockId
            );
            if (i === 0) {
              let parsedConfig = null;
              try {
                parsedConfig =
                  typeof aiBlock?.configJson === "string"
                    ? JSON.parse(aiBlock.configJson)
                    : aiBlock?.configJson;
              } catch (_) {}
              console.log("[Import AI] row 0 block", templateBlock.blockId, {
                foundAiBlock: !!aiBlock,
                hasConfigJson: !!aiBlock?.configJson,
                configJsonType: typeof aiBlock?.configJson,
                configJsonLength:
                  typeof aiBlock?.configJson === "string"
                    ? aiBlock.configJson.length
                    : "(object)",
                parsedKeys: parsedConfig ? Object.keys(parsedConfig) : [],
                hasQuestion: !!(parsedConfig?.question),
                optionsLength: Array.isArray(parsedConfig?.options)
                  ? parsedConfig.options.length
                  : 0,
              });
            }
            if (!aiBlock?.configJson) return templateBlock;
            // Explicit new block so quiz config is never lost (merge AI config for this row)
            const mergedConfigJson =
              typeof aiBlock.configJson === "string"
                ? aiBlock.configJson
                : JSON.stringify(aiBlock.configJson ?? {});
            return {
              blockId: templateBlock.blockId,
              type: templateBlock.type,
              label: templateBlock.label,
              required: templateBlock.required,
              configJson: mergedConfigJson,
            };
          });
        }

        const hasAnyText = values.some((v) => (v.text || "").trim());
        const hasAIGeneratedQuizContent =
          hasAIMappings &&
          aiCards[i]?.blocksSnapshot?.length &&
          columnMappings.some((m) => {
            if (!m.generateWithAI) return false;
            const snap = aiCards[i].blocksSnapshot.find(
              (b) => b.blockId === m.blockId
            );
            const cfg = snap?.configJson;
            if (cfg == null) return false;
            try {
              const parsed =
                typeof cfg === "string" ? JSON.parse(cfg) : cfg;
              return (
                parsed &&
                parsed.question != null &&
                String(parsed.question).trim()
              );
            } catch {
              return false;
            }
          });
        if (!hasAnyText && !hasAIGeneratedQuizContent) {
          if (i === 0 || hasAIMappings) {
            console.log("[Import AI] skip row", i, {
              hasAnyText,
              hasAIGeneratedQuizContent,
              hasAIMappings,
              aiCardPresent: !!aiCards[i],
              blocksSnapshotLength: aiCards[i]?.blocksSnapshot?.length ?? 0,
            });
          }
          continue;
        }

        if (i === 0 && hasAIMappings) {
          const isQuizType = (t) => {
            if (t == null) return false;
            if (t === "quizSingleSelect" || t === "quizMultiSelect" || t === "quizTextAnswer")
              return true;
            if (t === 8 || t === 9 || t === 10) return true;
            if (typeof t === "string" && /^(8|9|10)$/.test(t)) return true;
            return false;
          };
          const quizBlocks = rowBlocksSnapshot.filter((b) => isQuizType(b.type));
          const quizPayloads = quizBlocks.map((b) => {
            let cfg = null;
            try {
              cfg =
                typeof b.configJson === "string"
                  ? JSON.parse(b.configJson)
                  : b.configJson;
            } catch (_) {}
            return {
              blockId: b.blockId,
              type: b.type,
              configJsonIsString: typeof b.configJson === "string",
              hasQuestion: !!(cfg?.question),
              questionPreview: cfg?.question
                ? String(cfg.question).slice(0, 50)
                : "(none)",
              optionsLength: Array.isArray(cfg?.options) ? cfg.options.length : 0,
              correctAnswersLength: Array.isArray(cfg?.correctAnswers)
                ? cfg.correctAnswers.length
                : 0,
            };
          });
          console.log("[Import AI] row 0 creating card (payload to createCard)", {
            rowBlocksSnapshotLength: rowBlocksSnapshot.length,
            quizBlocksCount: quizBlocks.length,
            quizPayloads,
          });
          console.log("[Import AI] row 0 every block in rowBlocksSnapshot", {
            blocks: rowBlocksSnapshot.map((b) => ({
              blockId: b.blockId,
              type: b.type,
              typeOf: typeof b.type,
              hasConfigJson: b.configJson != null,
              configJsonType: typeof b.configJson,
              configJsonLength:
                typeof b.configJson === "string"
                  ? b.configJson.length
                  : b.configJson
                    ? JSON.stringify(b.configJson).length
                    : 0,
            })),
          });
          const mergedQuizBlockId = columnMappings.find((m) => m.generateWithAI)?.blockId;
          if (mergedQuizBlockId) {
            const mergedBlock = rowBlocksSnapshot.find((b) => b.blockId === mergedQuizBlockId);
            if (mergedBlock) {
              let cfg = null;
              try {
                cfg =
                  typeof mergedBlock.configJson === "string"
                    ? JSON.parse(mergedBlock.configJson)
                    : mergedBlock.configJson;
              } catch (e) {
                console.warn("[Import AI] QUIZ DEBUG: failed to parse merged block configJson", e);
              }
              console.log("[Import AI] row 0 merged quiz block (what we send to createCard)", {
                blockId: mergedBlock.blockId,
                type: mergedBlock.type,
                configJsonParsed: cfg
                  ? { question: cfg.question, optionsLength: cfg.options?.length, correctAnswers: cfg.correctAnswers }
                  : null,
                configJsonRawPreview:
                  typeof mergedBlock.configJson === "string"
                    ? mergedBlock.configJson.slice(0, 200)
                    : "(object)",
              });
            } else {
              console.warn(
                "[Import AI] QUIZ DEBUG: mergedQuizBlockId",
                mergedQuizBlockId,
                "not found in rowBlocksSnapshot — merge may have failed"
              );
            }
          }
          const anyQuizEmpty = quizPayloads.some(
            (p) => !p.hasQuestion || (p.optionsLength === 0 && p.correctAnswersLength === 0)
          );
          if (anyQuizEmpty) {
            console.warn(
              "[Import AI] QUIZ DEBUG: at least one quiz block has no question or no options/correctAnswers — quiz section may not render. Check quizPayloads above."
            );
          }
        }

        const created = await createCard(
          user.uid,
          deckId,
          rowBlocksSnapshot,
          values,
          selectedTemplate.templateId,
          selectedTemplate.mainBlockId ?? null,
          selectedTemplate.subBlockId ?? null
        );

        // If this row has audio "Use AI" with text, generate TTS (ElevenLabs) and update card
        const audioMapping = (columnMappings || []).find((m) => {
          if (!m.generateWithAI) return false;
          const b = selectedTemplate.blocks.find((bl) => bl.blockId === m.blockId);
          return b && isAudioBlockType(b);
        });
        if (audioMapping && mainTextForRow && created?.cardId) {
          setImportAudioGenerating(true);
          try {
            const audioBlock = selectedTemplate.blocks.find((b) => b.blockId === audioMapping.blockId);
            const { defaultVoiceId } = parseAudioBlockConfig(audioBlock?.configJson);
            const ttsHeaders = { "Content-Type": "application/json" };
            if (isProduction && user) {
              const token = await user.getIdToken();
              if (token) ttsHeaders.Authorization = `Bearer ${token}`;
            }
            const ttsRes = await fetch("/api/elevenlabs/text-to-speech", {
              method: "POST",
              headers: ttsHeaders,
              body: JSON.stringify({
                text: mainTextForRow,
                ...(defaultVoiceId && { voice_id: defaultVoiceId }),
              }),
            });
            if (ttsRes.ok) {
              const blob = await ttsRes.blob();
              const file = new File([blob], "import-tts.mp3", { type: "audio/mpeg" });
              const storageCheck = await checkStorageBeforeUpload(user, file.size);
              if (!storageCheck.allowed) {
                setImportAudioFailed((f) => f + 1);
              } else {
                const media = await uploadAudio(user.uid, file);
                const updatedValues = values.map((v) =>
                  v.blockId === audioMapping.blockId ? { ...v, mediaIds: [media.mediaId] } : v
                );
                await updateCard(
                  user.uid,
                  created.cardId,
                  deckId,
                  updatedValues,
                  rowBlocksSnapshot,
                  selectedTemplate.mainBlockId ?? null,
                  selectedTemplate.subBlockId ?? null
                );
                setImportAudioCompleted((c) => c + 1);
              }
            } else {
              setImportAudioFailed((f) => f + 1);
            }
          } catch (ttsErr) {
            console.warn("[Import] TTS failed for row", i + 1, ttsErr);
            setImportAudioFailed((f) => f + 1);
          } finally {
            setImportAudioGenerating(false);
          }
        }

        imported++;
        setImportProgress((importCompletedBeforeCards + i + 1) / importTotalSteps);
        setImportedCount(imported);
      }

      // Keep modal open to show completion
    } catch (error) {
      console.error("Error importing cards:", error);
      alert("Error importing cards: " + error.message);
    } finally {
      setImporting(false);
      setImportAIGenerating(false);
      setImportAIBatchProgress(null);
      setImportAudioGenerating(false);
      setImportAudioCompleted(0);
      setImportAudioFailed(0);
    }
  };

  // Reset import state
  const resetImport = () => {
    setShowImportModal(false);
    setImportData(null);
    setImportStep(ImportStep.loadFile);
    setSelectedRows(new Set());
    setSelectAllRows(true);
    setSelectedTemplate(null);
    setColumnMappings([]);
    setImporting(false);
    setImportAIGenerating(false);
    setImportAIBatchProgress(null);
    setImportAudioGenerating(false);
    setImportAudioCompleted(0);
    setImportAudioFailed(0);
    setImportProgress(0);
    setImportedCount(0);
    setImportUseAILoading(false);
    setImportUseAIError(null);
  };

  const handleImportUseAIInstead = async () => {
    if (!user || !deckId || !selectedTemplate || !importData) return;
    if (!aiEntitled) {
      setImportUseAIError("Pro subscription required to use AI.");
      return;
    }
    setImportUseAIError(null);
    setImportUseAILoading(true);
    try {
      const headers = (importData.headers || []).slice();
      const rows = (importData.rows || []).map((r) =>
        (Array.isArray(r) ? r : []).map((c) => String(c ?? "").trim())
      );
      const textContent = [
        headers.join("\t"),
        ...rows.map((r) => r.join("\t")),
      ].join("\n").slice(0, 50000);
      const reqHeaders = { "Content-Type": "application/json" };
      if (isProduction && user) {
        const token = await user.getIdToken();
        if (token) reqHeaders.Authorization = `Bearer ${token}`;
      }
      const res = await fetch("/api/cards/file-to-ai", {
        method: "POST",
        headers: reqHeaders,
        body: JSON.stringify({
          extractedContent: textContent,
          deckId,
          templateId: selectedTemplate.templateId,
          uid: user.uid,
          maxCards: 30,
          fileName: importData.fileName || "import.txt",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || data.message || "AI generation failed");
      }
      const rawCards = data.cards ?? [];
      const blocksSnapshotFallback = selectedTemplate.blocks.map((b) => ({
        blockId: b.blockId,
        type: b.type,
        label: b.label || "",
        required: b.required || false,
        configJson: b.configJson,
        side: effectiveBlockSide(b),
      }));
      const generatedCards = rawCards.map((c) => {
        if (c && Array.isArray(c.values) && c.blocksSnapshot) {
          return {
            templateId: c.templateId || selectedTemplate.templateId,
            blocksSnapshot: c.blocksSnapshot,
            values: (c.values || []).map((v) => ({
              ...v,
              ...(v.type === "audio" && (!v.mediaIds || !v.mediaIds.length) ? { mediaIds: [] } : {}),
            })),
          };
        }
        const values = Array.isArray(c) ? c : c?.values || [];
        return {
          blocksSnapshot: blocksSnapshotFallback,
          values: (values || []).map((v) => ({
            ...v,
            ...(v.type === "audio" ? { mediaIds: [] } : {}),
          })),
          templateId: selectedTemplate.templateId,
        };
      });
      setAddWithAIGeneratedCards(generatedCards);
      setAddWithAISelectedIndices(new Set(generatedCards.map((_, i) => i)));
      setEditingGeneratedCardIndex(null);
      if (data._devPrompt) {
        setAddWithAIDevPrompt(data._devPrompt);
        setShowDevPrompt(true);
        setPromptModalContent(data._devPrompt);
        setShowPromptModal(true);
      }
      resetImport();
      setShowAddWithAIModal(true);
    } catch (err) {
      console.error("Import Use AI instead:", err);
      setImportUseAIError(err.message || "AI generation failed");
    } finally {
      setImportUseAILoading(false);
    }
  };

  // Add card with AI: build context, call API 1–5 times, create cards, redirect
  const handleAddCardWithAI = async () => {
    if (!user) return;
    // Use deck ID from the current URL so we never use a different deck (avoids stale closure)
    const pathDeckId = typeof window !== "undefined"
      ? (window.location.pathname.match(/\/deck\/([^/]+)/)?.[1] ?? null)
      : null;
    const activeDeckId = pathDeckId || deckId;
    if (!activeDeckId) return;

    if (!addWithAITemplateId) {
      setAddWithAIError("Select a template.");
      return;
    }
    const count = Math.min(5, Math.max(1, Number(addWithAICount) || 1));
    setAddWithAIError(null);
    setAddWithAIDevPrompt(null);
    setAddWithAISuccess(null);
    setAddWithAIGenerating(true);

    let currentDeck = null;
    let deckCards = [];
    try {
      [currentDeck, deckCards] = await Promise.all([
        getDeck(user.uid, activeDeckId),
        getCards(user.uid, activeDeckId),
      ]);
    } catch (_) {
      setAddWithAIError("Could not load this deck. Try again.");
      setAddWithAIGenerating(false);
      return;
    }

    const freshTemplate = await getTemplate(user.uid, addWithAITemplateId);
    const cachedTemplate = templates.find((t) => t.templateId === addWithAITemplateId) || templates[0];
    console.log("[add-with-ai] template sources", {
      fresh: freshTemplate
        ? { blockCount: freshTemplate.blocks?.length, blockTypes: (freshTemplate.blocks || []).map((b) => ({ id: b.blockId?.slice(0, 8), type: b.type, label: b.label })) }
        : null,
      cached: cachedTemplate
        ? { blockCount: cachedTemplate.blocks?.length, blockTypes: (cachedTemplate.blocks || []).map((b) => ({ id: b.blockId?.slice(0, 8), type: b.type, label: b.label })) }
        : null,
      match: freshTemplate && cachedTemplate && freshTemplate.blocks?.length === cachedTemplate.blocks?.length,
    });
    let template = freshTemplate || cachedTemplate;
    if (!template?.blocks?.length) {
      setAddWithAIError("Select a template with at least one block.");
      setAddWithAIGenerating(false);
      return;
    }
    console.log("[add-with-ai] template used for request", {
      source: freshTemplate ? "getTemplate" : "cache",
      templateId: template.templateId,
      name: template.name,
      blockCount: template.blocks?.length,
      blockTypes: (template.blocks || []).map((b) => ({ id: b.blockId?.slice(0, 8), type: b.type, label: b.label })),
    });

    deckCards = deckCards.filter((c) => c.deckId === activeDeckId);
    if (!currentDeck || currentDeck.isDeleted) {
      setAddWithAIError("This deck was not found.");
      setAddWithAIGenerating(false);
      return;
    }

    const parseBlockConfig = (configJson) => {
      if (configJson == null || configJson === "") return {};
      if (typeof configJson === "string") {
        try {
          const x = JSON.parse(configJson);
          return x && typeof x === "object" ? x : {};
        } catch {
          return {};
        }
      }
      return typeof configJson === "object" ? configJson : {};
    };
    const isQuizBlockType = (type) =>
      type === "quizSingleSelect" ||
      type === "quizMultiSelect" ||
      type === "quizTextAnswer" ||
      type === 8 ||
      type === 9 ||
      type === 10;

    // Include quiz blocks from deck cards if the selected template doesn't have them (so prompt matches deck usage)
    const templateBlockIds = new Set((template.blocks || []).map((b) => b.blockId));
    const addedQuizIds = new Set();
    const extraQuizBlocks = [];
    for (const card of deckCards) {
      for (const b of card.blocksSnapshot || []) {
        if (!isQuizBlockType(b.type)) continue;
        if (templateBlockIds.has(b.blockId) || addedQuizIds.has(b.blockId)) continue;
        addedQuizIds.add(b.blockId);
        extraQuizBlocks.push({
          blockId: b.blockId,
          type: b.type,
          label: b.label || "",
          required: Boolean(b.required),
          configJson: b.configJson,
        });
      }
    }
    if (extraQuizBlocks.length) {
      console.log("[add-with-ai] merged quiz blocks from deck cards", {
        extraCount: extraQuizBlocks.length,
        extraTypes: extraQuizBlocks.map((b) => ({ type: b.type, label: b.label })),
      });
      template = {
        ...template,
        blocks: [...(template.blocks || []), ...extraQuizBlocks],
      };
      console.log("[add-with-ai] template after quiz merge", {
        blockCount: template.blocks?.length,
        blockTypes: (template.blocks || []).map((b) => ({ id: b.blockId?.slice(0, 8), type: b.type, label: b.label })),
      });
    }

    const refIds = addWithAIReferenceCardIds;
    const deckCardsForExamples =
      refIds.size > 0
        ? deckCards.filter((c) => refIds.has(c.cardId)).slice(0, 10)
        : [];
    const serializeQuizForExample = (config, blockType) => {
      if (!config || typeof config !== "object") return "(empty)";
      const q = config.question != null ? String(config.question).trim() : "";
      const questionPart = q || "(no question)";
      const opts = Array.isArray(config.options) ? config.options : [];
      const optionsStr = opts.length ? opts.map((x) => String(x ?? "").trim()).filter(Boolean).join(" | ") : "";
      if (isQuizBlockType(blockType) && (blockType === "quizTextAnswer" || blockType === 10)) {
        const ans = config.correctAnswer != null ? String(config.correctAnswer).trim() : "";
        return ans ? `Q: ${questionPart} | correctAnswer: ${ans}` : `Q: ${questionPart}`;
      }
      if (opts.length) {
        const idx = config.correctAnswerIndex ?? config.correctIndex;
        const indices = config.correctAnswerIndices ?? config.correctIndices;
        const multi = Array.isArray(indices) && indices.length > 0;
        if (multi) {
          return `Q: ${questionPart} | options: ${optionsStr} | correctIndices: [${indices.join(",")}]`;
        }
        const i = typeof idx === "number" && idx >= 0 && idx < opts.length ? idx : 0;
        return `Q: ${questionPart} | options: ${optionsStr} | correctIndex: ${i}`;
      }
      return questionPart || "(empty)";
    };

    const templateBlockIdList = (template.blocks || []).map((b) => b.blockId);
    const templateBlockById = new Map((template.blocks || []).map((b) => [b.blockId, b]));
    const mainBlockIdForExample = template.mainBlockId ?? template.blocks?.[0]?.blockId ?? null;
    const subBlockIdForExample = template.subBlockId ?? template.blocks?.[1]?.blockId ?? null;
    const exampleCards = deckCardsForExamples.map((card) => {
      const o = {};
      const getCardText = (blockId) => {
        const v = (card.values || []).find((x) => x.blockId === blockId);
        return v?.text != null ? String(v.text).trim() : "";
      };
      templateBlockIdList.forEach((blockId) => {
        const v = (card.values || []).find((x) => x.blockId === blockId);
        if (v?.text != null && String(v.text).trim()) {
          o[blockId] = String(v.text).trim();
        } else {
          const b = (card.blocksSnapshot || []).find((x) => x.blockId === blockId);
          const templateBlock = templateBlockById.get(blockId);
          if (templateBlock && isQuizBlockType(templateBlock.type)) {
            let quizDisplay = "";
            if (b && isQuizBlockType(b.type)) {
              const config = parseBlockConfig(b.configJson);
              quizDisplay = serializeQuizForExample(config, b.type);
            }
            if (!quizDisplay || quizDisplay === "(empty)") {
              const phrase = mainBlockIdForExample ? getCardText(mainBlockIdForExample) : "";
              const meaning = subBlockIdForExample ? getCardText(subBlockIdForExample) : "";
              o[blockId] = phrase || meaning
                ? `Q: What does "${phrase || "..."}" mean? | options: ${meaning || "correct"} | correctIndex: 0`
                : "Q: (question) | options: (option A) | (option B) | correctIndex: 0";
            } else {
              o[blockId] = quizDisplay;
            }
          } else {
            o[blockId] = "(empty)";
          }
        }
      });
      return o;
    });
    // Use template's main block when set; otherwise first block (so we still avoid duplicating existing cards)
    const mainIdForAvoid = template.mainBlockId ?? template.blocks?.[0]?.blockId ?? null;
    const avoidMainPhrases =
      mainIdForAvoid && deckCards.length > 0
        ? [
            ...new Set(
              deckCards
                .map((card) => {
                  const mainBlk = (card.blocksSnapshot || []).find((x) => x.blockId === mainIdForAvoid);
                  if (mainBlk && isQuizBlockType(mainBlk.type)) {
                    const q = parseBlockConfig(mainBlk.configJson).question;
                    return q != null && String(q).trim() ? String(q).trim() : null;
                  }
                  const v = (card.values || []).find((x) => x.blockId === mainIdForAvoid);
                  const t = v?.text != null ? String(v.text).trim() : "";
                  return t || null;
                })
                .filter(Boolean)
            ),
          ]
        : [];
    console.log("[add-with-ai] examples & request", {
      referenceCardIdsCount: refIds.size,
      deckCardsForExamplesCount: deckCardsForExamples.length,
      exampleCardsCount: exampleCards.length,
      templateBlockIdsCount: templateBlockIdList.length,
      firstExampleKeys: exampleCards[0] ? Object.keys(exampleCards[0]).length : 0,
      avoidMainPhrasesCount: avoidMainPhrases.length,
    });
    const templateBlocks = template.blocks.map((b) => ({
      blockId: b.blockId,
      type: b.type,
      label: b.label || "",
      required: Boolean(b.required),
      configJson: b.configJson,
      side: effectiveBlockSide(b),
    }));
    const mainBlock = template.mainBlockId ? template.blocks.find((b) => b.blockId === template.mainBlockId) : null;
    const subBlock = template.subBlockId ? template.blocks.find((b) => b.blockId === template.subBlockId) : null;
    const blocksSnapshot = template.blocks.map((b) => ({
      blockId: b.blockId,
      type: b.type,
      label: b.label || "",
      required: b.required || false,
      configJson: b.configJson,
      side: effectiveBlockSide(b),
    }));
    console.log("[add-with-ai] sending to API", {
      templateBlocksCount: templateBlocks.length,
      templateBlockTypes: templateBlocks.map((b) => ({ id: b.blockId?.slice(0, 8), type: b.type, label: b.label })),
      count,
      mainBlockId: template.mainBlockId ?? null,
      subBlockId: template.subBlockId ?? null,
    });
    try {
      setAddWithAIProgress(count > 1 ? `Generating ${count} different cards...` : "Generating...");
      const headers = { "Content-Type": "application/json" };
      if (isProduction && user) {
        const token = await user.getIdToken();
        if (token) headers.Authorization = `Bearer ${token}`;
      }
      const res = await fetch("/api/cards/generate-with-ai", {
        method: "POST",
        headers,
        body: JSON.stringify({
          deckTitle: currentDeck.title || "",
          deckDescription: currentDeck.description || "",
          templateBlocks,
          exampleCards,
          exampleCardsLabel:
            refIds.size > 0 ? "Reference cards (selected for style examples):" : "Example cards from this deck:",
          count,
          mainBlockId: template.mainBlockId ?? null,
          subBlockId: template.subBlockId ?? null,
          mainBlockLabel: mainBlock?.label ?? null,
          subBlockLabel: subBlock?.label ?? null,
          avoidMainPhrases,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || data.message || "Generation failed");
      }
      const rawCards = data.cards ?? (data.values ? [{ values: data.values, blocksSnapshot }] : []);
      console.log("[add-with-ai] API response", {
        ok: res.ok,
        cardsCount: rawCards?.length ?? 0,
        firstCardValuesCount: rawCards[0]?.values?.length ?? rawCards[0]?.length ?? 0,
        firstCardBlocksSnapshotCount: rawCards[0]?.blocksSnapshot?.length ?? 0,
      });
      if (data._devPrompt) {
        setAddWithAIDevPrompt(data._devPrompt);
        setShowDevPrompt(true);
        setPromptModalContent(data._devPrompt);
        setShowPromptModal(true);
      }
      const generatedCards = rawCards.map((item) => {
        const values = Array.isArray(item) ? item : item?.values ?? [];
        const snap =
          item && !Array.isArray(item) && Array.isArray(item.blocksSnapshot) && item.blocksSnapshot.length
            ? item.blocksSnapshot
            : blocksSnapshot;
        return {
          blocksSnapshot: snap,
          values: (values || []).map((v) => ({
            ...v,
            ...(v.type === "audio" && (!v.mediaIds || !v.mediaIds.length) ? { mediaIds: [] } : {}),
          })),
          templateId: template.templateId,
        };
      });
      setAddWithAIProgress(null);
      setAddWithAIGeneratedCards(generatedCards);
      setAddWithAISelectedIndices(new Set(generatedCards.map((_, i) => i)));
    } catch (err) {
      console.error("Add card with AI:", err);
      setAddWithAIError(err.message || "Failed to generate card");
    } finally {
      setAddWithAIGenerating(false);
      setAddWithAIProgress(null);
    }
  };

  const closeAddWithAIModal = () => {
    setShowAddWithAIModal(false);
    setAddWithAITemplateId("");
    setAddWithAIProgress(null);
    setAddWithAIDevPrompt(null);
    setAddWithAISuccess(null);
    setAddWithAIGeneratedCards([]);
    setAddWithAISelectedIndices(new Set());
    setAddWithAIReferenceCardIds(new Set());
    setEditingGeneratedCardIndex(null);
    setAddWithAIPreviewLoading(false);
    setShowPromptModal(false);
    setPromptModalContent(null);
  };

  // Build prompt client-side for preview (dev only). Uses same context as handleAddCardWithAI.
  const handlePreviewAddWithAIPrompt = async () => {
    if (!user || !isDev) return;
    const pathDeckId = typeof window !== "undefined"
      ? (window.location.pathname.match(/\/deck\/([^/]+)/)?.[1] ?? null)
      : null;
    const activeDeckId = pathDeckId || deckId;
    if (!activeDeckId || !addWithAITemplateId) {
      setAddWithAIError("Select a deck and template.");
      return;
    }
    setAddWithAIError(null);
    setAddWithAIPreviewLoading(true);
    try {
      let [currentDeck, deckCards] = await Promise.all([
        getDeck(user.uid, activeDeckId),
        getCards(user.uid, activeDeckId),
      ]);
      deckCards = (deckCards || []).filter((c) => c.deckId === activeDeckId);
      const freshTemplate = await getTemplate(user.uid, addWithAITemplateId);
      const cachedTemplate = templates.find((t) => t.templateId === addWithAITemplateId) || templates[0];
      let template = freshTemplate || cachedTemplate;
      if (!template?.blocks?.length) {
        setAddWithAIError("Template has no blocks.");
        setAddWithAIPreviewLoading(false);
        return;
      }
      const isQuizBlockType = (type) =>
        type === "quizSingleSelect" || type === "quizMultiSelect" || type === "quizTextAnswer" || type === 8 || type === 9 || type === 10;
      const templateBlockIds = new Set((template.blocks || []).map((b) => b.blockId));
      const addedQuizIds = new Set();
      const extraQuizBlocks = [];
      for (const card of deckCards) {
        for (const b of card.blocksSnapshot || []) {
          if (!isQuizBlockType(b.type)) continue;
          if (templateBlockIds.has(b.blockId) || addedQuizIds.has(b.blockId)) continue;
          addedQuizIds.add(b.blockId);
          extraQuizBlocks.push({ blockId: b.blockId, type: b.type, label: b.label || "", required: Boolean(b.required), configJson: b.configJson });
        }
      }
      if (extraQuizBlocks.length) {
        template = { ...template, blocks: [...(template.blocks || []), ...extraQuizBlocks] };
      }
      const refIds = addWithAIReferenceCardIds;
      const deckCardsForExamples = refIds.size > 0
        ? deckCards.filter((c) => refIds.has(c.cardId)).slice(0, 10)
        : [];
      const templateBlockIdList = (template.blocks || []).map((b) => b.blockId);
      const parseBlockConfig = (configJson) => {
        if (configJson == null || configJson === "") return {};
        if (typeof configJson === "string") {
          try {
            const x = JSON.parse(configJson);
            return x && typeof x === "object" ? x : {};
          } catch { return {}; }
        }
        return typeof configJson === "object" ? configJson : {};
      };
      const serializeQuizForExamplePreview = (config, blockType) => {
        if (!config || typeof config !== "object") return "(empty)";
        const q = config.question != null ? String(config.question).trim() : "";
        const questionPart = q || "(no question)";
        const opts = Array.isArray(config.options) ? config.options : [];
        const optionsStr = opts.length ? opts.map((x) => String(x ?? "").trim()).filter(Boolean).join(" | ") : "";
        if (blockType === "quizTextAnswer" || blockType === 10) {
          const ans = config.correctAnswer != null ? String(config.correctAnswer).trim() : "";
          return ans ? `Q: ${questionPart} | correctAnswer: ${ans}` : `Q: ${questionPart}`;
        }
        if (opts.length) {
          const idx = config.correctAnswerIndex ?? config.correctIndex;
          const indices = config.correctAnswerIndices ?? config.correctIndices;
          const multi = Array.isArray(indices) && indices.length > 0;
          if (multi) {
            return `Q: ${questionPart} | options: ${optionsStr} | correctIndices: [${indices.join(",")}]`;
          }
          const i = typeof idx === "number" && idx >= 0 && idx < opts.length ? idx : 0;
          return `Q: ${questionPart} | options: ${optionsStr} | correctIndex: ${i}`;
        }
        return questionPart || "(empty)";
      };
      const templateBlockByIdPreview = new Map((template.blocks || []).map((b) => [b.blockId, b]));
      const mainBlockIdForExamplePreview = template.mainBlockId ?? template.blocks?.[0]?.blockId ?? null;
      const subBlockIdForExamplePreview = template.subBlockId ?? template.blocks?.[1]?.blockId ?? null;
      const exampleCards = deckCardsForExamples.map((card) => {
        const o = {};
        const getCardTextPreview = (bid) => {
          const val = (card.values || []).find((x) => x.blockId === bid);
          return val?.text != null ? String(val.text).trim() : "";
        };
        templateBlockIdList.forEach((blockId) => {
          const v = (card.values || []).find((x) => x.blockId === blockId);
          if (v?.text != null && String(v.text).trim()) {
            o[blockId] = String(v.text).trim();
          } else {
            const b = (card.blocksSnapshot || []).find((x) => x.blockId === blockId);
            const templateBlock = templateBlockByIdPreview.get(blockId);
            if (templateBlock && isQuizBlockType(templateBlock.type)) {
              let quizDisplay = "";
              if (b && isQuizBlockType(b.type)) {
                const config = parseBlockConfig(b.configJson);
                quizDisplay = serializeQuizForExamplePreview(config, b.type);
              }
              if (!quizDisplay || quizDisplay === "(empty)") {
                const phrase = mainBlockIdForExamplePreview ? getCardTextPreview(mainBlockIdForExamplePreview) : "";
                const meaning = subBlockIdForExamplePreview ? getCardTextPreview(subBlockIdForExamplePreview) : "";
                o[blockId] = phrase || meaning
                  ? `Q: What does "${phrase || "..."}" mean? | options: ${meaning || "correct"} | correctIndex: 0`
                  : "Q: (question) | options: (option A) | (option B) | correctIndex: 0";
              } else {
                o[blockId] = quizDisplay;
              }
            } else {
              o[blockId] = "(empty)";
            }
          }
        });
        return o;
      });
      const mainIdForAvoid = template.mainBlockId ?? template.blocks?.[0]?.blockId ?? null;
      const avoidMainPhrases = mainIdForAvoid && deckCards.length > 0
        ? [...new Set(deckCards.map((card) => {
            const mainBlk = (card.blocksSnapshot || []).find((x) => x.blockId === mainIdForAvoid);
            if (mainBlk && isQuizBlockType(mainBlk.type)) {
              const q = parseBlockConfig(mainBlk.configJson).question;
              return q != null && String(q).trim() ? String(q).trim() : null;
            }
            const v = (card.values || []).find((x) => x.blockId === mainIdForAvoid);
            return (v?.text != null ? String(v.text).trim() : "") || null;
          }).filter(Boolean))]
        : [];
      const templateBlocksForApi = template.blocks.map((b) => ({
        blockId: b.blockId,
        type: b.type,
        label: b.label || "",
        required: Boolean(b.required),
        configJson: b.configJson,
      }));
      const normalizeBlockType = (t) => {
        if (t == null) return "text";
        if (typeof t === "number" && BlockTypeNames[t] != null) return BlockTypeNames[t];
        if (typeof t === "string" && /^\d+$/.test(t)) return BlockTypeNames[parseInt(t, 10)] ?? t;
        return String(t);
      };
      const promptBlocks = templateBlocksForApi.map((b) => ({
        blockId: b.blockId,
        type: normalizeBlockType(b.type),
        label: b.label || "",
      }));
      const mainBlock = template.mainBlockId ? template.blocks.find((b) => b.blockId === template.mainBlockId) : null;
      const subBlock = template.subBlockId ? template.blocks.find((b) => b.blockId === template.subBlockId) : null;
      const count = Math.min(5, Math.max(1, Number(addWithAICount) || 1));
      const exampleCardsLabel = refIds.size > 0
        ? "Reference cards (selected for style examples):"
        : "Example cards from this deck:";
      const { system, user: userMsg } = buildCardPrompt({
        deckTitle: (currentDeck && currentDeck.title) || "",
        deckDescription: (currentDeck && currentDeck.description) || "",
        templateBlocks: promptBlocks,
        exampleCards,
        count,
        mainBlockId: template.mainBlockId ?? null,
        subBlockId: template.subBlockId ?? null,
        mainBlockLabel: mainBlock?.label ?? null,
        subBlockLabel: subBlock?.label ?? null,
        avoidMainPhrases,
        exampleCardsLabel,
      });
      setAddWithAIDevPrompt({ system, user: userMsg });
      setShowDevPrompt(true);
      setPromptModalContent({ system, user: userMsg });
      setShowPromptModal(true);
    } catch (err) {
      console.error("Preview prompt:", err);
      setAddWithAIError(err.message || "Preview failed");
    } finally {
      setAddWithAIPreviewLoading(false);
    }
  };

  const handleCopyPromptModal = () => {
    if (!promptModalContent) return;
    const text = `System:\n\n${promptModalContent.system}\n\nUser:\n\n${promptModalContent.user}`;
    navigator.clipboard.writeText(text).then(() => { /* copied */ });
  };

  const updateGeneratedCardValue = (cardIndex, valueIndex, text) => {
    setAddWithAIGeneratedCards((prev) => {
      const next = prev.map((card, ci) => {
        if (ci !== cardIndex) return card;
        return {
          ...card,
          values: (card.values || []).map((v, vi) =>
            vi === valueIndex ? { ...v, text: text ?? "" } : v
          ),
        };
      });
      return next;
    });
  };

  const handleFileToAISubmit = async () => {
    if (!user || !deckId || !fileToAIFile) return;
    const template = templates.find((t) => t.templateId === fileToAITemplateId) || templates[0];
    if (!template?.blocks?.length) {
      setFileToAIError("Select a template with at least one block.");
      return;
    }
    setFileToAIError(null);
    setFileToAILoading(true);
    console.log("[file-to-ai] submit start", { fileName: fileToAIFile.name, templateId: fileToAITemplateId, deckId, maxCards: fileToAIMaxCards });
    try {
      const refIds = fileToAIReferenceCardIds;
      const deckCards = (cards || []).filter((c) => c.deckId === deckId);
      const deckCardsForExamples =
        refIds.size > 0 ? deckCards.filter((c) => refIds.has(c.cardId)).slice(0, 10) : [];
      const isQuizBlockType = (type) =>
        type === "quizSingleSelect" || type === "quizMultiSelect" || type === "quizTextAnswer" || type === 8 || type === 9 || type === 10;
      const parseBlockConfig = (configJson) => {
        if (configJson == null || configJson === "") return {};
        if (typeof configJson === "string") {
          try {
            const x = JSON.parse(configJson);
            return x && typeof x === "object" ? x : {};
          } catch { return {}; }
        }
        return typeof configJson === "object" ? configJson : {};
      };
      const serializeQuizForExample = (config, blockType) => {
        if (!config || typeof config !== "object") return "(empty)";
        const q = config.question != null ? String(config.question).trim() : "";
        const questionPart = q || "(no question)";
        const opts = Array.isArray(config.options) ? config.options : [];
        const optionsStr = opts.length ? opts.map((x) => String(x ?? "").trim()).filter(Boolean).join(" | ") : "";
        if (isQuizBlockType(blockType) && (blockType === "quizTextAnswer" || blockType === 10)) {
          const ans = config.correctAnswer != null ? String(config.correctAnswer).trim() : "";
          return ans ? `Q: ${questionPart} | correctAnswer: ${ans}` : `Q: ${questionPart}`;
        }
        if (opts.length) {
          const idx = config.correctAnswerIndex ?? config.correctIndex;
          const indices = config.correctAnswerIndices ?? config.correctIndices;
          const multi = Array.isArray(indices) && indices.length > 0;
          if (multi) {
            return `Q: ${questionPart} | options: ${optionsStr} | correctIndices: [${indices.join(",")}]`;
          }
          const i = typeof idx === "number" && idx >= 0 && idx < opts.length ? idx : 0;
          return `Q: ${questionPart} | options: ${optionsStr} | correctIndex: ${i}`;
        }
        return questionPart || "(empty)";
      };
      const templateBlockIdList = (template.blocks || []).map((b) => b.blockId);
      const templateBlockById = new Map((template.blocks || []).map((b) => [b.blockId, b]));
      const mainBlockIdForExample = template.mainBlockId ?? template.blocks?.[0]?.blockId ?? null;
      const subBlockIdForExample = template.subBlockId ?? template.blocks?.[1]?.blockId ?? null;
      const exampleCards = deckCardsForExamples.map((card) => {
        const o = {};
        const getCardText = (blockId) => {
          const v = (card.values || []).find((x) => x.blockId === blockId);
          return v?.text != null ? String(v.text).trim() : "";
        };
        templateBlockIdList.forEach((blockId) => {
          const v = (card.values || []).find((x) => x.blockId === blockId);
          if (v?.text != null && String(v.text).trim()) {
            o[blockId] = String(v.text).trim();
          } else {
            const b = (card.blocksSnapshot || []).find((x) => x.blockId === blockId);
            const templateBlock = templateBlockById.get(blockId);
            if (templateBlock && isQuizBlockType(templateBlock.type)) {
              let quizDisplay = "";
              if (b && isQuizBlockType(b.type)) {
                const config = parseBlockConfig(b.configJson);
                quizDisplay = serializeQuizForExample(config, b.type);
              }
              if (!quizDisplay || quizDisplay === "(empty)") {
                const phrase = mainBlockIdForExample ? getCardText(mainBlockIdForExample) : "";
                const meaning = subBlockIdForExample ? getCardText(subBlockIdForExample) : "";
                o[blockId] = phrase || meaning
                  ? `Q: What does "${phrase || "..."}" mean? | options: ${meaning || "correct"} | correctIndex: 0`
                  : "Q: (question) | options: (option A) | (option B) | correctIndex: 0";
              } else {
                o[blockId] = quizDisplay;
              }
            } else {
              o[blockId] = "(empty)";
            }
          }
        });
        return o;
      });
      const mainIdForAvoid = template.mainBlockId ?? template.blocks?.[0]?.blockId ?? null;
      const avoidMainPhrases =
        mainIdForAvoid && deckCards.length > 0
          ? [
              ...new Set(
                deckCards
                  .map((card) => {
                    const mainBlk = (card.blocksSnapshot || []).find((x) => x.blockId === mainIdForAvoid);
                    if (mainBlk && isQuizBlockType(mainBlk.type)) {
                      const q = parseBlockConfig(mainBlk.configJson).question;
                      return q != null && String(q).trim() ? String(q).trim() : null;
                    }
                    const v = (card.values || []).find((x) => x.blockId === mainIdForAvoid);
                    const t = v?.text != null ? String(v.text).trim() : "";
                    return t || null;
                  })
                  .filter(Boolean)
              ),
            ]
          : [];
      const exampleCardsLabel =
        refIds.size > 0 ? "Reference cards (selected for style examples):" : "Example cards from this deck:";

      const headers = {};
      if (isProduction && user) {
        const token = await user.getIdToken();
        if (token) headers.Authorization = `Bearer ${token}`;
      }
      const formData = new FormData();
      formData.append("file", fileToAIFile);
      formData.append("deckId", deckId);
      formData.append("templateId", template.templateId);
      formData.append("uid", user.uid);
      formData.append("maxCards", String(fileToAIMaxCards));
      if (exampleCards.length > 0) formData.append("exampleCards", JSON.stringify(exampleCards));
      if (avoidMainPhrases.length > 0) formData.append("avoidMainPhrases", JSON.stringify(avoidMainPhrases));
      if (exampleCardsLabel) formData.append("exampleCardsLabel", exampleCardsLabel);
      const res = await fetch("/api/cards/file-to-ai", {
        method: "POST",
        headers,
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      console.log("[file-to-ai] response", { ok: res.ok, cardsCount: data.cards?.length, hasDevPrompt: !!data._devPrompt, error: data.error });
      if (!res.ok) {
        throw new Error(data.error || data.message || "Import failed");
      }
      const rawCards = data.cards ?? [];
      console.log("[file-to-ai] rawCards", { length: rawCards.length, first: rawCards[0] ? { keys: Object.keys(rawCards[0]), valuesLen: rawCards[0].values?.length, blocksSnapshotLen: rawCards[0].blocksSnapshot?.length } : null });
      const blocksSnapshotFallback = template.blocks.map((b) => ({
        blockId: b.blockId,
        type: b.type,
        label: b.label || "",
        required: b.required || false,
        configJson: b.configJson,
        side: effectiveBlockSide(b),
      }));
      const generatedCards = rawCards.map((c) => {
        if (c && Array.isArray(c.values) && c.blocksSnapshot) {
          return {
            templateId: c.templateId || template.templateId,
            blocksSnapshot: c.blocksSnapshot,
            values: c.values.map((v) => ({
              ...v,
              ...(v.type === "audio" && (!v.mediaIds || !v.mediaIds.length)
                ? { mediaIds: [] }
                : {}),
            })),
          };
        }
        const values = Array.isArray(c) ? c : c?.values || [];
        return {
          blocksSnapshot: blocksSnapshotFallback,
          values: values.map((v) => ({
            ...v,
            ...(v.type === "audio" ? { mediaIds: [] } : {}),
          })),
          templateId: template.templateId,
        };
      });
      console.log("[file-to-ai] generatedCards", { length: generatedCards.length, first: generatedCards[0] ? { templateId: generatedCards[0].templateId, valuesLen: generatedCards[0].values?.length, blocksSnapshotLen: generatedCards[0].blocksSnapshot?.length } : null });
      setFileToAISuccessResult({
        cards: generatedCards,
        _devPrompt: data._devPrompt || null,
      });
      setFileToAIDevPromptOpen(!!data._devPrompt);
      setAddWithAITemplateId(template.templateId);
      setAddWithAIGeneratedCards(generatedCards);
      setAddWithAISelectedIndices(new Set(generatedCards.map((_, i) => i)));
      setEditingGeneratedCardIndex(null);
      if (data._devPrompt) {
        setAddWithAIDevPrompt(data._devPrompt);
        setShowDevPrompt(true);
        setPromptModalContent(data._devPrompt);
      }
      setFileToAIFile(null);
      if (fileToAIFileInputRef.current) fileToAIFileInputRef.current.value = "";
    } catch (err) {
      console.error("File to AI:", err);
      setFileToAIError(err.message || "Import failed");
    } finally {
      setFileToAILoading(false);
    }
  };

  const closeFileToAIModal = () => {
    setShowFileToAIModal(false);
    setFileToAIFile(null);
    setFileToAIError(null);
    setFileToAIDragging(false);
    setFileToAISuccessResult(null);
    setFileToAIDevPromptOpen(true);
    setFileToAIPreviewPrompt(null);
    setFileToAIReferenceCardIds(new Set());
    if (fileToAIFileInputRef.current) fileToAIFileInputRef.current.value = "";
  };

  const handleFileToAIPreviewPrompt = async () => {
    if (!user || !deckId || !fileToAIFile || !fileToAITemplateId) return;
    const template = templates.find((t) => t.templateId === fileToAITemplateId) || templates[0];
    if (!template?.blocks?.length) {
      setFileToAIError("Select a template with at least one block.");
      return;
    }
    setFileToAIError(null);
    setFileToAIPreviewLoading(true);
    setFileToAIPreviewPrompt(null);
    console.log("[file-to-ai preview] start", { fileName: fileToAIFile.name, type: fileToAIFile.type, templateId: fileToAITemplateId, deckId });
    try {
      const refIds = fileToAIReferenceCardIds;
      const deckCards = (cards || []).filter((c) => c.deckId === deckId);
      const deckCardsForExamples =
        refIds.size > 0 ? deckCards.filter((c) => refIds.has(c.cardId)).slice(0, 10) : [];
      const isQuizBlockType = (type) =>
        type === "quizSingleSelect" || type === "quizMultiSelect" || type === "quizTextAnswer" || type === 8 || type === 9 || type === 10;
      const parseBlockConfig = (configJson) => {
        if (configJson == null || configJson === "") return {};
        if (typeof configJson === "string") {
          try {
            const x = JSON.parse(configJson);
            return x && typeof x === "object" ? x : {};
          } catch { return {}; }
        }
        return typeof configJson === "object" ? configJson : {};
      };
      const serializeQuizForExample = (config, blockType) => {
        if (!config || typeof config !== "object") return "(empty)";
        const q = config.question != null ? String(config.question).trim() : "";
        const questionPart = q || "(no question)";
        const opts = Array.isArray(config.options) ? config.options : [];
        const optionsStr = opts.length ? opts.map((x) => String(x ?? "").trim()).filter(Boolean).join(" | ") : "";
        if (isQuizBlockType(blockType) && (blockType === "quizTextAnswer" || blockType === 10)) {
          const ans = config.correctAnswer != null ? String(config.correctAnswer).trim() : "";
          return ans ? `Q: ${questionPart} | correctAnswer: ${ans}` : `Q: ${questionPart}`;
        }
        if (opts.length) {
          const idx = config.correctAnswerIndex ?? config.correctIndex;
          const indices = config.correctAnswerIndices ?? config.correctIndices;
          const multi = Array.isArray(indices) && indices.length > 0;
          if (multi) {
            return `Q: ${questionPart} | options: ${optionsStr} | correctIndices: [${indices.join(",")}]`;
          }
          const i = typeof idx === "number" && idx >= 0 && idx < opts.length ? idx : 0;
          return `Q: ${questionPart} | options: ${optionsStr} | correctIndex: ${i}`;
        }
        return questionPart || "(empty)";
      };
      const templateBlockIdList = (template.blocks || []).map((b) => b.blockId);
      const templateBlockById = new Map((template.blocks || []).map((b) => [b.blockId, b]));
      const mainBlockIdForExample = template.mainBlockId ?? template.blocks?.[0]?.blockId ?? null;
      const subBlockIdForExample = template.subBlockId ?? template.blocks?.[1]?.blockId ?? null;
      const exampleCards = deckCardsForExamples.map((card) => {
        const o = {};
        const getCardText = (blockId) => {
          const v = (card.values || []).find((x) => x.blockId === blockId);
          return v?.text != null ? String(v.text).trim() : "";
        };
        templateBlockIdList.forEach((blockId) => {
          const v = (card.values || []).find((x) => x.blockId === blockId);
          if (v?.text != null && String(v.text).trim()) {
            o[blockId] = String(v.text).trim();
          } else {
            const b = (card.blocksSnapshot || []).find((x) => x.blockId === blockId);
            const templateBlock = templateBlockById.get(blockId);
            if (templateBlock && isQuizBlockType(templateBlock.type)) {
              let quizDisplay = "";
              if (b && isQuizBlockType(b.type)) {
                const config = parseBlockConfig(b.configJson);
                quizDisplay = serializeQuizForExample(config, b.type);
              }
              if (!quizDisplay || quizDisplay === "(empty)") {
                const phrase = mainBlockIdForExample ? getCardText(mainBlockIdForExample) : "";
                const meaning = subBlockIdForExample ? getCardText(subBlockIdForExample) : "";
                o[blockId] = phrase || meaning
                  ? `Q: What does "${phrase || "..."}" mean? | options: ${meaning || "correct"} | correctIndex: 0`
                  : "Q: (question) | options: (option A) | (option B) | correctIndex: 0";
              } else {
                o[blockId] = quizDisplay;
              }
            } else {
              o[blockId] = "(empty)";
            }
          }
        });
        return o;
      });
      const mainIdForAvoid = template.mainBlockId ?? template.blocks?.[0]?.blockId ?? null;
      const avoidMainPhrases =
        mainIdForAvoid && deckCards.length > 0
          ? [
              ...new Set(
                deckCards
                  .map((card) => {
                    const mainBlk = (card.blocksSnapshot || []).find((x) => x.blockId === mainIdForAvoid);
                    if (mainBlk && isQuizBlockType(mainBlk.type)) {
                      const q = parseBlockConfig(mainBlk.configJson).question;
                      return q != null && String(q).trim() ? String(q).trim() : null;
                    }
                    const v = (card.values || []).find((x) => x.blockId === mainIdForAvoid);
                    const t = v?.text != null ? String(v.text).trim() : "";
                    return t || null;
                  })
                  .filter(Boolean)
              ),
            ]
          : [];
      const exampleCardsLabel =
        refIds.size > 0 ? "Reference cards (selected for style examples):" : "Example cards from this deck:";

      const headers = {};
      if (isProduction && user) {
        const token = await user.getIdToken();
        if (token) headers.Authorization = `Bearer ${token}`;
      }
      const formData = new FormData();
      formData.append("file", fileToAIFile);
      formData.append("deckId", deckId);
      formData.append("templateId", template.templateId);
      formData.append("uid", user.uid);
      formData.append("maxCards", String(fileToAIMaxCards));
      formData.append("preview", "true");
      if (exampleCards.length > 0) formData.append("exampleCards", JSON.stringify(exampleCards));
      if (avoidMainPhrases.length > 0) formData.append("avoidMainPhrases", JSON.stringify(avoidMainPhrases));
      if (exampleCardsLabel) formData.append("exampleCardsLabel", exampleCardsLabel);
      const res = await fetch("/api/cards/file-to-ai", {
        method: "POST",
        headers,
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      const serverError = data?.error || data?.message;
      console.log("[file-to-ai preview] response", { status: res.status, ok: res.ok, hasDevPrompt: !!data._devPrompt, error: serverError });
      if (!res.ok) {
        const message = serverError || (res.status === 422 ? "Could not extract text from this file." : res.status === 403 ? "Subscription required to use AI features." : `Preview failed (${res.status}).`);
        throw new Error(message);
      }
      if (data._devPrompt) {
        setFileToAIPreviewPrompt(data._devPrompt);
        setFileToAIPreviewPromptOpen(true);
        setPromptModalContent(data._devPrompt);
        setShowPromptModal(true);
        console.log("[file-to-ai preview] prompt set", { systemLen: data._devPrompt.system?.length, userLen: data._devPrompt.user?.length });
      } else {
        setFileToAIError("Preview did not return a prompt. Try again or use Generate to create cards.");
      }
    } catch (err) {
      console.error("File to AI preview:", err);
      setFileToAIError(err?.message || "Preview failed");
    } finally {
      setFileToAIPreviewLoading(false);
    }
  };

  const handleFileToAIAddToDeck = () => {
    if (!fileToAISuccessResult?.cards?.length) return;
    setShowFileToAIModal(false);
    setFileToAISuccessResult(null);
    setShowAddWithAIModal(true);
  };

  const handleFileToAIDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!fileToAILoading) setFileToAIDragging(true);
  };

  const handleFileToAIDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setFileToAIDragging(false);
  };

  const handleFileToAIDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setFileToAIDragging(false);
    if (fileToAILoading) return;
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (!isFileToAIAccepted(file)) {
      setFileToAIError(
        "Use PDF, DOCX, or image (PNG, JPEG, WebP). For CSV/Excel/Anki use Import from table."
      );
      return;
    }
    setFileToAIError(null);
    setFileToAIFile(file);
    if (fileToAIFileInputRef.current) fileToAIFileInputRef.current.value = "";
  };

  // Clear prompt preview when file or template changes (form view)
  useEffect(() => {
    setFileToAIPreviewPrompt(null);
    setFileToAIPreviewPromptOpen(false);
  }, [fileToAIFile, fileToAITemplateId]);

  // Scroll prompt block into view when preview loads
  useEffect(() => {
    if (!fileToAIPreviewPrompt) return;
    const t = setTimeout(() => {
      fileToAIPreviewPromptBlockRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
    return () => clearTimeout(t);
  }, [fileToAIPreviewPrompt]);

  // Paste image into Generate from doc/img (when modal is open)
  useEffect(() => {
    if (!showFileToAIModal || fileToAILoading) return;
    const onPaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type && item.type.startsWith("image/")) {
          e.preventDefault();
          const blob = item.getAsFile();
          if (!blob) return;
          const ext = item.type === "image/png" ? "png" : item.type === "image/webp" ? "webp" : "jpg";
          const file = blob.name ? blob : new File([blob], `pasted-image.${ext}`, { type: item.type });
          if (!isFileToAIAccepted(file)) {
            setFileToAIError("Use PNG, JPEG, or WebP for paste.");
            return;
          }
          setFileToAIError(null);
          setFileToAIFile(file);
          if (fileToAIFileInputRef.current) fileToAIFileInputRef.current.value = "";
          return;
        }
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [showFileToAIModal, fileToAILoading]);

  const handleCopyPrompt = () => {
    if (!addWithAIDevPrompt) return;
    const text = `System:\n\n${addWithAIDevPrompt.system}\n\nUser:\n\n${addWithAIDevPrompt.user}`;
    navigator.clipboard.writeText(text).catch(() => {});
  };

  const getGeneratedCardPreview = (card) => {
    const values = card?.values ?? card;
    const list = Array.isArray(values) ? values : [];
    const blocks = card?.blocksSnapshot;
    const byBlockId = Object.fromEntries(
      list.filter((v) => v?.blockId).map((v) => [v.blockId, v]),
    );
    const frontBlocks = (blocks || []).filter((b) => effectiveBlockSide(b) === "front");
    for (const b of frontBlocks.length ? frontBlocks : blocks || []) {
      const v = byBlockId[b.blockId];
      if (v?.text != null && String(v.text).trim()) {
        return String(v.text).trim().substring(0, 80);
      }
    }
    for (const b of frontBlocks.length ? frontBlocks : blocks || []) {
      const t = b.type;
      const isQ =
        t === "quizSingleSelect" ||
        t === "quizMultiSelect" ||
        t === "quizTextAnswer" ||
        t === 8 ||
        t === 9 ||
        t === 10;
      if (!isQ) continue;
      let cfg = b.configJson;
      if (typeof cfg === "string") {
        try {
          cfg = JSON.parse(cfg || "{}");
        } catch {
          cfg = {};
        }
      }
      const q = cfg?.question;
      if (q != null && String(q).trim()) return String(q).trim().substring(0, 80);
    }
    const first = list.find((v) => v.text != null && String(v.text).trim());
    if (first) return String(first.text).trim().substring(0, 80);
    return "Empty card";
  };

  const handleAddSelectedCardsToDeck = async () => {
    if (!user || !deckId || addWithAIGeneratedCards.length === 0) return;
    if (addWithAIAddingToDeckRef.current) return;
    addWithAIAddingToDeckRef.current = true;

    const indices = Array.from(addWithAISelectedIndices).sort((a, b) => a - b);
    let lastCardId = null;
    let addedCount = 0;
    let skippedDuplicates = 0;
    const total = indices.length;
    const contentKeys = new Set();

    const isAudioBlock = (b) => b.type === "audio" || b.type === 7 || b.type === "7";

    const parseCfg = (configJson) => {
      if (configJson == null || configJson === "") return {};
      if (typeof configJson === "string") {
        try {
          const x = JSON.parse(configJson);
          return x && typeof x === "object" ? x : {};
        } catch {
          return {};
        }
      }
      return typeof configJson === "object" ? configJson : {};
    };
    const isQuizT = (type) =>
      type === "quizSingleSelect" ||
      type === "quizMultiSelect" ||
      type === "quizTextAnswer" ||
      type === 8 ||
      type === 9 ||
      type === 10;
    const getContentKey = (item) => {
      const templateForCard = templates.find((t) => t.templateId === item.templateId);
      const mainId = templateForCard?.mainBlockId ?? null;
      const subId = templateForCard?.subBlockId ?? null;
      const values = item.values || [];
      const snap = item.blocksSnapshot || [];
      let mainText = "";
      let subText = "";
      if (mainId) {
        const mb = snap.find((b) => b.blockId === mainId);
        if (mb && isQuizT(mb.type)) mainText = String(parseCfg(mb.configJson).question || "").trim();
        else {
          const mainVal = values.find((v) => v.blockId === mainId);
          mainText = (mainVal?.text != null ? String(mainVal.text).trim() : "") || "";
        }
      }
      if (subId) {
        const sb = snap.find((b) => b.blockId === subId);
        if (sb && isQuizT(sb.type)) subText = String(parseCfg(sb.configJson).question || "").trim();
        else {
          const subVal = values.find((v) => v.blockId === subId);
          subText = (subVal?.text != null ? String(subVal.text).trim() : "") || "";
        }
      }
      return `${mainText}\n${subText}`;
    };

    try {
    for (let idx = 0; idx < indices.length; idx++) {
      const i = indices[idx];
      const item = addWithAIGeneratedCards[i];
      if (!item) continue;

      const contentKey = getContentKey(item);
      if (contentKeys.has(contentKey)) {
        skippedDuplicates++;
        continue;
      }
      contentKeys.add(contentKey);

      const cardNum = total > 1 ? `Card ${idx + 1} of ${total}: ` : "";
      setAddWithAIProgress(`${cardNum}Generating card…`);

      const values = await (async () => {
        const list = [...(item.values || [])];
        const audioBlock = item.blocksSnapshot?.find(isAudioBlock);

        // If template has audio block: get main block text and generate audio.
        if (audioBlock) {
          const templateForCard = templates.find((t) => t.templateId === item.templateId);
          const mainBlockId = templateForCard?.mainBlockId || null;
          let mainText = "";
          if (mainBlockId) {
            const mb = item.blocksSnapshot?.find((b) => b.blockId === mainBlockId);
            if (
              mb &&
              (mb.type === "quizSingleSelect" ||
                mb.type === "quizMultiSelect" ||
                mb.type === "quizTextAnswer" ||
                mb.type === 8 ||
                mb.type === 9 ||
                mb.type === 10)
            ) {
              let cfg = mb.configJson;
              if (typeof cfg === "string") {
                try {
                  cfg = JSON.parse(cfg || "{}");
                } catch {
                  cfg = {};
                }
              }
              mainText = String(cfg?.question || "").trim();
            } else {
              const mainVal = list.find((x) => x.blockId === mainBlockId);
              mainText = (mainVal?.text != null ? String(mainVal.text) : "").trim();
            }
          }
          if (!mainText) {
            const firstWithText = list.find((x) => String(x?.text || "").trim());
            mainText = firstWithText ? String(firstWithText.text).trim() : "";
          }
          if (mainText) {
            setAddWithAIProgress(`${cardNum}Generating audio…`);
            const { defaultVoiceId } = parseAudioBlockConfig(audioBlock.configJson);
            try {
              const ttsHeaders = { "Content-Type": "application/json" };
              if (isProduction && user) {
                const token = await user.getIdToken();
                if (token) ttsHeaders.Authorization = `Bearer ${token}`;
              }
              const res = await fetch("/api/elevenlabs/text-to-speech", {
                method: "POST",
                headers: ttsHeaders,
                body: JSON.stringify({
                  text: mainText,
                  ...(defaultVoiceId && { voice_id: defaultVoiceId }),
                }),
              });
              if (res.ok) {
                const blob = await res.blob();
                const file = new File([blob], "ai-generated.mp3", { type: "audio/mpeg" });
                const storageCheck = await checkStorageBeforeUpload(user, file.size);
                if (storageCheck.allowed) {
                  const media = await uploadAudio(user.uid, file);
                  const audioIdx = list.findIndex((v) => v.blockId === audioBlock.blockId);
                  if (audioIdx >= 0) {
                    list[audioIdx] = { ...list[audioIdx], mediaIds: [media.mediaId] };
                  } else {
                    list.push({
                      blockId: audioBlock.blockId,
                      type: "audio",
                      text: "",
                      mediaIds: [media.mediaId],
                    });
                  }
                }
              }
            } catch (_) {}
          }
        }
        return list;
      })();

      setAddWithAIProgress(total > 1 ? `Card ${idx + 1} of ${total}: Saving…` : "Saving card…");
      const templateForCard = templates.find((t) => t.templateId === item.templateId);
      const created = await createCard(
        user.uid,
        deckId,
        item.blocksSnapshot,
        values,
        item.templateId,
        templateForCard?.mainBlockId ?? null,
        templateForCard?.subBlockId ?? null
      );
      lastCardId = created?.cardId ?? lastCardId;
      addedCount++;
    }

    setAddWithAIProgress(null);
    setAddWithAIGeneratedCards([]);
    setAddWithAISelectedIndices(new Set());
    setAddWithAISuccess({
      count: addedCount,
      skippedDuplicates,
      lastCardId,
    });
    } finally {
      addWithAIAddingToDeckRef.current = false;
    }
  };

  const QUIZ_BLOCK_TYPES = ["quizSingleSelect", "quizMultiSelect", "quizTextAnswer"];
  const resolveBlockType = (type) => {
    if (type == null) return type;
    const num = Number(type);
    const byId = { 8: "quizMultiSelect", 9: "quizSingleSelect", 10: "quizTextAnswer" };
    return byId[num] || type;
  };
  const isQuizBlock = (block) => QUIZ_BLOCK_TYPES.includes(resolveBlockType(block?.type));

  // Preview line: prefer front-face blocks (main/sub only when on front)
  const getCardPreview = (card) => {
    if (!card.values || card.values.length === 0) return { main: "Empty card", sub: null };

    const template = templates.find((t) => t.templateId === card.templateId);
    const mainId = card.mainBlockId ?? template?.mainBlockId;
    const subId = card.subBlockId ?? template?.subBlockId;
    const blocks = card.blocksSnapshot || [];
    const frontBlocks = blocks.filter((b) => effectiveBlockSide(b) === "front");

    const textForBlock = (block) => {
      if (!block) return null;
      const val = card.values.find((v) => v.blockId === block.blockId);
      if (val?.text?.trim()) return val.text.substring(0, 100);
      if (isQuizBlock(block)) {
        try {
          const config =
            typeof block.configJson === "string"
              ? JSON.parse(block.configJson || "{}")
              : block.configJson || {};
          return (config.question || "Quiz").substring(0, 100);
        } catch {
          return "Quiz";
        }
      }
      return null;
    };

    let mainText = null;
    let subText = null;

    if (mainId) {
      const mainBlock = blocks.find((b) => b.blockId === mainId);
      if (mainBlock && effectiveBlockSide(mainBlock) === "front") {
        mainText = textForBlock(mainBlock);
      }
    }
    if (subId) {
      const subBlock = blocks.find((b) => b.blockId === subId);
      if (subBlock && effectiveBlockSide(subBlock) === "front") {
        subText = textForBlock(subBlock)?.substring(0, 80) ?? null;
      }
    }

    if (!mainText && frontBlocks.length > 0) {
      mainText = textForBlock(frontBlocks[0]);
      if (!subText && frontBlocks.length > 1) {
        const s = textForBlock(frontBlocks[1]);
        subText = s ? s.substring(0, 80) : null;
      }
    }

    if (!mainText) {
      const textValues = card.values.filter((v) => v.text && v.text.trim());
      mainText =
        textValues[0]?.text?.substring(0, 100) || "Empty card";
      if (!subText && textValues.length > 1) {
        subText = textValues[1]?.text?.substring(0, 80) || null;
      }
    }

    return {
      main: mainText || "Empty card",
      sub: subText || null,
    };
  };

  const cardHasQuiz = (card) =>
    (card.blocksSnapshot || []).some((b) => isQuizBlock(b));

  // Card incomplete (validation errors) for carousel warning icon
  const normalizeBlockTypeForValidation = (type) => {
    if (type == null) return type;
    const num = typeof type === "number" ? type : /^\d+$/.test(String(type)) ? Number(type) : NaN;
    if (!Number.isNaN(num) && BlockTypeNames[num] != null) return BlockTypeNames[num];
    return type;
  };
  const resolveBlockTypeForValidation = (block) => normalizeBlockTypeForValidation(block?.type);
  const getBlockConfigForValidation = (block) => {
    const raw = block?.configJson ?? block?.config_json;
    if (raw == null) return null;
    if (typeof raw === "object") return raw;
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch {
      return null;
    }
  };
  const isCardIncomplete = (card) => {
    const blocks = card?.blocksSnapshot || [];
    if (blocks.length === 0) return false;
    const valuesObj = Object.fromEntries((card.values || []).map((v) => [v.blockId, v]));
    const result = getBlockValidationErrors(blocks, valuesObj, {
      resolveBlockType: resolveBlockTypeForValidation,
      getBlockConfig: getBlockConfigForValidation,
    });
    return !result.valid;
  };

  // Filter cards by search
  const filteredCards = cards.filter((card) => {
    if (!searchQuery) return true;
    const preview = getCardPreview(card);
    const searchLower = searchQuery.toLowerCase();
    return (
      preview.main.toLowerCase().includes(searchLower) ||
      (preview.sub && preview.sub.toLowerCase().includes(searchLower))
    );
  });

  if (loading || !deck) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <div className="h-5 w-24 bg-white/[0.05] rounded-md mb-8 animate-pulse" />
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 sm:p-8 mb-6 animate-pulse">
          <div className="h-8 w-64 bg-white/[0.06] rounded-lg mb-3" />
          <div className="h-4 w-96 bg-white/[0.04] rounded-md mb-5" />
          <div className="h-6 w-20 bg-white/[0.05] rounded-full" />
        </div>
        <div className="flex gap-2 mb-6">
          {[80, 72, 80, 100, 96].map((w, i) => (
            <div key={i} className="h-9 rounded-xl bg-white/[0.04] animate-pulse" style={{ width: w }} />
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 animate-pulse">
              <div className="h-4 w-3/4 bg-white/[0.05] rounded mb-2" />
              <div className="h-3 w-1/2 bg-white/[0.04] rounded mb-4" />
              <div className="h-3 w-16 bg-white/[0.03] rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <audio ref={deckAudioRef} className="hidden" />
      {/* Header — modern deck hero + actions */}
      <header className="mb-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-[13px] text-white/35 hover:text-white/70 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Decks
        </Link>

        {/* Deck hero: view mode (title/desc) or edit mode (form + bulk select) */}
        <div className="p-6 sm:p-8 mb-6 rounded-2xl border border-white/[0.07] bg-white/[0.02]">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="min-w-0 flex-1">
              {deckEditMode ? (
                <form
                  id="deck-edit-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void handleSaveEditDeck(e);
                  }}
                >
                  <input
                    data-deck-title-input
                    type="text"
                    value={editDeckTitle}
                    onChange={(e) => setEditDeckTitle(e.target.value)}
                    placeholder="Deck title"
                    className="w-full text-2xl sm:text-3xl font-semibold text-white tracking-tight bg-transparent border-0 border-b border-white/20 focus:border-white/40 focus:outline-none pb-1 transition-colors placeholder-white/30"
                    required
                  />
                  <textarea
                    value={editDeckDescription}
                    onChange={(e) => setEditDeckDescription(e.target.value)}
                    placeholder="No description"
                    rows={2}
                    className="mt-2 w-full text-white/70 text-sm sm:text-base leading-relaxed bg-transparent border-0 border-b border-white/20 focus:border-white/40 focus:outline-none resize-none placeholder-white/40 italic pb-1 transition-colors"
                  />
                </form>
              ) : (
                <>
                  <h1 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">
                    {deck.title}
                  </h1>
                  <p className={`mt-2 text-white/70 text-sm sm:text-base leading-relaxed ${!deck.description ? "text-white/40 italic" : ""}`}>
                    {deck.description || "No description"}
                  </p>
                </>
              )}
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center rounded-full bg-white/[0.06] border border-white/[0.07] px-3 py-1 text-[11px] font-medium text-white/50">
                  {cards.length} {cards.length === 1 ? "card" : "cards"}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {deckEditMode ? (
                <button
                  type="button"
                  disabled={!editDeckTitle.trim() || savingDeck}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-white/15 bg-white/[0.04] text-white/90 font-medium text-sm hover:bg-white/10 hover:border-white/25 transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none"
                  title="Save deck and exit edit mode"
                  onClick={(e) => {
                    e.preventDefault();
                    void handleSaveEditDeck(e);
                  }}
                >
                  {savingDeck ? "Saving…" : "Done"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={enterDeckEditMode}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-white/15 bg-white/[0.04] text-white/90 font-medium text-sm hover:bg-white/10 hover:border-white/25 transition-all duration-200"
                  title="Edit deck title, description, or select cards to delete"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit
                </button>
              )}
              <div className="relative" ref={exportMenuRef}>
                <button
                  type="button"
                  onClick={() => setShowExportMenu((v) => !v)}
                  disabled={cards.length === 0}
                  title={cards.length === 0 ? "Add cards to export" : "Export deck"}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-white/15 bg-white/[0.04] text-white/90 font-medium text-sm hover:bg-white/10 hover:border-white/25 disabled:opacity-50 disabled:pointer-events-none transition-all duration-200"
                >
                  <Download className="w-4 h-4" />
                  Export
                  <ChevronDown className="w-4 h-4 opacity-70" />
                </button>
                {showExportMenu && (
                  <div className="absolute left-0 top-full mt-1 py-1 min-w-[140px] bg-[#141414] border border-white/[0.09] rounded-xl shadow-xl z-50">
                    <button
                      type="button"
                      onClick={handleExportCSV}
                      className="flex items-center gap-2 w-full px-3.5 py-2.5 text-left text-[13px] text-white/60 hover:text-white/90 hover:bg-white/[0.06] transition-colors"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      CSV
                    </button>
                    <button
                      type="button"
                      onClick={handleExportXLSX}
                      disabled={isProduction && !aiEntitled}
                      title={isProduction && !aiEntitled ? "Pro required" : undefined}
                      className="flex items-center gap-2 w-full px-3.5 py-2.5 text-left text-[13px] text-white/60 hover:text-white/90 hover:bg-white/[0.06] transition-colors disabled:opacity-40"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      XLSX
                    </button>
                    <button
                      type="button"
                      onClick={handleExportAPKG}
                      disabled={exportApkgLoading || (isProduction && !aiEntitled)}
                      title={isProduction && !aiEntitled ? "Pro required" : undefined}
                      className="flex items-center gap-2 w-full px-3.5 py-2.5 text-left text-[13px] text-white/60 hover:text-white/90 hover:bg-white/[0.06] transition-colors disabled:opacity-40"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      {exportApkgLoading ? "Exporting…" : "Anki (.apkg)"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/dashboard/deck/${deckId}/study`}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-white/15 bg-white/[0.04] text-white/90 font-medium text-sm hover:bg-white/10 hover:border-white/25 transition-all duration-200"
          >
            <Play className="w-4 h-4" />
            Study
          </Link>
          <button
            type="button"
            onClick={() => {
              setAddCardTemplateId(effectiveDefaultTemplateId || templates[0]?.templateId || "");
              setShowAddCardModal(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-white/15 bg-white/[0.04] text-white/90 font-medium text-sm hover:bg-white/10 hover:border-white/25 transition-all duration-200"
          >
            <Plus className="w-4 h-4" />
            Add card
          </button>
          <button
            onClick={() => setShowImportModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-white/15 bg-white/[0.04] text-white/90 font-medium text-sm hover:bg-white/10 hover:border-white/25 transition-all duration-200"
            title="CSV, Excel, or Anki — AI for quiz & audio"
          >
            <Table2 className="w-4 h-4" />
            Import
            <Sparkles className="w-3.5 h-3.5 text-white/50" />
          </button>
          {isProduction && !aiEntitled ? (
            <Link
              href="/dashboard/subscription"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-600/90 hover:bg-amber-600 text-white font-medium text-sm shadow-md shadow-amber-600/15 transition-all duration-200"
              title="Upgrade to Pro"
            >
              <Sparkles className="w-4 h-4" />
              AI (Pro)
            </Link>
          ) : (
            <button
              type="button"
              disabled={cards.length === 0}
              title={cards.length === 0 ? "Add at least one card first" : undefined}
              onClick={async () => {
                setAddWithAIError(null);
                setAddWithAIDevPrompt(null);
                setAddWithAISuccess(null);
                setAddWithAIGeneratedCards([]);
                setAddWithAISelectedIndices(new Set());
                let list = templates;
                if (user) {
                  try {
                    list = await getTemplates(user.uid);
                    setTemplates(list);
                  } catch {
                    /* keep cached */
                  }
                }
                setAddWithAITemplateId(effectiveDefaultTemplateId || list[0]?.templateId || "");
                setShowAddWithAIModal(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-white/15 bg-white/[0.04] text-white/90 font-medium text-sm hover:bg-white/10 hover:border-white/25 transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none"
            >
              <Sparkles className="w-4 h-4 text-white/60" />
              Create with AI
            </button>
          )}
          <button
            type="button"
            disabled={!aiEntitled}
            title={!aiEntitled ? "Pro required" : "Generate from document or image — uses AI"}
            onClick={() => {
              setFileToAIError(null);
              setFileToAIFile(null);
              setFileToAITemplateId(effectiveDefaultTemplateId || templates[0]?.templateId || "");
              setShowFileToAIModal(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-white/15 bg-white/[0.04] text-white/90 font-medium text-sm hover:bg-white/10 hover:border-white/25 transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none"
          >
            <FileText className="w-4 h-4" />
            From doc/image
            <Sparkles className="w-3.5 h-3.5 text-white/50" />
          </button>
        </div>

        {/* Default template — compact settings row */}
        {templates.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
            <Settings className="w-4 h-4 text-white/40 shrink-0" />
            <span className="text-white/50">Default template</span>
            <select
              value={
                deck.defaultTemplateId &&
                templates.some((t) => t.templateId === deck.defaultTemplateId)
                  ? deck.defaultTemplateId
                  : ""
              }
              onChange={async (e) => {
                const templateId = e.target.value || null;
                try {
                  await updateDeck(user.uid, deckId, { defaultTemplateId: templateId });
                  setDeck((prev) => (prev ? { ...prev, defaultTemplateId: templateId } : prev));
                } catch (err) {
                  console.error("Failed to update default template:", err);
                }
              }}
              className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-white/70 text-[13px] focus:outline-none focus:border-accent/50 focus:bg-white/[0.06] transition-colors"
            >
              <option value="">Most used in deck</option>
              {templates.map((t) => (
                <option key={t.templateId} value={t.templateId}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </header>

      {/* Bulk selection bar */}
      {bulkSelectMode && filteredCards.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-3 px-4 py-3 bg-white/[0.03] border border-white/[0.07] rounded-xl">
          <span className="text-white/80 text-sm font-medium">
            {selectedCardIds.size} selected
          </span>
          <button
            type="button"
            onClick={selectAllFilteredCards}
            className="text-sm text-accent hover:text-accent/80 transition-colors"
          >
            Select all
          </button>
          <button
            type="button"
            onClick={() => setSelectedCardIds(new Set())}
            className="text-sm text-white/60 hover:text-white transition-colors"
          >
            Clear selection
          </button>
          <div className="flex-1" />
          <button
            type="button"
            onClick={() => setShowBulkDeleteModal(true)}
            disabled={selectedCardIds.size === 0}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-red-500 hover:bg-red-400 text-white text-sm font-medium shadow-lg shadow-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            <Trash2 className="w-4 h-4" />
            Delete selected
          </button>
        </div>
      )}

      {/* Search Bar */}
      {cards.length > 0 && (
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/30" />
          <input
            type="text"
            placeholder="Search cards..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-[14px] text-white placeholder-white/20 focus:outline-none focus:border-accent/50 focus:bg-white/[0.06] transition-colors"
          />
        </div>
      )}

      {/* Cards Grid */}
      {filteredCards.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-center mx-auto mb-5">
            <Layers className="w-6 h-6 text-white/20" />
          </div>
          <h3 className="text-[16px] font-semibold text-white/60 mb-2">
            {searchQuery ? "No cards found" : "No cards yet"}
          </h3>
          <p className="text-[13px] text-white/30 mb-6">
            {searchQuery
              ? "Try a different search term"
              : "Create your first card to get started"}
          </p>
          {!searchQuery && (
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <button
                onClick={() => setShowImportModal(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl border border-white/15 bg-white/[0.04] text-white/90 font-medium text-sm hover:bg-white/10 hover:border-white/25 transition-all duration-200"
              >
                <Table2 className="w-5 h-5" />
                Import from table
                <Sparkles className="w-4 h-4 text-white/50" />
              </button>
              {aiEntitled && (
                <button
                  type="button"
                  onClick={() => {
                    setFileToAIError(null);
                    setFileToAIFile(null);
                    setFileToAITemplateId(effectiveDefaultTemplateId || templates[0]?.templateId || "");
                    setShowFileToAIModal(true);
                  }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl border border-white/15 bg-white/[0.04] text-white/90 font-medium text-sm hover:bg-white/10 hover:border-white/25 transition-all duration-200"
                >
                  <FileText className="w-5 h-5" />
                  Generate from doc/img
                  <Sparkles className="w-4 h-4 text-white/50" />
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setAddCardTemplateId(effectiveDefaultTemplateId || templates[0]?.templateId || "");
                  setShowAddCardModal(true);
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl border border-white/15 bg-white/[0.04] text-white/90 font-medium text-sm hover:bg-white/10 hover:border-white/25 transition-all duration-200"
              >
                <Plus className="w-5 h-5" />
                Add Card
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCards.map((card) => (
            <motion.div
              key={card.cardId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={
                bulkSelectMode
                  ? "relative group flex items-stretch bg-white/[0.025] border border-white/[0.07] rounded-xl overflow-hidden"
                  : "relative group"
              }
            >
              {bulkSelectMode && (
                <div
                  className="flex items-center pl-4 shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={selectedCardIds.has(card.cardId)}
                    onChange={() => toggleBulkSelectCard(card.cardId)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-5 h-5 rounded border-white/30 bg-white/5 text-accent focus:ring-accent"
                  />
                </div>
              )}
              <Link
                href={bulkSelectMode ? "#" : `/dashboard/deck/${deckId}/card/${card.cardId}`}
                onClick={bulkSelectMode ? (e) => { e.preventDefault(); toggleBulkSelectCard(card.cardId); } : undefined}
                className={
                  bulkSelectMode
                    ? "flex-1 min-w-0 block p-4 hover:bg-white/5 transition-colors cursor-pointer"
                    : "block p-4 bg-white/[0.025] hover:bg-white/[0.045] border border-white/[0.07] hover:border-white/[0.12] rounded-xl transition-colors"
                }
              >
                <div className="flex gap-3 items-stretch min-h-[3rem]">
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    {(() => {
                      const preview = getCardPreview(card);
                      const incomplete = isCardIncomplete(card);
                      const hasQuiz = cardHasQuiz(card);
                      return (
                        <>
                          <p className="text-[14px] text-white/80 font-medium flex items-center gap-1.5">
                            {incomplete && (
                              <AlertCircle
                                className="w-4 h-4 shrink-0 text-amber-400"
                                aria-hidden
                                title="Card has validation errors"
                              />
                            )}
                            {hasQuiz && !incomplete && (
                              <HelpCircle
                                className="w-4 h-4 shrink-0 text-white/50"
                                aria-hidden
                                title="Card has quiz"
                              />
                            )}
                            <span className="min-w-0 line-clamp-2">{preview.main}</span>
                          </p>
                          {preview.sub && (
                            <p className="text-[13px] text-white/35 line-clamp-2 mt-1">
                              {preview.sub}
                            </p>
                          )}
                          <p className="text-[11px] text-white/20 mt-2">
                            {new Date(card.createdAt).toLocaleDateString()}
                          </p>
                        </>
                      );
                    })()}
                  </div>
                  <div className="flex gap-2 shrink-0 items-stretch">
                    {cardMediaCache[card.cardId]?.imageUrl && (
                      <div className="relative w-16 min-w-[4rem] min-h-[3rem] rounded-lg overflow-hidden bg-white/5 flex-shrink-0">
                        <Image
                          src={cardMediaCache[card.cardId].imageUrl}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="64px"
                        />
                      </div>
                    )}
                    {cardMediaCache[card.cardId]?.audioUrl && (
                      <div className="flex items-center gap-2 shrink-0 self-center">
                        <button
                          type="button"
                          onClick={(e) => handleDeckCardAudioClick(e, card.cardId, cardMediaCache[card.cardId].audioUrl)}
                          className={`flex items-center justify-center w-10 h-10 rounded-lg flex-shrink-0 transition-colors ${
                            playingCardId === card.cardId ? "bg-accent text-white" : "bg-accent/20 text-accent hover:bg-accent/30"
                          }`}
                          title={playingCardId === card.cardId ? "Pause" : "Play audio"}
                        >
                          {playingCardId === card.cardId ? (
                            <Pause className="w-5 h-5" />
                          ) : (
                            <Volume2 className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </Link>

              {/* Action Menu */}
              <div className="absolute top-2 right-2">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    setActionMenuCardId(
                      actionMenuCardId === card.cardId ? null : card.cardId
                    );
                  }}
                  className="p-1 opacity-0 group-hover:opacity-100 hover:bg-white/10 rounded transition-all"
                >
                  <MoreVertical className="w-4 h-4 text-white/50" />
                </button>

                {actionMenuCardId === card.cardId && (
                  <div className="absolute right-0 top-8 bg-[#141414] border border-white/[0.09] rounded-xl shadow-xl py-1 z-10 min-w-[140px]">
                    <Link
                      href={`/dashboard/deck/${deckId}/card/${card.cardId}`}
                      className="flex items-center gap-2 px-3.5 py-2.5 text-[13px] text-white/60 hover:text-white/90 hover:bg-white/[0.06] transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      Edit
                    </Link>
                    <Link
                      href={`/dashboard/deck/${deckId}/card/${card.cardId}/preview?from=deck`}
                      onClick={() => {
                        try {
                          sessionStorage.removeItem(`card-preview-draft-${deckId}`);
                        } catch {
                          /* ignore */
                        }
                      }}
                      className="flex items-center gap-2 px-3.5 py-2.5 text-[13px] text-white/60 hover:text-white/90 hover:bg-white/[0.06] transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Preview
                    </Link>
                    <div className="h-px bg-white/[0.05]" />
                    <button
                      onClick={() => {
                        setSelectedCard(card);
                        setShowDeleteModal(true);
                        setActionMenuCardId(null);
                      }}
                      className="flex items-center gap-2 px-3.5 py-2.5 text-[13px] text-red-400/70 hover:text-red-400 hover:bg-red-500/[0.07] transition-colors w-full"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Delete Modal */}
      <AnimatePresence>
        {showDeleteModal && selectedCard && (
          <Modal onClose={() => setShowDeleteModal(false)}>
            <h2 className="text-xl font-bold text-white mb-4">Delete Card</h2>
            <p className="text-white/70 mb-6">
              Are you sure you want to delete this card? This action cannot be
              undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-2.5 rounded-2xl border border-white/15 bg-white/[0.04] text-white/90 font-medium text-sm hover:bg-white/10 hover:border-white/25 transition-all duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteCard}
                className="flex-1 px-4 py-2.5 rounded-2xl bg-red-500 hover:bg-red-400 text-white font-medium text-sm shadow-lg shadow-red-500/20 transition-all duration-200"
              >
                Delete
              </button>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* Bulk Delete Confirmation Modal */}
      <AnimatePresence>
        {showBulkDeleteModal && (
          <Modal onClose={() => setShowBulkDeleteModal(false)}>
            <h2 className="text-xl font-bold text-white mb-4">Delete selected cards</h2>
            <p className="text-white/70 mb-6">
              Are you sure you want to delete {selectedCardIds.size} card{selectedCardIds.size !== 1 ? "s" : ""}? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowBulkDeleteModal(false)}
                className="flex-1 px-4 py-2.5 rounded-2xl border border-white/15 bg-white/[0.04] text-white/90 font-medium text-sm hover:bg-white/10 hover:border-white/25 transition-all duration-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkDeleteCards}
                disabled={bulkDeleting}
                className="flex-1 px-4 py-2.5 rounded-2xl bg-red-500 hover:bg-red-400 text-white font-medium text-sm shadow-lg shadow-red-500/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
              >
                {bulkDeleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* Add card – template or blank */}
      <AnimatePresence>
        {showAddCardModal && deck && (
          <Modal onClose={() => setShowAddCardModal(false)}>
            <div className="flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Plus className="w-5 h-5 text-white/70" />
                  Add Card
                </h2>
                <button
                  type="button"
                  onClick={() => setShowAddCardModal(false)}
                  className="p-1 hover:bg-white/10 rounded transition-colors"
                >
                  <X className="w-5 h-5 text-white/50" />
                </button>
              </div>
              <p className="text-white/60 text-sm mb-3">Create from a template or start from a blank card.</p>
              <div className="mb-4 space-y-3">
                <label className="flex items-center gap-3 p-3 rounded-lg border border-white/10 cursor-pointer hover:bg-white/5">
                  <input
                    type="radio"
                    name="addCardMode"
                    checked={addCardMode === "template"}
                    onChange={() => setAddCardMode("template")}
                    className="text-accent"
                  />
                  <span className="text-white">From template</span>
                </label>
                <label className="flex items-center gap-3 p-3 rounded-lg border border-white/10 cursor-pointer hover:bg-white/5">
                  <input
                    type="radio"
                    name="addCardMode"
                    checked={addCardMode === "blank"}
                    onChange={() => setAddCardMode("blank")}
                    className="text-accent"
                  />
                  <span className="text-white">From blank</span>
                </label>
                {addCardMode === "template" && (
                  <div className="ml-6 mt-2">
                    {templates.length === 0 ? (
                      <p className="text-white/50 text-sm">Loading templates...</p>
                    ) : (
                      <>
                        <label className="text-white/70 text-sm block mb-1">Template</label>
                        <select
                          value={addCardTemplateId}
                          onChange={(e) => setAddCardTemplateId(e.target.value)}
                          className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-accent/50 transition-colors"
                        >
                          {templates.map((t) => (
                            <option key={t.templateId} value={t.templateId}>
                              {t.name} ({t.blocks?.length ?? 0} blocks)
                            </option>
                          ))}
                        </select>
                      </>
                    )}
                  </div>
                )}
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowAddCardModal(false)}
                  className="px-4 py-2.5 rounded-2xl border border-white/15 bg-white/[0.04] text-white/90 font-medium text-sm hover:bg-white/10 hover:border-white/25 transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddCardModal(false);
                    if (addCardMode === "blank") {
                      router.push(`/dashboard/deck/${deckId}/card/new`);
                    } else {
                      const tid = addCardTemplateId || templates[0]?.templateId;
                      if (tid) router.push(`/dashboard/deck/${deckId}/card/new?templateId=${tid}`);
                    }
                  }}
                  disabled={addCardMode === "template" && templates.length === 0}
                  className="px-4 py-2.5 rounded-2xl bg-accent hover:bg-accent/90 text-white font-medium text-sm shadow-lg shadow-accent/20 transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none disabled:shadow-none"
                >
                  Add Card
                </button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* Add card with AI Modal */}
      <AnimatePresence>
        {showAddWithAIModal && deck && (
          <Modal onClose={() => !addWithAIGenerating && closeAddWithAIModal()}>
            <div className="flex flex-col max-h-[85vh]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                  {addWithAIGeneratedCards.length > 0
                    ? "Select cards to add"
                    : addWithAISuccess
                      ? "Cards added"
                      : "Create card with AI"}
                </h2>
                <button
                  type="button"
                  onClick={() => !addWithAIGenerating && closeAddWithAIModal()}
                  className="p-1 hover:bg-white/10 rounded transition-colors"
                >
                  <X className="w-5 h-5 text-white/50" />
                </button>
              </div>

              {addWithAIGeneratedCards.length > 0 ? (
                <>
                  {addWithAIProgress && (
                    <div className="mb-4 flex items-center gap-2 text-amber-400/90 text-sm">
                      <span className="animate-spin rounded-full h-4 w-4 border-2 border-amber-400/50 border-t-amber-400" />
                      <span>{addWithAIProgress}</span>
                    </div>
                  )}
                  <p className="text-white/70 text-sm mb-3">
                    Select which cards to add, edit any card’s content, then add selected to the deck.
                  </p>
                  <div className="mb-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setAddWithAISelectedIndices(new Set(addWithAIGeneratedCards.map((_, i) => i)))
                      }
                      className="text-xs text-white/60 hover:text-white underline"
                    >
                      Select all
                    </button>
                    <span className="text-white/40">|</span>
                    <button
                      type="button"
                      onClick={() => setAddWithAISelectedIndices(new Set())}
                      className="text-xs text-white/60 hover:text-white underline"
                    >
                      Deselect all
                    </button>
                  </div>
                  <div className="mb-4 max-h-64 overflow-y-auto space-y-1 rounded-lg border border-white/10 p-2">
                    {addWithAIGeneratedCards.map((card, i) => (
                      <div key={i} className="rounded-lg border border-white/5 overflow-hidden">
                        <label
                          className="flex items-center gap-3 p-2 hover:bg-white/5 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={addWithAISelectedIndices.has(i)}
                            onChange={(e) => {
                              e.stopPropagation();
                              setAddWithAISelectedIndices((prev) => {
                                const next = new Set(prev);
                                if (next.has(i)) next.delete(i);
                                else next.add(i);
                                return next;
                              });
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="rounded border-white/30 bg-white/5 text-amber-500 focus:ring-amber-500"
                          />
                          <span className="text-white/90 text-sm truncate flex-1">
                            {getGeneratedCardPreview(card)}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              setEditingGeneratedCardIndex((prev) => (prev === i ? null : i));
                            }}
                            className="shrink-0 px-2 py-1 text-xs text-amber-400 hover:text-amber-300 hover:bg-white/5 rounded"
                          >
                            {editingGeneratedCardIndex === i ? "Done" : "Edit"}
                          </button>
                        </label>
                        {editingGeneratedCardIndex === i && (
                          <div className="border-t border-white/10 bg-black/20 p-3 space-y-2">
                            {(card.values || []).map((v, vi) => {
                              const block = (card.blocksSnapshot || []).find(
                                (b) => b.blockId === v.blockId
                              );
                              const label = block?.label || v.blockId?.slice(0, 8) || `Field ${vi + 1}`;
                              const isLong =
                                v.type === "hiddenText" ||
                                v.type === "example" ||
                                v.type === "text";
                              const isQuiz =
                                v.type === "quizSingleSelect" ||
                                v.type === "quizMultiSelect" ||
                                v.type === "quizTextAnswer" ||
                                v.type === 8 ||
                                v.type === 9 ||
                                v.type === 10;
                              if (isQuiz) return null;
                              return (
                                <div key={vi}>
                                  <label className="text-white/60 text-xs block mb-0.5">
                                    {label}
                                  </label>
                                  {isLong ? (
                                    <textarea
                                      value={v.text ?? ""}
                                      onChange={(e) =>
                                        updateGeneratedCardValue(i, vi, e.target.value)
                                      }
                                      rows={2}
                                      className="w-full px-2 py-1.5 text-[13px] text-white bg-white/[0.04] border border-white/[0.08] rounded-lg focus:outline-none focus:border-amber-500/50 resize-y transition-colors"
                                    />
                                  ) : (
                                    <input
                                      type="text"
                                      value={v.text ?? ""}
                                      onChange={(e) =>
                                        updateGeneratedCardValue(i, vi, e.target.value)
                                      }
                                      className="w-full px-2 py-1.5 text-[13px] text-white bg-white/[0.04] border border-white/[0.08] rounded-lg focus:outline-none focus:border-amber-500/50 transition-colors"
                                    />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  {isDev && addWithAIDevPrompt && (
                    <div className="mb-4 border border-amber-500/30 rounded-lg overflow-hidden bg-black/20">
                      <div className="flex items-center justify-between px-3 py-2 bg-amber-500/10">
                        <button
                          type="button"
                          onClick={() => setShowDevPrompt((p) => !p)}
                          className="text-left text-amber-400/90 text-xs font-medium hover:bg-white/5 flex items-center gap-2"
                        >
                          Request prompt
                          <span className="text-white/40">{showDevPrompt ? "▼" : "▶"}</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleCopyPrompt}
                          className="flex items-center gap-1 px-2 py-1 text-xs text-amber-400/90 hover:bg-white/10 rounded"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          Copy prompt
                        </button>
                      </div>
                      {showDevPrompt && (
                        <div className="p-4 bg-black/40 text-white/90 font-mono text-base whitespace-pre-wrap min-h-[28rem] max-h-[min(56rem,90vh)] overflow-y-auto border-t border-white/10 leading-relaxed">
                          <div className="mb-2 text-amber-400/80">System:</div>
                          <div className="mb-3">{addWithAIDevPrompt.system}</div>
                          <div className="mb-2 text-amber-400/80">User:</div>
                          <div>{addWithAIDevPrompt.user}</div>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 justify-end">
                    <button
                      type="button"
                      onClick={closeAddWithAIModal}
                      disabled={!!addWithAIProgress}
                      className="px-4 py-2.5 rounded-2xl border border-white/15 bg-white/[0.04] text-white/90 font-medium text-sm hover:bg-white/10 hover:border-white/25 transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none"
                    >
                      Cancel all
                    </button>
                    <button
                      type="button"
                      onClick={handleAddSelectedCardsToDeck}
                      disabled={addWithAISelectedIndices.size === 0 || !!addWithAIProgress}
                      className="px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-white font-medium text-sm shadow-lg shadow-amber-500/25 transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none disabled:shadow-none"
                    >
                      {addWithAIGeneratedCards[0]?.blocksSnapshot?.some(
                        (b) => b.type === "audio" || b.type === 7 || b.type === "7"
                      )
                        ? "Add selected (" + addWithAISelectedIndices.size + ") to deck + generate audio"
                        : "Add selected (" + addWithAISelectedIndices.size + ") to deck"}
                    </button>
                  </div>
                </>
              ) : addWithAISuccess ? (
                <>
                  <p className="text-white/80 mb-4">
                    {addWithAISuccess.count} {addWithAISuccess.count === 1 ? "card has" : "cards have"} been added to this deck.
                    {addWithAISuccess.skippedDuplicates > 0 && (
                      <> ({addWithAISuccess.skippedDuplicates} duplicate{addWithAISuccess.skippedDuplicates === 1 ? "" : "s"} skipped)</>
                    )}
                  </p>
                  {isDev && addWithAIDevPrompt && (
                    <div className="mb-4 border border-amber-500/30 rounded-lg overflow-hidden bg-black/20">
                      <div className="flex items-center justify-between px-3 py-2 bg-amber-500/10">
                        <button
                          type="button"
                          onClick={() => setShowDevPrompt((p) => !p)}
                          className="text-left text-amber-400/90 text-xs font-medium hover:bg-white/5 flex items-center gap-2"
                        >
                          Request prompt
                          <span className="text-white/40">{showDevPrompt ? "▼" : "▶"}</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleCopyPrompt}
                          className="flex items-center gap-1 px-2 py-1 text-xs text-amber-400/90 hover:bg-white/10 rounded"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          Copy prompt
                        </button>
                      </div>
                      {showDevPrompt && (
                        <div className="p-4 bg-black/40 text-white/90 font-mono text-base whitespace-pre-wrap min-h-[28rem] max-h-[min(56rem,90vh)] overflow-y-auto border-t border-white/10 leading-relaxed">
                          <div className="mb-2 text-amber-400/80">System:</div>
                          <div className="mb-3">{addWithAIDevPrompt.system}</div>
                          <div className="mb-2 text-amber-400/80">User:</div>
                          <div>{addWithAIDevPrompt.user}</div>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 justify-end">
                    <button
                      type="button"
                      onClick={closeAddWithAIModal}
                      className="px-4 py-2.5 rounded-2xl border border-white/15 bg-white/[0.04] text-white/90 font-medium text-sm hover:bg-white/10 hover:border-white/25 transition-all duration-200"
                    >
                      Close
                    </button>
                    {addWithAISuccess.count === 1 && addWithAISuccess.lastCardId && (
                      <button
                        type="button"
                        onClick={() => {
                          router.push(`/dashboard/deck/${deckId}/card/${addWithAISuccess.lastCardId}`);
                          closeAddWithAIModal();
                        }}
                        className="px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-white font-medium text-sm shadow-lg shadow-amber-500/25 transition-all duration-200"
                      >
                        Go to card
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        router.push(`/dashboard/deck/${deckId}`);
                        closeAddWithAIModal();
                      }}
                      className="px-4 py-2.5 rounded-2xl bg-accent hover:bg-accent/90 text-white font-medium text-sm shadow-lg shadow-accent/20 transition-all duration-200"
                    >
                      Go to deck
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-white/60 text-sm mb-4">
                    Uses this deck and existing cards as context. No &quot;back&quot; — only front (and other blocks in the template).
                  </p>
                  <div className="space-y-3 mb-4">
                    <div>
                      <span className="text-white/50 text-xs">Deck</span>
                      <p className="text-white font-medium">{deck.title}</p>
                      {deck.description && (
                        <p className="text-white/60 text-sm mt-0.5">{deck.description}</p>
                      )}
                    </div>
                    <div>
                      <label className="text-white/70 text-sm block mb-1">Template</label>
                      <select
                        value={addWithAITemplateId}
                        onChange={(e) => setAddWithAITemplateId(e.target.value)}
                        disabled={addWithAIGenerating}
                        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500/50 transition-colors"
                      >
                        {templates.map((t) => (
                          <option key={t.templateId} value={t.templateId}>
                            {t.name} ({t.blocks?.length ?? 0} blocks)
                          </option>
                        ))}
                      </select>
                    </div>
                    {addWithAITemplateId && (() => {
                      const selectedTemplate = templates.find((t) => t.templateId === addWithAITemplateId);
                      const blocks = selectedTemplate?.blocks || [];
                      if (blocks.length === 0) return null;
                      const blockTypeLabel = (type) => {
                        const names = { header1: "Header 1", header2: "Header 2", header3: "Header 3", text: "Text", quote: "Quote", hiddenText: "Hidden", image: "Image", audio: "Audio", quizSingleSelect: "Quiz (single)", quizMultiSelect: "Quiz (multi)", quizTextAnswer: "Quiz (text)", divider: "Divider", space: "Space" };
                        return names[type] || (typeof type === "number" ? ["Header 1", "Header 2", "Header 3", "Text", "Quote", "Hidden", "Image", "Audio", "Quiz (multi)", "Quiz (single)", "Quiz (text)", "Divider", "Space"][type] : type);
                      };
                      return (
                        <div>
                          <span className="text-white/50 text-xs">Template format</span>
                          <div className="mt-1 flex flex-wrap gap-1.5">
                            {blocks.map((b) => (
                              <span
                                key={b.blockId}
                                className="inline-flex items-center rounded-md bg-white/10 px-2 py-0.5 text-xs text-white/80"
                              >
                                {b.label && String(b.label).trim() ? b.label : blockTypeLabel(b.type)}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                    <div>
                      <label className="text-white/70 text-sm block mb-1">Number of cards</label>
                      <select
                        value={addWithAICount}
                        onChange={(e) => setAddWithAICount(Number(e.target.value))}
                        disabled={addWithAIGenerating}
                        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500/50 transition-colors"
                      >
                        {[1, 2, 3, 4, 5].map((n) => (
                          <option key={n} value={n}>
                            {n} {n === 1 ? "card" : "cards"}
                          </option>
                        ))}
                      </select>
                    </div>
                    {cards.length > 0 && (
                      <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                        <p className="text-sm font-medium text-white/90 mb-0.5">Reference cards</p>
                        <p className="text-xs text-white/50 mb-3">Optional — pick cards to match style and tone.</p>
                        <div className="max-h-44 overflow-y-auto space-y-2 pr-1 -mr-1">
                          {cards.slice(0, 20).map((card) => {
                            const preview = getCardPreview(card);
                            const label = [preview.main, preview.sub].filter(Boolean).join(" — ") || "Empty card";
                            const checked = addWithAIReferenceCardIds.has(card.cardId);
                            return (
                              <label
                                key={card.cardId}
                                className={`flex items-center gap-3 py-2.5 px-3 rounded-xl border cursor-pointer transition-all duration-200 ${
                                  checked
                                    ? "border-amber-500/50 bg-amber-500/10 text-white"
                                    : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/15 text-white/90"
                                }`}
                              >
                                <span className={`shrink-0 w-4 h-4 rounded-md border flex items-center justify-center transition-colors ${
                                  checked ? "border-amber-400 bg-amber-500" : "border-white/30 bg-white/5"
                                }`}>
                                  {checked && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                                </span>
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => {
                                    setAddWithAIReferenceCardIds((prev) => {
                                      const next = new Set(prev);
                                      if (next.has(card.cardId)) next.delete(card.cardId);
                                      else next.add(card.cardId);
                                      return next;
                                    });
                                  }}
                                  className="sr-only"
                                />
                                <span className="truncate flex-1 text-sm min-w-0" title={label}>
                                  {label}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                        {cards.length > 20 && (
                          <p className="text-white/40 text-xs mt-2">Showing first 20 of {cards.length}</p>
                        )}
                      </div>
                    )}
                  </div>
                  {addWithAIProgress && (
                    <div className="flex items-center gap-2 text-amber-400/90 text-sm py-2">
                      <span className="animate-spin rounded-full h-4 w-4 border-2 border-amber-400/50 border-t-amber-400" />
                      <span>{addWithAIProgress}</span>
                    </div>
                  )}
                  {addWithAIError && (
                    <p className="text-red-400 text-sm mb-4">{addWithAIError}</p>
                  )}
                  {isDev && (
                    <div className="mb-4 flex flex-wrap gap-2 items-center">
                      <button
                        type="button"
                        onClick={handlePreviewAddWithAIPrompt}
                        disabled={addWithAIGenerating || addWithAIPreviewLoading || !addWithAITemplateId}
                        className="px-3 py-1.5 text-xs bg-white/10 hover:bg-white/20 text-white/80 rounded-lg border border-white/10 disabled:opacity-50 disabled:pointer-events-none"
                      >
                        {addWithAIPreviewLoading ? "Building preview…" : "Preview prompt"}
                      </button>
                    </div>
                  )}
                  {isDev && addWithAIDevPrompt && !addWithAISuccess && (
                    <div className="mb-4 border border-amber-500/30 rounded-lg overflow-hidden bg-black/20">
                      <div className="flex items-center justify-between px-3 py-2 bg-amber-500/10">
                        <button
                          type="button"
                          onClick={() => setShowDevPrompt((p) => !p)}
                          className="text-left text-amber-400/90 text-xs font-medium hover:bg-white/5 flex items-center gap-2"
                        >
                          Request prompt
                          <span className="text-white/40">{showDevPrompt ? "▼" : "▶"}</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleCopyPrompt}
                          className="flex items-center gap-1 px-2 py-1 text-xs text-amber-400/90 hover:bg-white/10 rounded"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          Copy prompt
                        </button>
                      </div>
                      {showDevPrompt && (
                        <div className="p-4 bg-black/40 text-white/90 font-mono text-base whitespace-pre-wrap min-h-[28rem] max-h-[min(56rem,90vh)] overflow-y-auto border-t border-white/10 leading-relaxed">
                          <div className="mb-2 text-amber-400/80">System:</div>
                          <div className="mb-3">{addWithAIDevPrompt.system}</div>
                          <div className="mb-2 text-amber-400/80">User:</div>
                          <div>{addWithAIDevPrompt.user}</div>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={closeAddWithAIModal}
                      disabled={addWithAIGenerating}
                      className="px-4 py-2.5 rounded-2xl border border-white/15 bg-white/[0.04] text-white/90 font-medium text-sm hover:bg-white/10 hover:border-white/25 transition-all duration-200 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const count = Math.min(5, Math.max(1, Number(addWithAICount) || 1));
                        const msg = `Generate ${count} ${count === 1 ? "card" : "cards"} and add ${count === 1 ? "it" : "them"} to this deck?`;
                        if (window.confirm(msg)) handleAddCardWithAI();
                      }}
                      disabled={addWithAIGenerating || !addWithAITemplateId}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-white font-medium text-sm shadow-lg shadow-amber-500/25 transition-all duration-200 disabled:opacity-50 disabled:shadow-none"
                    >
                      {addWithAIGenerating ? (
                        <>
                          <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                          {addWithAIProgress || "Generating..."}
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          Generate card
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* Generate from doc/img modal */}
      <AnimatePresence>
        {showFileToAIModal && deck && (
          <Modal onClose={() => !fileToAILoading && closeFileToAIModal()}>
            <div className="flex flex-col max-h-[85vh] min-h-0 overflow-y-auto">
              <div className="flex items-center justify-between pb-4 mb-2 border-b border-white/10">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2.5">
                  <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-amber-500/15 text-amber-400">
                    <FileText className="w-5 h-5" />
                  </span>
                  Generate from doc/img
                </h2>
                <button
                  type="button"
                  onClick={() => !fileToAILoading && closeFileToAIModal()}
                  className="p-2 rounded-xl hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {fileToAILoading ? (
                <div className="py-14 text-center">
                  <div className="w-14 h-14 mx-auto mb-4 rounded-2xl border-2 border-white/10 flex items-center justify-center">
                    <span className="animate-spin rounded-full h-8 w-8 border-2 border-amber-500/30 border-t-amber-500" />
                  </div>
                  <p className="text-white font-medium mb-1">Generating cards from file…</p>
                  <p className="text-white/50 text-sm">This may take a moment.</p>
                </div>
              ) : fileToAISuccessResult ? (
                <>
                  {addWithAISuccess && (
                    <div className="mb-4 p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400/90 text-sm">
                      {addWithAISuccess.count} {addWithAISuccess.count === 1 ? "card has" : "cards have"} been added to this deck.
                      {addWithAISuccess.skippedDuplicates > 0 && (
                        <span className="block mt-1 text-white/70">
                          ({addWithAISuccess.skippedDuplicates} duplicate{addWithAISuccess.skippedDuplicates === 1 ? "" : "s"} skipped)
                        </span>
                      )}
                    </div>
                  )}
                  <p className="text-white/70 text-sm mb-3">
                    Generated {addWithAIGeneratedCards.length} cards. Select which to add, then add selected to the deck.
                  </p>
                  <div className="mb-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setAddWithAISelectedIndices(new Set(addWithAIGeneratedCards.map((_, i) => i)))
                      }
                      className="text-xs text-white/60 hover:text-white underline"
                    >
                      Select all
                    </button>
                    <span className="text-white/40">|</span>
                    <button
                      type="button"
                      onClick={() => setAddWithAISelectedIndices(new Set())}
                      className="text-xs text-white/60 hover:text-white underline"
                    >
                      Deselect all
                    </button>
                  </div>
                  <div className="mb-4 max-h-64 overflow-y-auto space-y-1 rounded-lg border border-white/10 p-2">
                    {addWithAIGeneratedCards.map((card, i) => (
                      <div key={i} className="rounded-lg border border-white/5 overflow-hidden">
                        <label className="flex items-center gap-3 p-2 hover:bg-white/5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={addWithAISelectedIndices.has(i)}
                            onChange={(e) => {
                              e.stopPropagation();
                              setAddWithAISelectedIndices((prev) => {
                                const next = new Set(prev);
                                if (next.has(i)) next.delete(i);
                                else next.add(i);
                                return next;
                              });
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="rounded border-white/30 bg-white/5 text-amber-500 focus:ring-amber-500"
                          />
                          <span className="text-white/90 text-sm truncate flex-1">
                            {getGeneratedCardPreview(card)}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              const gen = addWithAIGeneratedCards[i];
                              if (!gen?.blocksSnapshot?.length) return;
                              const valuesObj = {};
                              for (const v of gen.values || []) {
                                if (v?.blockId) valuesObj[v.blockId] = v;
                              }
                              try {
                                sessionStorage.setItem(
                                  `card-preview-draft-${deckId}`,
                                  JSON.stringify({
                                    targetCardId: "new",
                                    blocks: gen.blocksSnapshot,
                                    values: valuesObj,
                                    entry: "fileToAi",
                                  }),
                                );
                              } catch (err) {
                                console.error(err);
                              }
                              router.push(
                                `/dashboard/deck/${deckId}/card/new/preview?from=fileToAi`,
                              );
                            }}
                            className="shrink-0 px-2 py-1 text-xs text-white/70 hover:text-amber-400 hover:bg-white/5 rounded flex items-center gap-1"
                            title="Preview card"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Preview
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              setEditingGeneratedCardIndex((prev) => (prev === i ? null : i));
                            }}
                            className="shrink-0 px-2 py-1 text-xs text-amber-400 hover:text-amber-300 hover:bg-white/5 rounded"
                          >
                            {editingGeneratedCardIndex === i ? "Done" : "Edit"}
                          </button>
                        </label>
                        {editingGeneratedCardIndex === i && (
                          <div className="border-t border-white/10 bg-black/20 p-3 space-y-2">
                            {(card.values || []).map((v, vi) => {
                              const block = (card.blocksSnapshot || []).find((b) => b.blockId === v.blockId);
                              const label = block?.label || v.blockId?.slice(0, 8) || `Field ${vi + 1}`;
                              const blockType = block?.type;
                              const isQuizType =
                                blockType === "quizSingleSelect" ||
                                blockType === "quizMultiSelect" ||
                                blockType === "quizTextAnswer" ||
                                blockType === 8 ||
                                blockType === 9 ||
                                blockType === 10 ||
                                (typeof blockType === "string" && /^([89]|10)$/.test(blockType));
                              if (isQuizType && block) {
                                const parseCfg = (cfg) => {
                                  if (cfg == null) return {};
                                  if (typeof cfg === "string") {
                                    try {
                                      return JSON.parse(cfg || "{}");
                                    } catch {
                                      return {};
                                    }
                                  }
                                  return typeof cfg === "object" ? cfg : {};
                                };
                                const cfg = parseCfg(block.configJson);
                                const question = String(cfg.question ?? "").trim() || "";
                                const options = Array.isArray(cfg.options)
                                  ? cfg.options.map((x) => String(x ?? "").trim())
                                  : [];
                                const optionsText = options.join("\n");
                                const correctAnswers = Array.isArray(cfg.correctAnswers)
                                  ? cfg.correctAnswers
                                  : cfg.correctAnswer != null
                                    ? [String(cfg.correctAnswer)]
                                    : options.length ? [options[cfg.correctAnswerIndex ?? 0]] : [];
                                const correctAnswer = correctAnswers[0] ?? "";
                                const correctAnswersText = correctAnswers.join(", ");
                                const isMulti = blockType === "quizMultiSelect" || blockType === 8 || blockType === "8";
                                const isTextAnswer = blockType === "quizTextAnswer" || blockType === 10 || blockType === "10";
                                const blockIdx = (card.blocksSnapshot || []).findIndex((b) => b.blockId === block.blockId);
                                return (
                                  <div key={vi} className="space-y-2 rounded-lg border border-white/10 p-2 bg-white/5">
                                    <label className="text-amber-400/90 text-xs font-medium block">{label} (quiz)</label>
                                    <div>
                                      <label className="text-white/50 text-xs block mb-0.5">Question</label>
                                      <input
                                        type="text"
                                        value={question}
                                        onChange={(e) => {
                                          const q = e.target.value;
                                          setAddWithAIGeneratedCards((prev) => {
                                            if (i < 0 || i >= prev.length || blockIdx < 0) return prev;
                                            const next = prev.map((c, ci) => {
                                              if (ci !== i || !c.blocksSnapshot?.[blockIdx]) return c;
                                              const cfg2 = parseCfg(c.blocksSnapshot[blockIdx].configJson);
                                              const newCfg = { ...cfg2, question: q };
                                              const snap = [...c.blocksSnapshot];
                                              snap[blockIdx] = { ...snap[blockIdx], configJson: JSON.stringify(newCfg) };
                                              return { ...c, blocksSnapshot: snap };
                                            });
                                            return next;
                                          });
                                        }}
                                        placeholder="Question"
                                        className="w-full px-2 py-1.5 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white text-[13px]"
                                      />
                                    </div>
                                    {!isTextAnswer && (
                                      <div>
                                        <label className="text-white/50 text-xs block mb-0.5">Options (one per line)</label>
                                        <textarea
                                          value={optionsText}
                                          onChange={(e) => {
                                            const lines = e.target.value.split("\n").map((s) => s.trim()).filter(Boolean);
                                            const opts = lines.length ? lines : ["Option A", "Option B"];
                                            setAddWithAIGeneratedCards((prev) => {
                                              if (i < 0 || i >= prev.length || blockIdx < 0) return prev;
                                              const next = prev.map((c, ci) => {
                                                if (ci !== i || !c.blocksSnapshot?.[blockIdx]) return c;
                                                const cfg2 = parseCfg(c.blocksSnapshot[blockIdx].configJson);
                                                const prevCorrect = Array.isArray(cfg2.correctAnswers) ? cfg2.correctAnswers : [];
                                                const kept = prevCorrect.filter((a) => opts.includes(a));
                                                const correctAnswers = kept.length ? kept : (opts[0] ? [opts[0]] : []);
                                                const correctAnswerIndex = opts.indexOf(correctAnswers[0]);
                                                const newCfg = {
                                                  ...cfg2,
                                                  options: opts,
                                                  correctAnswerIndex: correctAnswerIndex >= 0 ? correctAnswerIndex : 0,
                                                  correctAnswers,
                                                  correctAnswerIndices: correctAnswers.map((a) => opts.indexOf(a)).filter((idx) => idx >= 0),
                                                };
                                                const snap = [...c.blocksSnapshot];
                                                snap[blockIdx] = { ...snap[blockIdx], configJson: JSON.stringify(newCfg) };
                                                return { ...c, blocksSnapshot: snap };
                                              });
                                              return next;
                                            });
                                          }}
                                          rows={3}
                                          placeholder="Option A\nOption B"
                                          className="w-full px-2 py-1.5 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white text-[13px] min-h-[4rem]"
                                        />
                                      </div>
                                    )}
                                    <div>
                                      <label className="text-white/50 text-xs block mb-0.5">
                                        {isTextAnswer ? "Correct answer" : isMulti ? "Correct answers (comma-separated)" : "Correct answer"}
                                      </label>
                                      <input
                                        type="text"
                                        value={isTextAnswer ? correctAnswer : correctAnswersText}
                                        onChange={(e) => {
                                          const raw = e.target.value.trim();
                                          const answers = isTextAnswer ? [raw] : raw.split(",").map((s) => s.trim()).filter(Boolean);
                                          setAddWithAIGeneratedCards((prev) => {
                                            if (i < 0 || i >= prev.length || blockIdx < 0) return prev;
                                            const next = prev.map((c, ci) => {
                                              if (ci !== i || !c.blocksSnapshot?.[blockIdx]) return c;
                                              const cfg2 = parseCfg(c.blocksSnapshot[blockIdx].configJson);
                                              const opts = Array.isArray(cfg2.options) ? cfg2.options : [];
                                              let newCfg;
                                              if (isTextAnswer) {
                                                newCfg = { ...cfg2, correctAnswer: raw };
                                              } else {
                                                const indices = answers.map((a) => opts.indexOf(a)).filter((idx) => idx >= 0);
                                                if (indices.length === 0 && opts.length) indices.push(0);
                                                newCfg = {
                                                  ...cfg2,
                                                  correctAnswers: answers.length ? answers : (opts[0] ? [opts[0]] : []),
                                                  correctAnswerIndex: indices[0] ?? 0,
                                                  correctAnswerIndices: indices,
                                                };
                                              }
                                              const snap = [...c.blocksSnapshot];
                                              snap[blockIdx] = { ...snap[blockIdx], configJson: JSON.stringify(newCfg) };
                                              return { ...c, blocksSnapshot: snap };
                                            });
                                            return next;
                                          });
                                        }}
                                        placeholder={isTextAnswer ? "Answer" : "A, B"}
                                        className="w-full px-2 py-1.5 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white text-[13px]"
                                      />
                                    </div>
                                  </div>
                                );
                              }
                              const isLong =
                                v.type === "hiddenText" ||
                                v.type === "example" ||
                                (v.type === "quizSingleSelect" || v.type === "quizMultiSelect" || v.type === "quizTextAnswer");
                              return (
                                <div key={vi}>
                                  <label className="text-white/60 text-xs block mb-0.5">{label}</label>
                                  {isLong ? (
                                    <textarea
                                      value={typeof v.text === "string" ? v.text : ""}
                                      onChange={(e) => {
                                        const text = e.target.value;
                                        setAddWithAIGeneratedCards((prev) => {
                                          if (i < 0 || i >= prev.length) return prev;
                                          const next = [...prev];
                                          const c = next[i];
                                          if (!c?.values) return next;
                                          next[i] = {
                                            ...c,
                                            values: c.values.map((val, vIdx) =>
                                              vIdx === vi ? { ...val, text } : val
                                            ),
                                          };
                                          return next;
                                        });
                                      }}
                                      className="w-full px-2 py-1.5 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white text-[13px] min-h-[4rem]"
                                      rows={3}
                                    />
                                  ) : (
                                    <input
                                      type="text"
                                      value={typeof v.text === "string" ? v.text : ""}
                                      onChange={(e) => {
                                        const text = e.target.value;
                                        setAddWithAIGeneratedCards((prev) => {
                                          if (i < 0 || i >= prev.length) return prev;
                                          const next = [...prev];
                                          const c = next[i];
                                          if (!c?.values) return next;
                                          next[i] = {
                                            ...c,
                                            values: c.values.map((val, vIdx) =>
                                              vIdx === vi ? { ...val, text } : val
                                            ),
                                          };
                                          return next;
                                        });
                                      }}
                                      className="w-full px-2 py-1.5 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white text-[13px]"
                                    />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  {addWithAIProgress && (
                    <div className="mb-4 flex items-center gap-2 text-amber-400/90 text-sm">
                      <span className="animate-spin rounded-full h-4 w-4 border-2 border-amber-400/50 border-t-amber-400" />
                      <span>{addWithAIProgress}</span>
                    </div>
                  )}
                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={closeFileToAIModal}
                      disabled={!!addWithAIProgress}
                      className="px-4 py-2.5 rounded-2xl border border-white/15 bg-white/[0.04] text-white/90 font-medium text-sm hover:bg-white/10 hover:border-white/25 transition-all duration-200 disabled:opacity-50"
                    >
                      Done
                    </button>
                    <button
                      type="button"
                      onClick={handleAddSelectedCardsToDeck}
                      disabled={addWithAISelectedIndices.size === 0 || !!addWithAIProgress}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-white font-medium text-sm shadow-lg shadow-amber-500/25 transition-all duration-200 disabled:opacity-50 disabled:shadow-none"
                    >
                      <Sparkles className="w-4 h-4" />
                      Add selected ({addWithAISelectedIndices.size}) to deck
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-white/60 text-sm mb-5">
                    From document or image — AI drafts cards for your template. PDF, Word, or image only. For CSV/Excel/Anki use Import from table.
                  </p>
                  <div className="space-y-4 mb-5">
                    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                      <p className="text-sm font-medium text-white/90 mb-2">File</p>
                      <div
                        role="button"
                        tabIndex={0}
                        onDragOver={handleFileToAIDragOver}
                        onDragLeave={handleFileToAIDragLeave}
                        onDrop={handleFileToAIDrop}
                        onClick={() => fileToAIFileInputRef.current?.click()}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") fileToAIFileInputRef.current?.click();
                        }}
                        className={`flex flex-col items-center justify-center py-8 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200 ${
                          fileToAIDragging
                            ? "border-amber-500 bg-amber-500/10"
                            : "border-white/15 hover:border-amber-500/40 hover:bg-white/[0.04]"
                        } ${fileToAILoading ? "pointer-events-none opacity-60" : ""}`}
                      >
                        <input
                          ref={fileToAIFileInputRef}
                          type="file"
                          accept=".pdf,.docx,.png,.jpg,.jpeg,.webp,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/png,image/jpeg,image/webp"
                          onChange={(e) => {
                            setFileToAIFile(e.target.files?.[0] ?? null);
                            setFileToAIError(null);
                          }}
                          className="hidden"
                        />
                        {fileToAIFile ? (
                          <>
                            {fileToAIPreviewUrl ? (
                              <img
                                src={fileToAIPreviewUrl}
                                alt="Preview"
                                className="max-h-40 max-w-full rounded-lg object-contain border border-white/10 mb-2"
                              />
                            ) : (
                              <FileSpreadsheet className="w-10 h-10 text-amber-400/80 mb-2" />
                            )}
                            <span className="text-white/90 text-sm font-medium truncate max-w-full px-2">
                              {fileToAIFile.name}
                            </span>
                            <span className="text-white/50 text-xs mt-0.5">
                              Click or drop another file to replace · Or paste image (Ctrl/Cmd+V)
                            </span>
                          </>
                        ) : (
                          <>
                            <Upload className={`w-10 h-10 mb-2 ${fileToAIDragging ? "text-amber-400" : "text-white/40"}`} />
                            <span className={`text-sm ${fileToAIDragging ? "text-amber-400" : "text-white/70"}`}>
                              {fileToAIDragging ? "Drop file here" : "Drag & drop or click to choose"}
                            </span>
                            <span className="text-white/45 text-xs mt-1">
                              Or paste an image (Ctrl/Cmd+V)
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4 space-y-4">
                      <div>
                        <p className="text-sm font-medium text-white/90 mb-2">Template</p>
                        <select
                          value={fileToAITemplateId}
                          onChange={(e) => setFileToAITemplateId(e.target.value)}
                          disabled={fileToAILoading}
                          className="w-full rounded-xl bg-white/[0.06] border border-white/10 px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/50 transition-shadow"
                        >
                          {templates.map((t) => (
                            <option key={t.templateId} value={t.templateId}>
                              {t.name} ({t.blocks?.length ?? 0} blocks)
                            </option>
                          ))}
                        </select>
                      </div>
                      {fileToAITemplateId && (() => {
                        const selectedTemplate = templates.find((t) => t.templateId === fileToAITemplateId);
                        const blocks = selectedTemplate?.blocks || [];
                        if (blocks.length === 0) return null;
                        const blockTypeLabel = (type) => {
                          const names = { header1: "Header 1", header2: "Header 2", header3: "Header 3", text: "Text", quote: "Quote", hiddenText: "Hidden", image: "Image", audio: "Audio", quizSingleSelect: "Quiz (single)", quizMultiSelect: "Quiz (multi)", quizTextAnswer: "Quiz (text)", divider: "Divider", space: "Space" };
                          return names[type] || (typeof type === "number" ? ["Header 1", "Header 2", "Header 3", "Text", "Quote", "Hidden", "Image", "Audio", "Quiz (multi)", "Quiz (single)", "Quiz (text)", "Divider", "Space"][type] : type);
                        };
                        return (
                          <div>
                            <p className="text-xs text-white/50 mb-1.5">Template format</p>
                            <div className="flex flex-wrap gap-2">
                              {blocks.map((b) => (
                                <span
                                  key={b.blockId}
                                  className="inline-flex items-center rounded-lg bg-white/10 px-2.5 py-1 text-xs text-white/80"
                                >
                                  {b.label && String(b.label).trim() ? b.label : blockTypeLabel(b.type)}
                                </span>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                      <div>
                        <p className="text-sm font-medium text-white/90 mb-2">Max cards</p>
                        <select
                          value={fileToAIMaxCards}
                          onChange={(e) => setFileToAIMaxCards(Number(e.target.value))}
                          disabled={fileToAILoading}
                          className="w-full rounded-xl bg-white/[0.06] border border-white/10 px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/50 transition-shadow"
                        >
                          {[5, 10, 15, 20, 30].map((n) => (
                            <option key={n} value={n}>
                              Up to {n} cards
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    {cards.length > 0 && (
                      <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                        <p className="text-sm font-medium text-white/90 mb-0.5">Reference cards</p>
                        <p className="text-xs text-white/50 mb-3">Optional — pick cards to match style and tone.</p>
                        <div className="max-h-44 overflow-y-auto space-y-2 pr-1 -mr-1">
                          {cards.slice(0, 20).map((card) => {
                            const preview = getCardPreview(card);
                            const label = [preview.main, preview.sub].filter(Boolean).join(" — ") || "Empty card";
                            const checked = fileToAIReferenceCardIds.has(card.cardId);
                            return (
                              <label
                                key={card.cardId}
                                className={`flex items-center gap-3 py-2.5 px-3 rounded-xl border cursor-pointer transition-all duration-200 ${
                                  checked
                                    ? "border-amber-500/50 bg-amber-500/10 text-white"
                                    : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/15 text-white/90"
                                }`}
                              >
                                <span className={`shrink-0 w-4 h-4 rounded-md border flex items-center justify-center transition-colors ${
                                  checked ? "border-amber-400 bg-amber-500" : "border-white/30 bg-white/5"
                                }`}>
                                  {checked && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                                </span>
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => {
                                    setFileToAIReferenceCardIds((prev) => {
                                      const next = new Set(prev);
                                      if (next.has(card.cardId)) next.delete(card.cardId);
                                      else next.add(card.cardId);
                                      return next;
                                    });
                                  }}
                                  className="sr-only"
                                />
                                <span className="truncate flex-1 text-sm min-w-0" title={label}>
                                  {label}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                        {cards.length > 20 && (
                          <p className="text-white/40 text-xs mt-2">Showing first 20 of {cards.length}</p>
                        )}
                      </div>
                    )}
                  </div>
                  {isDev && (
                    <div className="mb-4 flex flex-wrap gap-2 items-center">
                      <button
                        type="button"
                        onClick={handleFileToAIPreviewPrompt}
                        disabled={fileToAILoading || fileToAIPreviewLoading || !fileToAIFile || !fileToAITemplateId}
                        className="px-3 py-1.5 text-xs bg-white/10 hover:bg-white/20 text-white/80 rounded-lg border border-white/10 disabled:opacity-50 disabled:pointer-events-none"
                      >
                        {fileToAIPreviewLoading ? "Building preview…" : "Preview prompt"}
                      </button>
                    </div>
                  )}
                  {fileToAIPreviewPrompt && (
                    <div
                      ref={fileToAIPreviewPromptBlockRef}
                      className="mb-4 border border-amber-500/30 rounded-lg overflow-hidden bg-black/20"
                    >
                      <div className="flex items-center justify-between px-3 py-2 bg-amber-500/10">
                        <button
                          type="button"
                          onClick={() => setFileToAIPreviewPromptOpen((p) => !p)}
                          className="text-left text-amber-400/90 text-xs font-medium hover:bg-white/5 flex items-center gap-2"
                        >
                          Request prompt
                          <span className="text-white/40">{fileToAIPreviewPromptOpen ? "▼" : "▶"}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const text = `System:\n\n${fileToAIPreviewPrompt.system}\n\nUser:\n\n${fileToAIPreviewPrompt.user}`;
                            navigator.clipboard.writeText(text).then(
                              () => { setFileToAIDevPromptCopied(true); setTimeout(() => setFileToAIDevPromptCopied(false), 2000); },
                              () => {}
                            );
                          }}
                          className="flex items-center gap-1 px-2 py-1 text-xs text-amber-400/90 hover:bg-white/10 rounded"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          {fileToAIDevPromptCopied ? "Copied!" : "Copy prompt"}
                        </button>
                      </div>
                      {fileToAIPreviewPromptOpen && (
                        <div className="p-4 bg-black/40 text-white/90 font-mono text-base whitespace-pre-wrap min-h-[28rem] max-h-[min(56rem,90vh)] overflow-y-auto border-t border-white/10 leading-relaxed">
                          <div className="mb-2 text-amber-400/80">System:</div>
                          <div className="mb-3">{fileToAIPreviewPrompt.system}</div>
                          <div className="mb-2 text-amber-400/80">User:</div>
                          <div>{fileToAIPreviewPrompt.user}</div>
                        </div>
                      )}
                    </div>
                  )}
                  {fileToAIError && (
                    <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-red-300/90 text-sm">
                      {fileToAIError}
                    </div>
                  )}
                  <div className="flex gap-3 justify-end pt-2">
                    <button
                      type="button"
                      onClick={closeFileToAIModal}
                      disabled={fileToAILoading}
                      className="px-5 py-2.5 rounded-xl border border-white/15 bg-white/5 text-white/90 text-sm font-medium hover:bg-white/10 hover:border-white/20 transition-all disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleFileToAISubmit}
                      disabled={fileToAILoading || !fileToAIFile || !fileToAITemplateId}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-white text-sm font-medium shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50 disabled:pointer-events-none disabled:shadow-none"
                    >
                      {fileToAILoading ? (
                        <>
                          <span className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
                          Extracting & generating…
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          Generate cards from file
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* Request prompt modal (dev) — full prompt in a separate large modal; render after Generate from doc/img so it shows on top */}
      {isDev && (
        <AnimatePresence>
          {showPromptModal && promptModalContent && (
            <Modal onClose={() => { setShowPromptModal(false); setPromptModalContent(null); }} large>
              <div className="flex flex-col flex-1 min-h-0">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-white">Request prompt</h2>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopyPromptModal}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-white/80 hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <Copy className="w-4 h-4" />
                      Copy
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowPromptModal(false); setPromptModalContent(null); }}
                      className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5 text-white/50" />
                    </button>
                  </div>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto rounded-lg bg-black/40 border border-white/10 p-4 text-white/90 font-mono text-sm whitespace-pre-wrap leading-relaxed">
                  <div className="mb-4">
                    <div className="text-amber-400/90 text-xs font-semibold uppercase tracking-wider mb-1">System</div>
                    <div>{promptModalContent.system}</div>
                  </div>
                  <div>
                    <div className="text-amber-400/90 text-xs font-semibold uppercase tracking-wider mb-1">User</div>
                    <div>{promptModalContent.user}</div>
                  </div>
                </div>
              </div>
            </Modal>
          )}
        </AnimatePresence>
      )}

      {/* Import from table modal (rows → columns → cards) */}
      <AnimatePresence>
        {showImportModal && (
          <Modal onClose={resetImport} wide>
            <div className="max-h-[80vh] overflow-hidden flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Table2 className="w-5 h-5 text-amber-400" />
                    Import from table
                  </h2>
                  <p className="text-white/45 text-sm mt-1">
                    Map columns to your template — AI can generate quiz and audio per row
                  </p>
                </div>
                <button
                  onClick={resetImport}
                  className="p-1 hover:bg-white/10 rounded transition-colors"
                >
                  <X className="w-5 h-5 text-white/50" />
                </button>
              </div>

              {/* Step Indicator */}
              <div className="flex items-center justify-between mb-6 px-4">
                {[
                  { step: 1, label: "File" },
                  { step: 2, label: "Rows" },
                  { step: 3, label: "Map" },
                  { step: 4, label: "Import" },
                ].map((s, idx) => (
                  <div key={s.step} className="flex items-center">
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                          importStep >= s.step
                            ? "bg-accent text-white"
                            : "bg-white/10 text-white/50"
                        }`}
                      >
                        {importStep > s.step ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          s.step
                        )}
                      </div>
                      <span
                        className={`text-xs mt-1 ${
                          importStep >= s.step ? "text-white" : "text-white/50"
                        }`}
                      >
                        {s.label}
                      </span>
                    </div>
                    {idx < 3 && (
                      <div
                        className={`w-12 h-0.5 mx-2 mb-5 ${
                          importStep > s.step ? "bg-accent" : "bg-white/10"
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* Step Content */}
              <div className="flex-1 overflow-y-auto">
                {/* Step 1: Load File */}
                {importStep === ImportStep.loadFile && (
                  <div>
                    <p className="text-white/60 mb-4">
                      Upload a CSV, Excel (.xlsx), or Anki (.apkg) file.
                    </p>
                    <label
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      className={`flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                        isDragging
                          ? "border-accent bg-accent/20"
                          : "border-white/20 hover:border-accent/50"
                      }`}
                    >
                      <FileSpreadsheet
                        className={`w-12 h-12 mb-4 ${
                          isDragging ? "text-accent" : "text-white/30"
                        }`}
                      />
                      <span
                        className={isDragging ? "text-accent" : "text-white/70"}
                      >
                        {isDragging
                          ? "Drop file here"
                          : "Drag & drop or click to select"}
                      </span>
                      <span className="text-white/40 text-sm mt-1">
                        CSV, XLSX, or APKG
                      </span>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv,.xlsx,.xls,.apkg"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}

                {/* Step 2: Select Rows */}
                {importStep === ImportStep.selectRows && importData && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-white/60">
                        Select rows to import ({getSelectedRowCount()} of{" "}
                        {importData.rowCount} selected)
                      </p>
                      <button
                        onClick={toggleSelectAll}
                        className="text-accent text-sm hover:underline"
                      >
                        {selectAllRows ? "Deselect All" : "Select All"}
                      </button>
                    </div>

                    <div className="rounded-md overflow-auto max-h-[300px] border border-white/[0.08]">
                      <table className="text-sm min-w-max w-full border-collapse">
                        <thead className="sticky top-0 z-10">
                          <tr className="bg-[#2a2a3d]">
                            <th className="px-2 py-1.5 w-10 sticky left-0 bg-[#2a2a3d] border-b border-r border-white/[0.08]">
                              <input
                                type="checkbox"
                                checked={selectAllRows}
                                onChange={toggleSelectAll}
                                className="rounded"
                              />
                            </th>
                            <th className="px-2 py-1.5 text-left text-white/40 text-xs font-normal sticky left-10 bg-[#2a2a3d] border-b border-r border-white/[0.08]">
                              #
                            </th>
                            {importData.headers.map((h, i) => (
                              <th
                                key={i}
                                className="px-2 py-1.5 text-left text-white/40 text-xs font-normal whitespace-nowrap bg-[#2a2a3d] border-b border-r border-white/[0.08] last:border-r-0"
                              >
                                {h || `Col ${i + 1}`}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {importData.rows.map((row, rowIdx) => (
                            <tr
                              key={rowIdx}
                              className={`group ${
                                selectAllRows || selectedRows.has(rowIdx)
                                  ? "bg-accent/10"
                                  : "hover:bg-white/[0.02]"
                              }`}
                            >
                              <td className="px-2 py-1 sticky left-0 bg-[#1f1f30] group-hover:bg-[#242438] border-b border-r border-white/[0.08]">
                                <input
                                  type="checkbox"
                                  checked={
                                    selectAllRows || selectedRows.has(rowIdx)
                                  }
                                  onChange={() => toggleRowSelection(rowIdx)}
                                  className="rounded"
                                />
                              </td>
                              <td className="px-2 py-1 text-white/30 sticky left-10 bg-[#1f1f30] group-hover:bg-[#242438] border-b border-r border-white/[0.08]">
                                {rowIdx + 1}
                              </td>
                              {row.map((cell, i) => (
                                <td
                                  key={i}
                                  className="px-2 py-1 text-white/80 whitespace-nowrap max-w-[200px] truncate border-b border-r border-white/[0.08] last:border-r-0"
                                >
                                  {cell || (
                                    <span className="text-white/20">Empty</span>
                                  )}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Step 3: Map Columns */}
                {importStep === ImportStep.mapColumns && importData && (
                  <div>
                    {/* Template Selection */}
                    <div className="mb-6">
                      <h3 className="text-white font-medium mb-3">
                        Select Template
                      </h3>
                      <div className="flex gap-2 overflow-x-auto pb-2">
                        {templates.map((template) => (
                          <button
                            key={template.templateId}
                            onClick={() => selectTemplate(template)}
                            className={`flex-shrink-0 p-3 rounded-lg border transition-colors ${
                              selectedTemplate?.templateId ===
                              template.templateId
                                ? "border-accent bg-accent/20"
                                : "border-white/10 bg-white/5 hover:bg-white/10"
                            }`}
                          >
                            <div className="text-white font-medium text-sm">
                              {template.name}
                            </div>
                            <div className="text-white/40 text-xs">
                              {template.blocks.length} blocks
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Column Mapping */}
                    {selectedTemplate && (
                      <div>
                        <h3 className="text-white font-medium mb-3">
                          Map Columns to Template Blocks
                        </h3>
                        <p className="text-white/50 text-sm mb-3">
                          {pendingBlockId !== null
                            ? "Now click a column to complete mapping"
                            : pendingColumnIndex !== null
                            ? "Now click a template block to complete mapping"
                            : "Click a column or template block to start mapping"}
                        </p>

                        {/* Template Blocks - Clickable + Generate with AI (quiz/audio only) */}
                        <div className="mb-4 p-3 bg-white/5 rounded-lg">
                          <h4 className="text-white/70 text-sm mb-2">
                            Template Blocks:
                          </h4>
                          <p className="text-white/45 text-xs mb-2">
                            Click a block then a column to map. Use &quot;AI&quot; only for{" "}
                            <strong className="text-white/60">quiz or audio</strong> blocks — AI
                            generates that block per row from the table context.
                          </p>
                          {(() => {
                            const blocks = selectedTemplate.blocks || [];
                            const frontBlocks = blocks.filter(
                              (b) => effectiveBlockSide(b) === "front"
                            );
                            const backBlocks = blocks.filter(
                              (b) => effectiveBlockSide(b) === "back"
                            );
                            const showFaceGroups = backBlocks.length > 0;

                            const renderBlockChip = (block, showFaceBadge) => {
                              const mapping = getMappingForBlock(block.blockId);
                              const isMapped = !!mapping;
                              const isAI = mapping?.generateWithAI;
                              const isPending = pendingBlockId === block.blockId;
                              return (
                                <div
                                  key={block.blockId}
                                  className="flex items-center gap-1"
                                >
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleBlockClick(block.blockId)
                                    }
                                    className={`text-xs px-3 py-1.5 rounded transition-all inline-flex items-center gap-1.5 ${
                                      isMapped
                                        ? isAI
                                          ? "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"
                                          : "bg-accent/20 text-accent hover:bg-accent/30"
                                        : isPending
                                        ? "bg-yellow-500/20 text-yellow-400 ring-2 ring-yellow-500/50"
                                        : pendingColumnIndex !== null
                                        ? "bg-white/10 text-white hover:bg-white/20 ring-1 ring-white/30"
                                        : "bg-white/10 text-white/50 hover:bg-white/20 hover:text-white"
                                    }`}
                                  >
                                    {showFaceBadge && (
                                      <span
                                        className={`shrink-0 rounded px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${
                                          effectiveBlockSide(block) === "back"
                                            ? "bg-violet-500/25 text-violet-200/90"
                                            : "bg-white/10 text-white/45"
                                        }`}
                                      >
                                        {effectiveBlockSide(block) === "back"
                                          ? "Back"
                                          : "Front"}
                                      </span>
                                    )}
                                    <span>{block.label}</span>
                                    {isMapped && (isAI ? " (AI) ✓" : " ✓")}
                                    {isPending && " ←"}
                                  </button>
                                </div>
                              );
                            };

                            if (showFaceGroups) {
                              return (
                                <div className="space-y-4">
                                  <div>
                                    <h5 className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-2">
                                      Front
                                    </h5>
                                    <div className="flex flex-wrap gap-2 items-center">
                                      {frontBlocks.map((b) =>
                                        renderBlockChip(b, false)
                                      )}
                                    </div>
                                  </div>
                                  <div>
                                    <h5 className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-2">
                                      Back
                                    </h5>
                                    <div className="flex flex-wrap gap-2 items-center">
                                      {backBlocks.map((b) =>
                                        renderBlockChip(b, false)
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            }

                            return (
                              <div className="flex flex-wrap gap-2 items-center">
                                {blocks.map((block) =>
                                  renderBlockChip(block, true)
                                )}
                              </div>
                            );
                          })()}
                        </div>

                        {/* Dev only: Quiz = prompt preview; Audio = request JSON preview */}
                        {importStep === ImportStep.mapColumns &&
                          columnMappings.some((m) => m.generateWithAI) &&
                          process.env.NODE_ENV === "development" &&
                          importData &&
                          selectedTemplate && (() => {
                            const rows = getRowsToImport();
                            const headers = (importData.headers || []).slice();
                            const tableRows = rows.map((r) =>
                              (Array.isArray(r) ? r : []).map((c) => String(c ?? "").trim())
                            );
                            const CHUNK_SIZE = 30;
                            const batchCount = Math.ceil(tableRows.length / CHUNK_SIZE);
                            const firstChunkRows = tableRows.slice(0, CHUNK_SIZE);
                            const textContent = [
                              headers.join("\t"),
                              ...firstChunkRows.map((r) => r.join("\t")),
                            ].join("\n").slice(0, 50000);
                            const aiBlockIdsSet = new Set(
                              (columnMappings || []).filter((m) => m.generateWithAI).map((m) => m.blockId)
                            );
                            const allAiBlocks = (selectedTemplate.blocks || [])
                              .filter((b) => aiBlockIdsSet.has(b.blockId))
                              .map((b) => ({ blockId: b.blockId, type: b.type, label: b.label ?? "" }));
                            const quizOnlyBlocks = allAiBlocks.filter((b) => isQuizBlock(b));
                            const audioOnlyBlocks = allAiBlocks.filter((b) => isAudioBlockType(b));
                            const batchNote = batchCount > 1 ? ` (batch 1 of ${batchCount})` : "";

                            const renderQuizPromptPreview = (system, user, onCopy, batchLabel) => (
                              <div className="mt-2 space-y-2">
                                {batchCount > 1 && batchLabel && (
                                  <p className="text-[10px] text-amber-200/70">{batchLabel}</p>
                                )}
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={onCopy}
                                    className="inline-flex items-center gap-1.5 px-2 py-1 text-[10px] font-medium rounded bg-amber-500/20 text-amber-200 hover:bg-amber-500/30 transition-colors"
                                  >
                                    <Copy className="w-3 h-3 shrink-0" />
                                    {importDevPromptCopied ? "Copied!" : "Copy prompt"}
                                  </button>
                                </div>
                                <div>
                                  <p className="text-[10px] font-medium text-amber-200/80 mb-1">System</p>
                                  <pre className="text-[10px] text-white/70 overflow-auto max-h-48 p-2 rounded bg-black/20 whitespace-pre-wrap break-words">
                                    {system}
                                  </pre>
                                </div>
                                <div>
                                  <p className="text-[10px] font-medium text-amber-200/80 mb-1">User</p>
                                  <pre className="text-[10px] text-white/70 overflow-auto max-h-48 p-2 rounded bg-black/20 whitespace-pre-wrap break-words">
                                    {user}
                                  </pre>
                                </div>
                              </div>
                            );

                            return (
                              <div className="mb-3 space-y-2">
                                {quizOnlyBlocks.length > 0 && (
                                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                                    <details className="group">
                                      <summary className="text-xs font-medium text-amber-200/90 cursor-pointer list-none flex items-center gap-1">
                                        <span className="group-open:inline hidden">▼</span>
                                        <span className="group-open:hidden inline">▶</span>
                                        Dev: Import AI — Quiz (prompt){batchNote}
                                      </summary>
                                      {(() => {
                                        const { system, user } = buildImportQuizAudioPrompt({
                                          extractedContent: textContent,
                                          templateBlocks: quizOnlyBlocks,
                                          maxCards: firstChunkRows.length,
                                          deckTitle: deck?.title ?? "",
                                        });
                                        return renderQuizPromptPreview(
                                          system,
                                          user,
                                          () => {
                                            navigator.clipboard.writeText(`=== System ===\n${system}\n\n=== User ===\n${user}`).then(
                                              () => { setImportDevPromptCopied(true); setTimeout(() => setImportDevPromptCopied(false), 2000); },
                                              () => {}
                                            );
                                          },
                                          batchCount > 1 ? `Import will call the AI API ${batchCount} times (up to ${CHUNK_SIZE} rows per batch). Preview shows batch 1.` : null
                                        );
                                      })()}
                                    </details>
                                  </div>
                                )}
                                {audioOnlyBlocks.length > 0 && (
                                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                                    <details className="group">
                                      <summary className="text-xs font-medium text-amber-200/90 cursor-pointer list-none flex items-center gap-1">
                                        <span className="group-open:inline hidden">▼</span>
                                        <span className="group-open:hidden inline">▶</span>
                                        Dev: Import AI — Audio (request JSON){batchNote}
                                      </summary>
                                      <div className="mt-2 space-y-2">
                                        {batchCount > 1 && (
                                          <p className="text-[10px] text-amber-200/70">
                                            Import will call the API {batchCount} times to get audio text; ElevenLabs TTS runs per card later (no prompt). Preview shows batch 1.
                                          </p>
                                        )}
                                        <div className="flex items-center justify-end gap-2">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const audioBlockIds = audioOnlyBlocks.map((b) => b.blockId);
                                              const requestBody = {
                                                extractedContent: textContent.length > 2000 ? textContent.slice(0, 2000) + "\n\n… (truncated)" : textContent,
                                                deckId,
                                                templateId: selectedTemplate.templateId,
                                                uid: user?.uid ?? "(current user)",
                                                maxCards: firstChunkRows.length,
                                                blockIds: audioBlockIds,
                                              };
                                              navigator.clipboard.writeText(JSON.stringify(requestBody, null, 2)).then(
                                                () => { setImportDevPromptCopied(true); setTimeout(() => setImportDevPromptCopied(false), 2000); },
                                                () => {}
                                              );
                                            }}
                                            className="inline-flex items-center gap-1.5 px-2 py-1 text-[10px] font-medium rounded bg-amber-500/20 text-amber-200 hover:bg-amber-500/30 transition-colors"
                                          >
                                            <Copy className="w-3 h-3 shrink-0" />
                                            {importDevPromptCopied ? "Copied!" : "Copy JSON"}
                                          </button>
                                        </div>
                                        <p className="text-[10px] font-medium text-amber-200/80 mb-1">POST /api/cards/import-ai-blocks (audio blockIds only)</p>
                                        <pre className="text-[10px] text-white/70 overflow-auto max-h-64 p-2 rounded bg-black/20 whitespace-pre-wrap break-words">
                                          {JSON.stringify({
                                            extractedContent: textContent.length > 2000 ? textContent.slice(0, 2000) + "\n\n… (truncated for preview)" : textContent,
                                            deckId,
                                            templateId: selectedTemplate.templateId,
                                            uid: user?.uid ?? "(current user)",
                                            maxCards: firstChunkRows.length,
                                            blockIds: audioOnlyBlocks.map((b) => b.blockId),
                                          }, null, 2)}
                                        </pre>
                                      </div>
                                    </details>
                                  </div>
                                )}
                              </div>
                            );
                          })()}

                        {/* Use AI - above table, when a quiz/audio block is selected */}
                        {importStep === ImportStep.mapColumns &&
                          selectedTemplate &&
                          aiEntitled &&
                          pendingBlockId &&
                          (() => {
                            const pendingBlock = selectedTemplate.blocks.find(
                              (b) => b.blockId === pendingBlockId
                            );
                            const canUseAI =
                              pendingBlock &&
                              isBlockEligibleForGenerateWithAI(pendingBlock);
                            const mapping = getMappingForBlock(pendingBlockId);
                            const isAI = mapping?.generateWithAI;
                            if (!canUseAI) return null;
                            return (
                              <div className="mb-3 flex justify-center">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setMappingGenerateWithAI(pendingBlockId)
                                  }
                                  title="Generate this block with AI per row (quiz/audio only)"
                                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                                    isAI
                                      ? "bg-amber-500 text-amber-50 hover:bg-amber-400"
                                      : "bg-amber-600/80 hover:bg-amber-600 text-white border border-amber-500/30"
                                  }`}
                                >
                                  <Sparkles className="w-4 h-4 shrink-0" />
                                  Use AI
                                </button>
                              </div>
                            );
                          })()}

                        {/* Data Preview Table with Clickable Headers */}
                        <div className="rounded-md overflow-auto max-h-[250px] border border-white/[0.08]">
                          <table className="text-sm min-w-max w-full border-collapse">
                            <thead className="sticky top-0 z-10">
                              <tr className="bg-[#2a2a3d]">
                                <th className="px-2 py-1.5 text-left text-white/40 text-xs font-normal sticky left-0 bg-[#2a2a3d] border-b border-r border-white/[0.08]">
                                  #
                                </th>
                                {importData.headers.map((h, i) => {
                                  const mapping = getMappingForColumn(i);
                                  const isPending = pendingColumnIndex === i;
                                  const colFace = inferColumnFaceFromHeader(h);
                                  return (
                                    <th
                                      key={i}
                                      onClick={() => handleColumnClick(i)}
                                      className={`px-2 py-2 text-left text-xs font-normal whitespace-nowrap border-b border-r border-white/[0.08] last:border-r-0 cursor-pointer transition-all hover:bg-[#3a3a4d] ${
                                        mapping
                                          ? "text-accent bg-accent/10"
                                          : isPending
                                          ? "bg-yellow-500/20 text-yellow-400 ring-2 ring-inset ring-yellow-500/50"
                                          : pendingBlockId !== null
                                          ? "bg-[#2a2a3d] text-white ring-1 ring-inset ring-white/30"
                                          : "bg-[#2a2a3d] text-white/40"
                                      }`}
                                    >
                                      <div className="flex flex-col gap-0.5">
                                        <span
                                          className={`inline-flex items-center gap-1.5 flex-wrap ${
                                            mapping
                                              ? "text-accent font-medium"
                                              : isPending
                                              ? "text-yellow-400 font-medium"
                                              : ""
                                          }`}
                                        >
                                          {colFace && (
                                            <span
                                              className={`shrink-0 rounded px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${
                                                colFace === "back"
                                                  ? "bg-violet-500/30 text-violet-100"
                                                  : "bg-white/15 text-white/70"
                                              }`}
                                            >
                                              {colFace === "back" ? "Back" : "Front"}
                                            </span>
                                          )}
                                          <span>{h || `Col ${i + 1}`}</span>
                                        </span>
                                        {mapping ? (
                                          <span className="text-accent/70 text-[10px]">
                                            → {mapping.blockLabel} ✕
                                          </span>
                                        ) : isPending ? (
                                          <span className="text-yellow-400/70 text-[10px]">
                                            ← Select a block
                                          </span>
                                        ) : (
                                          <span className="text-white/20 text-[10px]">
                                            {pendingBlockId !== null
                                              ? "Click to map"
                                              : "Select"}
                                          </span>
                                        )}
                                      </div>
                                    </th>
                                  );
                                })}
                              </tr>
                            </thead>
                            <tbody>
                              {importData.rows
                                .filter(
                                  (_, idx) =>
                                    selectAllRows || selectedRows.has(idx)
                                )
                                .slice(0, 5)
                                .map((row, rowIdx) => (
                                  <tr
                                    key={rowIdx}
                                    className="group hover:bg-white/[0.02]"
                                  >
                                    <td className="px-2 py-1 text-white/30 sticky left-0 bg-[#1f1f30] group-hover:bg-[#242438] border-b border-r border-white/[0.08]">
                                      {rowIdx + 1}
                                    </td>
                                    {row.map((cell, i) => {
                                      const mapping = getMappingForColumn(i);
                                      return (
                                        <td
                                          key={i}
                                          className={`px-2 py-1 whitespace-nowrap max-w-[200px] truncate border-b border-r border-white/[0.08] last:border-r-0 ${
                                            mapping
                                              ? "text-white"
                                              : "text-white/40"
                                          }`}
                                        >
                                          {cell || (
                                            <span className="text-white/20">
                                              Empty
                                            </span>
                                          )}
                                        </td>
                                      );
                                    })}
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        </div>
                        {getSelectedRowCount() > 5 && (
                          <p className="text-white/30 text-xs mt-1">
                            Showing first 5 of {getSelectedRowCount()} selected
                            rows
                          </p>
                        )}

                        {/* Mappings Summary */}
                        {columnMappings.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-4">
                            {columnMappings.map((m, idx) => (
                              <span
                                key={m.blockId ?? `mapping-${idx}`}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-accent/20 text-accent text-sm rounded"
                              >
                                {m.columnName} → {m.blockLabel}
                                <button
                                  onClick={() => removeBlockMapping(m.blockId)}
                                  className="hover:text-white"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Step 4: Importing */}
                {importStep === ImportStep.importing && (
                  <div className="py-8 text-center">
                    {importing ? (
                      <>
                        <div className="w-16 h-16 mx-auto mb-4 relative">
                          <div className="absolute inset-0 rounded-full border-4 border-white/10" />
                          <div
                            className="absolute inset-0 rounded-full border-4 border-accent border-t-transparent animate-spin"
                            style={{
                              clipPath: `polygon(0 0, 100% 0, 100% ${
                                importProgress * 100
                              }%, 0 ${importProgress * 100}%)`,
                            }}
                          />
                        </div>
                        {importAIGenerating ? (
                          <>
                            <p className="text-white text-lg mb-2">
                              Generating quiz/audio with AI...
                            </p>
                            {importAIBatchProgress ? (
                              <>
                                <p className="text-white/80 mb-2">
                                  Batch {importAIBatchProgress.current} of {importAIBatchProgress.total}
                                </p>
                                <div className="w-48 h-2 mx-auto rounded-full bg-white/10 overflow-hidden">
                                  <div
                                    className="h-full bg-amber-500 transition-all duration-300"
                                    style={{
                                      width: `${(importAIBatchProgress.current / importAIBatchProgress.total) * 100}%`,
                                    }}
                                  />
                                </div>
                              </>
                            ) : (
                              <p className="text-white/50">
                                Mapping your table to the template. This may take a moment.
                              </p>
                            )}
                          </>
                        ) : (
                          <>
                            <p className="text-white text-lg mb-2">
                              Importing cards...
                            </p>
                            <p className="text-white/50">
                              {importedCount} of {getSelectedRowCount()} cards
                              imported
                            </p>
                            {importAudioGenerating && (
                              <p className="text-amber-400/90 text-sm mt-2">
                                Generating audio...
                              </p>
                            )}
                            {(importAudioCompleted > 0 || importAudioFailed > 0) && (
                              <p className="text-white/60 text-sm mt-2">
                                Audio: {importAudioCompleted} completed
                                {importAudioFailed > 0 && (
                                  <span className="text-red-400/90">, {importAudioFailed} failed</span>
                                )}
                              </p>
                            )}
                          </>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="w-16 h-16 mx-auto mb-4 bg-green-500/20 rounded-full flex items-center justify-center">
                          <Check className="w-8 h-8 text-green-500" />
                        </div>
                        <p className="text-white text-lg mb-2">
                          Import Complete!
                        </p>
                        <p className="text-white/50 mb-6">
                          Successfully imported {importedCount} cards
                          {(importAudioCompleted > 0 || importAudioFailed > 0) && (
                            <span className="block mt-1 text-white/60">
                              Audio: {importAudioCompleted} completed
                              {importAudioFailed > 0 && (
                                <span className="text-red-400/90">, {importAudioFailed} failed</span>
                              )}
                            </span>
                          )}
                        </p>
                        <button
                          onClick={resetImport}
                          className="px-6 py-2.5 rounded-2xl bg-accent hover:bg-accent/90 text-white font-medium text-sm shadow-lg shadow-accent/20 transition-all duration-200"
                        >
                          Done
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Footer Navigation */}
              {importStep !== ImportStep.loadFile &&
                importStep !== ImportStep.importing && (
                  <div className="mt-6 pt-4 border-t border-white/10">
                    {importStep === ImportStep.mapColumns && importUseAIError && (
                      <p className="text-red-400 text-sm mb-3">{importUseAIError}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <button
                        onClick={previousStep}
                        disabled={importUseAILoading}
                        className="flex items-center gap-1 px-4 py-2 text-white/70 hover:text-white transition-colors disabled:opacity-50"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Back
                      </button>
                      {importStep === ImportStep.mapColumns ? (
                        <button
                          onClick={handleImport}
                          disabled={!canProceedToNextStep() || importUseAILoading}
                          className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-accent hover:bg-accent/90 text-white font-medium text-sm shadow-lg shadow-accent/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                        >
                          <Upload className="w-4 h-4" />
                          Import {getSelectedRowCount()} Cards
                        </button>
                      ) : (
                        <button
                          onClick={nextStep}
                          disabled={!canProceedToNextStep()}
                          className="flex items-center gap-1 px-4 py-2.5 rounded-2xl bg-accent hover:bg-accent/90 text-white font-medium text-sm shadow-lg shadow-accent/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                        >
                          Continue
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* Click outside to close action menu */}
      {actionMenuCardId && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setActionMenuCardId(null)}
        />
      )}
    </div>
  );
}

// Modal Component
function Modal({ children, onClose, wide = false, large = false }) {
  const sizeClass = large ? "w-full max-w-4xl max-h-[90vh] flex flex-col" : wide ? "w-full max-w-2xl" : "w-full max-w-md";
  useEffect(() => {
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 12 }}
        transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
        onClick={(e) => e.stopPropagation()}
        className={`bg-[#0e0e0e] border border-white/[0.08] rounded-2xl p-6 shadow-2xl ${sizeClass}`}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}
