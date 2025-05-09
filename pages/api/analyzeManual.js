import axios from "axios";
import { ref, getDownloadURL } from "firebase/storage";
import { storage } from "../../lib/firebase";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { vehicleId, currentMileage } = req.body;

  if (!vehicleId || currentMileage === undefined) {
    return res
      .status(400)
      .json({ error: "Missing vehicleId or currentMileage" });
  }

  try {
    console.log("Fetching maintenance table from Firebase Storage...");
    const storagePath = `listing/${vehicleId}/docs/maintenanceTable.json`;
    const storageRef = ref(storage, storagePath);
    const downloadURL = await getDownloadURL(storageRef);

    const response = await axios.get(downloadURL);
    const maintenanceTable = response.data;

    // Debugging: Log the maintenance table
    console.log(
      "Fetched maintenanceTable:",
      JSON.stringify(maintenanceTable, null, 2)
    );

    // Validate maintenanceTable structure
    if (!maintenanceTable || !Array.isArray(maintenanceTable.table)) {
      return res
        .status(400)
        .json({ error: "Invalid maintenance table format." });
    }

    console.log("Sending data to OpenAI for recommendation...");

    const prompt = `You are an API to analyze a maintenance table and provide recommendations based on it. The owner provided the following table:
    ${JSON.stringify(maintenanceTable, null, 2)}
    The current mileage of the vehicle is ${currentMileage} miles.

    Your output:
    1. Most urgent task: [Category] at [NextTimeToDo] miles.
    2. Missing history: [list of blank_categories].`;

    // Debugging: Log the constructed prompt
    console.log("Constructed Prompt:", prompt);

    const aiResponse = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a maintenance recommendation assistant.",
          },
          { role: "user", content: prompt },
        ],
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
      }
    );

    const recommendation = aiResponse.data.choices[0].message.content.trim();
    console.log("AI Recommendation:", recommendation);

    // Return the recommendation
    res.status(200).json({ recommendation });
  } catch (error) {
    console.error("Error during recommendation generation:", error.message);

    // Debugging: Log the error stack trace
    console.error("Stack trace:", error.stack);

    res
      .status(500)
      .json({ error: `Failed to generate recommendation: ${error.message}` });
  }
}
