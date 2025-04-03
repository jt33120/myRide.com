import { doc, setDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { vehicleId, currentMileage } = req.body;

  if (!vehicleId || currentMileage === undefined) {
    return res.status(400).json({ error: "Missing vehicleId or currentMileage" });
  }

  try {
    // Fetch the existing maintenance table (if needed)
    const maintenanceTable = [
      // Example: Replace this with logic to fetch and update the table
      { category: "Oil Change", nextTimeToDo: 5000 },
      { category: "Brake Inspection", nextTimeToDo: 10000 },
    ];

    // Update the maintenance table with the latest mileage
    const updatedTable = maintenanceTable.map((entry) => ({
      ...entry,
      lastMileageDone: entry.nextTimeToDo <= currentMileage ? currentMileage : entry.lastMileageDone,
      nextTimeToDo: entry.nextTimeToDo <= currentMileage ? currentMileage + 5000 : entry.nextTimeToDo,
    }));

    // Save the updated table to Firebase
    const docRef = doc(db, `listing/${vehicleId}/docs/maintenanceTable`);
    await setDoc(docRef, { table: updatedTable });

    res.status(200).json({ message: "Maintenance table updated successfully." });
  } catch (error) {
    console.error("Error updating maintenance table:", error);
    res.status(500).json({ error: "Failed to update maintenance table." });
  }
}
