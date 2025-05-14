import { useState, useEffect } from "react";
import { ref, listAll, getDownloadURL } from "firebase/storage";
import { doc, getDoc } from "firebase/firestore";
import { storage, db } from "../lib/firebase";
import { useAuth } from "../hooks/useAuth";
import Image from "next/image";

export default function GenerateImagePage() {
  const { currentUser } = useAuth();
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [vehicleDetails, setVehicleDetails] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [aiImage, setAiImage] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchVehicles = async () => {
      if (!currentUser) return;

      try {
        const userDoc = await getDoc(doc(db, "members", currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const vehicleIds = userData.vehicles || [];

          // Fetch details for each vehicle to construct titles
          const vehicleDetailsPromises = vehicleIds.map(async (vehicleId) => {
            const vehicleDoc = await getDoc(doc(db, "listing", vehicleId));
            if (vehicleDoc.exists()) {
              const { make, model, year } = vehicleDoc.data();
              return { id: vehicleId, title: `${year} ${make} ${model}` };
            }
            return { id: vehicleId, title: "Unknown Vehicle" };
          });

          const vehiclesWithTitles = await Promise.all(vehicleDetailsPromises);
          setVehicles(vehiclesWithTitles);
        }
      } catch (error) {
        console.error("Error fetching vehicles:", error);
      }
    };

    fetchVehicles();
  }, [currentUser]);

  const fetchVehicleDetails = async (vehicleId) => {
    try {
      const vehicleDoc = await getDoc(doc(db, "listing", vehicleId));
      if (vehicleDoc.exists()) {
        return vehicleDoc.data();
      } else {
        console.error("Vehicle details not found for ID:", vehicleId);
        return null;
      }
    } catch (error) {
      console.error("Error fetching vehicle details:", error);
      return null;
    }
  };

  const fetchPhotos = async (vehicleId) => {
    try {
      const storagePath = `listing/${vehicleId}/photos`;
      const storageRef = ref(storage, storagePath);

      // List all files in the directory
      const result = await listAll(storageRef);
      if (result.items.length === 0) {
        alert("No photos found for the selected vehicle.");
        return [];
      }

      const photoUrls = await Promise.all(
        result.items.map((item) => getDownloadURL(item))
      );

      console.log("Fetched photo URLs:", photoUrls);
      return photoUrls;
    } catch (error) {
      console.error("Error fetching photos:", error);
      alert("Failed to fetch photos. Please try again.");
      return [];
    }
  };

  const handleVehicleSelection = async (vehicleId) => {
    setSelectedVehicle(vehicleId);
    setVehicleDetails(null);
    setPhotos([]);
    setAiImage(null);

    if (vehicleId) {
      const details = await fetchVehicleDetails(vehicleId);
      setVehicleDetails(details);

      const photoUrls = await fetchPhotos(vehicleId);
      setPhotos(photoUrls);
    }
  };

  const generateAIImage = async () => {
    if (!selectedVehicle || !vehicleDetails || photos.length === 0) {
      alert("Please select a vehicle and ensure photos are available.");
      return;
    }

    try {
      setLoading(true);
      setAiImage(null);

      const response = await fetch("/api/generateImage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          vehicleDetails,
          selectedVehicle,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to generate AI image: ${response.statusText}`);
      }

      const { aiImageUrl } = await response.json();
      console.log("AI-generated toy model URL:", aiImageUrl);
      setAiImage(aiImageUrl);
    } catch (error) {
      console.error("Error generating AI image:", error);
      alert("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">
        Generate High-Quality Toy Model
      </h1>

      {/* Vehicle Selection */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">
          Select a Vehicle
        </label>
        <select
          value={selectedVehicle}
          onChange={(e) => handleVehicleSelection(e.target.value)}
          className="border border-gray-300 p-2 rounded w-full"
        >
          <option value="">-- Select a Vehicle --</option>
          {vehicles.map((vehicle, index) => (
            <option key={index} value={vehicle.id}>
              {vehicle.title}
            </option>
          ))}
        </select>
      </div>

      {/* Vehicle Details */}
      {vehicleDetails && (
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Vehicle Details</h2>
          <p>
            <strong>Make:</strong> {vehicleDetails.make}
          </p>
          <p>
            <strong>Model:</strong> {vehicleDetails.model}
          </p>
          <p>
            <strong>Year:</strong> {vehicleDetails.year}
          </p>
        </div>
      )}

      {/* Display Fetched Photos */}
      {photos.length > 0 && (
        <div className="mt-4">
          <h2 className="text-lg font-semibold mb-2">Fetched Photos</h2>
          <div className="grid grid-cols-3 gap-4">
            {photos.map((photo, index) => (
              <Image
                key={index}
                src={photo}
                alt={`Vehicle Photo ${index + 1}`}
                className="w-full h-auto rounded shadow"
                width={600}
                height={400}
                quality={80}
              />
            ))}
          </div>
        </div>
      )}

      <button
        onClick={generateAIImage}
        disabled={loading || !selectedVehicle || photos.length === 0}
        className="btn"
      >
        {loading ? "Processing..." : "Generate Toy Model"}
      </button>

      {/* Display AI-Generated Image */}
      {aiImage && (
        <div className="mt-4">
          <h2 className="text-lg font-semibold mb-2">AI-Generated Toy Model</h2>
          <Image
            src={aiImage}
            alt="AI-Generated Toy Model"
            className="w-full h-auto rounded shadow"
            width={600}
            height={400}
            quality={80}
          />
        </div>
      )}
    </div>
  );
}
