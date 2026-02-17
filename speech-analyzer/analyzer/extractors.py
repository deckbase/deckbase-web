import math
from collections import Counter, defaultdict
from typing import List, Dict, Any

from .nlp_processor import CONTENT_POS, norm_token
from .common_filter import is_common_lemma, phrase_has_distinctive_word, head_lemma_is_common, rarity_tier
from .idiom_lexicon import is_idiom


def extract_vocabulary(tokens: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Extract top vocabulary with frequency stats.
    Skips very common lemmas (go, think, people, ...) so we surface more distinctive words.
    Returns: List of {t, c, p10k, surfaces?}
    """
    counter = Counter()
    surfaces_by_lemma = defaultdict(set)
    total_tokens = 0
    for token in tokens:
        if token.get("pos") in CONTENT_POS and not token.get("is_stop"):
            lemma = token["lemma"]
            if is_common_lemma(lemma):
                continue
            counter[lemma] += 1
            surfaces_by_lemma[lemma].add(token.get("text", ""))
        total_tokens += 1
    if total_tokens == 0:
        return []
    vocab = []
    for lemma, count in counter.items():
        surfaces = list(surfaces_by_lemma.get(lemma, []))[:30]
        item = {
            "t": lemma,
            "c": count,
            "p10k": round((count / total_tokens) * 10000, 2),
            "r": rarity_tier(lemma),
        }
        if surfaces:
            item["surfaces"] = surfaces
        vocab.append(item)
    vocab.sort(key=lambda x: (-x["r"], -x["c"]))
    return vocab[:1000]


def generate_ngrams(
    tokens: List[Dict[str, Any]], n: int, doc_id: str
) -> List[tuple]:
    """Generate n-grams from normalized tokens. Returns (phrase, doc_id, surface)."""
    ngrams = []
    for i in range(len(tokens) - n + 1):
        ngram = tokens[i : i + n]
        stop_count = sum(1 for t in ngram if t.get("is_stop"))
        if stop_count / n > 0.6:
            continue
        has_content = any(t.get("pos") in CONTENT_POS for t in ngram)
        if not has_content:
            continue
        phrase = " ".join(t["norm"] for t in ngram)
        surface = " ".join(t.get("text", "") for t in ngram)
        ngrams.append((phrase, doc_id, surface))
    return ngrams


def _unigram_counts_and_total(all_tokens: Dict[str, List[Dict[str, Any]]]) -> tuple:
    """Build unigram counts and total token count from corpus (norm form). For PMI."""
    unigram = Counter()
    total = 0
    for tokens in all_tokens.values():
        for t in tokens:
            norm = (t.get("norm") or t.get("lemma") or "").strip()
            if norm:
                unigram[norm] += 1
                total += 1
    return unigram, total


def _pmi(phrase: str, phrase_count: int, unigram: Counter, total_tokens: int, n: int) -> float:
    """
    Pointwise mutual information: log2( P(phrase) / (P(w1)*...*P(wk)) ).
    Uses smoothing to avoid zeros. Higher PMI = stronger collocation.
    """
    if total_tokens <= 0 or phrase_count <= 0 or n < 2:
        return 0.0
    words = phrase.split()
    if len(words) != n:
        return 0.0
    prod = 1.0
    for w in words:
        c = unigram.get(w, 0) + 0.01
        prod *= c
    # P(phrase) ~ count_phrase / total_ngrams; total_ngrams ~ total_tokens (approx)
    num = (phrase_count + 0.01) * ((total_tokens + 0.01) ** (n - 1))
    pmi = math.log2(num / (prod + 1e-10))
    return round(pmi, 2)


def extract_learning_phrases(
    all_tokens: Dict[str, List[Dict[str, Any]]], total_docs: int
) -> List[Dict[str, Any]]:
    """
    Extract learning phrases across all documents.
    Ranks by score and PMI so strong collocations (e.g. "double down") surface higher.
    For single-doc corpus, relax doc_freq filter.
    """
    phrase_count = Counter()
    phrase_docs = defaultdict(set)
    phrase_surfaces = defaultdict(set)
    phrase_n = {}  # n-gram length for each phrase
    for doc_id, tokens in all_tokens.items():
        for n in range(2, 6):
            ngrams = generate_ngrams(tokens, n, doc_id)
            for phrase, doc, surface in ngrams:
                phrase_count[phrase] += 1
                phrase_docs[phrase].add(doc)
                phrase_n[phrase] = n
                if surface.strip():
                    phrase_surfaces[phrase].add(surface)

    unigram, total_tokens = _unigram_counts_and_total(all_tokens)

    min_doc_freq = 1 if total_docs == 1 else 2
    min_count = 2 if total_docs == 1 else 5

    phrases = []
    for phrase, count in phrase_count.items():
        doc_freq = len(phrase_docs[phrase])
        if count < min_count or doc_freq < min_doc_freq:
            continue
        if not phrase_has_distinctive_word(phrase):
            continue
        score = count * math.log(1 + doc_freq)
        pmi = _pmi(phrase, count, unigram, total_tokens, phrase_n.get(phrase, 2))
        surfaces = list(phrase_surfaces.get(phrase, []))[:30]
        item = {
            "t": phrase,
            "n": phrase,
            "c": count,
            "df": doc_freq,
            "s": round(score, 2),
            "pmi": pmi,
        }
        if surfaces:
            item["surfaces"] = surfaces
        phrases.append(item)
    phrases.sort(key=lambda x: (x["pmi"], x["s"]), reverse=True)
    return phrases[:1000]


def extract_idiom_phrases(
    all_tokens: Dict[str, List[Dict[str, Any]]], total_docs: int
) -> List[Dict[str, Any]]:
    """
    Extract phrases that match known idioms (from idiom_lexicon).
    Uses the same n-gram generation as learning phrases; keeps only matches.
    Returns list of {t, c, df, surfaces?} for use as signaturePhrases.
    """
    phrase_count = Counter()
    phrase_docs = defaultdict(set)
    phrase_surfaces = defaultdict(set)
    for doc_id, tokens in all_tokens.items():
        for n in range(2, 8):
            ngrams = generate_ngrams(tokens, n, doc_id)
            for phrase, doc, surface in ngrams:
                if not is_idiom(phrase):
                    continue
                phrase_count[phrase] += 1
                phrase_docs[phrase].add(doc)
                if surface.strip():
                    phrase_surfaces[phrase].add(surface)

    results = []
    for phrase, count in phrase_count.most_common(500):
        surfaces = list(phrase_surfaces.get(phrase, []))[:30]
        item = {
            "t": phrase,
            "c": count,
            "df": len(phrase_docs[phrase]),
        }
        if surfaces:
            item["surfaces"] = surfaces
        results.append(item)
    return results


def _span_text(doc, *indices) -> str:
    """Return doc text for the span covering the given token indices."""
    if not indices:
        return ""
    lo, hi = min(indices), max(indices)
    return doc[lo : hi + 1].text


def extract_pattern_phrases(doc) -> List[Dict[str, Any]]:
    """
    Extract dependency-based patterns from spaCy doc.
    Patterns: VPO, phrasal, VO, adjn, nn.
    Includes surface form (actual text span) for highlighting.
    """
    patterns = []
    for token in doc:
        if token.pos_ == "VERB":
            for child in token.children:
                if child.dep_ == "prep":
                    for grandchild in child.children:
                        if grandchild.dep_ == "pobj":
                            pattern = f"{token.lemma_} {child.lemma_} {norm_token(grandchild)}"
                            surface = _span_text(doc, token.i, child.i, grandchild.i)
                            patterns.append({"t": pattern, "kind": "VPO", "surface": surface})
                if child.dep_ == "prt":
                    pattern = f"{token.lemma_} {child.lemma_}"
                    surface = _span_text(doc, token.i, child.i)
                    patterns.append({"t": pattern, "kind": "phrasal", "surface": surface})
                if child.dep_ == "dobj":
                    pattern = f"{token.lemma_} {child.lemma_}"
                    surface = _span_text(doc, token.i, child.i)
                    patterns.append({"t": pattern, "kind": "VO", "surface": surface})
        if token.pos_ == "NOUN":
            for child in token.children:
                if child.dep_ == "amod" and child.pos_ == "ADJ":
                    pattern = f"{child.lemma_} {token.lemma_}"
                    surface = _span_text(doc, token.i, child.i)
                    patterns.append({"t": pattern, "kind": "adjn", "surface": surface})
                if child.dep_ == "compound" and child.pos_ == "NOUN":
                    pattern = f"{child.lemma_} {token.lemma_}"
                    surface = _span_text(doc, token.i, child.i)
                    patterns.append({"t": pattern, "kind": "nn", "surface": surface})
    return patterns


def aggregate_patterns(
    all_patterns: Dict[str, List[Dict[str, Any]]]
) -> List[Dict[str, Any]]:
    """Aggregate and rank pattern phrases; collect surface forms for highlighting."""
    pattern_count = Counter()
    pattern_docs = defaultdict(set)
    pattern_kind = {}
    pattern_surfaces = defaultdict(set)
    for doc_id, patterns in all_patterns.items():
        for p in patterns:
            key = p["t"]
            pattern_count[key] += 1
            pattern_docs[key].add(doc_id)
            pattern_kind[key] = p["kind"]
            surface = p.get("surface", "").strip()
            if surface:
                pattern_surfaces[key].add(surface)
    results = []
    for pattern, count in pattern_count.most_common(1000):
        if head_lemma_is_common(pattern):
            continue
        item = {
            "t": pattern,
            "kind": pattern_kind[pattern],
            "c": count,
            "df": len(pattern_docs[pattern]),
        }
        surfaces = list(pattern_surfaces.get(pattern, []))[:30]
        if surfaces:
            item["surfaces"] = surfaces
        results.append(item)
    return results
