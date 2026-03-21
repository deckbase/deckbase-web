/**
 * Regenerate public/app_logo.webp from public/app_logo.png (run after logo asset changes).
 * Usage: node scripts/optimize-app-logo.mjs
 */
import sharp from "sharp";
import fs from "fs";
import { fileURLToPath } from "url";

const dir = fileURLToPath(new URL("../public/", import.meta.url));
const input = `${dir}app_logo.png`;
const output = `${dir}app_logo.webp`;

await sharp(fs.readFileSync(input)).webp({ quality: 88 }).toFile(output);
const png = fs.statSync(input).size;
const webp = fs.statSync(output).size;
console.log(`app_logo: PNG ${png} bytes → WebP ${webp} bytes`);
