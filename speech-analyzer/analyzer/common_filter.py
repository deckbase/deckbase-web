"""
Very high-frequency English lemmas to filter from "signature" vocabulary and phrases.
Surfacing go/think/people/try to/go on would be uninformative; we prefer distinctive words and idioms.
Based on typical BNC/COCA top content words and common collocations.
"""

# Content words (and a few very common function-like) that are too generic for signature vocabulary.
# Excluding these makes room for more distinctive words (e.g. "reckon", "folks", "bizarre").
COMMON_LEMMAS = frozenset({
    # Very common verbs
    "go", "get", "think", "know", "say", "make", "take", "want", "see", "come",
    "use", "find", "give", "tell", "work", "call", "try", "ask", "need", "feel",
    "become", "leave", "put", "mean", "keep", "let", "begin", "seem", "help",
    "show", "hear", "play", "run", "move", "live", "believe", "bring", "happen",
    "write", "sit", "stand", "lose", "pay", "meet", "include", "continue", "set",
    "learn", "change", "lead", "understand", "watch", "follow", "stop", "create",
    "speak", "read", "allow", "add", "spend", "grow", "open", "walk", "win",
    "offer", "remember", "love", "consider", "appear", "buy", "wait", "serve",
    "die", "send", "expect", "build", "stay", "fall", "cut", "reach", "kill",
    "remain", "suggest", "raise", "pass", "sell", "require", "report", "decide",
    "pull", "break", "support", "hold", "turn", "start", "might", "must",
    # Very common nouns
    "people", "thing", "time", "way", "year", "man", "day", "world", "life",
    "hand", "part", "child", "eye", "woman", "place", "work", "week", "case",
    "point", "government", "company", "number", "group", "problem", "fact",
    "area", "water", "room", "money", "story", "lot", "program", "system",
    "car", "night", "school", "state", "family", "president", "country",
    "body", "house", "service", "party", "head", "level", "office", "door",
    "health", "person", "art", "war", "history", "result", "morning", "reason",
    "research", "girl", "guy", "book", "end", "member", "law", "face", "street",
    "community", "name", "team", "minute", "idea", "kid", "back", "parent",
    "rest", "power", "side", "moment", "table", "teacher", "father", "center",
    "ground", "policy", "force", "music", "role", "kitchen", "sport", "board",
    "action", "interest", "effect", "class", "industry", "rate", "type",
    "process", "job", "society", "food", "director", "bill", "model", "project",
    "court", "account", "sort", "issue", "line", "form", "term", "right",
    "development", "value", "market", "report", "experience", "voice", "order",
    "bank", "tax", "education", "management", "care", "activity", "couple",
    "amount", "staff", "condition", "question", "difference", "kind", "others",
    # Very common adjectives / adverbs
    "good", "new", "first", "last", "long", "great", "little", "own", "other",
    "old", "right", "big", "high", "different", "small", "large", "next",
    "early", "young", "important", "few", "public", "bad", "same", "able",
    "real", "sure", "clear", "possible", "whole", "certain", "likely", "social",
    "political", "national", "economic", "general", "local", "international",
    "special", "hard", "fine", "simple", "single", "free", "full", "best",
    "true", "easy", "strong", "available", "recent", "particular", "common",
    "personal", "open", "major", "natural", "significant", "serious", "ready",
    "necessary", "main", "basic", "central", "current", "total", "private",
    "wrong", "happy", "successful", "effective", "traditional", "medical",
    "final", "positive", "physical", "financial", "environmental", "popular",
    "nice", "pretty", "really", "quite", "actually", "probably", "maybe",
    "already", "always", "often", "sometimes", "usually", "almost", "especially",
    "rather", "exactly", "certainly", "obviously", "basically", "literally",
    # Particles / prepositions that make generic phrasal verbs (go on, try to, etc.)
    "on", "in", "out", "up", "down", "off", "over", "about", "around", "through",
    "back", "away", "to", "for", "with", "at", "by", "from", "of", "as",
})

# Next tier: still fairly common in general English; we down-rank these so rarer words surface first.
MODERATE_LEMMAS = frozenset({
    "agree", "allow", "answer", "apply", "argue", "arrive", "assume", "avoid",
    "base", "beat", "benefit", "claim", "close", "compare", "concern", "consider",
    "contact", "contain", "cover", "deal", "demand", "depend", "describe",
    "design", "determine", "develop", "discuss", "draw", "drive", "eat",
    "encourage", "enjoy", "enter", "exist", "express", "fail", "fill", "fit",
    "focus", "force", "forget", "form", "gain", "guess", "handle", "hang",
    "hope", "identify", "imagine", "improve", "increase", "indicate", "involve",
    "join", "judge", "lack", "limit", "list", "manage", "mark", "matter",
    "mind", "note", "notice", "obtain", "occur", "own", "perform", "pick",
    "plan", "prepare", "present", "prevent", "produce", "prove", "provide",
    "publish", "pull", "push", "raise", "realize", "receive", "recognize",
    "reduce", "refer", "reflect", "refuse", "regard", "relate", "release",
    "remain", "remove", "replace", "represent", "request", "require", "respond",
    "result", "return", "reveal", "review", "rule", "share", "sign", "solve",
    "sound", "speak", "spread", "stand", "stick", "study", "succeed", "suffer",
    "supply", "suppose", "train", "treat", "trust", "visit", "vote", "wish",
    "accept", "account", "address", "affect", "afford", "aim", "announce",
    "apologize", "approve", "attend", "attract", "average", "award", "balance",
    "band", "basis", "battle", "behavior", "belief", "birth", "bit", "block",
    "border", "brain", "branch", "budget", "burn", "bus", "cabinet", "camp",
    "campaign", "capital", "capture", "cell", "chain", "challenge", "channel",
    "chapter", "charge", "choice", "claim", "client", "club", "column",
    "comment", "commission", "competition", "complaint", "complex", "concept",
    "conclusion", "confidence", "connection", "consequence", "construction",
    "contact", "context", "contract", "contrast", "contribution", "conversation",
    "cookie", "copy", "cost", "count", "country", "course", "culture", "curve",
    "data", "date", "debate", "decision", "definition", "demand", "design",
    "desire", "detail", "difficulty", "discussion", "distance", "district",
    "document", "dream", "duty", "economy", "editor", "effect", "effort",
    "element", "emotion", "emphasis", "employee", "employer", "energy",
    "engine", "entry", "environment", "episode", "event", "evidence",
    "example", "exchange", "exercise", "expansion", "experience", "expert",
    "expression", "extent", "factor", "failure", "feature", "field", "figure",
    "film", "finger", "flight", "focus", "frame", "freedom", "friend", "front",
    "function", "fund", "future", "game", "gap", "generation", "glass", "goal",
    "god", "growth", "guide", "habit", "half", "impact", "importance",
    "impression", "improvement", "incident", "income", "increase", "industry",
    "influence", "information", "injury", "instance", "instruction",
    "insurance", "intelligence", "intention", "interview", "introduction",
    "item", "job", "key", "knowledge", "lab", "lack", "land", "language",
    "layer", "leader", "length", "level", "limit", "link", "list", "loss",
    "machine", "magazine", "majority", "manner", "map", "mass", "material",
    "meaning", "measure", "media", "medium", "method", "middle", "mind",
    "minority", "minute", "mix", "mode", "model", "moment", "month", "mouth",
    "movement", "nature", "network", "news", "noise", "note", "notice",
    "object", "opportunity", "option", "order", "organization", "output",
    "owner", "page", "pain", "painting", "pair", "panel", "paper", "parent",
    "part", "participant", "partner", "path", "patient", "pattern", "payment",
    "peace", "period", "piece", "plan", "plane", "plant", "plate", "player",
    "pleasure", "point", "policy", "position", "practice", "pressure", "price",
    "priority", "prize", "problem", "procedure", "process", "product",
    "profit", "program", "progress", "project", "promise", "proof", "property",
    "proposal", "protection", "purpose", "quality", "quantity", "quarter",
    "question", "range", "rate", "ratio", "reason", "record", "region",
    "relation", "relationship", "reply", "report", "request", "response",
    "responsibility", "return", "review", "risk", "role", "room", "rule",
    "safety", "sample", "scale", "scene", "schedule", "scheme", "scope",
    "score", "screen", "section", "sector", "sense", "series", "service",
    "session", "setting", "share", "shift", "shock", "side", "sign", "signal",
    "skill", "solution", "source", "space", "stage", "standard", "start",
    "state", "statement", "step", "stock", "store", "story", "strategy",
    "stress", "structure", "study", "style", "subject", "success", "survey",
    "system", "target", "task", "taste", "technology", "temperature", "term",
    "theme", "thing", "thought", "tip", "title", "tool", "topic", "town",
    "trade", "tradition", "train", "transfer", "transition", "truth", "turn",
    "type", "unit", "user", "value", "version", "video", "view", "village",
    "voice", "vote", "war", "way", "weight", "whole", "wife", "wind", "wing",
    "winner", "witness", "worker", "works", "writer", "year",
})


def is_common_lemma(lemma: str) -> bool:
    """True if this lemma is in the high-frequency list (uninformative for signature)."""
    if not lemma:
        return True
    return lemma.lower().strip() in COMMON_LEMMAS


def phrase_has_distinctive_word(phrase: str) -> bool:
    """True if at least one word in the phrase is not in the common list (so phrase is distinctive)."""
    if not phrase or not phrase.strip():
        return False
    words = [w.strip().lower() for w in phrase.split() if w.strip()]
    return any(w not in COMMON_LEMMAS for w in words)


def head_lemma_is_common(pattern: str) -> bool:
    """True if the first (head) word of the pattern is common (e.g. 'think' in 'think SB')."""
    if not pattern or not pattern.strip():
        return True
    head = pattern.strip().split()[0].lower()
    return head in COMMON_LEMMAS


def rarity_tier(lemma: str) -> int:
    """
    Rarity tier for vocabulary: 2 = rare (distinctive), 1 = moderate, 0 = common (excluded).
    Used to sort so unique/speaker-characteristic words surface first.
    """
    if not lemma:
        return 0
    w = lemma.lower().strip()
    if w in COMMON_LEMMAS:
        return 0
    if w in MODERATE_LEMMAS:
        return 1
    return 2
