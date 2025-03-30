import axios from "axios";
import { ref, uploadString } from "firebase/storage";
import { storage } from "../../lib/firebase";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { title, mileage, table, vehicleId } = req.body;

  console.log("Received Request Body:", req.body); // Debug log

  if (!title || !mileage || !table || !vehicleId) {
    return res.status(400).json({ error: "Missing title, mileage, table, or vehicleId" });
  }

  try {
    console.log("Sending data to OpenAI...");

    const prompt = `You are an API to update a maintenance table. The owner just uploaded a new receipt:
    We know that they did: ${title} at mileage=${mileage} miles.
    The current table is:
    ${JSON.stringify(table, null, 2)}
    Without modifying the two first columns, try to see if you can update the third column (LastTimeDone) for some tasks that are related/appear in the title, by filling them with  mileage=${mileage} (a number). 
    For example, if the receipt contains oil change, probably means that he did an oil change so you can update the corresponding field, ok ? Sometimes, there are several tasks in one receipt.
    If this is the case, you also need to update the last column (NextTimeToDo), as such: NextTimeToDo = LastTimeDone + Frequency.
    Your output is simply the JSON table, nothing else, updated with the information from the new receipt. No comments, nothing, so I can process it as a JSON file.`;

    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: "You are an update maintenance table assistant." },
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

    let aiResponse = response.data.choices[0].message.content.trim();
    console.log("Raw AI Response:", aiResponse);

    // Remove Markdown code block formatting if present
    if (aiResponse.startsWith("```json")) {
      aiResponse = aiResponse.slice(7, -3).trim(); // Remove ```json and ```
    }

    const updatedTable = JSON.parse(aiResponse); // Safely parse the JSON
    console.log("Parsed AI Response:", updatedTable);

    // Save the updated table back to Firebase Storage
    const storagePath = `listing/${vehicleId}/docs/maintenanceTable.json`;
    const storageRef = ref(storage, storagePath);

    console.log("Saving updated table to Firebase Storage...");
    await uploadString(storageRef, JSON.stringify(updatedTable), "raw");
    console.log("Updated table saved successfully.");

    res.status(200).json({ response: updatedTable });
  } catch (error) {
    console.error("Error during OpenAI request or Firebase upload:", error.message);
    res.status(500).json({ error: `Failed to update maintenance table: ${error.message}` });
  }
}
