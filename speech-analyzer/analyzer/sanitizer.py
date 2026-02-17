import re


def sanitize_text(raw: str) -> str:
    """
    Clean transcript text for NLP processing.

    Removes:
    - Timestamps (00:01:23, [00:01:23], 1:23)
    - Stage directions ([applause], (laughter), [music], <inaudible>)
    - HTML tags
    - Extra whitespace

    Preserves:
    - Punctuation (for sentence splitting)
    - Capitalization (for NER)
    """
    text = raw or ""

    # Remove timestamps
    text = re.sub(r"\[?\d{1,2}:\d{2}(?::\d{2})?\]?", "", text)

    # Remove stage directions
    text = re.sub(r"\[[^\]]+\]", "", text)  # [applause]
    text = re.sub(r"\([^)]+\)", "", text)  # (laughter)
    text = re.sub(r"<[^>]+>", "", text)  # <inaudible>

    # Collapse whitespace
    text = re.sub(r"\s+", " ", text)
    text = text.strip()

    return text
