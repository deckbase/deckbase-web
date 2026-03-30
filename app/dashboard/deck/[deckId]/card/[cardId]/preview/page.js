"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Edit2 } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { getDeck, getCards, getMedia } from "@/utils/firestore";
import { normalizeBlockTypeName } from "@/utils/firestore";
import CardPreviewContent from "@/components/CardPreviewContent";
import PreviewCardShell from "@/components/PreviewCardShell";
import { usePhonePreviewLayoutDebug } from "@/lib/phone-preview-layout-debug";
import PreviewModePill from "@/components/PreviewModePill";
import { PREVIEW_LAYOUT, previewHeroTag } from "@/lib/card-preview-layout";
import { previewDebugLog } from "@/lib/preview-debug-log";

const ENTRY_VALUES = new Set(["editor", "deck", "fileToAi"]);

function resolveEntry(fromParam, draftMatchesRoute, draft) {
  if (ENTRY_VALUES.has(fromParam)) return fromParam;
  if (draftMatchesRoute && ENTRY_VALUES.has(draft?.entry)) return draft.entry;
  return "deck";
}

function effectiveSide(block) {
  return block?.side === "back" ? "back" : "front";
}

function cardHasBackFace(blocksSnapshot) {
  return (blocksSnapshot || []).some((b) => effectiveSide(b) === "back");
}

function getCardTitle(blocksSnapshot, getValue) {
  for (const b of blocksSnapshot || []) {
    const t = normalizeBlockTypeName(b.type);
    if (t === "header1" || t === "header2" || t === "header3") {
      const v = getValue?.(b.blockId);
      const text = (v?.text && String(v.text).trim()) || (b.label && String(b.label).trim());
      if (text) return text;
    }
  }
  return null;
}

function CardPreviewPageInner() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromQuery = searchParams.get("from");
  const { user } = useAuth();
  const deckId = params.deckId;
  const cardId = params.cardId;

  const [deck, setDeck] = useState(null);
  const [orderedCards, setOrderedCards] = useState([]);
  const [activeCard, setActiveCard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mediaCache, setMediaCache] = useState({});
  const [entrySource, setEntrySource] = useState("deck");
  /** When true, card body scrolls; when false, vertical swipe changes cards. */
  const [readFullScroll, setReadFullScroll] = useState(false);

  useEffect(() => {
    previewDebugLog("page", "CardPreviewPageInner mounted / route", {
      deckId,
      cardId,
    });
  }, [deckId, cardId]);

  useEffect(() => {
    previewDebugLog("page", "readFullScroll changed", {
      readFullScroll,
      activeCardId: activeCard?.cardId ?? null,
    });
  }, [readFullScroll, activeCard?.cardId]);
  const [flipFaceByCard, setFlipFaceByCard] = useState({});

  const slideRefs = useRef([]);
  const phoneShellRef = useRef(null);
  const phoneBodyRef = useRef(null);
  const phoneScrollRef = useRef(null);
  const phonePreviewContentRef = useRef(null);
  usePhonePreviewLayoutDebug(
    "deck-card-preview",
    {
      phoneRef: phoneShellRef,
      bodyRef: phoneBodyRef,
      scrollRef: phoneScrollRef,
      innerRef: phoneScrollRef,
      contentRef: phonePreviewContentRef,
    },
    !loading,
  );

  const loadMediaForValues = useCallback(
    async (valuesArray) => {
      for (const value of valuesArray || []) {
        if (value.mediaIds && value.mediaIds.length > 0) {
          for (const mediaId of value.mediaIds) {
            const media = await getMedia(user.uid, mediaId);
            if (media) setMediaCache((prev) => ({ ...prev, [mediaId]: media }));
          }
        }
      }
    },
    [user],
  );

  useEffect(() => {
    if (!user || !deckId || !cardId) return;

    let cancelled = false;

    async function run() {
      setLoading(true);

      const deckData = await getDeck(user.uid, deckId);
      if (!deckData || deckData.isDeleted) {
        router.push("/dashboard");
        return;
      }
      if (cancelled) return;
      setDeck(deckData);

      let draft = null;
      try {
        const rawDraft = sessionStorage.getItem(`card-preview-draft-${deckId}`);
        draft = rawDraft ? JSON.parse(rawDraft) : null;
      } catch {
        draft = null;
      }

      const draftMatchesRoute =
        draft?.blocks?.length &&
        (cardId === "new"
          ? draft.targetCardId == null || draft.targetCardId === "new"
          : draft.targetCardId === cardId);

      setEntrySource(resolveEntry(fromQuery, draftMatchesRoute, draft));

      if (draftMatchesRoute) {
        const valuesArray = Object.entries(draft.values || {}).map(([bid, v]) => ({
          ...v,
          blockId: bid,
        }));
        const cardDraft = {
          cardId: cardId === "new" ? "new" : cardId,
          blocksSnapshot: draft.blocks,
          values: valuesArray,
          createdAt: null,
          updatedAt: null,
        };
        if (cancelled) return;
        setOrderedCards([cardDraft]);
        setActiveCard(cardDraft);
        await loadMediaForValues(valuesArray);
        setLoading(false);
        return;
      }

      if (cardId === "new") {
        router.replace(`/dashboard/deck/${deckId}/card/new`);
        return;
      }

      const all = await getCards(user.uid, deckId);
      if (!all.length) {
        router.push(`/dashboard/deck/${deckId}`);
        return;
      }

      const idx = all.findIndex((c) => c.cardId === cardId);
      if (idx < 0) {
        router.push(`/dashboard/deck/${deckId}`);
        return;
      }

      if (cancelled) return;
      setOrderedCards(all);
      setActiveCard(all[idx]);
      await loadMediaForValues(all[idx].values || []);
      setLoading(false);
    }

    run();
    return () => {
      cancelled = true;
    };
    // Intentionally omit `cardId`: URL updates when swiping cards; refetching would flash loading.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cardId read from closure on user/deck load only
  }, [user, deckId, router, fromQuery, loadMediaForValues]);

  useEffect(() => {
    if (!orderedCards.length || cardId === "new") return;
    const m = orderedCards.find((c) => c.cardId === cardId);
    if (m) setActiveCard(m);
  }, [cardId, orderedCards]);

  useEffect(() => {
    if (!user || !activeCard?.values?.length) return;
    loadMediaForValues(activeCard.values);
  }, [activeCard?.cardId, activeCard?.values, loadMediaForValues, user]);

  const getValue = useCallback(
    (blockId) => activeCard?.values?.find((v) => v.blockId === blockId),
    [activeCard],
  );

  const activeTitle = useMemo(
    () => getCardTitle(activeCard?.blocksSnapshot, getValue) || deck?.title || "Preview",
    [activeCard, getValue, deck?.title],
  );

  const nav = useMemo(() => {
    const deckPath = `/dashboard/deck/${deckId}`;
    const cardEditPath = `/dashboard/deck/${deckId}/card/${cardId}`;

    if (entrySource === "editor") {
      return {
        backHref: cardEditPath,
        backLabel: "Editor",
        backTitle: "Back to editor",
        editHref: deckPath,
        editLabel: "Deck",
        editTitle: "Open deck",
      };
    }
    if (entrySource === "fileToAi") {
      return {
        backHref: deckPath,
        backLabel: "Deck",
        backTitle: "Back to deck",
        editHref: cardEditPath,
        editLabel: cardId === "new" ? "Use in editor" : "Edit",
        editTitle: cardId === "new" ? "Open card editor" : "Edit card",
      };
    }
    return {
      backHref: deckPath,
      backLabel: "Deck",
      backTitle: "Back to deck",
      editHref: cardEditPath,
      editLabel: cardId === "new" ? "Back to edit" : "Edit",
      editTitle: cardId === "new" ? "Back to new card" : "Edit card",
    };
  }, [entrySource, deckId, cardId]);

  const syncUrlToCard = useCallback(
    (nextCardId) => {
      if (!nextCardId || nextCardId === "new") return;
      const q = fromQuery ? `?from=${encodeURIComponent(fromQuery)}` : "";
      router.replace(`/dashboard/deck/${deckId}/card/${nextCardId}/preview${q}`, {
        scroll: false,
      });
    },
    [deckId, fromQuery, router],
  );

  useLayoutEffect(() => {
    if (loading || !phoneScrollRef.current || orderedCards.length === 0) return;
    const i = orderedCards.findIndex((c) => c.cardId === cardId);
    if (i < 0) return;
    const slide = slideRefs.current[i];
    if (slide) {
      slide.scrollIntoView({ block: "start", behavior: "auto" });
    }
  }, [loading, cardId, orderedCards]);

  useEffect(() => {
    const root = phoneScrollRef.current;
    if (!root || orderedCards.length <= 1) return;

    const obs = new IntersectionObserver(
      (entries) => {
        const hit = entries
          .filter((e) => e.isIntersecting && e.intersectionRatio >= 0.45)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!hit?.target) return;
        const idx = Number(hit.target.getAttribute("data-slide-index"));
        const parsed = Number.parseInt(String(idx), 10);
        if (Number.isNaN(parsed) || parsed < 0 || parsed >= orderedCards.length) return;
        const next = orderedCards[parsed];
        if (next.cardId === cardId) return;
        setActiveCard(next);
        syncUrlToCard(next.cardId);
      },
      { root, rootMargin: "0px", threshold: [0.45, 0.55, 0.65] },
    );

    slideRefs.current.forEach((el) => {
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, [orderedCards, syncUrlToCard, cardId]);

  useEffect(() => {
    setReadFullScroll(false);
  }, [activeCard?.cardId]);

  if (loading) {
    return (
      <div className="flex h-[calc(100dvh-3.5rem)] min-h-0 items-center justify-center px-3 pt-2">
        <div className="text-[13px] text-white/35">Loading…</div>
      </div>
    );
  }

  return (
    <div
      ref={phoneShellRef}
      className="flex h-[calc(100dvh-3.5rem)] min-h-0 flex-col overflow-hidden bg-black pb-[max(env(safe-area-inset-bottom),0.5rem)]"
    >
      <div className="flex h-full min-h-0 flex-col">
        <header className="flex flex-shrink-0 items-center gap-px px-3 py-2.5 border-b border-white/[0.06]">
          <Link
            href={nav.backHref}
            className="flex min-w-0 flex-shrink-0 items-center gap-1.5 rounded-lg border border-white/[0.07] bg-white/[0.03] p-1.5 text-white/40 transition-all hover:bg-white/[0.07] hover:text-white/80"
            title={nav.backTitle}
            aria-label={nav.backTitle}
          >
            <ArrowLeft className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="hidden max-w-[5.5rem] truncate text-[11px] font-medium text-white/45 sm:inline">
              {nav.backLabel}
            </span>
          </Link>
          <h1 className="min-w-0 flex-1 truncate px-1 text-center text-[13px] font-medium text-white/90">
            {activeTitle}
          </h1>
          <PreviewModePill className="flex-shrink-0" />
          {entrySource !== "editor" && (
            <Link
              href={nav.editHref}
              className="flex flex-shrink-0 items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2 py-1.5 text-[12px] font-medium text-white/55 transition-all hover:bg-white/[0.07] hover:text-white/90"
              title={nav.editTitle}
            >
              <Edit2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{nav.editLabel}</span>
            </Link>
          )}
        </header>

        <div
          ref={phoneBodyRef}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
          style={{
            paddingLeft: PREVIEW_LAYOUT.horizontalPadding,
            paddingRight: PREVIEW_LAYOUT.horizontalPadding,
          }}
        >
          <div
            ref={phoneScrollRef}
            className={`min-h-0 flex-1 h-full overflow-y-auto overscroll-y-contain ${
              orderedCards.length > 1 ? "snap-y snap-mandatory snap-always" : ""
            }`}
          >
            {orderedCards.map((c, i) => {
                const isActive = c.cardId === activeCard?.cardId;
                const getVal = (bid) => c.values?.find((v) => v.blockId === bid);
                const face =
                  flipFaceByCard[c.cardId] === "back" ? "back" : "front";
                const layoutId = isActive
                  ? previewHeroTag("preview", c.cardId, face)
                  : undefined;

                return (
                  <section
                    key={c.cardId}
                    ref={(el) => {
                      slideRefs.current[i] = el;
                    }}
                    data-slide-index={i}
                    className={`box-border flex h-full min-h-0 flex-shrink-0 flex-col overflow-hidden ${
                      orderedCards.length > 1 ? "snap-start snap-always" : ""
                    }`}
                    style={{
                      paddingTop: PREVIEW_LAYOUT.pageItemVerticalPaddingHalf,
                      paddingBottom: PREVIEW_LAYOUT.pageItemVerticalPaddingHalf,
                    }}
                  >
                    <div className="flex min-h-0 min-w-0 flex-1 flex-col items-stretch overflow-hidden py-0">
                      <PreviewCardShell
                        reserveTopOverlay={cardHasBackFace(c.blocksSnapshot)}
                        layoutId={layoutId}
                      >
                        <div
                          ref={isActive ? phonePreviewContentRef : undefined}
                          className="h-full min-h-0 flex-1"
                        >
                          <CardPreviewContent
                            blocks={c.blocksSnapshot}
                            getValue={getVal}
                            mediaCache={mediaCache}
                            card={c}
                            mobileDeckPreview
                            pagerActive={isActive}
                            disableVerticalScroll={!readFullScroll}
                            onRequestReadFull={
                              isActive
                                ? () => {
                                    previewDebugLog("page", "Read full clicked", {
                                      cardId: c.cardId,
                                    });
                                    setReadFullScroll(true);
                                  }
                                : undefined
                            }
                            onExitReadFull={
                              isActive
                                ? () => {
                                    previewDebugLog("page", "Collapse clicked", {
                                      cardId: c.cardId,
                                    });
                                    setReadFullScroll(false);
                                  }
                                : undefined
                            }
                            previewDebugLabel={c.cardId}
                            centerBlockContent
                            onFlipFaceChange={(side) =>
                              setFlipFaceByCard((prev) => ({
                                ...prev,
                                [c.cardId]: side,
                              }))
                            }
                          />
                        </div>
                      </PreviewCardShell>
                    </div>
                  </section>
                );
              })}
          </div>
        </div>
      </div>

      {cardId !== "new" && (activeCard?.createdAt != null || activeCard?.updatedAt != null) && (
        <p className="flex-shrink-0 border-t border-white/[0.05] px-3 py-2 text-center text-[10px] text-white/20">
          {activeCard?.createdAt != null ? new Date(activeCard.createdAt).toLocaleDateString() : "—"}
          {activeCard?.updatedAt != null &&
            ` · Updated ${new Date(activeCard.updatedAt).toLocaleDateString()}`}
        </p>
      )}

    </div>
  );
}

export default function CardPreviewPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[calc(100dvh-3.5rem)] min-h-0 items-center justify-center px-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/[0.07] border-t-accent" />
        </div>
      }
    >
      <CardPreviewPageInner />
    </Suspense>
  );
}
