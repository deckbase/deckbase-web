# Speech Pattern Analysis System

> Automatically discover and extract learning patterns from speeches to power intelligent Deckbase flashcards

## 🎯 Purpose

This system analyzes speeches to automatically discover **how people communicate**, not just what they say. Instead of extracting memorable quotes, it identifies recurring language patterns, grammatical constructions, and signature phrases that define a speaker's communication style.

### What This Enables

- **Personalized Learning**: Generate flashcards based on real communication patterns
- **Signature Phrases**: Discover speaker-specific catchphrases and expressions
- **Reusable Patterns**: Learn transferable language constructions for better communication
- **Automatic Discovery**: No manual idiom detection or phrase curation needed

## 🏗️ Architecture Overview

```
Transcript → Sanitize → Parse → Extract Patterns → Rank → Store Top 1000
```

### Data Flow

1. **Input**: Raw speech transcripts stored in Cloud Storage
2. **Processing**: NLP analysis pipeline using spaCy
3. **Output**: Top 1000 patterns per speaker stored in Firestore

### Storage Structure

**Cloud Storage** (Raw transcripts):
```
gs://deckbase-transcripts/{personId}/{docId}.txt
```

**Firestore** (Metadata & results):
```
people/{personId}/docs/{docId}          # Transcript metadata
people/{personId}/analysis/v1           # Analysis results
```

## 🔍 What Gets Extracted

The system identifies 6 types of language patterns:

| Pattern Type | Example | Use Case |
|-------------|---------|----------|
| **N-gram Framing Phrases** | "the reason is", "what matters is" | Communication framing |
| **Verb-Preposition-Object** | "take into account", "focus on" | Action patterns |
| **Phrasal Verbs** | "point out", "carry out" | Idiomatic expressions |
| **Verb-Object** | "make sense", "take action" | Common constructions |
| **Adjective-Noun** | "serious problem", "economic growth" | Descriptive patterns |
| **Noun-Noun Compounds** | "market share", "health care system" | Domain terminology |

## 🧮 How It Works

### 1. Transcript Sanitization
Removes noise while preserving linguistic content:
- Timestamps (00:01:23)
- Stage directions ([applause], [music])
- HTML tags
- Normalizes punctuation and whitespace

### 2. NLP Processing
Uses spaCy to analyze:
- **Tokenization**: Break text into words
- **POS Tagging**: Identify parts of speech
- **Lemmatization**: Normalize word forms (giving → give)
- **Dependency Parsing**: Understand grammatical structure

### 3. Pattern Extraction
Automatically discovers patterns using:
- **Frequency counting**: Identifies recurring constructions
- **Normalization**: Replaces variables with placeholders
  - "give him praise" → "give SB praise"
  - "gave them 5 dollars" → "give SB NUM dollars"

### 4. Pattern Ranking
Two scoring approaches:

**Signature Phrases** (person-specific):
```
distinctiveness = (freq_person + 1) / (freq_background + 1)
score = distinctiveness * log(freq_person)
```

**Learning Phrases** (reusable patterns):
- Uses collocation scoring (PMI or t-score)
- Filters for high association and content words

### 5. Storage
Stores top 1000 patterns per speaker in three categories:
1. Vocabulary (most used words)
2. Signature phrases (unique to speaker)
3. Learning phrases (transferable patterns)

## 📊 Data Requirements

For reliable results, you need:
- **10-30 speeches** per speaker
- **50k-150k words** total corpus
- **Single-speaker transcripts** (preferred)

## 🎓 Why This Approach Works

> "Language style is revealed through repeated grammatical constructions."

Traditional approaches extract quotes or manually curate idioms. This system:

✅ **Discovers** patterns automatically
✅ **Teaches** communication skills, not memorization
✅ **Identifies** how speakers construct arguments
✅ **Captures** person-specific style

## 🚀 Example Use Case

**Input**: 20 speeches from a business leader (100k words)

**Output**:
```yaml
Vocabulary:
  - growth, challenge, opportunity, team, strategy...

Signature Phrases:
  - "what I find interesting is"
  - "let me be clear about"
  - "the way I think about"

Learning Patterns:
  - "take [something] into account"
  - "focus on [aspect]"
  - "weigh on SB mind"
```

**Result**: Flashcards that teach how this person communicates, not just their vocabulary.

## 📁 Related Documentation

- `DECK_STUDY_MODE_WEB_DOCUMENTATION_BACKUP.md` - Study mode implementation
- `COMMONPLACE.md` - Additional context (if applicable)

## 🔧 Technical Stack

- **NLP**: spaCy English model
- **Storage**: Google Cloud Storage (transcripts) + Firestore (metadata/results)
- **Language**: Python (processing pipeline)
- **Scoring**: PMI, t-score, custom distinctiveness metrics

## 📝 Notes

- This is NOT a quote extraction system
- This is NOT manual idiom detection
- This IS automatic communication pattern discovery
- Results improve with corpus size and speaker consistency

---

**Last Updated**: 2026-02-08
**Version**: 1.0
**Status**: Technical Design
