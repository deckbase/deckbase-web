import fs from "fs";
import path from "path";
import ExcelJS from "exceljs";

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

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Phrases");

    const keys = Object.keys(data[0]);
    worksheet.columns = keys.map((k) => ({ header: k, key: k }));
    data.forEach((row) => worksheet.addRow(row));

    const buffer = await workbook.xlsx.writeBuffer();

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
