# Vercel dev / Preview setup

Use this to get a stable “dev” URL on Vercel (e.g. for the mobile app) and skip the Pro/VIP check on that URL.

**Environments in Vercel:** You’ll see **Production**, **Preview**, and **Development**. Development is “Accessible via CLI” only (used when you run `vercel dev` locally) and has **no custom domains** — it’s not a deployed URL. For a dev URL in the cloud, use **Preview** (and optionally a custom domain on a Preview branch).

---

## 1. Dev branch and Preview URL

- Create and push a branch (e.g. `dev` or `staging`):
  ```bash
  git checkout -b dev
  git push -u origin dev
  ```
- In Vercel: **Deployments** → open the latest deployment for that branch → copy the **URL** (e.g. `https://deckbase-web-git-dev-yourteam.vercel.app`). That’s your dev API base for the app.

---

## 2. Skip subscription check on Preview

- Vercel → your project → **Settings** → **Environment Variables**.
- Add:
  - **Key:** `REQUIRE_PRO_FOR_AI`
  - **Value:** `false`
  - **Environments:** check **Preview** only (leave Production unchecked).
- Save. Redeploy the dev branch if needed so the new variable is applied.

---

## 3. (Optional) Custom domain for dev

- **Vercel:** Project → **Settings** → **Domains** → **Add**.
- Enter the hostname (e.g. `dev.deckbase.co` or `api-dev.deckbase.co`).
- When asked which branch to use, select your dev branch (e.g. `dev`).
- **DNS (where your domain is managed):** Add a **CNAME** record:
  - **Name:** `dev` (for `dev.deckbase.co`) or `api-dev` (for `api-dev.deckbase.co`).
  - **Value / Target:** `cname.vercel-dns.com` (or the value Vercel shows).
- After DNS propagates, use `https://dev.deckbase.co` (or your chosen hostname) as the dev API base.

---

## 4. Mobile app config

- **Dev build:** Set API base URL to your dev URL (Preview URL from step 1 or custom domain from step 3).
- **Prod build:** Keep API base URL as production (e.g. `https://www.deckbase.co`).

Use the same `DECKBASE_API_KEY` (X-API-Key) for both if your server env is the same; or use a separate key for Preview if you prefer.
