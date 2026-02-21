# Nic English phrase scraper

Scrapes [ニック式英会話 ひとこと英会話](https://nic-english.com/phrase/) and builds a table (CSV) with:

| Column | Description |
|--------|-------------|
| **japanese_translation** | Japanese translation of the phrase |
| **phrase** | English phrase |
| **category** | シチュエーション (e.g. 仕事, 性格, 交通) |
| **part_of_speech** | 文法 (e.g. 形容詞, 過去のこと) |
| **explanation** | Short explanation (excerpt from the listing page) |

## Usage

```bash
# Scrape first page only → nic-english-phrases.csv
node scripts/scrape-nic-english.js

# Scrape 5 pages
node scripts/scrape-nic-english.js --pages=5

# Custom output file
node scripts/scrape-nic-english.js --output=data/phrases.csv
```

The site has many pages (~315); use `--pages=N` to limit how many archive pages to fetch. There is a short delay between requests to be polite to the server.

## Output

- CSV with BOM (Excel-friendly), quoted fields, commas in content escaped.
- Default file: `nic-english-phrases.csv` in project root.

## Requirements

- Node 18+ (for `fetch`)
- `cheerio` (dev dependency)
