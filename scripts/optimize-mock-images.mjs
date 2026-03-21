/**
 * Generate WebP variants for public/mock/mock[1-5].png (run after replacing PNG assets).
 * Usage: node scripts/optimize-mock-images.mjs
 */
import sharp from "sharp";
import fs from "fs";
import { fileURLToPath } from "url";

const dir = fileURLToPath(new URL("../public/mock/", import.meta.url));
for (let i = 1; i <= 5; i++) {
  const base = `mock${i}`;
  const png = `${dir}${base}.png`;
  const webp = `${dir}${base}.webp`;
  if (!fs.existsSync(png)) {
    console.warn("skip (missing):", png);
    continue;
  }
  await sharp(fs.readFileSync(png)).webp({ quality: 82 }).toFile(webp);
  const a = fs.statSync(png).size;
  const b = fs.statSync(webp).size;
  console.log(`${base}: PNG ${a} → WebP ${b} bytes`);
}
