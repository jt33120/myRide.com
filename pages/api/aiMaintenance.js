import axios from "axios";
import { ref, getDownloadURL } from "firebase/storage";
import { storage } from "../../lib/firebase";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { prompt, vehicleId, vehicleDetails } = req.body;

  // Validation des données d'entrée
  if (
    !prompt ||
    !vehicleId ||
    !vehicleDetails ||
    !vehicleDetails.make ||
    !vehicleDetails.model ||
    !vehicleDetails.year
  ) {
    return res
      .status(400)
      .json({
        error:
          "Missing required fields: prompt, vehicleId, or vehicleDetails (make, model, year).",
      });
  }

  try {
    console.log("Requête reçue avec vehicleId :", vehicleId);
    console.log("Détails du véhicule :", vehicleDetails);

    const storagePath = `listing/${vehicleId}/docs/maintenanceTable.json`;
    const storageRef = ref(storage, storagePath);
    const downloadURL = await getDownloadURL(storageRef);

    const maintenanceResponse = await axios.get(downloadURL);
    const maintenanceTable = maintenanceResponse.data;

    // Validation du format de la table de maintenance
    if (!maintenanceTable || !Array.isArray(maintenanceTable.table)) {
      throw new Error("Invalid maintenance table format.");
    }

    console.log(
      "Table de maintenance récupérée :",
      JSON.stringify(maintenanceTable, null, 2)
    );

    const vehicleContext = `
      Vehicle Details:
      - Make: ${vehicleDetails.make}
      - Model: ${vehicleDetails.model}
      - Year: ${vehicleDetails.year}
      - Mileage: ${vehicleDetails.mileage || "Unknown"}
    `;

    const tableSummary = maintenanceTable.table
      .map(
        (item) =>
          `${item.Task}: Next at ${
            item.NextTimeToDo || "Unknown"
          }, Last done at ${item.LastTimeDone || "Unknown"}`
      )
      .join("\n");

    const fullPrompt = `
      Information about the vehicle:
      ${vehicleContext}

      Maintenance Summary:
      ${tableSummary}

      User Question: ${prompt}

      You are a maintenance helper for this vehicle owner. Answer the user question as accurately as possible.
    `;

    console.log("Prompt construit :", fullPrompt);

    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: fullPrompt }],
        max_tokens: 1500,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
      }
    );

    if (response.status === 200) {
      const answer = response.data.choices?.[0]?.message?.content.trim() || "";
      res.status(200).json({ answer });
    } else {
      console.error("Erreur API OpenAI :", response.data.error?.message);
      res
        .status(response.status)
        .json({ error: response.data.error?.message || "Erreur inconnue" });
    }
  } catch (error) {
    console.error("Erreur lors du traitement du prompt AI :", error.message);

    if (error.response) {
      console.error("Détails de l'erreur :", error.response.data);
    }

    res.status(500).json({
      error: "Failed to process the AI maintenance prompt.",
      details: error.response ? error.response.data : null,
    });
  }
}
