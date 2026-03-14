# Subscription pricing

Plans and feature limits for Deckbase subscriptions. Use this for paywall copy, product docs, and RevenueCat/Stripe configuration.

---

## Pricing summary

| Plan  | Monthly | Yearly | Effective monthly (annual) | Discount | Anki Decks match |
| ----- | ------- | ------ | -------------------------- | -------- | ---------------- |
| Free  | $0      | $0     | $0                         | —        | 4 decks/mo       |
| Basic | $5.99   | $59    | $4.92                      | 18%      | $5 → $60/yr      |
| Pro   | $11.99  | $119   | $9.92                      | 17%      | $12 → $144/yr    |

---

## Plans overview

| Feature             | Free                | Basic ($5.99/mo)                   | Pro ($11.99/mo)           |
| ------------------- | ------------------- | ---------------------------------- | ------------------------- |
| AI Card Generations | ❌ None              | 250 cards/month                    | 600 cards/month           |
| OCR Scans/Pages     | Unlimited            | Unlimited                          | Unlimited                 |
| Decks               | Unlimited            | Unlimited                          | Unlimited                 |
| Cards               | Unlimited            | Unlimited                          | Unlimited                 |
| Spaced repetition   | Unlimited            | Unlimited                          | Unlimited                 |
| Quizzes             | Unlimited            | Unlimited                          | Unlimited                 |
| Supported media     | Image, Audio         | Image, Audio                      | Image, Audio              |
| Text-to-Speech      | ❌ None              | Premium voices + speed (up to 30K chars/mo) | Premium voices (up to 50K chars/mo) |
| MCP                 | ❌ None              | Included                          | Included                          |
| Import              | CSV only            | CSV, Excel, Anki                  | CSV, Excel, Anki                 |
| Export              | CSV only            | CSV, Excel, Anki                  | CSV, Excel, Anki                 |
| Storage & Backup    | ❌ None              | 2GB cloud backup                   | 20GB cloud backup         |
| Best for            | Manual card testing | Regular students                   | Exam prep, heavy users    |

---

## TTS cost & profitability (ElevenLabs)

We use [ElevenLabs Text-to-Speech API](https://elevenlabs.io/pricing/api), billed **per character**. Flash/Turbo is ~**$0.06 per 1K characters** (Business tier; other tiers have different included/overage rates).

| Plan  | TTS included | Est. cost at $0.06/1K | Revenue | Gross margin (TTS only) |
|-------|----------------|------------------------|---------|--------------------------|
| Basic | 30K chars/mo   | **$1.80**              | $5.99   | ~70%                     |
| Pro   | 50K chars/mo   | **$3.00**              | $11.99  | ~75%                     |

**Target:** TTS caps set so that at full use, gross margin stays **~70–80%** (direct cost 20–30% of revenue). If you add other variable costs (AI, OCR, storage), consider slightly lower caps or higher prices. Track actual usage and adjust.

---

## Cloud Storage & Firestore (Firebase)

Rough variable cost for the “Storage & Backup” limits (Firebase Storage + Firestore). [Firebase Storage](https://firebase.google.com/docs/storage) is ~**$0.026/GB** (default bucket, Blaze); [Firestore](https://firebase.google.com/docs/firestore/pricing) storage is ~**$0.18/GB/month**.

| Plan  | Backup limit | Est. Storage cost | Est. Firestore (app data) | Total storage cost |
|-------|----------------|-------------------|----------------------------|---------------------|
| Basic | 2GB           | ~$0.05            | ~$0.09 (0.5GB)             | **~$0.14**          |
| Pro   | 20GB          | ~$0.52            | ~$0.36 (2GB)               | **~$0.88**          |

**Combined with TTS (full use):**

| Plan  | TTS + Storage + Firestore | Revenue | Gross margin |
|-------|----------------------------|---------|--------------|
| Basic | $1.80 + $0.14 = **$1.94**  | $5.99   | **~68%**     |
| Pro   | $3.00 + $0.88 = **$3.88**  | $11.99  | **~68%**     |

**Conclusion:** 2GB (Basic) and 20GB (Pro) are conservative; many note/flashcard apps show lower or no numbers. You can raise limits later as a “free upgrade” if margins allow.

---

## Notes for implementation

- **Entitlements:** Map Basic and Pro to RevenueCat entitlement identifiers (e.g. `basic`, `pro`) as needed. Current app uses `pro` for paid access; extend to `basic` vs `pro` if you offer both tiers.
- **Limits:** Enforce AI generations, OCR pages, TTS (character count), and storage per billing period (e.g. monthly reset). Track usage in Firestore or your backend.
- **Export / TTS / File uploads:** Gate by plan in the UI and API; see [REVENUECAT_SUBSCRIPTIONS.md](./REVENUECAT_SUBSCRIPTIONS.md) for gating patterns.

---

**Related:** [CONFIGURE_REVENUECAT.md](./CONFIGURE_REVENUECAT.md) · [REVENUECAT_SUBSCRIPTIONS.md](./REVENUECAT_SUBSCRIPTIONS.md)
