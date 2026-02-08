# Speech Pattern Extraction Pipeline - Implementation Guide

> Complete step-by-step guide to deploy the Deckbase speech analysis system from scratch

## 📋 Overview

This guide walks you through implementing a production-ready pipeline that analyzes speeches and extracts:
- **Top 1000 vocabulary** (lemmatized words)
- **Top 1000 phrases** (2-5 word expressions)
- **Pattern phrases** (grammatical constructions)
- **Signature phrases** (optional: speaker-specific catchphrases)

**Time Estimate**: 2-3 days for MVP
**Tech Stack**: Python, spaCy, Cloud Run, Firestore, Cloud Storage

---

## 🎯 Step 0: Define MVP Scope

### ✅ Ship First (MVP)
- [x] Ingest transcript text files into Cloud Storage
- [x] Store per-document metadata in Firestore
- [x] Deploy analyzer service on Cloud Run
- [x] Write top 1000 results to Firestore
- [x] Basic UI integration

### ⏭️ Ship Later (V2)
- [ ] Background corpus scoring (signature phrases)
- [ ] Search/indexing (Typesense/Algolia)
- [ ] Audio diarization pipeline
- [ ] Real-time processing

---

## 🏗️ Step 1: Firebase + GCP Setup

### 1.1 Create Storage Bucket

```bash
# Create bucket
gsutil mb gs://deckbase-transcripts

# Set lifecycle rules (optional)
gsutil lifecycle set lifecycle.json gs://deckbase-transcripts
```

**Folder Convention**:
```
gs://deckbase-transcripts/
  └── {personId}/
      ├── {docId1}.txt
      ├── {docId2}.txt
      └── ...
```

### 1.2 Firestore Schema

#### Collection: `people/{personId}`
```typescript
interface Person {
  displayName: string;
  status: 'active' | 'disabled';
  createdAt: Timestamp;
}
```

#### Subcollection: `people/{personId}/docs/{docId}`
```typescript
interface Document {
  title: string;
  sourceType: 'youtube' | 'pdf' | 'manual';
  sourceUrl?: string;
  storagePath: string;  // gs://deckbase-transcripts/...
  tokenCount: number;
  docDate: Timestamp | string;
  status: 'queued' | 'processing' | 'done' | 'failed';
  error?: string;
}
```

#### Analysis Results: `people/{personId}/analysis/v1`
```typescript
interface Analysis {
  vocabulary: VocabItem[];        // max 1000
  learningPhrases: Phrase[];      // max 1000
  patternPhrases: Pattern[];      // max 1000
  signaturePhrases?: Phrase[];    // max 500 (optional)
  corpusStats: CorpusStats;
  progress: Progress;
}

interface VocabItem {
  t: string;    // term (lemma)
  c: number;    // count
  p10k: number; // per 10k tokens
}

interface Phrase {
  t: string;   // text
  n: number;   // normalized form
  c: number;   // count
  df: number;  // document frequency
  s: number;   // score
}

interface Pattern {
  t: string;   // text
  kind: string; // VPO|phrasal|VO|adjn|nn
  c: number;   // count
  df: number;  // document frequency
}

interface CorpusStats {
  docCount: number;
  tokenCount: number;
  updatedAt: Timestamp;
  methodVersion: string;
}

interface Progress {
  processedDocs: number;
  totalDocs: number;
  percent: number;
  updatedAt: Timestamp;
  status: 'idle' | 'processing' | 'done' | 'failed';
}
```

**Firestore Indexes** (create if needed):
```bash
# Create composite index for queries
firebase firestore:indexes
```

---

## 🚀 Step 2: Deploy Cloud Run Service

### 2.1 Project Structure
```
speech-analyzer/
├── Dockerfile
├── requirements.txt
├── main.py
├── analyzer/
│   ├── __init__.py
│   ├── sanitizer.py
│   ├── nlp_processor.py
│   ├── extractors.py
│   └── storage.py
└── tests/
    └── test_analyzer.py
```

### 2.2 Requirements (`requirements.txt`)
```txt
spacy==3.7.2
google-cloud-storage==2.10.0
google-cloud-firestore==2.13.0
flask==3.0.0
gunicorn==21.2.0
```

### 2.3 Dockerfile
```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Download spaCy model
RUN python -m spacy download en_core_web_sm

# Copy application
COPY . .

# Set environment
ENV PORT=8080
ENV PYTHONUNBUFFERED=1

# Run application
CMD exec gunicorn --bind :$PORT --workers 1 --threads 4 --timeout 600 main:app
```

### 2.4 Deploy
```bash
# Build and deploy
gcloud run deploy speech-analyzer \
  --source . \
  --platform managed \
  --region us-central1 \
  --memory 4Gi \
  --timeout 600 \
  --concurrency 4 \
  --no-allow-unauthenticated
```

**Resource Settings**:
- **Memory**: 2-4 GB (spaCy models need RAM)
- **Timeout**: 600s (10 min for large corpora)
- **Concurrency**: 1-4 (low for stability)

---

## 🔌 Step 3: Define Job Trigger

### Option A: HTTP Trigger (MVP - Simplest)
```python
# main.py
from flask import Flask, request, jsonify
from analyzer import process_person

app = Flask(__name__)

@app.route('/analyze', methods=['POST'])
def analyze():
    person_id = request.args.get('personId')

    if not person_id:
        return jsonify({'error': 'personId required'}), 400

    # Process asynchronously
    process_person(person_id)

    return jsonify({'status': 'started', 'personId': person_id}), 202
```

**Usage**:
```bash
curl -X POST "https://speech-analyzer-xxx.run.app/analyze?personId=joe-biden" \
  -H "Authorization: Bearer $(gcloud auth print-identity-token)"
```

### Option B: Cloud Tasks (Recommended for Production)
```python
from google.cloud import tasks_v2

def enqueue_analysis(person_id: str):
    client = tasks_v2.CloudTasksClient()
    parent = client.queue_path('project-id', 'us-central1', 'analysis-queue')

    task = {
        'http_request': {
            'http_method': tasks_v2.HttpMethod.POST,
            'url': 'https://speech-analyzer-xxx.run.app/analyze',
            'oidc_token': {
                'service_account_email': 'invoker@project.iam.gserviceaccount.com'
            },
            'body': json.dumps({'personId': person_id}).encode()
        }
    }

    client.create_task(request={'parent': parent, 'task': task})
```

---

## 🧹 Step 4: Transcript Sanitization

### Implementation (`analyzer/sanitizer.py`)
```python
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
    text = raw

    # Remove timestamps
    text = re.sub(r'\[?\d{1,2}:\d{2}(?::\d{2})?\]?', '', text)

    # Remove stage directions
    text = re.sub(r'\[[^\]]+\]', '', text)  # [applause]
    text = re.sub(r'\([^)]+\)', '', text)    # (laughter)
    text = re.sub(r'<[^>]+>', '', text)      # <inaudible>

    # Remove HTML tags
    text = re.sub(r'<[^>]+>', '', text)

    # Collapse whitespace
    text = re.sub(r'\s+', ' ', text)
    text = text.strip()

    return text
```

**Test Cases**:
```python
def test_sanitize_timestamps():
    assert sanitize_text("Hello [00:01:23] world") == "Hello world"
    assert sanitize_text("Hi 1:23 there") == "Hi there"

def test_sanitize_stage_directions():
    assert sanitize_text("Wow [applause] amazing") == "Wow amazing"
    assert sanitize_text("So (laughter) funny") == "So funny"
```

---

## 🧠 Step 5: NLP Preprocessing

### Implementation (`analyzer/nlp_processor.py`)
```python
import spacy
from typing import List

nlp = spacy.load("en_core_web_sm")

IGNORE_POS = {'PUNCT', 'SPACE', 'DET', 'AUX'}
STOPWORDS = nlp.Defaults.stop_words

def norm_token(token) -> str:
    """
    Normalize token to reduce variation.

    Rules:
    - Pronouns → SB
    - Proper nouns → SB (optional)
    - Numbers → NUM
    - Others → lowercase lemma
    """
    if token.pos_ == 'PRON':
        return 'SB'

    # Optional: normalize proper nouns
    if token.pos_ == 'PROPN':
        return 'SB'

    # Normalize numbers
    if token.like_num or token.pos_ == 'NUM':
        return 'NUM'

    return token.lemma_.lower()

def process_document(text: str) -> List[dict]:
    """
    Process document and return normalized tokens with metadata.
    """
    doc = nlp(text)

    tokens = []
    for token in doc:
        # Skip punctuation, space, etc.
        if token.pos_ in IGNORE_POS:
            continue

        tokens.append({
            'text': token.text,
            'lemma': token.lemma_.lower(),
            'norm': norm_token(token),
            'pos': token.pos_,
            'dep': token.dep_,
            'head': token.head,
            'is_stop': token.is_stop
        })

    return tokens
```

**Memory Optimization**:
```python
# For large corpora, process in batches
def process_in_batches(text: str, batch_size: int = 100000):
    """Process text in chunks to avoid memory issues."""
    for i in range(0, len(text), batch_size):
        chunk = text[i:i + batch_size]
        doc = nlp(chunk)
        yield from doc
```

---

## 📊 Step 6: Extractors

### 6.1 Vocabulary Extractor (`analyzer/extractors.py`)

```python
from collections import Counter
from typing import List, Dict

CONTENT_POS = {'NOUN', 'VERB', 'ADJ', 'ADV'}

def extract_vocabulary(tokens: List[dict]) -> List[Dict]:
    """
    Extract top vocabulary with frequency stats.

    Returns: List of {term, count, per10k}
    """
    # Count lemmas for content words
    counter = Counter()
    total_tokens = 0

    for token in tokens:
        if token['pos'] in CONTENT_POS and not token['is_stop']:
            counter[token['lemma']] += 1
        total_tokens += 1

    # Calculate per-10k rate
    vocab = []
    for lemma, count in counter.most_common(1000):
        vocab.append({
            't': lemma,
            'c': count,
            'p10k': round((count / total_tokens) * 10000, 2)
        })

    return vocab
```

### 6.2 N-gram Phrase Extractor

```python
from collections import defaultdict

def generate_ngrams(tokens: List[dict], n: int, doc_id: str):
    """Generate n-grams from normalized tokens."""
    ngrams = []

    for i in range(len(tokens) - n + 1):
        ngram = tokens[i:i+n]

        # Skip if contains too many stopwords
        stop_count = sum(1 for t in ngram if t['is_stop'])
        if stop_count / n > 0.6:
            continue

        # Must contain at least 1 content word
        has_content = any(t['pos'] in CONTENT_POS for t in ngram)
        if not has_content:
            continue

        phrase = ' '.join(t['norm'] for t in ngram)
        ngrams.append((phrase, doc_id))

    return ngrams

def extract_learning_phrases(all_tokens: Dict[str, List[dict]]) -> List[Dict]:
    """
    Extract learning phrases across all documents.

    Args:
        all_tokens: {doc_id: tokens}

    Returns: Top 1000 phrases by score
    """
    phrase_count = Counter()
    phrase_docs = defaultdict(set)

    # Generate n-grams for n=2..5
    for doc_id, tokens in all_tokens.items():
        for n in range(2, 6):
            ngrams = generate_ngrams(tokens, n, doc_id)

            for phrase, doc in ngrams:
                phrase_count[phrase] += 1
                phrase_docs[phrase].add(doc)

    # Filter and score
    phrases = []
    for phrase, count in phrase_count.items():
        doc_freq = len(phrase_docs[phrase])

        # Filters
        if count < 5:
            continue
        if doc_freq < 2:
            continue

        # Score: count * log(1 + doc_freq)
        import math
        score = count * math.log(1 + doc_freq)

        phrases.append({
            't': phrase,
            'n': phrase,  # normalized form
            'c': count,
            'df': doc_freq,
            's': round(score, 2)
        })

    # Sort by score and return top 1000
    phrases.sort(key=lambda x: x['s'], reverse=True)
    return phrases[:1000]
```

### 6.3 Pattern Phrase Extractor

```python
def extract_pattern_phrases(doc) -> List[Dict]:
    """
    Extract dependency-based patterns from spaCy doc.

    Patterns:
    - VPO: Verb-Preposition-Object
    - Phrasal: Phrasal verbs
    - VO: Verb-Object
    - AdjN: Adjective-Noun
    - NN: Noun-Noun compounds
    """
    patterns = []

    for token in doc:
        # A) Verb-Preposition-Object (VPO)
        if token.pos_ == 'VERB':
            for child in token.children:
                if child.dep_ == 'prep':
                    for grandchild in child.children:
                        if grandchild.dep_ == 'pobj':
                            pattern = f"{token.lemma_} {child.lemma_} {norm_token(grandchild)}"
                            patterns.append({
                                't': pattern,
                                'kind': 'VPO'
                            })

        # B) Phrasal verbs
        if token.pos_ == 'VERB':
            for child in token.children:
                if child.dep_ == 'prt':
                    pattern = f"{token.lemma_} {child.lemma_}"
                    patterns.append({
                        't': pattern,
                        'kind': 'phrasal'
                    })

        # C) Verb-Object
        if token.pos_ == 'VERB':
            for child in token.children:
                if child.dep_ == 'dobj':
                    pattern = f"{token.lemma_} {child.lemma_}"
                    patterns.append({
                        't': pattern,
                        'kind': 'VO'
                    })

        # D) Adjective-Noun
        if token.pos_ == 'NOUN':
            for child in token.children:
                if child.dep_ == 'amod' and child.pos_ == 'ADJ':
                    pattern = f"{child.lemma_} {token.lemma_}"
                    patterns.append({
                        't': pattern,
                        'kind': 'adjn'
                    })

        # E) Noun compounds
        if token.pos_ == 'NOUN':
            for child in token.children:
                if child.dep_ == 'compound' and child.pos_ == 'NOUN':
                    pattern = f"{child.lemma_} {token.lemma_}"
                    patterns.append({
                        't': pattern,
                        'kind': 'nn'
                    })

    return patterns

def aggregate_patterns(all_patterns: Dict[str, List[dict]]) -> List[Dict]:
    """Aggregate and rank pattern phrases."""
    pattern_count = Counter()
    pattern_docs = defaultdict(set)
    pattern_kind = {}

    for doc_id, patterns in all_patterns.items():
        for pattern in patterns:
            key = pattern['t']
            pattern_count[key] += 1
            pattern_docs[key].add(doc_id)
            pattern_kind[key] = pattern['kind']

    # Build output
    results = []
    for pattern, count in pattern_count.most_common(1000):
        results.append({
            't': pattern,
            'kind': pattern_kind[pattern],
            'c': count,
            'df': len(pattern_docs[pattern])
        })

    return results
```

---

## 📈 Step 7: Progressive Processing

### Implementation (`analyzer/processor.py`)

```python
from google.cloud import firestore, storage
import logging

def process_person(person_id: str):
    """
    Process all documents for a person progressively.
    """
    db = firestore.Client()
    storage_client = storage.Client()

    # Get all documents
    docs_ref = db.collection('people').document(person_id).collection('docs')
    docs = list(docs_ref.where('status', '==', 'done').stream())

    total_docs = len(docs)
    if total_docs == 0:
        logging.warning(f"No documents found for {person_id}")
        return

    # Initialize progress
    analysis_ref = db.collection('people').document(person_id).collection('analysis').document('v1')
    analysis_ref.set({
        'progress': {
            'processedDocs': 0,
            'totalDocs': total_docs,
            'percent': 0,
            'updatedAt': firestore.SERVER_TIMESTAMP,
            'status': 'processing'
        }
    }, merge=True)

    # Initialize counters
    all_tokens = {}
    all_patterns = {}

    try:
        # Process each document
        for idx, doc in enumerate(docs, 1):
            doc_data = doc.to_dict()

            # Download transcript
            bucket_name, blob_path = parse_gs_url(doc_data['storagePath'])
            bucket = storage_client.bucket(bucket_name)
            blob = bucket.blob(blob_path)
            raw_text = blob.download_as_text()

            # Sanitize and process
            clean_text = sanitize_text(raw_text)
            spacy_doc = nlp(clean_text)

            # Extract features
            tokens = process_document(clean_text)
            patterns = extract_pattern_phrases(spacy_doc)

            all_tokens[doc.id] = tokens
            all_patterns[doc.id] = patterns

            # Update progress every 10 docs
            if idx % 10 == 0 or idx == total_docs:
                progress_percent = round((idx / total_docs) * 100, 1)
                analysis_ref.update({
                    'progress.processedDocs': idx,
                    'progress.percent': progress_percent,
                    'progress.updatedAt': firestore.SERVER_TIMESTAMP
                })
                logging.info(f"Processed {idx}/{total_docs} docs ({progress_percent}%)")

        # Generate final results
        vocabulary = extract_vocabulary([t for tokens in all_tokens.values() for t in tokens])
        learning_phrases = extract_learning_phrases(all_tokens)
        pattern_phrases = aggregate_patterns(all_patterns)

        # Calculate corpus stats
        total_tokens = sum(len(tokens) for tokens in all_tokens.values())

        # Write final results
        analysis_ref.set({
            'vocabulary': vocabulary,
            'learningPhrases': learning_phrases,
            'patternPhrases': pattern_phrases,
            'corpusStats': {
                'docCount': total_docs,
                'tokenCount': total_tokens,
                'updatedAt': firestore.SERVER_TIMESTAMP,
                'methodVersion': '1.0'
            },
            'progress': {
                'processedDocs': total_docs,
                'totalDocs': total_docs,
                'percent': 100,
                'updatedAt': firestore.SERVER_TIMESTAMP,
                'status': 'done'
            }
        }, merge=True)

        logging.info(f"✅ Analysis complete for {person_id}")

    except Exception as e:
        logging.error(f"❌ Analysis failed for {person_id}: {e}")
        analysis_ref.update({
            'progress.status': 'failed',
            'progress.error': str(e),
            'progress.updatedAt': firestore.SERVER_TIMESTAMP
        })
        raise

def parse_gs_url(gs_path: str) -> tuple:
    """Parse gs://bucket/path into (bucket, path)."""
    parts = gs_path.replace('gs://', '').split('/', 1)
    return parts[0], parts[1]
```

---

## 💾 Step 8: Write Results to Firestore

### Schema Validation
```python
def validate_results(analysis: dict) -> bool:
    """Ensure results meet size constraints."""

    # Check array sizes
    if len(analysis.get('vocabulary', [])) > 1000:
        raise ValueError("vocabulary exceeds 1000 items")

    if len(analysis.get('learningPhrases', [])) > 1000:
        raise ValueError("learningPhrases exceeds 1000 items")

    if len(analysis.get('patternPhrases', [])) > 1000:
        raise ValueError("patternPhrases exceeds 1000 items")

    # Estimate document size (Firestore limit: 1MB)
    import sys
    size_bytes = sys.getsizeof(str(analysis))
    if size_bytes > 900_000:  # Leave 100KB buffer
        raise ValueError(f"Document too large: {size_bytes} bytes")

    return True
```

### Atomic Writes
```python
from google.cloud import firestore

def write_results_atomic(person_id: str, results: dict):
    """Write results atomically with transaction."""
    db = firestore.Client()
    analysis_ref = db.collection('people').document(person_id).collection('analysis').document('v1')

    @firestore.transactional
    def update_in_transaction(transaction):
        validate_results(results)
        transaction.set(analysis_ref, results, merge=True)

    transaction = db.transaction()
    update_in_transaction(transaction)
```

---

## 🎯 Step 9: Signature Phrases (Optional)

### Background Corpus Scoring

```python
import math

def compute_signature_phrases(
    person_phrases: Counter,
    background_phrases: Counter,
    top_n: int = 500
) -> List[Dict]:
    """
    Identify person-specific catchphrases via contrast scoring.

    Score = distinctiveness * log(freq_person)
    where distinctiveness = (freq_person + 1) / (freq_background + 1)
    """
    signature_scores = []

    for phrase, person_freq in person_phrases.items():
        bg_freq = background_phrases.get(phrase, 0)

        # Distinctiveness: how unique is this to the person?
        distinctiveness = (person_freq + 1) / (bg_freq + 1)

        # Signature score
        score = distinctiveness * math.log(1 + person_freq)

        signature_scores.append({
            't': phrase,
            'c': person_freq,
            'bg': bg_freq,
            'dist': round(distinctiveness, 2),
            's': round(score, 2)
        })

    # Sort by score and return top N
    signature_scores.sort(key=lambda x: x['s'], reverse=True)
    return signature_scores[:top_n]
```

### Building Background Corpus
```python
def build_background_corpus(exclude_person_id: str) -> Counter:
    """
    Aggregate phrase frequencies from all other speakers.
    """
    db = firestore.Client()
    people = db.collection('people').where('status', '==', 'active').stream()

    background = Counter()

    for person in people:
        if person.id == exclude_person_id:
            continue

        # Load their analysis
        analysis_ref = person.reference.collection('analysis').document('v1')
        analysis = analysis_ref.get()

        if analysis.exists:
            data = analysis.to_dict()
            for phrase in data.get('learningPhrases', []):
                background[phrase['t']] += phrase['c']

    return background
```

---

## 🎨 Step 10: UI Integration

### Frontend Component (React)

```typescript
// components/SpeechAnalysis.tsx
import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface AnalysisData {
  vocabulary: Array<{ t: string; c: number; p10k: number }>;
  learningPhrases: Array<{ t: string; c: number; df: number; s: number }>;
  patternPhrases: Array<{ t: string; kind: string; c: number; df: number }>;
  progress: {
    status: string;
    percent: number;
    processedDocs: number;
    totalDocs: number;
  };
}

export default function SpeechAnalysis({ personId }: { personId: string }) {
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalysis = async () => {
      const docRef = doc(db, 'people', personId, 'analysis', 'v1');
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        setAnalysis(docSnap.data() as AnalysisData);
      }
      setLoading(false);
    };

    fetchAnalysis();
  }, [personId]);

  if (loading) return <div>Loading analysis...</div>;
  if (!analysis) return <div>No analysis available</div>;

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="bg-gray-100 p-4 rounded-lg">
        <h3 className="font-semibold mb-2">Analysis Progress</h3>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div
            className="bg-blue-600 h-2.5 rounded-full"
            style={{ width: `${analysis.progress.percent}%` }}
          />
        </div>
        <p className="text-sm mt-2">
          {analysis.progress.processedDocs} / {analysis.progress.totalDocs} documents
        </p>
      </div>

      {/* Vocabulary */}
      <section>
        <h3 className="text-xl font-bold mb-4">Top Vocabulary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {analysis.vocabulary.slice(0, 20).map((item, idx) => (
            <VocabCard key={idx} item={item} onAddToDeck={() => addToDeck(item)} />
          ))}
        </div>
      </section>

      {/* Learning Phrases */}
      <section>
        <h3 className="text-xl font-bold mb-4">Learning Phrases</h3>
        <div className="space-y-2">
          {analysis.learningPhrases.slice(0, 20).map((phrase, idx) => (
            <PhraseCard key={idx} phrase={phrase} onAddToDeck={() => addToDeck(phrase)} />
          ))}
        </div>
      </section>

      {/* Pattern Phrases */}
      <section>
        <h3 className="text-xl font-bold mb-4">Pattern Phrases</h3>
        <PatternPhraseList patterns={analysis.patternPhrases} />
      </section>
    </div>
  );
}
```

### Add to Deck Action
```typescript
// actions/addToDeck.ts
import { collection, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface FlashcardData {
  personId: string;
  type: 'vocab' | 'phrase' | 'pattern';
  term: string;
  context?: string;
}

export async function addToDeck(
  deckId: string,
  data: FlashcardData
): Promise<void> {
  const cardsRef = collection(db, 'decks', deckId, 'cards');

  await addDoc(cardsRef, {
    front: data.term,
    back: '', // To be filled by user
    tags: [data.type, data.personId],
    sourceType: 'speech-analysis',
    sourceData: data,
    createdAt: new Date(),
    studyData: {
      easeFactor: 2.5,
      interval: 0,
      repetitions: 0,
      lastReview: null
    }
  });
}
```

---

## 🛡️ Step 11: Quality Controls

### Corpus Quality Checks
```python
def validate_corpus(person_id: str, docs: list) -> dict:
    """
    Validate corpus quality before processing.
    """
    errors = []
    warnings = []

    # Check minimum docs
    if len(docs) < 3:
        warnings.append(f"Only {len(docs)} documents. Need 10-30 for reliable results.")

    # Check token count
    total_tokens = sum(doc.get('tokenCount', 0) for doc in docs)
    if total_tokens < 20_000:
        errors.append(f"Corpus too small: {total_tokens} tokens. Need 50k-150k.")
    elif total_tokens < 50_000:
        warnings.append(f"Corpus small: {total_tokens} tokens. Results may be noisy.")

    # Check source consistency
    source_types = set(doc.get('sourceType') for doc in docs)
    if len(source_types) > 2:
        warnings.append("Mixed source types detected. Results may be inconsistent.")

    return {
        'valid': len(errors) == 0,
        'errors': errors,
        'warnings': warnings,
        'stats': {
            'docCount': len(docs),
            'tokenCount': total_tokens,
            'sourceTypes': list(source_types)
        }
    }
```

### Filter Lists
```python
# Extended stopwords for phrases
STOP_PHRASES = {
    'of the', 'in the', 'to the', 'for the',
    'on the', 'at the', 'by the', 'from the',
    'this is', 'that is', 'it is', 'there is',
    'i think', 'you know', 'i mean', 'sort of'
}

# Stop adjectives (too generic)
STOP_ADJECTIVES = {
    'many', 'several', 'other', 'different', 'various',
    'certain', 'such', 'same', 'own', 'more', 'most',
    'some', 'any', 'each', 'every', 'all'
}

def is_valuable_phrase(phrase: str) -> bool:
    """Filter out low-value phrases."""
    phrase_lower = phrase.lower()

    # Check stop phrases
    if phrase_lower in STOP_PHRASES:
        return False

    # Check if starts/ends with stop word
    words = phrase_lower.split()
    if len(words) > 1:
        if words[0] in {'the', 'a', 'an', 'to', 'of', 'in'}:
            return False
        if words[-1] in {'the', 'a', 'an', 'to', 'of', 'in'}:
            return False

    return True
```

---

## ✅ Step 12: Testing Checklist

### Unit Tests
```python
# tests/test_sanitizer.py
def test_remove_timestamps():
    assert sanitize_text("Hello [00:01:23] world") == "Hello world"
    assert sanitize_text("Hi 1:23 there") == "Hi there"
    assert sanitize_text("Test 00:12:34 text") == "Test text"

def test_remove_stage_directions():
    assert sanitize_text("Wow [applause] amazing") == "Wow amazing"
    assert sanitize_text("So (laughter) funny") == "So funny"
    assert sanitize_text("Great <inaudible> job") == "Great job"

def test_preserve_punctuation():
    text = "Hello. How are you? I'm fine!"
    clean = sanitize_text(text)
    assert "." in clean and "?" in clean and "!" in clean
```

```python
# tests/test_nlp.py
def test_lemmatization():
    tokens = process_document("I am giving them something")
    lemmas = [t['lemma'] for t in tokens]
    assert 'give' in lemmas  # giving → give
    assert 'be' in lemmas    # am → be

def test_pronoun_normalization():
    tokens = process_document("Give him the book. Give her the pen.")
    norms = [t['norm'] for t in tokens]
    assert norms.count('SB') == 2  # him, her → SB

def test_number_normalization():
    tokens = process_document("I have 5 dollars and 10 cents")
    norms = [t['norm'] for t in tokens]
    assert norms.count('NUM') == 2  # 5, 10 → NUM
```

```python
# tests/test_extractors.py
def test_vpo_extraction():
    text = "We take into account the context"
    doc = nlp(text)
    patterns = extract_pattern_phrases(doc)
    assert any(p['t'] == 'take into account' for p in patterns)

def test_phrasal_verb_extraction():
    text = "Let me point out the issue"
    doc = nlp(text)
    patterns = extract_pattern_phrases(doc)
    assert any(p['t'] == 'point out' and p['kind'] == 'phrasal' for p in patterns)

def test_adjnoun_extraction():
    text = "This is a serious problem"
    doc = nlp(text)
    patterns = extract_pattern_phrases(doc)
    assert any(p['t'] == 'serious problem' and p['kind'] == 'adjn' for p in patterns)
```

### Integration Test
```python
# tests/test_integration.py
def test_end_to_end_analysis():
    """Golden test with known transcript."""

    # Load sample transcript
    with open('tests/fixtures/sample_speech.txt') as f:
        raw_text = f.read()

    # Process
    clean = sanitize_text(raw_text)
    doc = nlp(clean)
    tokens = process_document(clean)
    patterns = extract_pattern_phrases(doc)

    # Verify expected patterns appear
    pattern_texts = [p['t'] for p in patterns]

    assert 'take into account' in pattern_texts
    assert 'economic growth' in pattern_texts
    assert 'point out' in pattern_texts

    # Verify vocabulary
    vocab = extract_vocabulary(tokens)
    vocab_terms = [v['t'] for v in vocab]

    assert 'economy' in vocab_terms[:100]  # Should be in top 100
```

### Performance Test
```python
# tests/test_performance.py
import time

def test_processing_speed():
    """Ensure processing meets performance targets."""

    # Load large corpus (100k words)
    with open('tests/fixtures/large_corpus.txt') as f:
        text = f.read()

    start = time.time()

    # Process
    clean = sanitize_text(text)
    doc = nlp(clean)
    tokens = process_document(clean)

    elapsed = time.time() - start

    # Should process 100k words in under 60 seconds
    assert elapsed < 60, f"Processing too slow: {elapsed}s for 100k words"
```

---

## 📊 Tunable Thresholds

### Configuration File (`config.py`)
```python
# Pattern extraction thresholds
MIN_COUNT = 5              # Minimum frequency for phrase
MIN_DOC_FREQ = 2           # Must appear in at least N docs
MAX_PHRASE_LENGTH = 5      # Max tokens in n-gram
STOPWORD_RATIO_MAX = 0.6   # Max proportion of stopwords

# Result limits
TOP_VOCAB = 1000
TOP_LEARNING_PHRASES = 1000
TOP_PATTERN_PHRASES = 1000
TOP_SIGNATURE_PHRASES = 500

# Processing
CHECKPOINT_INTERVAL = 10   # Write progress every N docs
BATCH_SIZE = 100_000       # Characters per spaCy batch

# Quality controls
MIN_CORPUS_TOKENS = 20_000
RECOMMENDED_DOCS = 10
RECOMMENDED_TOKENS = 50_000
```

---

## 📦 Deliverables Summary

### 1. Cloud Run Service
- [x] `speech-analyzer` deployed to Cloud Run
- [x] Dockerfile with spaCy model
- [x] `/analyze` endpoint

### 2. Firestore Schema
- [x] `people/{personId}` collection
- [x] `people/{personId}/docs/{docId}` subcollection
- [x] `people/{personId}/analysis/v1` document
- [x] Composite indexes (if needed)

### 3. Storage Bucket
- [x] `gs://deckbase-transcripts` bucket
- [x] Folder structure: `{personId}/{docId}.txt`

### 4. Processing Pipeline
- [x] Transcript sanitization
- [x] NLP preprocessing (spaCy)
- [x] Vocabulary extraction
- [x] N-gram phrase extraction
- [x] Pattern phrase extraction
- [x] Progressive processing with checkpoints

### 5. UI Integration
- [x] Analysis display component
- [x] Add to deck action
- [x] Progress tracking

### 6. Testing
- [x] Unit tests for sanitization
- [x] Unit tests for NLP
- [x] Unit tests for extractors
- [x] Integration test (golden transcript)
- [x] Performance test

---

## 🚀 Deployment Checklist

```bash
# 1. Set up GCP project
gcloud config set project deckbase-production

# 2. Enable APIs
gcloud services enable run.googleapis.com
gcloud services enable storage.googleapis.com
gcloud services enable firestore.googleapis.com

# 3. Create storage bucket
gsutil mb gs://deckbase-transcripts

# 4. Deploy Cloud Run service
cd speech-analyzer
gcloud run deploy speech-analyzer \
  --source . \
  --platform managed \
  --region us-central1 \
  --memory 4Gi \
  --timeout 600

# 5. Set up Firestore indexes (if needed)
firebase deploy --only firestore:indexes

# 6. Upload test transcripts
gsutil cp sample-speeches/*.txt gs://deckbase-transcripts/test-person/

# 7. Trigger test analysis
curl -X POST "https://speech-analyzer-xxx.run.app/analyze?personId=test-person" \
  -H "Authorization: Bearer $(gcloud auth print-identity-token)"

# 8. Verify results
# Check Firestore console for people/test-person/analysis/v1
```

---

## 📚 Related Documentation

- [Technical Design](./SPEECH_PATTERN_ANALYSIS_README.md) - Architecture overview
- [Study Mode Docs](./DECK_STUDY_MODE_WEB_DOCUMENTATION_BACKUP.md) - Flashcard system
- [Firestore Security Rules](./firestore.rules) - Access control

---

## 🆘 Troubleshooting

### Issue: Memory errors in Cloud Run
**Solution**: Increase memory allocation to 4GB or enable batching:
```python
nlp.max_length = 2_000_000  # Increase spaCy limit
```

### Issue: Firestore document too large (>1MB)
**Solution**: Use shorter field names and limit array sizes:
```python
# Use abbreviations: t=term, c=count, df=docFreq
# Trim arrays to exactly 1000 items
```

### Issue: Processing timeout
**Solution**: Increase Cloud Run timeout and use checkpoints:
```bash
--timeout 900  # 15 minutes
```

### Issue: Poor quality results
**Solution**: Check corpus quality:
```python
result = validate_corpus(person_id, docs)
if not result['valid']:
    print(result['errors'])
```

---

**Version**: 1.0
**Last Updated**: 2026-02-08
**Estimated Implementation Time**: 2-3 days
**Maintainer**: Deckbase Engineering
