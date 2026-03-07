# Postman setup for Deckbase API

## Import

1. Open **Postman**.
2. **Import** → drag and drop (or choose):
   - `Deckbase-API.postman_collection.json`
   - `Deckbase-Local.postman_environment.json`
   - `Deckbase-Prod.postman_environment.json`
3. Select an environment (**Deckbase Local** or **Deckbase Prod**) and set the variables below.

## Variables (collection / environment)

| Variable   | Example                    | Use |
|-----------|----------------------------|-----|
| **baseUrl** | **Local:** `http://localhost:3000` · **Prod:** your live URL | API base URL. |
| **apiKey**  | (value of `DECKBASE_API_KEY` from server env) | For mobile APIs: add-with-ai and ElevenLabs. Send as **X-API-Key** header. Dashboard API keys (Bearer) are for MCP only. |

## Auth

- **Development:** Many routes (e.g. voice-sample, text-to-speech) do **not** require auth against a dev server.
- **Production (mobile APIs):** Use **X-API-Key: {{apiKey}}** with `DECKBASE_API_KEY` from server env for add-with-ai and ElevenLabs. For **MCP** use **Bearer {{dashboardApiKey}}** (key from dashboard, not DECKBASE_API_KEY).

## 401 on voice-sample or text-to-speech

In **production**, mobile endpoints (add-with-ai, ElevenLabs) require **X-API-Key: {{apiKey}}** where apiKey = `DECKBASE_API_KEY` from server env. MCP uses Bearer with a dashboard API key (different key).
