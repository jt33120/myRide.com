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
    console.log("Fetching maintenance table as JSON...");
    const storagePath = `listing/${vehicleId}/docs/maintenanceTable.json`;
    const storageRef = ref(storage, storagePath);

    const downloadURL = await getDownloadURL(storageRef);
    console.log("Download URL fetched successfully:", downloadURL);

    const response = await axios.get(downloadURL);
    const maintenanceTable = response.data;
    console.log("Fetched maintenance table successfully:", maintenanceTable);

    console.log("Sending maintenance table to OpenAI...");
    const prompt = `You are an API to update a maintenance table. The owner just uploaded a new receipt:
The receipt title is: "${receiptData.title}".
The current mileage of the vehicle is ${currentMileage}.
The current table is, in JSON format:
${JSON.stringify(maintenanceTable, null, 2)}

Instructions:
1. Analyze the receipt title and check for keywords that match the "Task" field in the table (e.g., "Oil Change", "Oil Filter", "Brake Pad"). If a keyword is found, update the corresponding entry in the table. The idea is interpreting the user input as part or not of the table.
2. Update the "LastTimeDone" field for the matching entries with the current mileage (${currentMileage}).
3. For each updated entry, calculate "NextTimeToDo" as follows: NextTimeToDo = LastTimeDone + Frequency (convert Frequency to numeric if needed).
4. If no matching keywords are found in the receipt title, leave the table unchanged.

Your output should be the updated JSON format of the maintenance table, exact same format but with updated values. Do not include any additional text or comments.`;

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
    console.log("OpenAI API response received.");

    const updatedTable = JSON.parse(aiResponse.data.choices[0].message.content.trim());
    console.log("AI Response (updated table):", updatedTable);

    console.log("Saving updated maintenance table as JSON...");
    const metadata = {
      contentType: "application/json",
    };
    await uploadString(storageRef, JSON.stringify(updatedTable, null, 2), "raw", metadata);
    console.log("Updated maintenance table saved successfully at:", new Date().toISOString());

        // Call analyzeManual to update aiRec and aiRecommendation
        console.log("Calling analyzeManual to update AI recommendations...");
        const analyzeResponse = await axios.post(
          "/api/analyzeManual",
          { vehicleId, currentMileage },
          {
            headers: {
              "Content-Type": "application/json",
            }
          }
        );
    
        if (!analyzeResponse.data || !analyzeResponse.data.success) {
          throw new Error("Failed to update AI recommendations via analyzeManual.");
        }
    
        console.log("AI recommendations updated successfully via analyzeManual.");
    
        res.status(200).json({
          message: "Maintenance table and AI recommendations updated successfully.",
          timestamp: new Date().toISOString(),
        });
  } catch (error) {
    console.error("Error updating maintenance table at:", new Date().toISOString(), error.message);

    // Log detailed error information
    if (error.response) {
      console.error("Error response data:", error.response.data);
      console.error("Error response status:", error.response.status);
      console.error("Error response headers:", error.response.headers);
    }

    res.status(500).json({
      error: `Failed to update maintenance table: ${error.message}`,
      details: error.response ? error.response.data : null,
      timestamp: new Date().toISOString(),
    });
  }
}
