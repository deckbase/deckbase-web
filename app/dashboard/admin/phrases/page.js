import fs from "fs";
import path from "path";
import PhrasesTable from "./phrases-table";

async function loadPhrases() {
  const candidates = [
    "nic-english-phrases-full.json",
    "nic-english-phrases.json",
  ];

  for (const name of candidates) {
    const filePath = path.join(process.cwd(), name);
    if (fs.existsSync(filePath)) {
      try {
        const raw = await fs.promises.readFile(filePath, "utf8");
        const data = JSON.parse(raw);
        if (Array.isArray(data)) {
          return data;
        }
      } catch (err) {
        console.error(`Error reading ${filePath}:`, err);
      }
    }
  }

  return [];
}

export default async function AdminPhrasesPage() {
  const phrases = await loadPhrases();

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Nic English Phrases
          </h1>
          <p className="text-white/60 text-sm">
            Japanese↔English phrases scraped from nic-english.com/phrase
          </p>
        </div>
        <div className="text-right text-xs text-white/40">
          {phrases.length > 0
            ? `${phrases.length} phrases loaded from JSON`
            : "No data found. Run the scrape script to generate JSON."}
        </div>
      </div>

      {phrases.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-6 text-sm text-white/70">
          <p className="mb-2">
            No phrase data JSON was found in the project root.
          </p>
          <p>
            Generate it by running:
            <code className="ml-2 rounded bg-black/60 px-2 py-1 text-xs">
              npm run scrape:nic-english -- --pages=1 --output=nic-english-phrases-full.csv
            </code>
          </p>
        </div>
      ) : (
        <PhrasesTable phrases={phrases} />
      )}
    </div>
  );
}

