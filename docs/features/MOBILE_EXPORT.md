# Export Functionality – Mobile Implementation Guide

This doc describes the **deck export** feature (Anki .apkg and Excel .xlsx) so the mobile team can implement equivalent behavior or integrate with the same backend.

**Related:** [Import Spreadsheet (Mobile)](./MOBILE_IMPORT_SPREADSHEET.md), [Subscription features](../subscription/SUBSCRIPTION_FEATURES_CHECK.md).

---

## 1. Overview

| Item | Description |
|------|-------------|
| **Formats** | **Anki (.apkg)** and **Excel (.xlsx)**. CSV export is also available (no Pro required). |
| **Gating** | In production, **APKG and XLSX export require Pro** (or VIP). CSV export is allowed for all users. |
| **Where it runs** | Web: **client-side** (browser). No dedicated “export API”; media bytes are fetched via `POST /api/media/bytes`. |
| **Output** | APKG = ZIP with SQLite `collection.anki2` + media files + media mapping. XLSX = spreadsheet with one row per card. |

---

## 2. Subscription (Pro required)

- **Export Anki (.apkg):** Pro required in production. Disable the export button or show “Pro subscription required” when `!isPro` (and production).
- **Export XLSX:** Same as APKG; Pro required in production.
- **Export CSV:** No gate; available to all users.

Use the same entitlement check as elsewhere: RevenueCat Pro/VIP (or your app’s equivalent). See [SUBSCRIPTION_FEATURES_CHECK.md](../subscription/SUBSCRIPTION_FEATURES_CHECK.md).

---

## 3. Data needed for export

Export uses the **deck** and its **cards** in the same shape as the rest of the app.

### 3.1 Deck

- `deckId`, `title` (deck name used in APKG and as default filename).

### 3.2 Cards

Each card must have:

| Field | Type | Description |
|-------|------|-------------|
| `blocksSnapshot` | `Array<Block>` | Block definitions in display order. Each block: `blockId`, `type`, `label`, optional `configJson` (for quiz blocks). |
| `values` | `Array<Value>` | One value per block. Each value: `blockId`, `type`, `text`, optional `mediaIds` / `media_ids`, optional `items`, `correctAnswers` (quiz). |

Block `type` can be numeric (e.g. `7` = audio, `6` = image, `8` = quizMultiSelect, `9` = quizSingleSelect, `10` = quizTextAnswer) or string (e.g. `"audio"`, `"quizSingleSelect"`).

### 3.3 Media

- Audio and image blocks reference media by **media ID** (UUID).
- To include media in the APKG, you need the **raw bytes** for each media ID (e.g. from Firebase Storage or via API). Web uses `POST /api/media/bytes` with Bearer token; see §5.

---

## 4. Anki (.apkg) export – behavior

### 4.1 Front vs Back

Anki’s Basic note type has two fields: **Front** and **Back**. We map Deckbase blocks like this:

- **Front** = first block (e.g. term) **+ all quiz blocks + all audio blocks**.
- **Back** = all other blocks (e.g. definition, extra text).

So quiz and audio appear on the **front** of the card (before “Show answer”); the rest appears on the back.

### 4.2 Block types → Anki content

- **Text / headers:** Escaped HTML; newlines → `<br>`.
- **Audio:** Each media ID is fetched and stored in the ZIP; field content gets `[sound:media_N.mp3]` (Anki format).
- **Image:** Same idea; stored as media and referenced as `<img src="media_N.jpg">`.
- **Quiz (single/multi choice):** Exported in two ways:
  - **Interactive:** A `<span class="deckbase-quiz" data-deckbase-quiz="...">` embeds base64-encoded JSON (`question`, `options`, `correct` or `correctIndices`, `type`). The Anki card template includes a script that replaces this with clickable buttons and green/red feedback. Works on Anki Desktop when the template script runs.
  - **Fallback:** The same span contains static text (Q, options list, answer) so if the script doesn’t run (e.g. some mobile clients), the user still sees the content.
- **Quiz (text answer):** Static text only (question + “Answer: …”).

### 4.3 APKG structure (ZIP)

- `collection.anki2` – SQLite DB (deflated). Contains `col`, `notes`, `cards`, `graves`, `revlog`. Notes have two fields: Front and Back, `\x1f`-separated.
- `media` – JSON object mapping numeric string keys to filenames, e.g. `{"0":"media_0.mp3","1":"media_1.mp3"}`.
- `0`, `1`, `2`, … – Media files (binary). Stored **uncompressed** (STORE) so Anki can read them.

Web reference: `utils/apkgExport.js` (`exportApkgToBlob`, `buildCollectionDb`, media ZIP layout).

---

## 5. Fetching media bytes (for APKG)

Web uses a single server endpoint so export doesn’t depend on client-side download URLs:

- **Endpoint:** `POST /api/media/bytes`
- **Body:** `{ "mediaId": "<uuid>" }`
- **Auth:** `Authorization: Bearer <Firebase ID token>` (web). For mobile you can use the same with the user’s ID token, or the backend can support `X-API-Key` + `uid` if you add it.
- **Response:** Binary body (audio or image bytes); `Content-Type` from the media doc (e.g. `audio/mpeg`, `image/jpeg`). On error: 4xx/5xx JSON.

The server looks up `users/{uid}/media/{mediaId}` in Firestore, reads `storage_path`, and streams the file from Firebase Storage. So the mobile app can either:

1. Call `POST /api/media/bytes` with the user’s auth (Bearer or API key + uid) and use the response bytes in the APKG, or  
2. Fetch media from Storage directly (using the same paths as the web) and pass bytes into your export pipeline.

Web flow: for each media ID, call `getMediaBytes(mediaId)` which does `fetch("/api/media/bytes", { method: "POST", body: JSON.stringify({ mediaId }) })` with Bearer token, then `res.arrayBuffer()` → `Uint8Array`.

---

## 6. Excel (.xlsx) export

- One row per card. Column headers come from the template block labels (or defaults).
- Each cell = that block’s text for that card. Audio/image blocks can be represented as `[audio: filename]` / `[image: filename]` if you want to match import; or you can omit media in XLSX and only export text.
- Web uses the `xlsx` (SheetJS) library to build the workbook and trigger download. No backend API; all client-side.

For mobile you can generate an XLSX with your preferred library and share/save the file; no API required.

---

## 7. Implementation options for mobile

1. **Match web (in-app export)**  
   - Use the same Front/Back collapse and block→field rules.  
   - For APKG: implement or reuse SQLite + ZIP (e.g. native SQLite + ZIP lib, or a WebView that runs the same JS as web).  
   - For media: call `POST /api/media/bytes` with the user’s auth and feed the returned bytes into the APKG.

2. **Export via backend (future)**  
   - If you add a “export deck” API that accepts `deckId` and returns the APKG blob (or a download URL), the server would use the same logic (cards, media, build ZIP) and mobile would only call the API and save/share the file. Today there is **no** such API; export is client-side on web.

3. **Share / open in browser**  
   - Less ideal: open the web deck page in a browser and let the user export there. No extra mobile implementation, but worse UX.

---

## 8. Quick reference – web code

| What | Where |
|------|--------|
| APKG export (ZIP + SQLite, fields, media, quiz) | `utils/apkgExport.js` |
| Media bytes API | `app/api/media/bytes/route.js` |
| Deck page export UI (APKG, XLSX, CSV) and Pro gating | `app/dashboard/deck/[deckId]/page.js` |
| Subscription / Pro checks | `docs/subscription/SUBSCRIPTION_FEATURES_CHECK.md` |

---

## 9. Checklist for mobile

- [ ] Gate “Export as Anki” and “Export as Excel” on Pro (production).
- [ ] Use same card shape: `blocksSnapshot` + `values` (and `mediaIds` / `media_ids` for media blocks).
- [ ] Front = first block + all quiz + all audio; Back = remaining blocks.
- [ ] For APKG: media files in ZIP with numeric keys, `media` JSON, and notes with `[sound:...]` / `<img src="...">` as in §4.
- [ ] Fetch media bytes via `POST /api/media/bytes` (with your auth) or from Storage.
- [ ] Quiz: optional interactive export via `data-deckbase-quiz` + script in note type (see `utils/apkgExport.js` and `getAnswerTemplateWithQuizScript` / `getQuestionTemplateWithQuizScript`); otherwise static Q/options/answer is enough.
