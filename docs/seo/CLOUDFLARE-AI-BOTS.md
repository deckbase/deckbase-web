# Cloudflare and AI crawlers (checklist)

The [FULL-AUDIT-REPORT](./FULL-AUDIT-REPORT.md) (March 2026) noted **user-agent blocks** for GPTBot, ClaudeBot, Google-Extended, etc. at the **CDN** layer. The repo’s [`public/robots.txt`](../../public/robots.txt) allows standard indexing and does **not** block those agents.

## What to do

1. Open **Cloudflare** → your **deckbase.co** zone → **Security** / **WAF** / **Bots** (exact UI varies).
2. Search for rules that **Disallow** or **block** by user-agent: `GPTBot`, `ClaudeBot`, `Google-Extended`, `Bytespider`, etc.
3. Align with product policy:
   - **Allow** if you want visibility in AI-powered search / citations (subject to each provider’s terms).
   - **Block** only if you intentionally restrict those agents (note: may reduce AI discovery).

`Content-Signal` / `robots.txt` training directives are separate from **firewall** blocks—both can apply.
