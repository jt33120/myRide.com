import React, { useState, useEffect } from "react";
import { ref, getDownloadURL } from "firebase/storage";
import { storage } from "../lib/firebase";

export default function DebugPage() {
  const [vehicleDetails, setVehicleDetails] = useState({
    year: "",
    make: "",
    model: "",
    color: "",
  });
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tableData, setTableData] = useState(null);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setVehicleDetails((prev) => ({ ...prev, [name]: value }));
  };

  const generateImages = async () => {
    const { year, make, model, color } = vehicleDetails;

    if (!year || !make || !model || !color) {
      alert("Please fill in all fields.");
      return;
    }

    setLoading(true);
    setImages([]);

    try {
      const response = await fetch("/api/generateImage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year, make, model, color }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate images");
      }

      const data = await response.json();
      setImages(data.images);
    } catch (error) {
      console.error("Error generating images:", error);
      alert("Failed to generate images. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const printImage = (imageUrl) => {
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`<img src="${imageUrl}" style="width:100%;">`);
    printWindow.document.close();
    printWindow.print();
  };

  useEffect(() => {
    const fetchTable = async () => {
      try {
        const storagePath = `listing/vehicleId123/docs/maintenanceTable.json`; // Replace 'vehicleId123' with the actual vehicle ID
        const storageRef = ref(storage, storagePath);
        const downloadURL = await getDownloadURL(storageRef);

        const response = await fetch(downloadURL);
        const data = await response.json();
        setTableData(data);
      } catch (err) {
        console.error("Error fetching table:", err);
        setError("Failed to fetch the table.");
      }
    };

    fetchTable();
  }, []);

  if (error) {
    return <div>{error}</div>;
  }

  if (!tableData) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex flex-col items-center p-4">
      <h1 className="text-xl font-bold mb-4">AI Vehicle Image Generator</h1>
      <div className="mb-4">
        <label className="block mb-2">Year:</label>
        <input
          type="text"
          name="year"
          value={vehicleDetails.year}
          onChange={handleChange}
          className="border p-2 w-full"
        />
      </div>
      <div className="mb-4">
        <label className="block mb-2">Make:</label>
        <input
          type="text"
          name="make"
          value={vehicleDetails.make}
          onChange={handleChange}
          className="border p-2 w-full"
        />
      </div>
      <div className="mb-4">
        <label className="block mb-2">Model:</label>
        <input
          type="text"
          name="model"
          value={vehicleDetails.model}
          onChange={handleChange}
          className="border p-2 w-full"
        />
      </div>
      <div className="mb-4">
        <label className="block mb-2">Color:</label>
        <input
          type="text"
          name="color"
          value={vehicleDetails.color}
          onChange={handleChange}
          className="border p-2 w-full"
        />
      </div>
      <button
        onClick={generateImages}
        className="bg-blue-500 text-white px-4 py-2 rounded mb-4"
        disabled={loading}
      >
        {loading ? "Generating..." : "Generate Images"}
      </button>
      {images.length > 0 && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          {images.map((imageUrl, index) => (
            <div key={index} className="flex flex-col items-center">
              <img src={imageUrl} alt={`Generated Vehicle ${index + 1}`} className="border rounded mb-2" />
              <button
                onClick={() => printImage(imageUrl)}
                className="bg-green-500 text-white px-4 py-2 rounded"
              >
                Print Image
              </button>
            </div>
          ))}
        </div>
      )}
      <pre>{JSON.stringify(tableData, null, 2)}</pre>
    </div>
  );
}
