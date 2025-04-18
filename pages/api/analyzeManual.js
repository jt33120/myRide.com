import axios from "axios";
import { ref, getDownloadURL } from "firebase/storage";
import { storage } from "../../lib/firebase";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { vehicleId, currentMileage } = req.body;

  if (!vehicleId || currentMileage === undefined) {
    return res.status(400).json({ error: "Missing vehicleId or currentMileage" });
  }

  try {
    console.log("Fetching maintenance table from Firebase Storage...");
    const storagePath = `listing/${vehicleId}/docs/maintenanceTable.json`;
    const storageRef = ref(storage, storagePath);
    const downloadURL = await getDownloadURL(storageRef);

    const response = await axios.get(downloadURL);
    const maintenanceTable = response.data;

    console.log("Sending data to OpenAI for recommendation...");

    const prompt = `You are an API to analyze a maintenance table and provide recommendations based on it. You are integrate in a whole app so your goal is to display consistant messages. The owner provided the following table:
    ${JSON.stringify(maintenanceTable, null, 2)}
    The current mileage of the vehicle is ${currentMileage} miles.

    Your output are these pieces of information (don't display anything else, it's a snapshot for the owner):
    1. Get the category (first column) with the smallest value in NextTimeToDo  that is still above ${currentMileage} (basically, filter to get categories with a value > ${currentMileage} in NextTimeTodo, and then get the minimum of this filtered set, the closest to the current mileage in NextTimeToDo). Display a message as such : "Most urgent to come: [Category] at [value in 'NextTimeToDo'] miles". Obviously, the recommendation has to be for a mileage > ${currentMileage}).
    2. Add a warning for all maintenance missing history: list of all categories with blank value in column 'NextTimeToDo' (so-called blank_categories). Like this: "No history found for: [list of blank_categories]. We recommend checking them."`;
//     3. Maintenance grade. grade = count of non-empty categories in 'NextTimeToDo' / count of all categories. Like this: "Maintenance Grade: [grade]" as a percentage.
    const aiResponse = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: "You are a maintenance recommendation assistant." },
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

    let recommendation = aiResponse.data.choices[0].message.content.trim();
    console.log("AI Recommendation:", recommendation);

    // Return the recommendation
    res.status(200).json({ recommendation });
  } catch (error) {
    console.error("Error during recommendation generation:", error.message);
    res.status(500).json({ error: `Failed to generate recommendation: ${error.message}` });
  }
}
