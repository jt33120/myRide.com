// pages/edit-vehicle.js
import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { db } from "../lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";

// Helpers de style
const selectClass = (error) =>
  `w-full bg-gray-700 text-gray-100 border ${
    error ? "border-red-500" : "border-gray-600"
  } rounded p-2`;
const inputClass = selectClass;

// Composants Field et ErrorMsg
function Field({ label, children }) {
  return (
    <div>
      <label className="block mb-1 text-gray-200">{label}</label>
      {children}
    </div>
  );
}
function ErrorMsg({ children }) {
  return <p className="mt-1 text-sm text-red-400">{children}</p>;
}

export default function EditVehiclePage() {
  const router = useRouter();
  const { id } = router.query;

  const [formData, setFormData] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Chargement initial des données
  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      const docSnap = await getDoc(doc(db, "listing", id));
      if (docSnap.exists()) {
        setFormData(docSnap.data());
        setLoading(false);
      } else {
        alert("Vehicle not found.");
        router.push("/");
      }
    };
    fetchData();
  }, [id, router]);

  // Gestion des changements de champs
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: null }));
  };

  // Soumission du formulaire
  const handleSubmit = async (e) => {
    e.preventDefault();
    const requiredFields = [
      "make",
      "model",
      "year",
      "mileage",
      "color",
      "engine",
      "transmission",
      "horsepower",
      "fuelType",
      "city",
      "state",
    ];
    const errs = {};
    requiredFields.forEach((f) => {
      if (!formData[f]) errs[f] = "Required";
    });
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }

    setSaving(true);
    try {
      await updateDoc(doc(db, "listing", id), formData);
      setSaving(false);
      window.alert("Changes saved successfully"); // native alert
      router.push(`/vehicleCard_page?id=${id}`);
    } catch {
      setSaving(false);
      window.alert("Error while saving changes");
    }
  };

  // Affichage de l’écran de chargement
  if (loading || !formData)
    return <div className="p-6 text-white">Loading...</div>;

  return (
    <div className="min-h-screen mt-8 text-white bg-gray-900">
      <div className="max-w-3xl px-4 py-8 mx-auto">
        <h1 className="mb-8 text-3xl font-bold text-center">Edit Vehicle</h1>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 p-6 bg-gray-800 rounded-lg shadow-lg md:grid-cols-2">
            <Field label="Make *">
              <input
                name="make"
                value={formData.make}
                onChange={handleChange}
                className={inputClass(errors.make)}
              />
              {errors.make && <ErrorMsg>{errors.make}</ErrorMsg>}
            </Field>

            <Field label="Model *">
              <input
                name="model"
                value={formData.model}
                onChange={handleChange}
                className={inputClass(errors.model)}
              />
              {errors.model && <ErrorMsg>{errors.model}</ErrorMsg>}
            </Field>

            <Field label="Year *">
              <input
                type="number"
                name="year"
                value={formData.year}
                onChange={handleChange}
                className={inputClass(errors.year)}
              />
              {errors.year && <ErrorMsg>{errors.year}</ErrorMsg>}
            </Field>

            <Field label="Mileage *">
              <input
                type="number"
                name="mileage"
                value={formData.mileage}
                onChange={handleChange}
                className={inputClass(errors.mileage)}
              />
              {errors.mileage && <ErrorMsg>{errors.mileage}</ErrorMsg>}
            </Field>

            <Field label="Color *">
              <input
                name="color"
                value={formData.color}
                onChange={handleChange}
                className={inputClass(errors.color)}
              />
              {errors.color && <ErrorMsg>{errors.color}</ErrorMsg>}
            </Field>

            <Field label="Engine *">
              <input
                name="engine"
                value={formData.engine}
                onChange={handleChange}
                className={inputClass(errors.engine)}
              />
              {errors.engine && <ErrorMsg>{errors.engine}</ErrorMsg>}
            </Field>

            <Field label="Transmission *">
              <input
                name="transmission"
                value={formData.transmission}
                onChange={handleChange}
                className={inputClass(errors.transmission)}
              />
              {errors.transmission && (
                <ErrorMsg>{errors.transmission}</ErrorMsg>
              )}
            </Field>

            <Field label="Horsepower *">
              <input
                type="number"
                name="horsepower"
                value={formData.horsepower}
                onChange={handleChange}
                className={inputClass(errors.horsepower)}
              />
              {errors.horsepower && <ErrorMsg>{errors.horsepower}</ErrorMsg>}
            </Field>

            <Field label="Fuel Type *">
              <input
                name="fuelType"
                value={formData.fuelType}
                onChange={handleChange}
                className={inputClass(errors.fuelType)}
              />
              {errors.fuelType && <ErrorMsg>{errors.fuelType}</ErrorMsg>}
            </Field>

            <Field label="City *">
              <input
                name="city"
                value={formData.city}
                onChange={handleChange}
                className={inputClass(errors.city)}
              />
              {errors.city && <ErrorMsg>{errors.city}</ErrorMsg>}
            </Field>

            <Field label="State *">
              <input
                name="state"
                value={formData.state}
                onChange={handleChange}
                className={inputClass(errors.state)}
              />
              {errors.state && <ErrorMsg>{errors.state}</ErrorMsg>}
            </Field>
          </div>

          <div className="flex justify-end mt-6">
            <button
              type="submit"
              disabled={saving}
              className={`px-6 py-2 text-white rounded ${
                saving ? "bg-gray-500" : "bg-green-600 hover:bg-green-700"
              }`}
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
