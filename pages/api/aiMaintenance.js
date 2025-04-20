import axios from "axios"; // Import axios
import { ref, getDownloadURL } from "firebase/storage"; // Import ref and getDownloadURL
import { storage } from "../../lib/firebase"; // Ensure storage is correctly imported

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt, vehicleId, vehicleDetails } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required.' });
  }

  if (!vehicleId || !vehicleDetails || !vehicleDetails.make || !vehicleDetails.model || !vehicleDetails.year) {
    return res.status(400).json({ error: 'Vehicle ID and details (make, model, year) are required.' });
  }

  try {
    // Debugging: Log incoming request
    console.log("Received request with vehicleId:", vehicleId);
    console.log("Vehicle details:", vehicleDetails);

    console.log("Fetching maintenance table from Firebase Storage...");
    const storagePath = `listing/${vehicleId}/docs/maintenanceTable.json`;
    const storageRef = ref(storage, storagePath); // Use ref to create a reference to the file
    const downloadURL = await getDownloadURL(storageRef); // Get the download URL

    const maintenanceResponse = await axios.get(downloadURL);
    const maintenanceTable = maintenanceResponse.data;

    // Debugging: Log the fetched maintenance table
    console.log("Fetched maintenanceTable:", JSON.stringify(maintenanceTable, null, 2));

    // Simplify the prompt to avoid exceeding token limits
    const vehicleContext = `
      Vehicle Details:
      - Make: ${vehicleDetails.make}
      - Model: ${vehicleDetails.model}
      - Year: ${vehicleDetails.year}
      - Mileage: ${vehicleDetails.mileage || 'Unknown'}
    `;

    const tableSummary = maintenanceTable.table
      .map((item) => `${item.Task}: Next at ${item.NextTimeToDo || 'Unknown'}, Last done at ${item.LastTimeDone || 'Unknown'}`)
      .join('\n');

    const fullPrompt = `
      Information about the vehicle:
      ${vehicleContext}

      Maintenance Summary:
      ${tableSummary}

      User Question: ${prompt}

      You are a maintenance helper for this vehicle owner. Answer the user question as accurately as possible.
    `;

    // Debugging: Log the constructed prompt
    console.log("Constructed Prompt:", fullPrompt);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: fullPrompt }],
        max_tokens: 1500,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      const answer = data.choices?.[0]?.message?.content.trim() || '';
      res.status(200).json({ answer });
    } else {
      console.error("OpenAI API Error:", data.error?.message);
      res.status(response.status).json({ error: data.error?.message || 'Unknown error' });
    }
  } catch (error) {
    console.error('Error processing AI maintenance prompt:', error.message);
    res.status(500).json({ error: 'Failed to process the AI maintenance prompt.' });
  }
}