# Image Optimization Audit

**Date:** 2026-03-27

---

## Image Audit Summary

| Metric | Status | Count |
|--------|--------|-------|
| Total Images | — | 42 |
| Missing/Empty Alt Text | ❌ | 3 |
| Oversized (>200KB) | ⚠️ | 4 |
| PNG (should be WebP) | ⚠️ | 18 |
| No Dimensions | ⚠️ | 5 |
| Missing `loading="lazy"` | ⚠️ | Most |
| No AVIF | ⚠️ | 0 |
| Missing referenced images | ❌ | 7 |

---

## Critical Issues

### 1. Empty alt text (accessibility + SEO)

- `components/NavBar.js` — user profile `<img alt="">`
- `components/BlockDisplay.js` — card `<Image alt="">` with `fill` prop

For user content images, use descriptive dynamic alt text. For intentionally decorative images, add `role="presentation"`.

### 2. Missing avatar/partner images (broken components)

These referenced images do not exist in `/public/`:

- `/avatars/sarah.jpg`, `marcus.jpg`, `emma.jpg`, `david.jpg`, `lisa.jpg`, `alex.jpg` — `components/UserTestimonials.js`
- `/partners/loa.png` — `components/PartnerApps.js`

Add the files or implement graceful fallbacks in these components.

### 3. Oversized icons

| File | Size | Issue |
|------|------|-------|
| `public/icons/vscode.png` | 285KB | 3840×3840 — extreme oversize for web |
| `public/icons/codex.png` | 346KB | 816×816 PNG, no WebP alternative |

Resize `vscode.png` to ≤256px and convert both to WebP.

### 4. Plain `<img>` instead of Next.js `<Image>`

- `components/HowItWorks.js` — `<img src="/mock/mock1.webp">`, no dimensions
- `components/OurStory.js` — `<img src="/mock/mock1.webp">`, no dimensions

These bypass automatic optimization, lazy loading, and responsive sizing. Replace with `<Image>` component.

---

## Image File Inventory

### Mock App Images

| File | Size | Notes |
|------|------|-------|
| `public/mock/mock1.png` | 631KB | PNG source — WebP pair exists (50KB) |
| `public/mock/mock1.webp` | 50KB | ✅ In use |
| `public/mock/mock2.png` | 1.2MB | PNG source — WebP pair exists (74KB) |
| `public/mock/mock2.webp` | 74KB | ✅ In use |
| `public/mock/mock3.png` | 754KB | PNG source — WebP pair exists (66KB) |
| `public/mock/mock3.webp` | 66KB | ✅ In use |
| `public/mock/mock4.png` | 1.2MB | PNG source — WebP pair exists (71KB) |
| `public/mock/mock4.webp` | 71KB | ✅ In use |
| `public/mock/mock5.png` | 707KB | PNG source — WebP pair exists (57KB) |
| `public/mock/mock5.webp` | 57KB | ✅ In use |

The 5 PNG source files total ~4.5MB. If only WebP is served, these can be moved out of `/public/` to avoid being shipped.

### Icons

| File | Size | Format | Notes |
|------|------|--------|-------|
| `public/icons/codex.png` | 346KB | PNG | Large, no WebP — convert and resize |
| `public/icons/vscode.png` | 285KB | PNG | 3840×3840 — extreme oversize, resize to ≤256px |
| `public/icons/chatgtp.webp` | 39KB | WebP | ✅ Good format |
| `public/icons/windsurf.jpg` | 8.1KB | JPEG | Convert to WebP |
| `public/icons/claude.svg` | 4.0KB | SVG | ✅ Good |
| `public/icons/community.svg` | 5.0KB | SVG | ✅ Good |
| `public/icons/ai.svg` | 2.9KB | SVG | ✅ Good |
| `public/icons/control.svg` | 1.9KB | SVG | ✅ Good |

### OG / Meta Images

| File | Size | Notes |
|------|------|-------|
| `public/og.png` | 139KB | No WebP alternative |
| `public/og3.png` | 123KB | No WebP alternative |

OG images are consumed by social scrapers which expect JPEG/PNG — no need for WebP versions specifically for social sharing, but consider WebP if used as on-page images.

### QR Codes

| File | Size | Notes |
|------|------|-------|
| `public/qrcodes/qr-code-ios.svg` | 113KB | Large SVG — run svgo |
| `public/qrcodes/qr-code-android.svg` | 110KB | Large SVG — run svgo |

### App Logo

| File | Size | Notes |
|------|------|-------|
| `public/app_logo.png` | 62KB | PNG source — WebP pair exists (10KB) |
| `public/app_logo.webp` | 10KB | ✅ In use |

### Store Badges

| File | Size | Notes |
|------|------|-------|
| `public/buttons/app-store-badge.svg` | 11KB | ✅ SVG — good |
| `public/buttons/app-store-badge_light.svg` | 10KB | ✅ SVG — good |
| `public/buttons/google-play-badge.png` | 4.6KB | Small, low priority |

---

## Prioritized Optimization List

Sorted by estimated savings:

| Image | Current Size | Format | Issues | Est. Savings |
|-------|--------------|--------|--------|--------------|
| `mock2.png` + `mock4.png` | 1.2MB each | PNG | WebP pair exists; PNGs in public/ | ~2.4MB |
| `mock3.png` | 754KB | PNG | WebP pair exists | ~688KB |
| `mock5.png` | 707KB | PNG | WebP pair exists | ~650KB |
| `mock1.png` | 631KB | PNG | WebP pair exists | ~581KB |
| `icons/codex.png` | 346KB | PNG | No WebP; oversize | ~250KB+ |
| `icons/vscode.png` | 285KB | PNG | 3840×3840 — resize to ≤256px | ~280KB+ |
| `og.png` | 139KB | PNG | No WebP | ~80KB |
| `og3.png` | 123KB | PNG | No WebP | ~70KB |
| `qr-code-ios.svg` | 113KB | SVG | Unoptimized — run svgo | ~50KB |
| `qr-code-android.svg` | 110KB | SVG | Unoptimized — run svgo | ~50KB |
| `icons/windsurf.jpg` | 8.1KB | JPEG | Convert to WebP | ~2-3KB |

**Estimated total savings if all applied: ~4–5MB**

---

## Component Image Analysis

| Component | Image | Alt Text | Dimensions | Priority/Lazy | Issues |
|-----------|-------|----------|------------|---------------|--------|
| `app/page.js` | `mock1.webp` | ✅ "Deckbase App Screenshot" | ✅ 1500×1125 | ✅ `priority` | None |
| `NavBar.js` | `app_logo.webp` | ✅ | ✅ 28×28 | ✅ `priority` | None |
| `NavBar.js` | user avatar | ❌ `alt=""` | — | — | Empty alt |
| `Footer.js` | `app_logo.webp` | ✅ "Deckbase Logo" | ✅ 32×32 | — | None |
| `HowItWorks.js` | `mock1.webp` | ✅ "Deckbase app preview" | ❌ Missing | ❌ Plain `<img>` | No dimensions, plain img tag |
| `OurStory.js` | `mock1.webp` | ✅ "Deckbase App Mockup" | ❌ Missing | ❌ Plain `<img>` | No dimensions, plain img tag |
| `BlockDisplay.js` | dynamic | ❌ `alt=""` | N/A (fill) | — | Empty alt |
| `PartnerApps.js` | partner icons | ✅ dynamic `alt={app.name}` | ✅ 48×48 | — | Missing source files |
| `AppStoreDownloadButton.js` | badge | ✅ "Download on the App Store" | ✅ 150×45 | — | None |
| `GooglePlayDownloadButton.js` | badge | ✅ "Get it on Google Play" | ✅ 150×50 | — | None |
| `UserTestimonials.js` | avatars | — | — | — | Missing source files |

---

## Recommendations

### Immediate (high impact)

1. **Fix empty alt text** in `NavBar.js` and `BlockDisplay.js`. For user-generated content images, derive alt from context (username, card title, etc.).

2. **Replace plain `<img>` tags** in `HowItWorks.js` and `OurStory.js` with Next.js `<Image>` component to get automatic lazy loading, responsive srcset, and CLS prevention:
   ```jsx
   import Image from 'next/image';
   <Image src="/mock/mock1.webp" alt="Deckbase app preview" width={655} height={1354} />
   ```

3. **Resize and convert `vscode.png`** — 3840×3840 is unusable at any web breakpoint. Resize to 256×256 and export as WebP.

4. **Add missing avatar/partner images** or implement graceful image fallbacks in `UserTestimonials.js` and `PartnerApps.js`.

### Medium impact

5. **Add AVIF support** in `next.config.mjs` — Next.js Image will serve AVIF to supported browsers automatically (93.8% support):
   ```js
   images: {
     formats: ['image/avif', 'image/webp'],
     minimumCacheTTL: 31536000,
     qualities: [25, 50, 75, 100],
     remotePatterns: [...],
   },
   ```

6. **Add `decoding="async"`** to all non-hero images to prevent decoding from blocking the main thread:
   ```jsx
   <Image ... decoding="async" />
   ```

7. **Optimize QR SVGs** with svgo:
   ```bash
   npx svgo public/qrcodes/qr-code-ios.svg --multipass
   npx svgo public/qrcodes/qr-code-android.svg --multipass
   ```

8. **Move PNG source files** (`mock1-5.png`, `app_logo.png`) out of `/public/` — WebP versions are in use; PNGs are source assets that don't need to be served.

### Low priority

9. Convert `icons/windsurf.jpg` to WebP.
10. Generate WebP alternatives for `og.png` / `og3.png` if used as on-page images.
11. Consider adding a CI image optimization step (e.g., `sharp` or Squoosh) to prevent oversized images from being committed.

---

## Current `next.config.mjs` Image Config

```js
images: {
  qualities: [25, 50, 75, 100],
  remotePatterns: [
    { protocol: "https", hostname: "firebasestorage.googleapis.com", pathname: "/**" },
    { protocol: "https", hostname: "lh3.googleusercontent.com", pathname: "/**" },
  ],
},
```

**Missing:** `formats`, `minimumCacheTTL`, `deviceSizes` / `imageSizes` customization.
