import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { auth, db } from "../../lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import Navbar from "../../components/Navbar";

// Classe d'input avec gestion des erreurs / Input style with error handling
const selectClass = (error) =>
  `w-full bg-gray-700 text-gray-100 border ${error ? "border-red-500" : "border-gray-600"} rounded p-2`;
const inputClass = selectClass;

// Composant champ de formulaire / Form field component
function Field({ label, children }) {
  const child = React.Children.only(children);
  const inputId = child.props.name;
  return (
    <div>
      <label htmlFor={inputId} className="block mb-1 text-gray-200">{label}</label>
      {React.cloneElement(child, { id: inputId })}
    </div>
  );
}

// Message d'erreur / Error message
function ErrorMsg({ children }) {
  return <p className="mt-1 text-sm text-red-400">{children}</p>;
}

const EditVehiclePage = () => {
  const router = useRouter();
  const { id } = router.query;

  const [formData, setFormData] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Récupère les données du véhicule / Fetch vehicle data
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

  // Gère les changements d'inputs / Handle input change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: null }));
  };

  // Soumet le formulaire / Submit form
  const handleSubmit = async () => {
    const requiredFields = ["make", "model", "year", "mileage", "color", "engine", "transmission", "horsepower", "fuelType", "city", "state"];
    const errs = {};
    for (const f of requiredFields) {
      if (!formData[f]) {
        errs[f] = "Required field";
      }
    }
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }

    setSaving(true);
    try {
      await updateDoc(doc(db, "listing", id), formData);
      router.push(`/vehicleCard_page/${id}`);
    } catch (e) {
      alert("An error occurred while updating the vehicle.");
    } finally {
      setSaving(false);
    }
  };

  // Affiche le chargement / Show loading state
  if (loading || !formData) return <div className="p-6 text-white">Loading...</div>;

  return (
    <div className="min-h-screen text-white bg-gray-900">
      <Navbar />
      <div className="max-w-3xl px-4 py-8 mx-auto">
        <h1 className="mb-8 text-3xl font-bold text-center">Edit Vehicle</h1>
        <div className="grid gap-4 p-6 bg-gray-800 rounded-lg shadow-lg md:grid-cols-2">
          {/* Champs de formulaire / Form fields */}
          <Field label="Make *">
            <>
              <input name="make" value={formData.make} onChange={handleChange} className={inputClass(errors.make)} />
              {errors.make && <ErrorMsg>{errors.make}</ErrorMsg>}
            </>
          </Field>

          <Field label="Model *">
            <>
              <input name="model" value={formData.model} onChange={handleChange} className={inputClass(errors.model)} />
              {errors.model && <ErrorMsg>{errors.model}</ErrorMsg>}
            </>
          </Field>

          <Field label="Year *">
            <>
              <input type="number" name="year" value={formData.year} onChange={handleChange} className={inputClass(errors.year)} />
              {errors.year && <ErrorMsg>{errors.year}</ErrorMsg>}
            </>
          </Field>

          <Field label="Mileage *">
            <>
              <input type="number" name="mileage" value={formData.mileage} onChange={handleChange} className={inputClass(errors.mileage)} />
              {errors.mileage && <ErrorMsg>{errors.mileage}</ErrorMsg>}
            </>
          </Field>

          <Field label="Color *">
            <>
              <input name="color" value={formData.color} onChange={handleChange} className={inputClass(errors.color)} />
              {errors.color && <ErrorMsg>{errors.color}</ErrorMsg>}
            </>
          </Field>

          <Field label="Engine *">
            <>
              <input name="engine" value={formData.engine} onChange={handleChange} className={inputClass(errors.engine)} />
              {errors.engine && <ErrorMsg>{errors.engine}</ErrorMsg>}
            </>
          </Field>

          <Field label="Transmission *">
            <>
              <input name="transmission" value={formData.transmission} onChange={handleChange} className={inputClass(errors.transmission)} />
              {errors.transmission && <ErrorMsg>{errors.transmission}</ErrorMsg>}
            </>
          </Field>

          <Field label="Horsepower *">
            <>
              <input type="number" name="horsepower" value={formData.horsepower} onChange={handleChange} className={inputClass(errors.horsepower)} />
              {errors.horsepower && <ErrorMsg>{errors.horsepower}</ErrorMsg>}
            </>
          </Field>

          <Field label="Fuel Type *">
            <>
              <input name="fuelType" value={formData.fuelType} onChange={handleChange} className={inputClass(errors.fuelType)} />
              {errors.fuelType && <ErrorMsg>{errors.fuelType}</ErrorMsg>}
            </>
          </Field>

          <Field label="City *">
            <>
              <input name="city" value={formData.city} onChange={handleChange} className={inputClass(errors.city)} />
              {errors.city && <ErrorMsg>{errors.city}</ErrorMsg>}
            </>
          </Field>

          <Field label="State *">
            <>
              <input name="state" value={formData.state} onChange={handleChange} className={inputClass(errors.state)} />
              {errors.state && <ErrorMsg>{errors.state}</ErrorMsg>}
            </>
          </Field>
        </div>

        {/* Bouton d'enregistrement / Save button */}
        <div className="flex justify-end mt-6">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className={`px-6 py-2 text-white rounded ${saving ? "bg-gray-500" : "bg-green-600 hover:bg-green-700"}`}
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditVehiclePage;
