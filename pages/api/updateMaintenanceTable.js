import { ref, getDownloadURL, uploadString } from "firebase/storage";
import { storage } from "../../lib/firebase";
import axios from "axios";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { vehicleId, currentMileage, receiptData } = req.body;

  if (!vehicleId || currentMileage === undefined || !receiptData) {
    return res.status(400).json({ error: "Missing vehicleId, currentMileage, or receiptData" });
  }

  try {
    // Step 1: Fetch the existing maintenance table from Firebase Storage
    console.log("Fetching maintenance table from Firebase Storage...");
    const storagePath = `listing/${vehicleId}/docs/maintenanceTable.json`;
    const storageRef = ref(storage, storagePath);
    const downloadURL = await getDownloadURL(storageRef);

    const response = await axios.get(downloadURL);
    const maintenanceTable = response.data;

    console.log("Fetched maintenance table:", maintenanceTable);

    // Step 2: Send the maintenance table to OpenAI for processing
    console.log("Sending maintenance table to OpenAI...");
    const prompt = `You are an API to update a maintenance table. The owner just uploaded a new receipt:
The receipt title is: "${receiptData.title}".
The current mileage of the vehicle is ${currentMileage}.
The current table is:
${JSON.stringify(maintenanceTable, null, 2)}

Instructions:
1. Analyze the receipt title and check for keywords that match the first column of the table (e.g., "Oil Change", "Oil Filter", "Brake Pad"). If a keyword is found, update the corresponding row in the table.
2. Update the "LastTimeDone" column for the matching rows with the current mileage (${currentMileage}).
3. For each updated row, calculate "NextTimeToDo" as follows: NextTimeToDo = LastTimeDone + Frequency.
4. If no matching keywords are found in the receipt title, leave the table unchanged.

Your output should be the updated JSON table. Do not include any additional text or comments.`;

    const aiResponse = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: "You are a maintenance table update assistant." },
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

    let updatedTable = aiResponse.data.choices[0].message.content.trim();
    console.log("AI Response:", updatedTable);

    // Step 3: Parse and validate the AI's output
    if (updatedTable.startsWith("```json")) {
      updatedTable = updatedTable.slice(7, -3).trim(); // Remove ```json and ```
    }
    const parsedTable = JSON.parse(updatedTable);

    console.log("Parsed updated table:", parsedTable);

    // Step 4: Overwrite the maintenance table in Firebase Storage
    console.log("Saving updated maintenance table to Firebase Storage...");
    await uploadString(storageRef, JSON.stringify(parsedTable), "raw");

    console.log("Updated maintenance table saved successfully.");
    res.status(200).json({ message: "Maintenance table updated successfully." });
  } catch (error) {
    console.error("Error updating maintenance table:", error.message);
    res.status(500).json({ error: `Failed to update maintenance table: ${error.message}` });
  }
}
