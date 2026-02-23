"use client";

import { useEffect, useState, useRef, useMemo } from "react";
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
  Check,
  Play,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Copy,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useRevenueCat, DEFAULT_ENTITLEMENT_ID } from "@/contexts/RevenueCatContext";
import {
  getDeck,
  updateDeck,
  subscribeToCards,
  deleteCard,
  createCard,
  getTemplates,
  createDefaultTemplates,
  uploadAudio,
} from "@/utils/firestore";
import {
  parseFile,
  SpreadsheetFileType,
  getFileTypeFromPath,
} from "@/utils/spreadsheetParser";

// Import steps matching mobile
const ImportStep = {
  loadFile: 1,
  selectRows: 2,
  mapColumns: 3,
  importing: 4,
};

const isProduction = process.env.NODE_ENV === "production";

export default function DeckDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { isConfigured: rcConfigured, isEntitledTo } = useRevenueCat();
  const [aiEntitled, setAiEntitled] = useState(true);
  const deckId = params.deckId;

  useEffect(() => {
    if (!isProduction || !rcConfigured) {
      setAiEntitled(true);
      return;
    }
    let mounted = true;
    isEntitledTo(DEFAULT_ENTITLEMENT_ID).then((v) => {
      if (mounted) setAiEntitled(!!v);
    });
    return () => { mounted = false; };
  }, [rcConfigured, isEntitledTo]);

  const [deck, setDeck] = useState(null);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);
  const [actionMenuCardId, setActionMenuCardId] = useState(null);

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
  const [columnMappings, setColumnMappings] = useState([]); // [{columnIndex, blockId, columnName, blockLabel}]
  const [pendingColumnIndex, setPendingColumnIndex] = useState(null); // For two-way selection
  const [pendingBlockId, setPendingBlockId] = useState(null); // For two-way selection

  // Step 4: Importing
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importedCount, setImportedCount] = useState(0);

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

  // Add card (normal): template vs blank
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [addCardMode, setAddCardMode] = useState("template"); // "template" | "blank"
  const [addCardTemplateId, setAddCardTemplateId] = useState("");

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
    });

    setColumnMappings(filtered);
    setPendingColumnIndex(null);
    setPendingBlockId(null);
  };

  const removeMapping = (columnIndex) => {
    setColumnMappings(
      columnMappings.filter((m) => m.columnIndex !== columnIndex)
    );
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
      // Already mapped - remove it
      removeMapping(existingMapping.columnIndex);
      return;
    }

    if (pendingColumnIndex !== null) {
      // Column was selected first - complete the mapping
      setMapping(pendingColumnIndex, blockId);
    } else {
      // Select this block, wait for column selection
      setPendingBlockId(blockId);
      setPendingColumnIndex(null);
    }
  };

  const getMappingForColumn = (columnIndex) => {
    return columnMappings.find((m) => m.columnIndex === columnIndex);
  };

  const getMappingForBlock = (blockId) => {
    return columnMappings.find((m) => m.blockId === blockId);
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

    setImporting(true);
    setImportStep(ImportStep.importing);
    setImportProgress(0);
    setImportedCount(0);

    try {
      const rows = getRowsToImport();
      let imported = 0;

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];

        // Build blocks snapshot from template
        const blocksSnapshot = selectedTemplate.blocks.map((block) => ({
          blockId: block.blockId,
          type: block.type,
          label: block.label,
          required: block.required,
          configJson: block.configJson,
        }));

        // Build values from mappings
        const values = [];
        for (const mapping of columnMappings) {
          if (mapping.columnIndex < row.length) {
            const cellValue = row[mapping.columnIndex];
            if (cellValue && cellValue.trim()) {
              const block = selectedTemplate.blocks.find(
                (b) => b.blockId === mapping.blockId
              );
              if (block) {
                values.push({
                  blockId: mapping.blockId,
                  type: block.type,
                  text: cellValue,
                });
              }
            }
          }
        }

        // Skip rows with no values
        if (values.length === 0) continue;

        await createCard(
          user.uid,
          deckId,
          blocksSnapshot,
          values,
          selectedTemplate.templateId
        );

        imported++;
        setImportProgress((i + 1) / rows.length);
        setImportedCount(imported);
      }

      // Keep modal open to show completion
    } catch (error) {
      console.error("Error importing cards:", error);
      alert("Error importing cards: " + error.message);
    } finally {
      setImporting(false);
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
    setImportProgress(0);
    setImportedCount(0);
  };

  // Add card with AI: build context, call API 1–5 times, create cards, redirect
  const handleAddCardWithAI = async () => {
    if (!user || !deck || !deckId) return;
    const template = templates.find((t) => t.templateId === addWithAITemplateId) || templates[0];
    if (!template?.blocks?.length) {
      setAddWithAIError("Select a template with at least one block.");
      return;
    }
    const count = Math.min(5, Math.max(1, Number(addWithAICount) || 1));
    setAddWithAIError(null);
      setAddWithAIDevPrompt(null);
      setAddWithAISuccess(null);
      setAddWithAIGenerating(true);
    const exampleCards = cards.slice(0, 5).map((card) => {
      const o = {};
      (card.values || []).forEach((v) => {
        if (v.text != null && String(v.text).trim()) o[v.blockId] = String(v.text).trim();
      });
      return o;
    });
    const templateBlocks = template.blocks.map((b) => ({
      blockId: b.blockId,
      type: b.type,
      label: b.label || "",
    }));
    const blocksSnapshot = template.blocks.map((b) => ({
      blockId: b.blockId,
      type: b.type,
      label: b.label || "",
      required: b.required || false,
      configJson: b.configJson,
    }));
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
          deckTitle: deck.title || "",
          deckDescription: deck.description || "",
          templateBlocks,
          exampleCards,
          count,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || data.message || "Generation failed");
      }
      if (data._devPrompt) {
        setAddWithAIDevPrompt(data._devPrompt);
        setShowDevPrompt(true);
      }
      const rawCards = data.cards ?? (data.values ? [data.values] : []);
      const generatedCards = rawCards.map((values) => ({
        blocksSnapshot,
        values: (values || []).map((v) => ({
          ...v,
          ...(v.type === "audio" ? { mediaIds: [] } : {}),
        })),
        templateId: template.templateId,
      }));
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
  };

  const handleCopyPrompt = () => {
    if (!addWithAIDevPrompt) return;
    const text = `System:\n\n${addWithAIDevPrompt.system}\n\nUser:\n\n${addWithAIDevPrompt.user}`;
    navigator.clipboard.writeText(text).catch(() => {});
  };

  const getGeneratedCardPreview = (values) => {
    const first = (values || []).find((v) => v.text != null && String(v.text).trim());
    return first ? String(first.text).trim().substring(0, 80) : "Empty card";
  };

  const handleAddSelectedCardsToDeck = async () => {
    if (!user || !deckId || addWithAIGeneratedCards.length === 0) return;
    const indices = Array.from(addWithAISelectedIndices).sort((a, b) => a - b);
    let lastCardId = null;
    const total = indices.length;

    const isAudioBlock = (b) => b.type === "audio" || b.type === 7 || b.type === "7";

    for (let idx = 0; idx < indices.length; idx++) {
      const i = indices[idx];
      const item = addWithAIGeneratedCards[i];
      if (!item) continue;

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
            const mainVal = list.find((x) => x.blockId === mainBlockId);
            mainText = (mainVal?.text != null ? String(mainVal.text) : "").trim();
          }
          if (!mainText) {
            const firstWithText = list.find((x) => String(x?.text || "").trim());
            mainText = firstWithText ? String(firstWithText.text).trim() : "";
          }
          if (mainText) {
            setAddWithAIProgress(`${cardNum}Generating audio…`);
            let defaultVoiceId = null;
            if (audioBlock.configJson) {
              try {
                const config = JSON.parse(audioBlock.configJson);
                defaultVoiceId = config.defaultVoiceId || null;
              } catch {}
            }
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
            } catch (_) {}
          }
        }
        return list;
      })();

      setAddWithAIProgress(total > 1 ? `Card ${idx + 1} of ${total}: Saving…` : "Saving card…");
      const created = await createCard(
        user.uid,
        deckId,
        item.blocksSnapshot,
        values,
        item.templateId
      );
      lastCardId = created?.cardId ?? lastCardId;
    }

    setAddWithAIProgress(null);
    setAddWithAIGeneratedCards([]);
    setAddWithAISelectedIndices(new Set());
    setAddWithAISuccess({ count: indices.length, lastCardId });
  };

  // Get preview text from card values using template's main/sub blocks
  const getCardPreview = (card) => {
    if (!card.values || card.values.length === 0) return { main: "Empty card", sub: null };

    // Find the template for this card
    const template = templates.find((t) => t.templateId === card.templateId);

    if (template && (template.mainBlockId || template.subBlockId)) {
      // Use template's main/sub block IDs
      const mainValue = template.mainBlockId
        ? card.values.find((v) => v.blockId === template.mainBlockId)
        : null;
      const subValue = template.subBlockId
        ? card.values.find((v) => v.blockId === template.subBlockId)
        : null;

      return {
        main: mainValue?.text?.substring(0, 100) || card.values.find((v) => v.text)?.text?.substring(0, 100) || "Empty card",
        sub: subValue?.text?.substring(0, 80) || null,
      };
    }

    // Fallback: use first two text values
    const textValues = card.values.filter((v) => v.text && v.text.trim());
    return {
      main: textValues[0]?.text?.substring(0, 100) || "Empty card",
      sub: textValues[1]?.text?.substring(0, 80) || null,
    };
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
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-accent"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-white/50 hover:text-white mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Decks
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">{deck.title}</h1>
            {deck.description && (
              <p className="text-white/60">{deck.description}</p>
            )}
            <p className="text-white/40 text-sm mt-2">
              {cards.length} {cards.length === 1 ? "card" : "cards"}
            </p>
            {/* Default template setting */}
            {templates.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Settings className="w-4 h-4 text-white/40" />
                <label className="text-white/60 text-sm">Default template:</label>
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
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-accent/50"
                >
                  <option value="">Most used in deck</option>
                  {templates.map((t) => (
                    <option key={t.templateId} value={t.templateId}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <span className="text-white/40 text-xs">
                  Used when adding cards or generating with AI
                </span>
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/dashboard/deck/${deckId}/study`}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
            >
              <Play className="w-5 h-5" />
              <span className="hidden sm:inline">Study</span>
            </Link>
            <button
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
            >
              <Upload className="w-5 h-5" />
              <span className="hidden sm:inline">Import</span>
            </button>
            {isProduction && !aiEntitled ? (
              <Link
                href="/dashboard/subscription"
                className="flex items-center gap-2 px-4 py-2 bg-amber-600/70 hover:bg-amber-600 text-white rounded-lg transition-colors font-medium"
                title="Upgrade to Pro to use AI"
              >
                <Sparkles className="w-5 h-5" />
                Add Card with AI (Pro)
              </Link>
            ) : (
              <button
                type="button"
                disabled={cards.length === 0}
                title={cards.length === 0 ? "Add at least one card manually so AI can use them as examples" : undefined}
                onClick={() => {
                  setAddWithAIError(null);
                  setAddWithAIDevPrompt(null);
                  setAddWithAISuccess(null);
                  setAddWithAIGeneratedCards([]);
                  setAddWithAISelectedIndices(new Set());
                  setAddWithAITemplateId(effectiveDefaultTemplateId || templates[0]?.templateId || "");
                  setShowAddWithAIModal(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:pointer-events-none"
              >
                <Sparkles className="w-5 h-5" />
                Add Card with AI
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setAddCardTemplateId(effectiveDefaultTemplateId || templates[0]?.templateId || "");
                setShowAddCardModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent/90 text-white rounded-lg transition-colors font-medium"
            >
              <Plus className="w-5 h-5" />
              Add Card
            </button>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      {cards.length > 0 && (
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/30" />
          <input
            type="text"
            placeholder="Search cards..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-accent/50"
          />
        </div>
      )}

      {/* Cards Grid */}
      {filteredCards.length === 0 ? (
        <div className="text-center py-20">
          <Layers className="w-16 h-16 text-white/20 mx-auto mb-4" />
          <h3 className="text-xl text-white/70 mb-2">
            {searchQuery ? "No cards found" : "No cards yet"}
          </h3>
          <p className="text-white/40 mb-6">
            {searchQuery
              ? "Try a different search term"
              : "Create your first card to get started"}
          </p>
          {!searchQuery && (
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setShowImportModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
              >
                <Upload className="w-5 h-5" />
                Import Cards
              </button>
              <button
                type="button"
                onClick={() => {
                  setAddCardTemplateId(effectiveDefaultTemplateId || templates[0]?.templateId || "");
                  setShowAddCardModal(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent/90 text-white rounded-lg transition-colors"
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
              className="relative group"
            >
              <Link
                href={`/dashboard/deck/${deckId}/card/${card.cardId}`}
                className="block p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors"
              >
                {(() => {
                  const preview = getCardPreview(card);
                  return (
                    <>
                      <p className="text-white font-medium line-clamp-2">
                        {preview.main}
                      </p>
                      {preview.sub && (
                        <p className="text-white/50 text-sm line-clamp-2 mt-1">
                          {preview.sub}
                        </p>
                      )}
                    </>
                  );
                })()}
                <p className="text-white/30 text-xs mt-2">
                  {new Date(card.createdAt).toLocaleDateString()}
                </p>
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
                  <div className="absolute right-0 top-8 bg-zinc-900 border border-white/10 rounded-lg shadow-xl py-1 z-10 min-w-[140px]">
                    <Link
                      href={`/dashboard/deck/${deckId}/card/${card.cardId}`}
                      className="flex items-center gap-2 px-3 py-2 text-white/70 hover:bg-white/10 transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                      Edit
                    </Link>
                    <Link
                      href={`/dashboard/deck/${deckId}/card/${card.cardId}/preview`}
                      className="flex items-center gap-2 px-3 py-2 text-white/70 hover:bg-white/10 transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      Preview
                    </Link>
                    <button
                      onClick={() => {
                        setSelectedCard(card);
                        setShowDeleteModal(true);
                        setActionMenuCardId(null);
                      }}
                      className="flex items-center gap-2 px-3 py-2 text-red-400 hover:bg-white/10 transition-colors w-full"
                    >
                      <Trash2 className="w-4 h-4" />
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
                className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteCard}
                className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
              >
                Delete
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
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-accent/50"
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
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
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
                  className="px-4 py-2 bg-accent hover:bg-accent/90 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none"
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
                      : "Add Card with AI"}
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
                    Select which cards to add to the deck, or cancel to discard all.
                  </p>
                  <div className="mb-4 max-h-48 overflow-y-auto space-y-2 rounded-lg border border-white/10 p-2">
                    {addWithAIGeneratedCards.map((card, i) => (
                      <label
                        key={i}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={addWithAISelectedIndices.has(i)}
                          onChange={() => {
                            setAddWithAISelectedIndices((prev) => {
                              const next = new Set(prev);
                              if (next.has(i)) next.delete(i);
                              else next.add(i);
                              return next;
                            });
                          }}
                          className="rounded border-white/30 bg-white/5 text-amber-500 focus:ring-amber-500"
                        />
                        <span className="text-white/90 text-sm truncate flex-1">
                          {getGeneratedCardPreview(card.values)}
                        </span>
                      </label>
                    ))}
                  </div>
                  {addWithAIDevPrompt && (
                    <div className="mb-4 border border-white/10 rounded-lg overflow-hidden">
                      <div className="flex items-center justify-between px-3 py-2 bg-white/5">
                        <button
                          type="button"
                          onClick={() => setShowDevPrompt((p) => !p)}
                          className="text-left text-white/60 text-xs font-medium hover:bg-white/5 flex items-center gap-2"
                        >
                          Request prompt (dev only)
                          <span className="text-white/40">{showDevPrompt ? "▼" : "▶"}</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleCopyPrompt}
                          className="flex items-center gap-1 px-2 py-1 text-xs text-white/70 hover:bg-white/10 rounded"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          Copy prompt
                        </button>
                      </div>
                      {showDevPrompt && (
                        <div className="p-3 bg-black/30 text-white/80 text-xs font-mono whitespace-pre-wrap max-h-60 overflow-y-auto border-t border-white/10">
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
                      className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors disabled:opacity-50 disabled:pointer-events-none"
                    >
                      Cancel all
                    </button>
                    <button
                      type="button"
                      onClick={handleAddSelectedCardsToDeck}
                      disabled={addWithAISelectedIndices.size === 0 || !!addWithAIProgress}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none"
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
                  </p>
                  {addWithAIDevPrompt && (
                    <div className="mb-4 border border-white/10 rounded-lg overflow-hidden">
                      <div className="flex items-center justify-between px-3 py-2 bg-white/5">
                        <button
                          type="button"
                          onClick={() => setShowDevPrompt((p) => !p)}
                          className="text-left text-white/60 text-xs font-medium hover:bg-white/5 flex items-center gap-2"
                        >
                          Request prompt (dev only)
                          <span className="text-white/40">{showDevPrompt ? "▼" : "▶"}</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleCopyPrompt}
                          className="flex items-center gap-1 px-2 py-1 text-xs text-white/70 hover:bg-white/10 rounded"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          Copy prompt
                        </button>
                      </div>
                      {showDevPrompt && (
                        <div className="p-3 bg-black/30 text-white/80 text-xs font-mono whitespace-pre-wrap max-h-60 overflow-y-auto border-t border-white/10">
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
                      className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
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
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-medium transition-colors"
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
                      className="px-4 py-2 bg-accent hover:bg-accent/90 text-white rounded-lg font-medium transition-colors"
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
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500/50"
                      >
                        {templates.map((t) => (
                          <option key={t.templateId} value={t.templateId}>
                            {t.name} ({t.blocks?.length ?? 0} blocks)
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-white/70 text-sm block mb-1">Number of cards</label>
                      <select
                        value={addWithAICount}
                        onChange={(e) => setAddWithAICount(Number(e.target.value))}
                        disabled={addWithAIGenerating}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500/50"
                      >
                        {[1, 2, 3, 4, 5].map((n) => (
                          <option key={n} value={n}>
                            {n} {n === 1 ? "card" : "cards"}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {addWithAIProgress && (
                    <p className="text-amber-400/90 text-sm mb-4">{addWithAIProgress}</p>
                  )}
                  {addWithAIError && (
                    <p className="text-red-400 text-sm mb-4">{addWithAIError}</p>
                  )}
                  {addWithAIDevPrompt && !addWithAISuccess && (
                    <div className="mb-4 border border-white/10 rounded-lg overflow-hidden">
                      <div className="flex items-center justify-between px-3 py-2 bg-white/5">
                        <button
                          type="button"
                          onClick={() => setShowDevPrompt((p) => !p)}
                          className="text-left text-white/60 text-xs font-medium hover:bg-white/5 flex items-center gap-2"
                        >
                          Request prompt (dev only)
                          <span className="text-white/40">{showDevPrompt ? "▼" : "▶"}</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleCopyPrompt}
                          className="flex items-center gap-1 px-2 py-1 text-xs text-white/70 hover:bg-white/10 rounded"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          Copy prompt
                        </button>
                      </div>
                      {showDevPrompt && (
                        <div className="p-3 bg-black/30 text-white/80 text-xs font-mono whitespace-pre-wrap max-h-60 overflow-y-auto border-t border-white/10">
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
                      className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors disabled:opacity-50"
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
                      className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
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

      {/* Import Modal */}
      <AnimatePresence>
        {showImportModal && (
          <Modal onClose={resetImport} wide>
            <div className="max-h-[80vh] overflow-hidden flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">Import Cards</h2>
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

                        {/* Template Blocks - Clickable */}
                        <div className="mb-4 p-3 bg-white/5 rounded-lg">
                          <h4 className="text-white/70 text-sm mb-2">
                            Template Blocks:
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {selectedTemplate.blocks.map((block) => {
                              const isMapped = getMappingForBlock(
                                block.blockId
                              );
                              const isPending =
                                pendingBlockId === block.blockId;
                              return (
                                <button
                                  key={block.blockId}
                                  onClick={() =>
                                    handleBlockClick(block.blockId)
                                  }
                                  className={`text-xs px-3 py-1.5 rounded transition-all ${
                                    isMapped
                                      ? "bg-accent/20 text-accent hover:bg-accent/30"
                                      : isPending
                                      ? "bg-yellow-500/20 text-yellow-400 ring-2 ring-yellow-500/50"
                                      : pendingColumnIndex !== null
                                      ? "bg-white/10 text-white hover:bg-white/20 ring-1 ring-white/30"
                                      : "bg-white/10 text-white/50 hover:bg-white/20 hover:text-white"
                                  }`}
                                >
                                  {block.label}
                                  {isMapped && " ✓"}
                                  {isPending && " ←"}
                                </button>
                              );
                            })}
                          </div>
                        </div>

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
                                          className={
                                            mapping
                                              ? "text-accent font-medium"
                                              : isPending
                                              ? "text-yellow-400 font-medium"
                                              : ""
                                          }
                                        >
                                          {h || `Col ${i + 1}`}
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
                            {columnMappings.map((m) => (
                              <span
                                key={m.columnIndex}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-accent/20 text-accent text-sm rounded"
                              >
                                {m.columnName} → {m.blockLabel}
                                <button
                                  onClick={() => removeMapping(m.columnIndex)}
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
                        <p className="text-white text-lg mb-2">
                          Importing cards...
                        </p>
                        <p className="text-white/50">
                          {importedCount} of {getSelectedRowCount()} cards
                          imported
                        </p>
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
                        </p>
                        <button
                          onClick={resetImport}
                          className="px-6 py-2 bg-accent hover:bg-accent/90 text-white rounded-lg transition-colors"
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
                  <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/10">
                    <button
                      onClick={previousStep}
                      className="flex items-center gap-1 px-4 py-2 text-white/70 hover:text-white transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Back
                    </button>
                    {importStep === ImportStep.mapColumns ? (
                      <button
                        onClick={handleImport}
                        disabled={!canProceedToNextStep()}
                        className="flex items-center gap-2 px-6 py-2 bg-accent hover:bg-accent/90 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Upload className="w-4 h-4" />
                        Import {getSelectedRowCount()} Cards
                      </button>
                    ) : (
                      <button
                        onClick={nextStep}
                        disabled={!canProceedToNextStep()}
                        className="flex items-center gap-1 px-4 py-2 bg-accent hover:bg-accent/90 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Continue
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    )}
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
function Modal({ children, onClose, wide = false }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className={`bg-zinc-900 border border-white/10 rounded-2xl p-6 ${
          wide ? "w-full max-w-2xl" : "w-full max-w-md"
        }`}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}
