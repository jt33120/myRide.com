import { ref, getDownloadURL } from "firebase/storage";
import { storage } from "../../lib/firebase";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { vehicleId } = req.query;

  if (!vehicleId) {
    return res.status(400).json({ error: "Missing vehicleId" });
  }

  try {
    console.log("Fetching maintenance table for vehicle:", vehicleId);

    // Define the Firebase Storage path for the JSON file
    const filePath = `listing/${vehicleId}/docs/maintenanceTable.json`;
    const fileRef = ref(storage, filePath);

    // Get the download URL for the JSON file
    const url = await getDownloadURL(fileRef);
    console.log("Generated Firebase file URL:", url);

    // Fetch the JSON file content from the URL
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch file content. Status: ${response.status}`);
    }

    const json = await response.json();
    console.log("Fetched maintenance table (JSON):", json);

    // Return the JSON content
    res.status(200).json(json);
  } catch (error) {
    console.error("Error fetching maintenance table:", error.message);
    res.status(500).json({ error: "Failed to fetch maintenance table" });
  }
}
