import spacy
from typing import List, Dict, Any

nlp = spacy.load("en_core_web_sm")

IGNORE_POS = {"PUNCT", "SPACE", "DET", "AUX"}
CONTENT_POS = {"NOUN", "VERB", "ADJ", "ADV"}


def norm_token(token) -> str:
    """
    Normalize token to reduce variation.
    - Pronouns → SB
    - Proper nouns → SB
    - Numbers → NUM
    - Others → lowercase lemma
    """
    if token.pos_ == "PRON":
        return "SB"
    if token.pos_ == "PROPN":
        return "SB"
    if token.like_num or token.pos_ == "NUM":
        return "NUM"
    return token.lemma_.lower()


def process_document(text: str) -> List[Dict[str, Any]]:
    """
    Process document and return normalized tokens with metadata.
    """
    doc = nlp(text)
    tokens = []
    for token in doc:
        if token.pos_ in IGNORE_POS:
            continue
        tokens.append({
            "text": token.text,
            "lemma": token.lemma_.lower(),
            "norm": norm_token(token),
            "pos": token.pos_,
            "dep": token.dep_,
            "is_stop": token.is_stop,
        })
    return tokens


def get_doc_for_patterns(text: str):
    """Return spaCy doc for pattern extraction (same text as process_document)."""
    return nlp(text)
