# Subscription pricing

Plans and feature limits for Deckbase subscriptions. Use this for paywall copy, product docs, and RevenueCat/Stripe configuration.

**AI images (fal.ai):** Full product spec — models, credits, style library, reference images — is in **[`../features/AI_IMAGE_FAL_FEASIBILITY.md`](../features/AI_IMAGE_FAL_FEASIBILITY.md)**.

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
| AI image generation (fal.ai) | ❌ None | Up to **40 credits/mo** (weighted by model; curated list) | Up to **100 credits/mo** (weighted by model) |

**AI image credits:** Each generation consumes credits based on the **fal `model_id`** (cheap/fast models cost fewer credits than premium models). Usage is tracked **per model** for analytics. **Subscribers** also get access to a **curated style prompt library** (preset snippets to append to prompts; **filterable by tags** such as subject—STEM, vocabulary—and visual style—e.g. anime, realistic)—see `docs/features/AI_IMAGE_FAL_FEASIBILITY.md` → *Style prompt library*.
| MCP                 | ❌ None              | Included                          | Included                          |
| Import              | CSV only            | CSV, Excel, Anki                  | CSV, Excel, Anki                 |
| Export              | CSV only            | CSV, Excel, Anki                  | CSV, Excel, Anki                 |
| Import from file    | —                   | PDF, DOCX, PNG, JPEG              | PDF, DOCX, PNG, JPEG             |
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

## AI image cost & profitability (fal.ai)

Image generation uses [fal.ai](https://fal.ai/models). Per-model **list prices** (March 2026) are tabulated in **`docs/features/AI_IMAGE_FAL_FEASIBILITY.md`** → *fal.ai pricing snapshot* — e.g. FLUX Schnell **$0.003/MP**, Grok **$0.02/image**, Recraft V3 **~$0.04/image**, Nano Banana Pro **~$0.15/image**, reference edits **~$0.04–$0.15/image**, etc. **fal may change pricing;** use their dashboard for ground truth.

**Planning assumption for subscription math:** **Credit weights** are chosen so that if users mostly consume **~1 credit per run** (Schnell/Grok-class), blended fal cost stays near **~$0.035 per credit-equivalent**. **Nano Banana Pro (5 credits)** and **reference edits** are priced to reflect higher fal cost — see the **CREDIT_COST_BY_MODEL** table in `docs/features/AI_IMAGE_FAL_FEASIBILITY.md`.

| Plan  | Credits/mo | Illustrative max variable if avg **~$0.035/credit-equivalent** | Revenue | Gross margin (images only) |
|-------|------------|------------------------------------------------------------------|---------|----------------------------|
| Basic | 40         | **~$1.40**                                                       | $5.99   | ~77%                       |
| Pro   | 100        | **~$3.50**                                                       | $11.99  | ~71%                       |

**Target:** Same ballpark as TTS — keep direct API cost **well under** headline subscription price; **reconcile** against **fal.ai billing** monthly and adjust **credit weights**, caps, or allowlist if blended cost drifts.

**Related:** `docs/features/AI_IMAGE_FAL_FEASIBILITY.md` (architecture, model list, **pricing snapshot**, checklist).

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

**Related:** [CONFIGURE_REVENUECAT.md](./CONFIGURE_REVENUECAT.md) · [REVENUECAT_SUBSCRIPTIONS.md](./REVENUECAT_SUBSCRIPTIONS.md) · [AI image spec (fal.ai)](../features/AI_IMAGE_FAL_FEASIBILITY.md)
