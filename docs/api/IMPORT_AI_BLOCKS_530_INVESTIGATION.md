# Investigation: 530 on POST /api/cards/import-ai-blocks

## Summary

**Endpoint:** `POST https://dev.deckbase.co/api/cards/import-ai-blocks`  
**Symptom:** HTTP **530**, **no JSON body** when using “Generate with AI” (quiz) during spreadsheet import from the mobile app.

The application code **never returns 530**. All error responses from the route use 4xx/5xx with a JSON body (400, 401, 403, 404, 422, 500, 502, 503). So **530 with no body** comes from the **platform** (e.g. Vercel), not from the route handler.

---

## Root cause (likely)

When the platform kills the function or the function crashes **before** sending a response, the client can see a generic error page (e.g. 502/503/530) with **no JSON**. Typical causes:

1. **Function timeout**  
   The handler runs auth → Firestore (template) → RevenueCat/usage → **Claude API**. The Claude call can take 15–60+ seconds. If the serverless execution limit is exceeded (e.g. default 10s on some plans), the platform terminates the function and may return 530 (or 502/504) with an HTML/empty body.

2. **Uncaught exception**  
   If something throws in a dependency (e.g. Firebase init, Firestore, RevenueCat, or the Anthropic SDK) in a way that bypasses the route’s `try/catch`, or the process crashes (e.g. OOM), the platform may respond with 530 and no JSON.

3. **Proxy/CDN**  
   If there is a reverse proxy or CDN in front (e.g. Cloudflare), 530 can mean “origin unreachable” or “origin error”. The client would then see 530 even when the origin would have returned 500 with a body.

---

## What was changed in the codebase

To reduce the chance of 530 and to make remaining failures easier to debug:

1. **Longer allowed runtime**  
   `export const maxDuration = 60` was added for this route so the serverless function can run up to 60 seconds. This reduces timeouts when Claude is slow.

2. **Claude errors always return JSON**  
   The Anthropic `messages.create` call is wrapped in a dedicated `try/catch`. On failure we return **502** or **503** with a JSON body (e.g. `{ "error": "AI service is busy. Please try again later." }`) instead of letting the exception bubble and risk a platform 530.

3. **Structured logging**  
   Logs were added at:
   - `start`
   - `auth` (with `uid`)
   - `template_ok` / `template_missing` (with `uid`, `templateId`, block count)
   - `claude_call` (with `maxCards`, `hasQuiz`)
   - `claude_done`
   - On error: full message and stack.

   All lines are prefixed with `[import-ai-blocks]` and a timestamp so you can correlate with platform logs.

4. **Top-level catch**  
   The main `catch` logs `err.message` and `err.stack` and still returns **500** with a JSON body, so the handler always sends a proper response when the error is caught.

---

## How to get logs for a specific failure

1. **Vercel (or your host)**  
   - Open the project → **Logs** or **Functions**.
   - Filter by path: `/api/cards/import-ai-blocks` and time window.
   - Look for:
     - `[import-ai-blocks]` lines (request flow and errors).
     - Platform messages like “Function execution timeout”, “Out of memory”, or “Runtime error”.

2. **Correlation**  
   If the client can send **timestamp** (and optionally `uid` / `templateId`), search logs around that time for the same `[import-ai-blocks]` and any platform error.

3. **What to report**  
   - Last log line before failure (e.g. `claude_call` but no `claude_done` → timeout or crash during Claude).
   - Any platform error line (timeout, OOM, uncaught exception).
   - Whether the response was 530 with an empty or HTML body (confirms platform-level response).

---

## If 530 still happens

- **After these changes:** If the function now returns 502/503/500 with JSON for most failures, remaining 530s are likely:
  - Timeout beyond 60s (consider smaller batches or a faster model).
  - Crash/OOM (check function memory and payload size).
  - Proxy/CDN in front returning 530 when the origin is slow or unreachable (check proxy docs and origin health).
- **Mobile:** Continue treating 530 as “server error, try again later” and use “Go Back” as you do now. Once logs are available for a 530, the exact cause can be tied to one of the cases above.
