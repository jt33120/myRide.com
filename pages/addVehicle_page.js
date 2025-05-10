// pages/addVehicle_page.jsx
import { useState } from "react";
import { useRouter } from "next/router";
import { auth, db, storage } from "../lib/firebase"; // Include storage
import { doc, setDoc, updateDoc, arrayUnion } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";

export default function AddVehiclePage() {
  const router = useRouter();

  // Basic vehicle info
  const [vehicleType, setVehicleType] = useState("");
  const [selectedMake, setSelectedMake] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [boughtAt, setBoughtAt] = useState("");
  const [color, setColor] = useState("");
  const [title, setTitle] = useState("");
  const [mileage, setMileage] = useState("");
  const [zip, setZip] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [engine, setEngine] = useState("");
  const [transmission, setTransmission] = useState("");
  const [fuelType, setFuelType] = useState("");
  const [description, setDescription] = useState("");

  // Cost fields
  const [withoutPurchasePrice, setWithoutPurchasePrice] = useState("");
  const [repairCost, setRepairCost] = useState("");
  const [scheduledMaintenance, setScheduledMaintenance] = useState("");
  const [cosmeticMods, setCosmeticMods] = useState("");
  const [performanceMods, setPerformanceMods] = useState("");

  const [errors, setErrors] = useState({});

  // Marketplace toggle: if true then all fields (except VIN) are required
  const [marketplace, setMarketplace] = useState(false);
  const [saving, setSaving] = useState(false); // Add saving initialization

  const makes = ["Toyota", "BMW", "Ford", "Audi"];
  const models = ["Corolla", "X5", "Focus", "A4"];
  const years = Array.from({ length: 45 }, (_, i) => 1980 + i).reverse();

  const handleSubmit = async () => {
    const user = auth.currentUser;
    if (!user) {
      alert("Please log in first.");
      return;
    }

    // If marketplace is selected, require all fields (except VIN)
    const requiredKeys = marketplace
      ? [
          "vehicleType",
          "selectedMake",
          "selectedModel",
          "selectedYear",
          "boughtAt",
          // "vin", // Removed vin requirement
          "color",
          "title",
          "mileage",
          "zip",
          "state",
          "city",
          "engine",
          "transmission",
          "fuelType",
          "withoutPurchasePrice",
          "repairCost",
          "scheduledMaintenance",
          "cosmeticMods",
          "performanceMods",
          "description",
        ]
      : [];
    const newErrors = {};
    requiredKeys.forEach((key) => {
      // Using local variables names directly as they are in state
      // All values are trimmed strings; you could add further parsing if needed.
      if (!eval(key)) newErrors[key] = true;
    });
    setErrors(newErrors);
    if (Object.keys(newErrors).length) return;

    setSaving(true); // Start saving state

    // Prepare payload
    const vehicleData = {
      uid: user.uid,
      vehicleType,
      make: selectedMake,
      model: selectedModel,
      year: Number(selectedYear),
      boughtAt: Number(boughtAt),
      color,
      title,
      mileage: Number(mileage),
      zip,
      state,
      city,
      engine,
      transmission,
      fuelType,
      withoutPurchasePrice: Number(withoutPurchasePrice),
      repairCost: Number(repairCost),
      scheduledMaintenance: Number(scheduledMaintenance),
      cosmeticMods: Number(cosmeticMods),
      performanceMods: Number(performanceMods),
      description,
      createdAt: new Date(),
      marketplace, // record whether to list on marketplace
    };

    // Write vehicle data to Firestore
    const id = `${vehicleType}-${Date.now()}`;
    const listingRef = doc(db, "listing", id);
    await setDoc(listingRef, vehicleData);
    await updateDoc(doc(db, "members", user.uid), {
      vehicles: arrayUnion(id),
    });

    // Helper function to upload photos for a given category.
    const uploadCategory = async (files, category) => {
      return await Promise.all(
        files.map(async (file) => {
          const photoName = `${id}-${Date.now()}-${category}-${file.name}`;
          const storageRef = ref(
            storage,
            `listing/${id}/photos/${category}/${photoName}`
          );
          const snapshot = await uploadBytesResumable(storageRef, file);
          return await getDownloadURL(snapshot.ref);
        })
      );
    };

    // Upload photos if files exist for each category.
    const frontURLs =
      frontPhotos.length > 0 ? await uploadCategory(frontPhotos, "front") : [];
    const rearURLs =
      rearPhotos.length > 0 ? await uploadCategory(rearPhotos, "rear") : [];
    const sideURLs =
      sidePhotos.length > 0 ? await uploadCategory(sidePhotos, "side") : [];
    const interiorURLs =
      interiorPhotos.length > 0
        ? await uploadCategory(interiorPhotos, "interior")
        : [];
    const dashboardURLs =
      dashboardPhotos.length > 0
        ? await uploadCategory(dashboardPhotos, "dashboard")
        : [];
    const engineBayURLs =
      engineBayPhotos.length > 0
        ? await uploadCategory(engineBayPhotos, "engineBay")
        : [];

    // Update Firestore with photo URLs
    await updateDoc(listingRef, {
      photos: {
        front: frontURLs,
        rear: rearURLs,
        side: sideURLs,
        interior: interiorURLs,
        dashboard: dashboardURLs,
        engineBay: engineBayURLs,
      },
    });

    // Build AI prompt using collected data
    const prompt = `
Provide a maintenance recommendation for this vehicle using all details below:
Year: ${vehicleData.year}
Mileage: ${vehicleData.mileage}
Purchase price: $${vehicleData.boughtAt}
Without purchase price: $${vehicleData.withoutPurchasePrice}
Repair cost: $${vehicleData.repairCost}
Scheduled maintenance cost: $${vehicleData.scheduledMaintenance}
Cosmetic mods cost: $${vehicleData.cosmeticMods}
Performance mods cost: $${vehicleData.performanceMods}
Engine: ${vehicleData.engine}
Transmission: ${vehicleData.transmission}
Horsepower: ${vehicleData.horsepower} HP
Fuel type: ${vehicleData.fuelType}
Description: ${vehicleData.description}
`;
    try {
      const aiRes = await fetch("/api/aiMaintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          vehicleId: id,
          vehicleDetails: vehicleData,
        }),
      });
      const aiJson = await aiRes.json();
      if (aiRes.ok && aiJson.answer) {
        await updateDoc(listingRef, { aiRecommendation: aiJson.answer });
      }
    } catch (err) {
      console.error("AI error:", err);
    }

    setSaving(false); // End saving state
    router.push(`/vehicleCard/${id}`);
  };

  // Basic fields – note Transmission and Fuel Type are now selects
  const basicFields = [
    {
      label: "Vehicle Type",
      name: "vehicleType",
      value: vehicleType,
      onChange: setVehicleType,
      type: "select",
      options: ["car", "motorcycle"],
    },
    {
      label: "Make",
      name: "selectedMake",
      value: selectedMake,
      onChange: setSelectedMake,
      type: "select",
      options: makes,
    },
    {
      label: "Model",
      name: "selectedModel",
      value: selectedModel,
      onChange: setSelectedModel,
      type: "select",
      options: models,
    },
    {
      label: "Year",
      name: "selectedYear",
      value: selectedYear,
      onChange: setSelectedYear,
      type: "select",
      options: years,
    },
    {
      label: "Bought At ($)",
      name: "boughtAt",
      value: boughtAt,
      onChange: setBoughtAt,
      type: "number",
    },
    {
      label: "Color",
      name: "color",
      value: color,
      onChange: setColor,
    },
    {
      label: "Title",
      name: "title",
      value: title,
      onChange: setTitle,
      type: "select",
      options: ["clean", "salvage", "rebuilt"],
    },
    {
      label: "Mileage",
      name: "mileage",
      value: mileage,
      onChange: setMileage,
      type: "number",
    },
    {
      label: "ZIP",
      name: "zip",
      value: zip,
      onChange: setZip,
    },
    {
      label: "State",
      name: "state",
      value: state,
      onChange: setState,
    },
    {
      label: "City",
      name: "city",
      value: city,
      onChange: setCity,
    },
    {
      label: "Engine",
      name: "engine",
      value: engine,
      onChange: setEngine,
    },
    {
      label: "Transmission",
      name: "transmission",
      value: transmission,
      onChange: setTransmission,
      type: "select",
      options: ["Automatic", "Manual", "Semi-Automatic", "CVT", "Other"],
    },
    {
      label: "Fuel Type",
      name: "fuelType",
      value: fuelType,
      onChange: setFuelType,
      type: "select",
      options: ["Gasoline", "Diesel", "Electric", "Hybrid", "Other"],
    },
  ];

  const costFields = [
    {
      label: "Without Purchase Price",
      state: withoutPurchasePrice,
      setter: setWithoutPurchasePrice,
    },
    { label: "Repair Cost", state: repairCost, setter: setRepairCost },
    {
      label: "Scheduled Maintenance",
      state: scheduledMaintenance,
      setter: setScheduledMaintenance,
    },
    { label: "Cosmetic Mods", state: cosmeticMods, setter: setCosmeticMods },
    {
      label: "Performance Mods",
      state: performanceMods,
      setter: setPerformanceMods,
    },
  ];

  return (
    <div className="min-h-screen pt-16 text-white bg-gray-900 ">
      <div className="container max-w-6xl px-6 py-1 mx-auto">
        <h1 className="mb-8 text-4xl font-bold text-center">
          Add Your Vehicle
        </h1>
        {/* Marketplace toggle */}
        <div className="flex items-center mb-6">
          <input
            type="checkbox"
            id="marketplace"
            checked={marketplace}
            onChange={(e) => setMarketplace(e.target.checked)}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded"
          />
          <label htmlFor="marketplace" className="ml-2 text-sm text-gray-300">
            Add to Marketplace (VIN required only when enabled)
          </label>
        </div>
        <div className="mb-4 text-xs text-yellow-300">
          All fields are required to obtain AI recommendations.
        </div>
        <div className="grid grid-cols-1 gap-6 p-8 bg-gray-800 shadow-xl md:grid-cols-2 rounded-2xl">
          {/* Map basicFields */}
          {basicFields.map((f, i) => (
            <div key={i} className="flex flex-col">
              <label className="mb-1 text-sm font-medium text-gray-300">
                {f.label} <span className="text-red-500">*</span>
              </label>
              {f.type === "select" ? (
                <select
                  id={f.name}
                  name={f.name}
                  value={f.value}
                  onChange={(e) => f.onChange(e.target.value)}
                  className="px-4 py-2 text-white bg-gray-700 border border-gray-600 rounded-lg"
                >
                  <option value="">Select {f.label.toLowerCase()}</option>
                  {f.options.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id={f.name}
                  name={f.name}
                  type={f.type || "text"}
                  value={f.value}
                  onChange={(e) => f.onChange(e.target.value)}
                  className="px-4 py-2 text-white bg-gray-700 border border-gray-600 rounded-lg"
                />
              )}
              {errors[f.name] && (
                <span className="mt-1 text-xs text-red-500">Required</span>
              )}
            </div>
          ))}
          {/* Map costFields similarly */}
          {costFields.map((c, i) => (
            <div key={i} className="flex flex-col">
              <label className="mb-1 text-sm font-medium text-gray-300">
                {c.label} ($) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute text-gray-400 -translate-y-1/2 left-3 top-1/2">
                  $
                </span>
                <input
                  id={c.name}
                  name={c.name}
                  type="number"
                  step="0.01"
                  value={c.state || ""}
                  onChange={(e) => c.setter(e.target.value)}
                  className="w-full px-4 py-2 pl-8 text-white bg-gray-700 border border-gray-600 rounded-lg"
                />
              </div>
              {errors[c.name] && (
                <span className="mt-1 text-xs text-red-500">Required</span>
              )}
            </div>
          ))}
          <div className="flex flex-col md:col-span-2">
            <label className="mb-1 text-sm font-medium text-gray-300">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              id="description"
              name="description"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="px-4 py-2 text-white bg-gray-700 border border-gray-600 rounded-lg"
            />
            {errors.description && (
              <span className="mt-1 text-xs text-red-500">Required</span>
            )}
          </div>
          {/* Photo Section */}
          <div className="md:col-span-2">
            <h2 className="mb-2 text-xl font-bold text-gray-300">
              Vehicle Photos
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {/* Front Photos */}
              <div className="flex flex-col">
                <label className="mb-1 text-sm font-medium text-gray-300">
                  Front
                </label>
                <input
                  type="file"
                  multiple
                  onChange={(e) => setFrontPhotos(Array.from(e.target.files))}
                  className="px-4 py-2 text-white bg-gray-700 border border-gray-600 rounded-lg"
                />
                <p className="mt-1 text-xs text-gray-300">
                  Upload multiple front view photos.
                </p>
              </div>
              {/* Rear Photos */}
              <div className="flex flex-col">
                <label className="mb-1 text-sm font-medium text-gray-300">
                  Rear
                </label>
                <input
                  type="file"
                  multiple
                  onChange={(e) => setRearPhotos(Array.from(e.target.files))}
                  className="px-4 py-2 text-white bg-gray-700 border border-gray-600 rounded-lg"
                />
                <p className="mt-1 text-xs text-gray-300">
                  Upload multiple rear view photos.
                </p>
              </div>
              {/* Side Photos */}
              <div className="flex flex-col">
                <label className="mb-1 text-sm font-medium text-gray-300">
                  Side
                </label>
                <input
                  type="file"
                  multiple
                  onChange={(e) => setSidePhotos(Array.from(e.target.files))}
                  className="px-4 py-2 text-white bg-gray-700 border border-gray-600 rounded-lg"
                />
                <p className="mt-1 text-xs text-gray-300">
                  Upload multiple side view photos.
                </p>
              </div>
              {/* Interior Photos */}
              <div className="flex flex-col">
                <label className="mb-1 text-sm font-medium text-gray-300">
                  Interior
                </label>
                <input
                  type="file"
                  multiple
                  onChange={(e) =>
                    setInteriorPhotos(Array.from(e.target.files))
                  }
                  className="px-4 py-2 text-white bg-gray-700 border border-gray-600 rounded-lg"
                />
                <p className="mt-1 text-xs text-gray-300">
                  Upload multiple interior view photos.
                </p>
              </div>
              {/* Dashboard Photos */}
              <div className="flex flex-col">
                <label className="mb-1 text-sm font-medium text-gray-300">
                  Dashboard
                </label>
                <input
                  type="file"
                  multiple
                  onChange={(e) =>
                    setDashboardPhotos(Array.from(e.target.files))
                  }
                  className="px-4 py-2 text-white bg-gray-700 border border-gray-600 rounded-lg"
                />
                <p className="mt-1 text-xs text-gray-300">
                  Photos of dashboard & controls
                </p>
              </div>
              {/* Engine Bay Photos */}
              <div className="flex flex-col">
                <label className="mb-1 text-sm font-medium text-gray-300">
                  Engine Bay
                </label>
                <input
                  type="file"
                  multiple
                  onChange={(e) =>
                    setEngineBayPhotos(Array.from(e.target.files))
                  }
                  className="px-4 py-2 text-white bg-gray-700 border border-gray-600 rounded-lg"
                />
                <p className="mt-1 text-xs text-gray-300">
                  Photos of the engine bay
                </p>
              </div>
            </div>
            <p className="mt-2 text-xs text-gray-300">
              Please upload multiple photos in each category to provide a
              comprehensive view of your vehicle&apos;s condition, especially
              for the marketplace.
            </p>
          </div>
          {/* Submit */}
          <div className="flex justify-center md:col-span-2">
            <button
              onClick={handleSubmit}
              disabled={saving}
              className={`px-8 py-3 text-white rounded ${
                saving ? "bg-gray-500" : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {saving ? "Saving…" : "Submit Vehicle"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
