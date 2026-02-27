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
| **baseUrl** | **Local:** `http://localhost:3000` · **Prod:** your live URL (e.g. `https://deckbase.vercel.app`) | API base URL. |
| **idToken** | (Firebase ID token string) | For `Authorization: Bearer {{idToken}}`. Get from your app (e.g. `user.getIdToken(true)`) or Firebase Auth REST API. |
| **apiKey**  | (value of `ELEVENLABS_MOBILE_API_KEY`) | For ElevenLabs TTS/voice-sample in prod without Firebase; set header `X-API-Key`. |

## Auth

- **Development:** Many routes (e.g. voice-sample, text-to-speech) do **not** require auth; you can leave `idToken` empty when calling against `http://localhost:3000` with `npm run dev`.
- **Production:** For ElevenLabs: use either **Bearer {{idToken}}** (Firebase ID token; user must be Pro or VIP) or **X-API-Key: {{apiKey}}** (no Pro check). For Cards AI and `/api/user/vip`, use **Bearer {{idToken}}**.

## 401 `auth_missing` on voice-sample or text-to-speech

In **production** these endpoints require auth. Do one of the following:

1. **X-API-Key (easiest for Postman):** In your environment, set **apiKey** to the value of **ELEVENLABS_MOBILE_API_KEY** from your server env (e.g. from `.env.prod`). The collection uses `X-API-Key: {{apiKey}}` by default for ElevenLabs requests.
2. **Firebase ID token:** Set **idToken** to a current Firebase ID token, then in the request **Headers** disable `X-API-Key` and enable `Authorization: Bearer {{idToken}}`.

## Getting a Firebase ID token for Postman

1. In your web app, log in, then in the browser console run something like:
   ```js
   firebase.auth().currentUser.getIdToken(true).then(t => console.log(t))
   ```
   (adjust to your Firebase SDK usage). Copy the token.
2. Paste into the **idToken** variable in Postman (or set the Authorization header manually). Tokens expire in ~1 hour.
