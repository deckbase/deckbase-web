# IndexNow (Bing / participating engines)

[IndexNow](https://www.indexnow.org/) lets you notify search engines when URLs change.

## Setup (Deckbase)

1. Generate a key (e.g. 32+ character hex string). Keep it secret.
2. Set **`INDEXNOW_KEY`** in your production environment (e.g. Vercel project env vars).
3. Deploy. The app serves the verification file at:

   `https://www.deckbase.co/{INDEXNOW_KEY}.txt`

   The file body is the key value (handled by [`middleware.js`](../../middleware.js)).

4. Submit URLs to the IndexNow API when you publish (CI script or manual `curl`). Example:

```bash
KEY="your-key"
curl -s "https://api.indexnow.org/indexnow?url=https://www.deckbase.co/features&key=${KEY}"
```

Use `url` for a single URL or follow the [batch API](https://www.indexnow.org/documentation) for multiple URLs.

## Notes

- If **`INDEXNOW_KEY`** is unset, no key file is served (middleware passes through).
- **`robots.txt`** and **`llms.txt`** are not intercepted.
