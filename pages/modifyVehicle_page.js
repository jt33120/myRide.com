import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { db } from '../lib/firebase'; // Adjust the import based on your Firebase setup
import { doc, getDoc, updateDoc } from 'firebase/firestore';

const ModifyVehiclePage = () => {
  const [vehicleData, setVehicleData] = useState({
    Make: '',
    Model: '',
    Year: '',
    Color: '',
    Mileage: '',
    Title: '',
    Tracked: false,
    Inspected: false,
    Dropped: false,
  });
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { id } = router.query; // Get vehicleid from URL

  useEffect(() => {
    if (!id) return; // Wait for the vehicle ID to be available

    const fetchVehicleData = async () => {
      setLoading(true);
      try {
        const vehicleRef = doc(db, 'listing', id); // Reference to the vehicle document in Firestore
        const vehicleDoc = await getDoc(vehicleRef);
        
        if (vehicleDoc.exists()) {
          setVehicleData(vehicleDoc.data()); // Set vehicle data
        } else {
          console.log("No such document!");
        }
      } catch (error) {
        console.error("Error fetching vehicle data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchVehicleData();
  }, [id]); // Re-run the effect when the ID changes

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setVehicleData({
      ...vehicleData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleSave = async () => {
    try {
      const vehicleRef = doc(db, 'listing', id); // Reference to the vehicle document in Firestore
      await updateDoc(vehicleRef, vehicleData); // Update vehicle data in Firestore
      router.push(`/vehicleCard_page?id=${id}`); // Redirect to the vehicle details page
    } catch (error) {
      console.error("Error updating vehicle data:", error);
    }
  };

  if (loading) return <p>Loading vehicle details...</p>;

  return (
    <div className="min-h-screen p-6 bg-gray-100 text-black">
      <button 
        onClick={() => router.push(`/vehicleCard_page?id=${id}`)}
        className="absolute top-4 left-4 bg-none border-none text-xl text-gray-600 cursor-pointer"
        title="Back to Vehicle Details"
      >
        ⏎
      </button>

      <h1 className="text-3xl font-bold mb-6 text-center">Modify Vehicle Details</h1>

      <div className="max-w-lg mx-auto bg-white p-6 rounded-lg shadow-md">
        <input
          type="text"
          name="Make"
          value={vehicleData.Make}
          onChange={handleChange}
          className="w-full p-2 mb-4 border rounded"
          placeholder="Make"
        />
        <input
          type="text"
          name="Model"
          value={vehicleData.Model}
          onChange={handleChange}
          className="w-full p-2 mb-4 border rounded"
          placeholder="Model"
        />
        <input
          type="number"
          name="Year"
          value={vehicleData.Year}
          onChange={handleChange}
          className="w-full p-2 mb-4 border rounded"
          placeholder="Year"
        />
        <input
          type="text"
          name="Color"
          value={vehicleData.Color}
          onChange={handleChange}
          className="w-full p-2 mb-4 border rounded"
          placeholder="Color"
        />
        <input
          type="text"
          name="Mileage"
          value={vehicleData.Mileage}
          onChange={handleChange}
          className="w-full p-2 mb-4 border rounded"
          placeholder="Mileage"
        />
        <input
          type="text"
          name="Title"
          value={vehicleData.Title}
          onChange={handleChange}
          className="w-full p-2 mb-4 border rounded"
          placeholder="Title"
        />
        <label className="flex items-center">
          <input
            type="checkbox"
            name="Tracked"
            checked={vehicleData.Tracked}
            onChange={handleChange}
            className="mr-2"
          />
          Tracked
        </label>
        <label className="flex items-center">
          <input
            type="checkbox"
            name="Inspected"
            checked={vehicleData.Inspected}
            onChange={handleChange}
            className="mr-2"
          />
          Inspected
        </label>
        <label className="flex items-center">
          <input
            type="checkbox"
            name="Dropped"
            checked={vehicleData.Dropped}
            onChange={handleChange}
            className="mr-2"
          />
          Dropped
        </label>

        <div className="mt-4">
          <button 
            className="bg-purple-700 text-white px-6 py-2 rounded-full hover:bg-purple-800"
            onClick={handleSave}
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModifyVehiclePage;
