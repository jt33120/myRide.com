import axios from "axios";
import { ref, getDownloadURL } from "firebase/storage";
import { doc, updateDoc } from "firebase/firestore";
import { storage, db } from "../../lib/firebase"; // Ensure Firestore is imported

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

    Your output are these pieces of information (don't display anything else, it's a snapshot for the owner):
    1. Go through all rows, and get the category (first column value) with the smallest value in NextTimeToDo that is still above ${currentMileage} (row that minimizes  NextTimeToDo - ${currentMileage} being > 0. Display a message as such : "Most urgent to come: [Category] at [value in 'NextTimeToDo'] miles". Obviously, the recommendation has to be for a mileage > ${currentMileage}.
    2. Add a warning for all maintenance missing history: list of all categories with blank value in column 'NextTimeToDo' (so-called blank_categories). Like this: "No history found for: [list of blank_categories]. We recommend checking them.
    3. Maintenance Grade: To come`;

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

    // Update the aiRecommendation field in Firestore
    console.log("Updating Firestore with AI recommendation...");
    const vehicleRef = doc(db, "listing", vehicleId);
    await updateDoc(vehicleRef, { aiRecommendation: recommendation });
    console.log("Firestore updated successfully.");

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