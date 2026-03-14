# GA4 & Search Console setup (SEO Command Center)

The Overview widget uses a **Google Cloud service account** to read GA4 and Search Console data. No user sign-in is required.

## How to get GOOGLE_SERVICE_ACCOUNT_JSON

1. **Open Google Cloud Console**  
   Go to [console.cloud.google.com](https://console.cloud.google.com/).

2. **Select or create a project**  
   Use the project dropdown at the top. Create one if needed.

3. **Create a service account**  
   - Left menu: **IAM & Admin** → **Service accounts**.  
   - Click **+ Create service account**.  
   - Name it (e.g. `deckbase-seo`), click **Create and continue** (roles optional), then **Done**.

4. **Create a JSON key**  
   - Click the service account you just created.  
   - Open the **Keys** tab.  
   - **Add key** → **Create new key** → choose **JSON** → **Create**.  
   - A `.json` file will download (e.g. `your-project-abc123.json`).

5. **Turn the file into the env value**  
   - Open the downloaded JSON file in a text editor.  
   - It looks like:
     ```json
     {
       "type": "service_account",
       "project_id": "your-project",
       "private_key_id": "...",
       "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
       "client_email": "deckbase-seo@your-project.iam.gserviceaccount.com",
       "client_id": "...",
       "auth_uri": "https://accounts.google.com/o/oauth2/auth",
       "token_uri": "https://oauth2.googleapis.com/token",
       ...
     }
     ```
   - Copy the **entire** contents (all lines, including `{` and `}`).
   - In `.env.local` (or Vercel env), set:
     ```
     GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"your-project",...}
     ```
   - You can paste it as one line (minified), or keep newlines — both work. **Recommended:** use **single quotes** so the JSON is not mangled by escaping:
     ```
     GOOGLE_SERVICE_ACCOUNT_JSON='{"type":"service_account","project_id":"your-project",...}'
     ```
   - If you must use double quotes, escape internal quotes: `GOOGLE_SERVICE_ACCOUNT_JSON="{\"type\":\"service_account\",...}"`

6. **Keep the key secret**  
   Do not commit the JSON file or the env value to git. Add `*.json` (or the key filename) to `.gitignore` if you store the file in the project.

---

## 1. Google Cloud project

1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Create or select a project.
3. Enable these APIs:
   - **Google Analytics Data API** (for GA4)
   - **Search Console API** (for GSC)

## 2. Service account

1. In Cloud Console: **IAM & Admin** → **Service accounts** → **Create service account**.
2. Give it a name (e.g. `deckbase-seo`) and create.
3. Open the service account → **Keys** → **Add key** → **Create new key** → **JSON**. Download the JSON file.
4. For **Vercel / serverless**: paste the entire JSON as one line into an env var:
   - **Key:** `GOOGLE_SERVICE_ACCOUNT_JSON`
   - **Value:** `{"type":"service_account","project_id":"...", ...}` (the full file content).
5. For **local dev**: either use the same env var, or set **`GOOGLE_APPLICATION_CREDENTIALS`** to the path of the JSON file (e.g. `/path/to/key.json`).

## 3. GA4 property access

1. In [Google Analytics](https://analytics.google.com/): **Admin** → **Property access** (under the property).
2. **Add users** → enter the **service account email** (e.g. `deckbase-seo@your-project.iam.gserviceaccount.com`).
3. Role: **Viewer**. Save.
4. Copy the **Property ID** (Admin → Property settings: numeric, e.g. `123456789`). Set env:
   - **Key:** `GA4_PROPERTY_ID`
   - **Value:** `123456789`

## 4. Search Console access

1. In [Google Search Console](https://search.google.com/search-console): open your property (e.g. `https://deckbase.co/`).
2. **Settings** → **Users and permissions** → **Add user**.
3. Enter the **service account email**. Permission: **Full** or **Restricted**.
4. Set env:
   - **Key:** `GSC_SITE_URL`
   - **Value:** Your property URL, e.g. `https://deckbase.co/` or `https://www.deckbase.co/`. Use the exact URL shown in Search Console (with or without `www`).

## 5. Env summary

| Variable | Description |
|---------|-------------|
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Full JSON key file as string (preferred for Vercel). |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to JSON key file (alternative for local). |
| `GA4_PROPERTY_ID` | GA4 property ID (numeric). |
| `GSC_SITE_URL` | Search Console property URL (e.g. `https://deckbase.co/`). |

After setting these and restarting the app, open **Dashboard → Admin → SEO Command Center**. The **Overview** section will load GA4 metrics (users, sessions, page views), top pages from GA4, and Search Console data (clicks, impressions, position, top queries and pages).

---

## Troubleshooting

- **Overview still shows "Connect" or no data**
  1. **Restart the dev server** after changing `.env.local` (e.g. stop and run `npm run dev` again).
  2. Check env is loaded: open **`/api/seo/overview/status`** in the browser. It returns:
     - `hasGoogleJson`, `hasGa4Id`, `hasGscUrl` — whether each var is set
     - `jsonParseOk` — whether `GOOGLE_SERVICE_ACCOUNT_JSON` parses as valid JSON
     - `message` — a short hint (e.g. "Set GA4_PROPERTY_ID" or "GOOGLE_SERVICE_ACCOUNT_JSON is set but invalid JSON")
  3. If `jsonParseOk` is false, put the JSON in **single quotes** in `.env.local` so backslashes and quotes aren’t interpreted:
     `GOOGLE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'`
  4. Ensure the service account email is added in GA4 (Property access) and in Search Console (Users and permissions).

- **"Google Analytics Data API has not been used... or it is disabled"**
  - In [Google Cloud Console](https://console.cloud.google.com/), select the **same project** as your service account (e.g. `deckbase-prod`).
  - Go to **APIs & Services** → **Library**, search for **Google Analytics Data API**, open it, and click **Enable**.
  - Wait a few minutes and retry the Overview.

- **"User does not have sufficient permission for site 'https://...'"** (Search Console 403)
  - In [Search Console](https://search.google.com/search-console) → your property → **Settings** → **Users and permissions**.
  - Click **Add user**, paste your **service account email** (e.g. `deckbase-seo@deckbase-prod.iam.gserviceaccount.com`), choose **Full** or **Restricted**, then save.
  - Use the exact property URL in `GSC_SITE_URL` (e.g. `https://deckbase.co/` as shown in Search Console).
