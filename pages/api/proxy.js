import axios from "axios";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: "Missing URL" });
  }

  try {
    console.log("Fetching file from URL:", url);

    // Fetch the file content from the provided URL
    const response = await axios.get(url, { responseType: "json" });

    res.status(200).json({ content: response.data });
  } catch (error) {
    console.error("Error fetching file:", error.message);
    res.status(500).json({ error: `Failed to fetch file: ${error.message}` });
  }
}
