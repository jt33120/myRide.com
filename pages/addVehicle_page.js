import { useState } from 'react';
import { useRouter } from 'next/router';
import { auth, db } from '../lib/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

const AddVehiclePage = () => {
  const [vehicleData, setVehicleData] = useState({
    make: '',
    model: '',
    year: '',
    vin: '',
    color: '',
    mileage: '',
    description: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setVehicleData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddVehicle = async () => {
    const user = auth.currentUser;
    if (!user) {
      setError('You must be logged in to add a vehicle.');
      return;
    }

    // Validate required fields
    if (!vehicleData.make || !vehicleData.model || !vehicleData.year || !vehicleData.vin) {
      setError('Please fill in all required fields.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Add vehicle to Firestore
      await addDoc(collection(db, 'listing'), {
        ...vehicleData,
        uid: user.uid, // Associate the vehicle with the current user
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      alert('Vehicle added successfully!');
      router.push('/myVehicles_page'); // Redirect to the user's vehicles page
    } catch (error) {
      console.error('Error adding vehicle:', error);
      setError('Failed to add vehicle. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-6 bg-gray-100 text-black">
      <h1 className="text-3xl font-bold mb-6">Add New Vehicle</h1>
      <div className="form-container">
        <div className="form-section">
          <label className="form-label">Make</label>
          <input
            type="text"
            name="make"
            value={vehicleData.make}
            onChange={handleInputChange}
            className="border border-gray-300 p-2 rounded-md w-full mb-2"
            required
          />
        </div>
        <div className="form-section">
          <label className="form-label">Model</label>
          <input
            type="text"
            name="model"
            value={vehicleData.model}
            onChange={handleInputChange}
            className="border border-gray-300 p-2 rounded-md w-full mb-2"
            required
          />
        </div>
        <div className="form-section">
          <label className="form-label">Year</label>
          <input
            type="number"
            name="year"
            value={vehicleData.year}
            onChange={handleInputChange}
            className="border border-gray-300 p-2 rounded-md w-full mb-2"
            required
          />
        </div>
        <div className="form-section">
          <label className="form-label">VIN</label>
          <input
            type="text"
            name="vin"
            value={vehicleData.vin}
            onChange={handleInputChange}
            className="border border-gray-300 p-2 rounded-md w-full mb-2"
            required
          />
        </div>
        <div className="form-section">
          <label className="form-label">Color</label>
          <input
            type="text"
            name="color"
            value={vehicleData.color}
            onChange={handleInputChange}
            className="border border-gray-300 p-2 rounded-md w-full mb-2"
          />
        </div>
        <div className="form-section">
          <label className="form-label">Mileage</label>
          <input
            type="number"
            name="mileage"
            value={vehicleData.mileage}
            onChange={handleInputChange}
            className="border border-gray-300 p-2 rounded-md w-full mb-2"
          />
        </div>
        <div className="form-section">
          <label className="form-label">Description</label>
          <textarea
            name="description"
            value={vehicleData.description}
            onChange={handleInputChange}
            className="border border-gray-300 p-2 rounded-md w-full mb-2"
          />
        </div>
        <button
          onClick={handleAddVehicle}
          className={`px-6 py-2 rounded-full text-white ${
            loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'
          }`}
          disabled={loading}
        >
          {loading ? 'Adding...' : 'Add Vehicle'}
        </button>
        {error && <p className="text-red-500 mt-4">{error}</p>}
      </div>
    </div>
  );
};

export default AddVehiclePage;