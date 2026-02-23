# Configure RevenueCat (step-by-step)

Do this once in the [RevenueCat dashboard](https://app.revenuecat.com). The app is already wired to use the **entitlement id** `pro` (see `lib/revenuecat-config.js`).

---

## Already configured (Deckbase project)

Via RevenueCat MCP, your project **Deckbase** (`proj6771eeb7`) already has:

- **Entitlement:** `pro` (Pro access to all features)
- **Current offering:** `default` (The standard set of packages) with packages:
  - `$rc_monthly` — Unlimited access for a month
  - `$rc_annual` — Unlimited access for a year
- **Apps:** Play Store, App Store, and **Deckbase (Stripe)** for web

Use the **Public API Key** from the **Deckbase (Stripe)** app in the dashboard (or from your Web Billing app if you added one). Set it in `.env` as:

```bash
NEXT_PUBLIC_REVENUECAT_WEB_API_KEY=<your_public_api_key>
```

Then restart the dev server and open **Dashboard → Subscription** (crown icon) → **View plans**.

---

## Why product status is "Not found"

For the **Deckbase (Stripe)** app, the two products **Pro Monthly** and **Pro Annual** exist in RevenueCat but show **status "Not found"** until they are linked to real products and prices in **Stripe**. RevenueCat does not create those in Stripe for you.

**Fix:**

1. **In Stripe Dashboard** ([dashboard.stripe.com](https://dashboard.stripe.com)):
   - **Products** → **Add product**.
   - Create **Pro Monthly**: name e.g. "Pro Monthly", **Recurring** price (e.g. $4.99/month). Save and note the **Price ID** (e.g. `price_xxx`).
   - Create **Pro Annual**: name e.g. "Pro Annual", **Recurring** price (e.g. $39.99/year). Save and note the **Price ID**.
   - Use **Standard** or **Package** pricing only (no metered/tiered).

2. **In RevenueCat** ([app.revenuecat.com](https://app.revenuecat.com)):
   - Open your project → **Apps** → **Deckbase (Stripe)** (or your Stripe/Web Billing app).
   - Go to **Products** (or the section where Stripe products are linked).
   - For **Pro Monthly** (`store_identifier`: `deckbase_pro_monthly`), link it to the Stripe product/price you created for monthly.
   - For **Pro Annual** (`store_identifier`: `deckbase_pro_annual`), link it to the Stripe product/price you created for annual.

3. **Webhooks (if required):** In Stripe, add a webhook pointing to RevenueCat and subscribe to the events RevenueCat requires (e.g. `customer.subscription.created/updated/deleted`, `checkout.session.completed`). Use the webhook secret in RevenueCat’s Stripe app config.

After the link is correct and webhooks are set up, product status in RevenueCat should move from **Not found** to **Active** (or the equivalent in your dashboard).

---

## 1. Create a project (if needed)

- Go to [app.revenuecat.com](https://app.revenuecat.com) and sign in.
- Create a new project or select an existing one (e.g. "Deckbase").

---

## 2. Add Web Billing app

- In the project, open **Apps & providers** (or **Project** → **Apps**).
- Click **+ New** and choose **Web** (or **Web Billing**).
- Select **RevenueCat Web Billing** (Stripe as payment gateway) or **Paddle** if you use Paddle.
- Fill in:
  - **App name:** e.g. Deckbase Web
  - **Support email**
  - **Stripe account** (connect if not already)
  - **Default currency** (e.g. USD)
- Save. You’ll see:
  - **Public API Key** → use this in `.env` as `NEXT_PUBLIC_REVENUECAT_WEB_API_KEY`
  - **Sandbox API Key** → only for local/testing (do not use in production).

---

## 3. Create entitlement

- Go to **Entitlements** (or **Project** → **Entitlements**).
- Click **+ New**.
- **Identifier:** `pro` (must match `REVENUECAT_ENTITLEMENT_ID` in `lib/revenuecat-config.js`).
- **Description** (optional): e.g. "Pro subscription".
- Save.

---

## 4. Create products (Web Billing)

- In the **Web Billing** app you added, open **Products** (or the product setup section).
- Create at least one subscription product, e.g.:
  - **Product ID:** `deckbase_pro_monthly`
  - **Type:** Subscription
  - **Duration:** Monthly (or yearly)
  - **Price** (e.g. $4.99/month).
- Attach this product to the **pro** entitlement (in the product config or in the entitlement’s product list).

---

## 5. Create offering

- Go to **Offerings** (or **Project** → **Offerings**).
- Ensure there is a **Current** offering (or create one and set it as current).
- Add a **Package** to that offering:
  - Link the package to the product you created (e.g. monthly or annual).
  - Package identifier can be e.g. `$rc_monthly` or a custom id.

Without a current offering with at least one package, the paywall will have nothing to show.

---

## 6. Set env var in this app

In `.env` (and `.env.prod` for production):

```bash
NEXT_PUBLIC_REVENUECAT_WEB_API_KEY=your_public_api_key_from_step_2
```

Restart the dev server after changing `.env`.

---

## 7. Optional: customize paywall

- In the **Web Billing** app settings, open **Appearance** (or **Paywall**).
- Adjust colors, logo, button style, etc. as needed.

---

## Checklist

- [ ] Web Billing app added with Stripe (or Paddle)
- [ ] Entitlement `pro` created
- [ ] At least one subscription product created and attached to `pro`
- [ ] Current offering has at least one package linked to that product
- [ ] `NEXT_PUBLIC_REVENUECAT_WEB_API_KEY` set in `.env`
- [ ] App restarted; open `/dashboard/subscription` and click “View plans”

If the paywall shows “No offerings” or stays empty, double-check the current offering and packages in the dashboard.
