import logging
from typing import Optional

from google.cloud import firestore, storage

from .sanitizer import sanitize_text
from .nlp_processor import process_document, get_doc_for_patterns
from .extractors import (
    extract_vocabulary,
    extract_learning_phrases,
    extract_idiom_phrases,
    extract_pattern_phrases,
    aggregate_patterns,
)

logger = logging.getLogger(__name__)


def parse_gs_url(gs_path: str) -> tuple:
    """Parse gs://bucket/path into (bucket, path)."""
    if not gs_path or not gs_path.startswith("gs://"):
        raise ValueError(f"Invalid storage path: {gs_path}")
    parts = gs_path.replace("gs://", "").split("/", 1)
    return parts[0], parts[1]


def process_person(person_id: str, session_id: Optional[str] = None) -> None:
    """
    Process queued docs and write analysis into the session doc.
    Path: people/{personId}/analysis_sessions/{sessionId} (one doc for session + analysis).
    session_id is required (no separate analysis collection).
    """
    if not session_id:
        raise ValueError("session_id is required")
    logger.info("[analyzer] process_person started: person_id=%s session_id=%s", person_id, session_id)
    db = firestore.Client()
    storage_client = storage.Client()

    docs_ref = db.collection("people").document(person_id).collection("docs")
    docs_snapshot = list(docs_ref.where("status", "==", "queued").stream())
    total_docs = len(docs_snapshot)
    logger.info("[analyzer] queued docs for person_id=%s: %s (doc ids: %s)", person_id, total_docs, [d.id for d in docs_snapshot])

    session_ref = (
        db.collection("people")
        .document(person_id)
        .collection("analysis_sessions")
        .document(session_id)
    )

    if total_docs == 0:
        logger.warning("[analyzer] No queued documents — writing progress 0/0 and status=done so UI does not hang")
        session_ref.set(
            {
                "progress": {
                    "processedDocs": 0,
                    "totalDocs": 0,
                    "percent": 100,
                    "updatedAt": firestore.SERVER_TIMESTAMP,
                    "status": "done",
                },
                "status": "done",
                "updatedAt": firestore.SERVER_TIMESTAMP,
            },
            merge=True,
        )
        return

    session_ref.set(
        {
            "progress": {
                "processedDocs": 0,
                "totalDocs": total_docs,
                "percent": 0,
                "updatedAt": firestore.SERVER_TIMESTAMP,
                "status": "processing",
            }
        },
        merge=True,
    )

    all_tokens = {}
    all_patterns = {}

    try:
        for idx, doc_snap in enumerate(docs_snapshot, 1):
            doc_data = doc_snap.to_dict()
            storage_path = doc_data.get("storagePath") or ""
            if not storage_path:
                logger.warning("Doc %s has no storagePath", doc_snap.id)
                continue

            bucket_name, blob_path = parse_gs_url(storage_path)
            bucket = storage_client.bucket(bucket_name)
            blob = bucket.blob(blob_path)
            raw_text = blob.download_as_text(encoding="utf-8")

            clean_text = sanitize_text(raw_text)
            if not clean_text.strip():
                continue

            tokens = process_document(clean_text)
            spacy_doc = get_doc_for_patterns(clean_text)
            patterns = extract_pattern_phrases(spacy_doc)

            all_tokens[doc_snap.id] = tokens
            all_patterns[doc_snap.id] = patterns

            # Mark doc as done so we don't reprocess
            doc_snap.reference.update({
                "status": "done",
                "updatedAt": firestore.SERVER_TIMESTAMP,
            })

            progress_percent = round((idx / total_docs) * 100, 1)
            session_ref.update({
                "progress.processedDocs": idx,
                "progress.percent": progress_percent,
                "progress.updatedAt": firestore.SERVER_TIMESTAMP,
            })
            logger.info("Processed %s/%s docs (%.1f%%)", idx, total_docs, progress_percent)

        # Build flat token list for vocabulary
        flat_tokens = []
        for t_list in all_tokens.values():
            flat_tokens.extend(t_list)
        vocabulary = extract_vocabulary(flat_tokens)
        learning_phrases = extract_learning_phrases(all_tokens, total_docs)
        idiom_phrases = extract_idiom_phrases(all_tokens, total_docs)
        pattern_phrases = aggregate_patterns(all_patterns)
        total_tokens = len(flat_tokens)

        session_ref.set(
            {
                "vocabulary": vocabulary[:1000],
                "learningPhrases": learning_phrases[:1000],
                "signaturePhrases": idiom_phrases[:500],
                "patternPhrases": pattern_phrases[:1000],
                "corpusStats": {
                    "docCount": total_docs,
                    "tokenCount": total_tokens,
                    "updatedAt": firestore.SERVER_TIMESTAMP,
                    "methodVersion": "1.0",
                },
                "progress": {
                    "processedDocs": total_docs,
                    "totalDocs": total_docs,
                    "percent": 100,
                    "updatedAt": firestore.SERVER_TIMESTAMP,
                    "status": "done",
                },
                "updatedAt": firestore.SERVER_TIMESTAMP,
            },
            merge=True,
        )
        logger.info("Analysis complete for person_id=%s session_id=%s", person_id, session_id)

    except Exception as e:
        logger.exception("Analysis failed for person_id=%s", person_id)
        session_ref.update({
            "progress.status": "failed",
            "progress.error": str(e),
            "progress.updatedAt": firestore.SERVER_TIMESTAMP,
        })
        raise
