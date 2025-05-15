// pages/edit-vehicle/[id].jsx
import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { auth, db } from "../../lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { toast } from "react-toastify";

export default function EditVehiclePage() {
  // Routing and state
  const router = useRouter();
  const { id } = router.query;
  // Declare all fields exactly as in addVehicle_page.js
  const [formData, setFormData] = useState({
    year: "",
    make: "",
    model: "",
    city: "",
    state: "",
    vin: "",
    mileage: "",
    color: "",
    engine: "",
    transmission: "",
    horsepower: "",
    fuelType: "",
    vehicleType: "",
    boughtAt: "",
    purchaseYear: "",
    withoutPurchasePrice: "",
    repairCost: "",
    scheduledMaintenance: "",
    cosmeticMods: "",
    performanceMods: "",
    description: "", // newly added for description
  });

  // Ensure user is authenticated
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) router.push("/Welcome_page");
    });
    return unsub;
  }, [router]);

  // Fetch vehicle data and prefill fields
  useEffect(() => {
    if (!id) return;
    (async () => {
      const snap = await getDoc(doc(db, "listing", id));
      if (snap.exists()) {
        const data = snap.data();
        // Prefill each field using the same names as in addVehicle
        setFormData({
          year: data.year || "",
          make: data.make || "",
          model: data.model || "",
          city: data.city || "",
          state: data.state || "",
          vin: data.vin || "",
          mileage: data.mileage || "",
          color: data.color || "",
          engine: data.engine || "",
          transmission: data.transmission || "",
          horsepower: data.horsepower || "",
          fuelType: data.fuelType || "",
          vehicleType: data.vehicleType || "",
          boughtAt: data.boughtAt || "",
          purchaseYear: data.purchaseYear || "",
          withoutPurchasePrice: data.withoutPurchasePrice || "",
          repairCost: data.repairCost || "",
          scheduledMaintenance: data.scheduledMaintenance || "",
          cosmeticMods: data.cosmeticMods || "",
          performanceMods: data.performanceMods || "",
          description: data.description || "", // ensure description is loaded
        });
      }
    })();
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await setDoc(
        doc(db, "listing", id),
        {
          ...formData,
          state: formData.state,
          boughtAt: formData.boughtAt,
          purchaseYear: formData.purchaseYear,
          withoutPurchasePrice: formData.withoutPurchasePrice,
          repairCost: formData.repairCost,
          scheduledMaintenance: formData.scheduledMaintenance,
          cosmeticMods: formData.cosmeticMods,
          performanceMods: formData.performanceMods,
        },
        { merge: true }
      );
      toast.success("Vehicle updated successfully");
      router.push(`/vehicleCard_page/${id}`);
    } catch (error) {
      console.error(error);
      toast.error("Update failed");
    }
  };

  return (
    <div className="min-h-screen p-6 text-white bg-neutral-900">
      <h1 className="mb-4 text-3xl font-bold">Edit Vehicle</h1>
      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-4">
        {/* First row: Year, Make, Model, City, State, VIN */}
        <div className="grid grid-cols-2 gap-4">
          <input
            type="text"
            value={formData.year}
            onChange={(e) => setFormData({ ...formData, year: e.target.value })}
            placeholder="Year"
            className="p-2 rounded bg-neutral-800"
          />
          <input
            type="text"
            value={formData.make}
            onChange={(e) => setFormData({ ...formData, make: e.target.value })}
            placeholder="Make"
            className="p-2 rounded bg-neutral-800"
          />
          <input
            type="text"
            value={formData.model}
            onChange={(e) =>
              setFormData({ ...formData, model: e.target.value })
            }
            placeholder="Model"
            className="p-2 rounded bg-neutral-800"
          />
          <input
            type="text"
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            placeholder="City"
            className="p-2 rounded bg-neutral-800"
          />
          <input
            type="text"
            value={formData.state}
            onChange={(e) =>
              setFormData({ ...formData, state: e.target.value })
            }
            placeholder="State"
            className="p-2 rounded bg-neutral-800"
          />
          <input
            type="text"
            value={formData.vin}
            onChange={(e) => setFormData({ ...formData, vin: e.target.value })}
            placeholder="VIN"
            className="p-2 rounded bg-neutral-800"
          />
        </div>
        {/* Second row: Mileage, Color, Engine, Transmission */}
        <div className="grid grid-cols-2 gap-4">
          <input
            type="number"
            value={formData.mileage}
            onChange={(e) =>
              setFormData({ ...formData, mileage: e.target.value })
            }
            placeholder="Mileage"
            className="p-2 rounded bg-neutral-800"
          />
          <input
            type="text"
            value={formData.color}
            onChange={(e) =>
              setFormData({ ...formData, color: e.target.value })
            }
            placeholder="Color"
            className="p-2 rounded bg-neutral-800"
          />
          <input
            type="text"
            value={formData.engine}
            onChange={(e) =>
              setFormData({ ...formData, engine: e.target.value })
            }
            placeholder="Engine"
            className="p-2 rounded bg-neutral-800"
          />
          <input
            type="text"
            value={formData.transmission}
            onChange={(e) =>
              setFormData({ ...formData, transmission: e.target.value })
            }
            placeholder="Transmission"
            className="p-2 rounded bg-neutral-800"
          />
        </div>
        {/* Third row: Horsepower, Fuel Type, Vehicle Type */}
        <div className="grid grid-cols-2 gap-4">
          <input
            type="number"
            value={formData.horsepower}
            onChange={(e) =>
              setFormData({ ...formData, horsepower: e.target.value })
            }
            placeholder="Horsepower"
            className="p-2 rounded bg-neutral-800"
          />
          <input
            type="text"
            value={formData.fuelType}
            onChange={(e) =>
              setFormData({ ...formData, fuelType: e.target.value })
            }
            placeholder="Fuel Type"
            className="p-2 rounded bg-neutral-800"
          />
          <input
            type="text"
            value={formData.vehicleType}
            onChange={(e) =>
              setFormData({ ...formData, vehicleType: e.target.value })
            }
            placeholder="Vehicle Type"
            className="p-2 rounded bg-neutral-800"
          />
        </div>
        {/* Fourth row: Purchase Price, Purchase Year */}
        <div className="grid grid-cols-2 gap-4">
          <input
            type="number"
            value={formData.boughtAt}
            onChange={(e) =>
              setFormData({ ...formData, boughtAt: e.target.value })
            }
            placeholder="Purchase Price"
            className="p-2 rounded bg-neutral-800"
          />
          <input
            type="text"
            value={formData.purchaseYear}
            onChange={(e) =>
              setFormData({ ...formData, purchaseYear: e.target.value })
            }
            placeholder="Purchase Year"
            className="p-2 rounded bg-neutral-800"
          />
        </div>
        {/* New row: Owner Manual URL */}
        <div>
          <input
            type="text"
            value={formData.ownerManual}
            onChange={(e) =>
              setFormData({ ...formData, ownerManual: e.target.value })
            }
            placeholder="Owner Manual URL"
            className="w-full p-2 rounded bg-neutral-800"
          />
        </div>
        {/* Full-width Description Field */}
        <div className="md:col-span-3">
          <label className="block mb-1 text-gray-200">Description *</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            rows={4}
            placeholder="Modifier la description du véhicule..."
            className="w-full p-2 text-gray-200 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
        >
          Update Vehicle
        </button>
      </form>
    </div>
  );
}
