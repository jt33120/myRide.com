// pages/debug.js
import { useState } from "react";

export default function DebugPage() {
  const [fileContent, setFileContent] = useState(null);
  const [error, setError] = useState(null);
  const [fileUrl, setFileUrl] = useState(null); // State to store the file URL
  const [updateMessage, setUpdateMessage] = useState(null);
  const [analyzeOutput, setAnalyzeOutput] = useState(null);

  const handleFetchFile = async () => {
    setError(null);
    setFileContent(null);
    setFileUrl(null);

    try {
      console.log("Fetching file content via proxy API...");
      const vehicleId = "CAR-pq16PgxleiSSyknpWM2va4BVW8H2-3-15-2025--20-47-29";
      const response = await fetch(`/api/fetchMaintenanceTable?vehicleId=${vehicleId}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch file content. Status: ${response.status}`);
      }

      const text = await response.text();
      console.log("Fetched file content (via proxy):", text);

      // Display the content as plain text
      setFileContent(text);
    } catch (err) {
      console.error("Error fetching file:", err.message);
      setError(`Error fetching file: ${err.message}`);
    }
  };

  const handleUpdateMaintenanceTable = async () => {
    setError(null);
    setUpdateMessage(null);
    setAnalyzeOutput(null);

    try {
      console.log("Updating maintenance table...");
      const vehicleId = "CAR-pq16PgxleiSSyknpWM2va4BVW8H2-3-15-2025--20-47-29";
      const currentMileage = 140000;
      const receiptData = { title: "Oil Change" };

      // Call the updateMaintenanceTable API
      const updateResponse = await fetch("/api/updateMaintenanceTable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vehicleId, currentMileage, receiptData }),
      });

      const updateData = await updateResponse.json();

      if (!updateResponse.ok) {
        console.error("Update failed:", updateData);
        throw new Error(updateData.error || `Failed to update maintenance table. Status: ${updateResponse.status}`);
      }

      console.log("Update response:", updateData);
      setUpdateMessage(updateData.message);

      // Fetch the updated maintenance table using analyzeManual.js
      console.log("Fetching updated maintenance table...");
      const analyzeResponse = await fetch("/api/analyzeManual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vehicleId }),
      });

      const analyzeData = await analyzeResponse.json();

      if (!analyzeResponse.ok) {
        console.error("Analyze failed:", analyzeData);
        throw new Error(analyzeData.error || `Failed to fetch updated maintenance table. Status: ${analyzeResponse.status}`);
      }

      console.log("Analyze response:", analyzeData);
      setAnalyzeOutput(analyzeData);
    } catch (err) {
      console.error("Error:", err.message);
      setError(`Error: ${err.message}`);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Debug Firebase File</h1>
      <button
        onClick={handleFetchFile}
        className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
      >
        Fetch Maintenance Table
      </button>

      <button
        onClick={handleUpdateMaintenanceTable}
        className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 mt-4"
      >
        Update Maintenance Table
      </button>

      {fileUrl && (
        <p className="mt-4">
          File URL:{" "}
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 underline"
          >
            {fileUrl}
          </a>
        </p>
      )}

      {error && <p className="text-red-500 mt-4">Error: {error}</p>}
      {fileContent && (
        <pre className="mt-4 p-4 bg-gray-100 rounded max-w-full overflow-auto">
          {fileContent}
        </pre>
      )}

      {updateMessage && <p className="mt-4 text-green-500">Update: {updateMessage}</p>}
      {analyzeOutput && (
        <div className="mt-4">
          <h2 className="text-lg font-bold">Analyze Output:</h2>
          <pre className="bg-gray-100 p-4 rounded-md overflow-auto">
            {JSON.stringify(analyzeOutput, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
