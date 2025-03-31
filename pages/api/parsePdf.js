import axios from "axios";
import pdfParse from "pdf-parse";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: "Missing URL" });
  }

  try {
    console.log("Fetching PDF...");
    const response = await axios.get(url, { responseType: "arraybuffer" });

    console.log("Parsing PDF...");
    const parsedPdf = await pdfParse(Buffer.from(response.data, "binary"));

    // Extract potential maintenance table sections
    const regex = /(\bMaintenance\b.*?)\n\n/gs;
    let matches = [...parsedPdf.text.matchAll(regex)];
    let maintenanceSections = matches.map(m => m[1]).join("\n\n");

    console.log("Filtered maintenance sections.");
    res.status(200).json({ parsedText: maintenanceSections });

  } catch (error) {
    console.error("PDF Parsing Error:", error);
    res.status(500).json({ error: `Failed to parse the PDF: ${error.message}` });
  }
}
