import { useState } from "react";
import { useRouter } from 'next/router';
import { auth, db } from '../lib/firebase';
import { doc, setDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import Navbar from "../components/Navbar";

const AddVehiclePage = () => {
  const router = useRouter();

  const [vehicleType, setVehicleType] = useState('');
  const [selectedMake, setSelectedMake] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [boughtIn, setBoughtIn] = useState('');
  const [boughtAt, setBoughtAt] = useState('');
  const [color, setColor] = useState('');
  const [vin, setVin] = useState('');
  const [title, setTitle] = useState('');
  const [mileage, setMileage] = useState('');
  const [zip, setZip] = useState('');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [engine, setEngine] = useState('');
  const [transmission, setTransmission] = useState('');
  const [horsepower, setHorsepower] = useState('');
  const [torque, setTorque] = useState('');
  const [fuelType, setFuelType] = useState('');
  const [weight, setWeight] = useState('');
  const [topSpeed, setTopSpeed] = useState('');
  const [acceleration, setAcceleration] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState({});

  const makes = ["Toyota", "BMW", "Ford", "Audi"];
  const models = ["Corolla", "X5", "Focus", "A4"];
  const years = Array.from({ length: 45 }, (_, i) => 1980 + i).reverse();

  const handleSubmit = async () => {
    const user = auth.currentUser;
    if (!user) return alert("Please log in first.");

    const newErrors = {};
    if (!vehicleType) newErrors.vehicleType = 'Required';
    if (!selectedMake) newErrors.make = 'Required';
    if (!selectedModel) newErrors.model = 'Required';
    if (!selectedYear) newErrors.year = 'Required';
    if (!boughtAt) newErrors.boughtAt = 'Required';
    if (!color) newErrors.color = 'Required';
    if (!title) newErrors.title = 'Required';
    if (!mileage) newErrors.mileage = 'Required';
    if (!zip) newErrors.zip = 'Required';
    if (!state) newErrors.state = 'Required';
    if (!city) newErrors.city = 'Required';
    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) return;

    const vehicleData = {
      uid: user.uid,
      vehicleType,
      make: selectedMake,
      model: selectedModel,
      year: Number(selectedYear),
      boughtIn: Number(boughtIn),
      boughtAt: Number(boughtAt),
      color,
      vin,
      title,
      mileage: Number(mileage),
      zip,
      state,
      city,
      engine,
      transmission,
      horsepower: Number(horsepower),
      torque: Number(torque),
      fuelType,
      weight: Number(weight),
      topSpeed: Number(topSpeed),
      acceleration: Number(acceleration),
      description,
      createdAt: new Date(),
    };

    const id = `${vehicleType}-${Date.now()}`;
    await setDoc(doc(db, "listing", id), vehicleData);
    await updateDoc(doc(db, "members", user.uid), { vehicles: arrayUnion(id) });
    router.push(`/vehicleCard_page?id=${id}`);
  };

  const fields = [
    { label: "Vehicle Type", value: vehicleType, onChange: setVehicleType, type: "select", options: ["car", "motorcycle"], required: true },
    { label: "Make", value: selectedMake, onChange: setSelectedMake, type: "select", options: makes, required: true },
    { label: "Model", value: selectedModel, onChange: setSelectedModel, type: "select", options: models, required: true },
    { label: "Year", value: selectedYear, onChange: setSelectedYear, type: "select", options: years, required: true },
    { label: "Bought In", value: boughtIn, onChange: setBoughtIn },
    { label: "Bought At", value: boughtAt, onChange: setBoughtAt, type: "number", required: true },
    { label: "Color", value: color, onChange: setColor, required: true },
    { label: "VIN", value: vin, onChange: setVin },
    { label: "Title", value: title, onChange: setTitle, type: "select", options: ["clean", "salvage", "rebuilt"], required: true },
    { label: "Mileage", value: mileage, onChange: setMileage, type: "number", required: true },
    { label: "ZIP", value: zip, onChange: setZip, required: true },
    { label: "State", value: state, onChange: setState, required: true },
    { label: "City", value: city, onChange: setCity, required: true },
    { label: "Engine", value: engine, onChange: setEngine },
    { label: "Transmission", value: transmission, onChange: setTransmission },
    { label: "Horsepower", value: horsepower, onChange: setHorsepower, type: "number" },
    { label: "Fuel Type", value: fuelType, onChange: setFuelType, type: "select", options: ["gasoline", "diesel", "electric", "hybrid"] },
  ];

  return (
    <div className="min-h-screen text-white bg-gray-900">
      <Navbar />
      <div className="max-w-6xl px-6 py-10 mx-auto md:pt-24 ">
        <h1 className="mb-8 text-4xl font-bold text-center">Add Your Vehicle</h1>

        <div className="grid grid-cols-1 gap-6 p-8 bg-gray-800 shadow-xl md:grid-cols-2 rounded-2xl">
          {fields.map((field, idx) => (
            <div className="flex flex-col" key={idx}>
              <label className="mb-1 text-sm font-medium text-gray-300">
                {field.label}{field.required && ' *'}
              </label>
              {field.type === 'select' ? (
                <select
                  value={field.value}
                  onChange={e => field.onChange(e.target.value)}
                  className="px-4 py-2 text-white bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">Select</option>
                  {field.options.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              ) : (
                <input
                  type={field.type || 'text'}
                  value={field.value}
                  onChange={e => field.onChange(e.target.value)}
                  className="px-4 py-2 text-white bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              )}
            </div>
          ))}

          <div className="flex flex-col md:col-span-2">
            <label className="mb-1 text-sm font-medium text-gray-300">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={4}
              className="px-4 py-2 text-white bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-center md:col-span-2">
            <button
              onClick={handleSubmit}
              className="px-8 py-3 text-white transition bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              Submit Vehicle
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddVehiclePage;