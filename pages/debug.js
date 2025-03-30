import React, { useState, useEffect } from "react";
import { ref, getDownloadURL } from "firebase/storage";
import { storage } from "../lib/firebase"; // Ensure this matches your Firebase setup

export default function DebugPage() {
  const vehicleId = "MOTORCYCLE-pq16PgxleiSSyknpWM2va4BVW8H2-3-19-2025--00-06-51"; // Hardcoded vehicle ID
  const title = "Oil Change HP4S"; // Hardcoded title
  const mileage = 18500; // Hardcoded mileage
  const [loading, setLoading] = useState(false);
  const [updatedTable, setUpdatedTable] = useState(null);
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [maintenanceTable, setMaintenanceTable] = useState(null);

  const fetchMaintenanceTable = async () => {
    console.log("Debug: Fetching maintenance table...");
    try {
      const storagePath = `listing/${vehicleId}/docs/maintenanceTable.json`;
      console.log("Debug: Storage path:", storagePath);

      const storageRef = ref(storage, storagePath);
      console.log("Debug: Storage reference created:", storageRef);

      const url = await getDownloadURL(storageRef);
      console.log("Debug: Download URL fetched:", url);

      setDownloadUrl(url);

      // Use the proxy API to fetch the file content
      const response = await fetch("/api/proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch maintenance table. Status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Debug: Maintenance table fetched successfully:", data.content);

      setMaintenanceTable(data.content);
    } catch (error) {
      console.error("Debug: Error fetching maintenance table:", error.message);
      alert("Failed to fetch maintenance table. Please try again.");
    }
  };

  useEffect(() => {
    fetchMaintenanceTable();
  }, []);

  const handleUpdateMaintenanceTable = async () => {
    console.log("Debug: Starting handleUpdateMaintenanceTable...");
    console.log("Vehicle ID:", vehicleId);
    console.log("Title:", title);
    console.log("Mileage:", mileage);

    if (!maintenanceTable) {
      alert("Maintenance table not loaded yet. Please try again.");
      return;
    }

    setLoading(true);
    try {
      // Call the updateMaintenanceTable API
      console.log("Debug: Calling updateMaintenanceTable API...");
      const apiResponse = await fetch("/api/updateMaintenanceTable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, mileage, table: maintenanceTable, vehicleId }), // Include vehicleId
      });

      if (!apiResponse.ok) {
        const errorData = await apiResponse.json();
        console.error("Debug: API response error:", errorData);
        throw new Error(errorData.error || "Failed to update maintenance table");
      }

      const data = await apiResponse.json();
      console.log("Debug: Updated Maintenance Table received:", data.response);
      setUpdatedTable(data.response); // Use the parsed JSON directly
    } catch (error) {
      console.error("Debug: Error in handleUpdateMaintenanceTable:", error.message);
      alert("Failed to update maintenance table: " + error.message);
    } finally {
      setLoading(false);
      console.log("Debug: Finished handleUpdateMaintenanceTable.");
    }
  };

  return (
    <div className="flex flex-col items-center p-4">
      <h1 className="text-xl font-bold mb-4">Debug Page</h1>
      <div className="mb-4">
        <p><strong>Vehicle ID:</strong> {vehicleId}</p>
        <p><strong>Title:</strong> {title}</p>
        <p><strong>Mileage:</strong> {mileage}</p>
      </div>
      {downloadUrl && (
        <div className="mb-4">
          <a
            href={downloadUrl}
            download="maintenanceTable.json"
            className="text-blue-500 underline"
          >
            Download Maintenance Table
          </a>
        </div>
      )}
      {maintenanceTable && (
        <div className="mb-4 bg-gray-100 p-4 rounded-lg shadow-md w-full max-w-md overflow-auto">
          <h2 className="text-lg font-semibold mb-2">Maintenance Table Preview</h2>
          <pre className="text-sm whitespace-pre-wrap">
            {JSON.stringify(maintenanceTable, null, 2)}
          </pre>
        </div>
      )}
      <button
        onClick={handleUpdateMaintenanceTable}
        className="bg-blue-500 text-white px-4 py-2 mt-2 rounded"
        disabled={loading}
      >
        {loading ? "Updating..." : "Update Maintenance Table"}
      </button>
      {updatedTable && (
        <pre className="mt-4 p-4 bg-gray-100 rounded w-full max-w-md overflow-auto">
          {JSON.stringify(updatedTable, null, 2)}
        </pre>
      )}
    </div>
  );
}
