# `isVip` — implementation guide for mobile

**VIP** users get **Pro-level features** without a RevenueCat subscription (e.g. staff, partners, or manual grants). The web app treats them as **Pro** and **hides subscription / paywall UI** where appropriate.

**Audience:** Mobile engineers (Swift / Kotlin).  
**Related:** [FIREBASE_STRUCTURE_MOBILE.md](./FIREBASE_STRUCTURE_MOBILE.md), [CONFIGURE_REVENUECAT.md](../subscription/CONFIGURE_REVENUECAT.md).

---

## What `isVip` means

| Concept | Meaning |
| ------- | ------- |
| **VIP** | User is allowlisted in Firestore as VIP; **not** derived from RevenueCat alone. |
| **Effective “Pro”** | **`isPro` = `isVip` OR user has the `pro` entitlement in RevenueCat** (same rule as web `RevenueCatContext`). |
| **Server APIs** | Backend routes that check subscription use **`getSubscriptionTier` / `isBasicOrProOrVip`** — VIP is treated as **Pro** (and Basic+Pro gates include VIP where applicable). |

Mobile should mirror web: after you know **VIP** and **RevenueCat entitlement**, compute **`isPro`** the same way so paywalls and feature flags stay consistent.

---

## Firestore: `vip/{uid}` (source of truth)

| Item | Value |
| ---- | ----- |
| **Collection** | `vip` |
| **Document ID** | User’s **Firebase Auth UID** (same as `request.auth.uid`). |
| **Body** | Empty doc is valid. Optional field **`active`**: if the field exists and is **`false`**, the user is **not** VIP; if absent or `true`, presence of the doc means VIP. |

**Admin / console:** To grant VIP, create `vip/{uid}`. To revoke, delete the doc or set `active: false`.

---

## Client apps cannot read `vip` from Firestore

Deckbase **Firestore security rules do not expose** the `vip` collection to clients. **Do not** rely on a direct Firestore read for VIP on iOS/Android.

Use the **HTTP API** below (or depend on server-side checks only—see next section).

---

## How to fetch `isVip` on mobile (recommended)

Call the same endpoint the web app uses:

| | |
| --- | --- |
| **Method / path** | `GET /api/user/vip` |
| **Base URL** | Your Deckbase web/API host (production vs staging as appropriate). |
| **Auth** | `Authorization: Bearer <Firebase ID token>` — obtain with your Firebase Auth SDK (`getIdToken()`). |

**Success (200):**

```json
{ "isVip": true }
```

or

```json
{ "isVip": false }
```

**Errors:**

- **`401`** — Missing/invalid/expired token (`{ "error": "..." }`).
- If auth admin is unavailable, the server may respond **`200`** with `{ "isVip": false }` (fail closed).

**When to refresh:** After sign-in, when the ID token is refreshed, or when the user returns to the app—same cadence you use for other user-scoped API calls. VIP status changes rarely; a session-level cache is usually enough.

---

## Combine with RevenueCat: `isPro`

Web logic (simplified):

- **`isVip`** — from `GET /api/user/vip`.
- **`entitled`** — RevenueCat **customer info** includes the **`pro`** entitlement (see `lib/revenuecat-config.js` / RevenueCat dashboard).
- **`isPro` = `isVip || entitled`**.

On mobile, use the RevenueCat SDK for entitlement and **also** call `/api/user/vip` (or your backend that wraps the same check) so VIP users get Pro **without** a store subscription.

---

## UX expectations (align with web)

- **VIP:** Prefer **not** pushing users into subscription purchase flows; web hides manage-subscription affordances for VIP where `isVip` is true.
- **Labels:** Web may show copy like **“Pro (VIP)”** / **“VIP access”** on the subscription screen—optional on mobile for parity.

---

## Server-side Pro / paid gates (no extra mobile work)

Endpoints that enforce Pro or paid tiers already account for VIP on the server (e.g. **`isBasicOrProOrVip`**, **`getSubscriptionTier`** in `lib/revenuecat-server.js`). Examples mobile may call with a Bearer token:

- `/api/mobile/cards/add-with-ai` — production entitlement check includes VIP.

So: **client-side `isPro` is for UI**; **APIs remain authoritative** for whether a request is allowed.

---

## Summary

1. **VIP** = document **`vip/{firebaseUid}`** (with optional `active`; `false` revokes).
2. **Clients** should use **`GET /api/user/vip`** with a Firebase ID token — **not** Firestore reads.
3. **`isPro` = `isVip || RevenueCat pro entitlement`** — match web.
4. **Backend** already treats VIP as Pro for gated APIs; mobile still needs **`isVip` for correct UI** (paywall / subscription screens).

For dashboard setup and RevCat details, see **[CONFIGURE_REVENUECAT.md](../subscription/CONFIGURE_REVENUECAT.md)** (section **VIP users**).
