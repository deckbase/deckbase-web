import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";

export async function GET() {
  try {
    const jsonPath = path.join(process.cwd(), "nic-english-phrases-full.json");

    if (!fs.existsSync(jsonPath)) {
      return new Response("Phrase JSON not found. Run the scraper first.", {
        status: 404,
      });
    }

    const raw = await fs.promises.readFile(jsonPath, "utf8");
    const data = JSON.parse(raw);

    if (!Array.isArray(data) || data.length === 0) {
      return new Response("No phrase data to export.", { status: 400 });
    }

    // Convert to worksheet
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Phrases");

    const buffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition":
          'attachment; filename="nic-english-phrases.xlsx"',
      },
    });
  } catch (err) {
    console.error("Error generating XLSX:", err);
    return new Response("Failed to generate XLSX export", { status: 500 });
  }
}

