# SEO Action Plan — deckbase.co
**Generated:** 2026-03-11
**Overall SEO Health Score:** 47 / 100

---

## 🔴 CRITICAL — Fix Immediately (Blocks rankings or risks penalty)

### C1. Remove False AggregateRating Schema
**Impact:** Prevents Google manual penalty on rich results
**Effort:** 30 minutes
**File:** Marketing site templates (Next.js)

Every page claims `4.8/5 from 500 reviews` in structured data, but the product is "Coming Soon." Google issues manual actions for misleading schema. Remove the `aggregateRating` block from all pages until you have real, verifiable App Store/Play Store ratings.

```json
// DELETE this block from SoftwareApplication schema on all pages:
"aggregateRating": {
  "@type": "AggregateRating",
  "ratingValue": "4.8",
  "reviewCount": "500"
}
// Re-add only once the app is live with real ratings, linking to App Store listing
```

---

### C2. Fix www vs non-www Canonical Consistency
**Impact:** Prevents duplicate content, consolidates link equity
**Effort:** 1–2 hours

Every canonical and sitemap URL uses `deckbase.co` (non-www) but the site serves on `www.deckbase.co`. Choose one and enforce it everywhere.

**Option A — Prefer www:**
- Update all `<link rel="canonical">` to `https://www.deckbase.co/...`
- Update `sitemap.xml` to use `https://www.deckbase.co/...`
- Update robots.txt sitemap declaration
- Confirm 301 redirect: `deckbase.co → www.deckbase.co`

**Option B — Prefer non-www (canonicals already correct):**
- Confirm 301 redirect: `www.deckbase.co → deckbase.co`
- Verify the redirect is active and returning HTTP 301

---

### C3. Guard RevenueCat Initialization with `kIsWeb`
**Impact:** Prevents potential Flutter web startup hang
**Effort:** 5 minutes
**File:** `lib/main.dart`

```dart
// BEFORE (line ~40 in main()):
await _configurePurchaseSDK();

// AFTER:
if (!kIsWeb) {
  await _configurePurchaseSDK();
}
```

Also guard `initCustomerInfo()` and any other RevenueCat calls with `if (!kIsWeb)`. The `pubspec.yaml` itself notes `purchases_flutter` as `#WEB NOT SUPPORTED`.

---

### C4. Subset or Remove NotoColorEmoji.ttf (10MB → <200KB)
**Impact:** Removes 10MB from web payload — single biggest performance fix
**Effort:** 1 hour
**File:** `assets/fonts/NotoColorEmoji.ttf` + `pubspec.yaml`

```bash
# Option A: Subset to only emoji used in the app
pip install fonttools
# Identify your emoji codepoints, then:
pyftsubset NotoColorEmoji.ttf --unicodes="U+1F4DA,U+2705,..." --output-file=NotoColorEmoji-subset.ttf

# Option B (simplest): Remove and let the platform render emoji natively
# Delete the font reference from pubspec.yaml — iOS, Android, and modern browsers
# all have system emoji fonts that render without bundling
```

---

## 🟠 HIGH — Fix Within 1 Week

### H1. Fix Duplicate "| Deckbase" in 3 Meta Titles
**Effort:** 15 minutes
**Affected pages:** /features, /contact-us, /updates

Template is appending the site name twice. Fix in the Next.js metadata config:

```ts
// app/layout.tsx or next.config.js metadata
export const metadata: Metadata = {
  title: {
    template: '%s | Deckbase',  // Appends once
    default: 'Deckbase — Scan. Build. Remember.',
  },
}
```

---

### H2. Fix ©null Copyright Bug
**Effort:** 15 minutes
**File:** Marketing site footer component

```tsx
// Footer.tsx
<p>© {new Date().getFullYear()} Deckbase AI. All Rights Reserved.</p>
// If SSR hydration mismatch is the cause, use suppressHydrationWarning:
<p suppressHydrationWarning>© {new Date().getFullYear()} Deckbase AI. All Rights Reserved.</p>
```

---

### H3. Convert app_logo.png to WebP
**Impact:** Reduces LCP image from 188KB to ~15KB (90%+ reduction)
**Effort:** 30 minutes
**File:** `assets/app_logo.png`

```bash
# Install cwebp (brew install webp)
cwebp -q 85 assets/app_logo.png -o assets/app_logo.webp

# Update all references in Dart code:
# Image.asset('assets/app_logo.png') → Image.asset('assets/app_logo.webp')
# Also update flutter_native_splash.yaml
```

---

### H4. Enable AI Search Crawlers (Unblock GPTBot, Google-Extended)
**Impact:** Enables AI Overviews, ChatGPT, Perplexity, Apple Intelligence citations
**Effort:** 5 minutes

The `Content-Signal: ai-train=no` already signals no AI training consent. But the specific user-agent blocks in robots.txt prevent AI *search* grounding too. Remove the user-agent blocks to allow AI search visibility while keeping the training restriction.

```
# robots.txt — REMOVE these blocks (they block AI search, not just training):
# User-agent: GPTBot
# Disallow: /
#
# User-agent: Google-Extended
# Disallow: /
#
# User-agent: ClaudeBot
# Disallow: /

# KEEP the Content-Signal which blocks training:
User-agent: *
Content-Signal: search=yes,ai-train=no
Allow: /
```

---

### H5. Add Real Team/Founder Information
**Impact:** E-E-A-T — highest-leverage content change for an EdTech product
**Effort:** 2–3 hours

Add to `/about-us`:
- Founder name, photo, brief bio
- Link to founder's LinkedIn or Twitter
- Company founding story (even 150 words of authentic voice)
- Country of operation

Add `Person` schema for key team members:
```json
{
  "@type": "Person",
  "name": "[Founder Name]",
  "jobTitle": "Founder & CEO",
  "url": "https://linkedin.com/in/...",
  "worksFor": { "@id": "https://deckbase.co/#organization" }
}
```

---

### H6. Add FAQPage Schema to 4+ Pages
**Impact:** FAQ rich results in SERPs, increased CTR
**Effort:** 1–2 hours

FAQ sections exist on /features, /premium, /about-us, /download. Add JSON-LD to each:

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Is Deckbase free to use?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes, Deckbase has a free tier with manual card creation, basic spaced repetition, and up to 500 cards. Premium is $4.99/month (or $49.99/year) for unlimited AI generation and advanced features."
      }
    },
    {
      "@type": "Question",
      "name": "How does Deckbase compare to Anki?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Deckbase uses the FSRS algorithm (same family as Anki's SM-2), adds AI-powered card generation from book scans, and offers a more modern mobile-first interface. Deckbase supports Anki .apkg import."
      }
    }
    // Add all existing FAQ items
  ]
}
```

---

### H7. Fix Firebase Hosting Configuration
**Impact:** CDN caching, security headers, Brotli compression
**Effort:** 30 minutes
**File:** `firebase.json`

Add a `"hosting"` block:

```json
{
  "firestore": { ... },
  "functions": { ... },
  "hosting": {
    "public": "build/web",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      { "source": "**", "destination": "/index.html" }
    ],
    "headers": [
      {
        "source": "**/*.@(js|css|woff2|ttf|png|webp|jpg|svg)",
        "headers": [
          { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
        ]
      },
      {
        "source": "index.html",
        "headers": [
          { "key": "Cache-Control", "value": "no-cache, no-store, must-revalidate" }
        ]
      },
      {
        "source": "**",
        "headers": [
          { "key": "X-Content-Type-Options", "value": "nosniff" },
          { "key": "X-Frame-Options", "value": "SAMEORIGIN" },
          { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
          { "key": "Strict-Transport-Security", "value": "max-age=31536000; includeSubDomains" }
        ]
      }
    ]
  }
}
```

---

### H8. Move Non-Critical Startup to Post-First-Frame
**Impact:** Reduces pre-`runApp()` await chain, faster LCP
**Effort:** 1–2 hours
**File:** `lib/main.dart`

```dart
void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
  await Hive.initFlutter();

  runApp(ProviderScope(child: MyApp()));

  // Move these AFTER runApp() — not needed before first paint:
  WidgetsBinding.instance.addPostFrameCallback((_) async {
    if (!kIsWeb) {
      await _configurePurchaseSDK();
      await initCustomerInfo();
      await HomeWidgetService.init();
      await initShareIntent();
    }
    await initAppLinks();
  });
}
```

---

### H9. Upgrade Firebase Functions to Node 20
**Impact:** Prevents function failures from deprecated runtime
**Effort:** 10 minutes
**File:** `functions/package.json`

```json
"engines": {
  "node": "20"
}
```

---

## 🟡 MEDIUM — Fix Within 1 Month

### M1. Replace Placeholder Content
**Effort:** 2–4 hours

- **/updates:** Either publish real changelog entries with dates (V1.0, V1.1 etc.) or add `<meta name="robots" content="noindex">` until content exists
- **/features:** Remove "What We Expect to Hear" and "Expected User Feedback" sections entirely; replace with real user quotes with attributed names

---

### M2. Populate `web/manifest.json`
**File:** `web/manifest.json`
**Effort:** 20 minutes

```json
{
  "name": "Deckbase",
  "short_name": "Deckbase",
  "description": "AI-powered flashcard app with spaced repetition. Scan books into flashcards.",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#000000",
  "theme_color": "#000000",
  "icons": [
    { "src": "icons/Icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "icons/Icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "icons/Icon-maskable-192.png", "sizes": "192x192", "type": "image/png", "purpose": "maskable" },
    { "src": "icons/Icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

---

### M3. Fix Sitemap Domain Consistency
**Effort:** 30 minutes

Update `sitemap.xml` to use whichever domain you choose in C2. All 9 URLs should use the same www/non-www form as the canonical tags. Also add `/mcp` and `/refunds` to the sitemap.

---

### M4. Replace GoogleFonts Runtime with Self-Hosted Font
**Effort:** 1–2 hours
**File:** `lib/core/ui/theme/fontstyle.dart`

The project already bundles `NotoSans-Medium.ttf`. Either use that or bundle Montserrat locally:

```dart
// pubspec.yaml
flutter:
  fonts:
    - family: Montserrat
      fonts:
        - asset: assets/fonts/Montserrat-Regular.ttf
        - asset: assets/fonts/Montserrat-Medium.ttf
          weight: 500
        - asset: assets/fonts/Montserrat-Bold.ttf
          weight: 700

// fontstyle.dart — replace GoogleFonts.montserrat() with:
TextStyle(fontFamily: 'Montserrat', fontSize: 14, ...)
```

---

### M5. Add Organization Logo and sameAs to Schema
**Effort:** 30 minutes

```json
{
  "@type": "Organization",
  "name": "Deckbase",
  "url": "https://deckbase.co",
  "logo": {
    "@type": "ImageObject",
    "url": "https://www.deckbase.co/icons/Icon-512.png",
    "width": 512,
    "height": 512
  },
  "sameAs": [
    "https://twitter.com/DeckbaseApp",
    "https://apps.apple.com/app/deckbase/id6748827564",
    "https://play.google.com/store/apps/details?id=co.deckbase.app"
  ],
  "contactPoint": {
    "@type": "ContactPoint",
    "email": "support@deckbase.co",
    "contactType": "customer support"
  }
}
```

---

### M6. Fix Tap Targets on Login Page
**Effort:** 30 minutes
**File:** Login page widget

```dart
// BEFORE (tap target shrunk to ~16px):
TextButton(
  style: ButtonStyle(
    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
    minimumSize: WidgetStateProperty.all(Size.zero),
  ),
  child: Text('Forgot password?'),
)

// AFTER (inherits theme's 44px minimum):
TextButton(
  onPressed: () => ...,
  child: Text('Forgot password?'),
)
// Also replace GestureDetector for "Sign up" with TextButton
```

---

### M7. Increase Body Font Sizes
**Effort:** 30 minutes
**File:** `lib/core/ui/theme/` (dark theme text theme)

```dart
// Increase in darkTextTheme:
bodyMedium: montserrat(fontSize: 16, ...),  // was 14px
bodySmall: montserrat(fontSize: 13, ...),   // was 13px (acceptable)
// Fix time-ago inline override from 11 → 12px min
```

---

### M8. Fix CLS from Dynamic Section Loading
**Effort:** 1–2 hours
**File:** `lib/features/home/presentation/pages/home_page.dart`

Replace `SizedBox.shrink()` placeholders with fixed-height shimmer loaders:

```dart
// BEFORE:
if (!snapshot.hasData) {
  return const SizedBox.shrink(); // Causes jump when data arrives
}

// AFTER (using shimmer package):
if (!snapshot.hasData) {
  return Shimmer.fromColors(
    baseColor: Colors.grey[800]!,
    highlightColor: Colors.grey[600]!,
    child: Container(height: 200, ...), // Match actual content height
  );
}
```

---

### M9. Add llms.txt for AI Visibility
**Effort:** 30 minutes

Create `/public/llms.txt` (or equivalent static file at your domain root):

```
# Deckbase

> AI-powered flashcard app that turns books, notes, and PDFs into spaced repetition flashcards using OCR and the FSRS algorithm.

## Key Pages
- [Homepage](https://deckbase.co)
- [Features](https://deckbase.co/features)
- [Premium Plans](https://deckbase.co/premium)
- [Download](https://deckbase.co/download)

## About
Deckbase is an iOS and Android app (free tier + Premium at $4.99/month) that scans physical books and digital documents to automatically generate flashcard decks, then schedules reviews using the FSRS (Free Spaced Repetition Scheduler) algorithm for optimal memory retention.

## Contact
support@deckbase.co
```

---

### M10. Add BreadcrumbList Schema to Inner Pages
**Effort:** 1 hour

```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://deckbase.co" },
    { "@type": "ListItem", "position": 2, "name": "Features", "item": "https://deckbase.co/features" }
  ]
}
```

---

## 🔵 LOW — Backlog

### L1. Add Spaced Repetition Citation to Content
Link "scientifically proven" claims to:
- Ebbinghaus forgetting curve (1885)
- FSRS paper: github.com/open-spaced-repetition/fsrs4anki

### L2. Standardize Sitemap lastmod Dates
Configure sitemap generator to use actual modification times per page, not a single identical timestamp.

### L3. Implement hreflang for Japanese
If Japanese content is planned: add `<link rel="alternate" hreflang="ja" href="https://deckbase.co/ja/">` and create locale-specific URLs.

### L4. Start a Blog / Content Hub
Begin with 3–5 articles targeting high-value long-tail:
- "What is spaced repetition?"
- "FSRS vs SM-2: which algorithm is better for studying?"
- "How to convert a PDF into flashcards with AI"
- "Deckbase vs Anki: complete comparison"

### L5. Add Comparison Pages
- `/deckbase-vs-anki`
- `/deckbase-vs-quizlet`
These are high commercial-intent queries with clear ranking opportunity.

### L6. Implement IndexNow
1. Generate key at indexnow.org
2. Place key file at `https://deckbase.co/{key}.txt`
3. Ping `https://api.indexnow.org/indexnow?url=...&key=...` on content updates

### L7. Cancel Firestore Listeners on dispose()
Audit all `onSnapshot` / `StreamSubscription` usage for missing `dispose()` cancellation. Accumulated listeners degrade INP over a session.

### L8. Move Heavy Operations to Dart Isolate
APKG import, batch card creation, and image OCR processing should use `compute()` or `Isolate.spawn()` to keep the main thread free.

---

## Priority Matrix Summary

| # | Task | Severity | Effort | Impact |
|---|---|---|---|---|
| C1 | Remove fake AggregateRating schema | Critical | 30 min | Prevents manual penalty |
| C2 | Fix www/non-www canonicals | Critical | 1-2 hrs | Indexing consolidation |
| C3 | Guard RevenueCat with kIsWeb | Critical | 5 min | Web startup fix |
| C4 | Subset NotoColorEmoji.ttf (10MB → <200KB) | Critical | 1 hr | LCP improvement |
| H1 | Fix duplicate "Deckbase" in 3 titles | High | 15 min | CTR |
| H2 | Fix ©null copyright bug | High | 15 min | Trust |
| H3 | Convert app_logo.png → WebP | High | 30 min | LCP |
| H4 | Enable AI search crawlers in robots.txt | High | 5 min | AI visibility |
| H5 | Add real team/founder info | High | 2-3 hrs | E-E-A-T |
| H6 | Add FAQPage schema | High | 1-2 hrs | Rich results |
| H7 | Fix firebase.json hosting config | High | 30 min | CDN/security |
| H8 | Move startup init post-first-frame | High | 1-2 hrs | LCP |
| H9 | Upgrade Firebase Functions Node 20 | High | 10 min | Infrastructure |
| M1 | Replace placeholder content | Medium | 2-4 hrs | Content quality |
| M2 | Populate manifest.json | Medium | 20 min | PWA signals |
| M3 | Fix sitemap domain + add missing pages | Medium | 30 min | Crawlability |
| M4 | Self-host Montserrat font | Medium | 1-2 hrs | LCP |
| M5 | Improve Organization schema | Medium | 30 min | Knowledge panel |
| M6 | Fix login tap targets | Medium | 30 min | Mobile UX |
| M7 | Increase body font sizes | Medium | 30 min | Readability |
| M8 | Fix CLS from dynamic sections | Medium | 1-2 hrs | CLS score |
| M9 | Add llms.txt | Medium | 30 min | AI visibility |
| M10 | Add BreadcrumbList schema | Medium | 1 hr | SERP display |
