import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, collection, getDocs, deleteDoc, updateDoc, arrayRemove } from 'firebase/firestore';
import { getStorage, ref, listAll, getDownloadURL, deleteObject } from 'firebase/storage';
import Image from 'next/image';

const MyGarage = () => {
  const [firstName, setFirstName] = useState('');
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sumType, setSumType] = useState('Current Value'); // Default to "Current Value"
  const [, setGarageReceipts] = useState([]); // Store all receipts across vehicles
  const router = useRouter();

  // Firebase storage instance
  const storage = getStorage();

  // Fetch user's first name and vehicle IDs from Firestore
  useEffect(() => {
    const fetchUserData = async () => {
      const user = auth.currentUser;
      if (user) {
        const userDocRef = doc(db, 'members', user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const userData = userDoc.data();
          setFirstName(userData.firstName); // Set the first name from Firestore
          const vehicleIds = userData.vehicles || []; // Get vehicle IDs from the `vehicles` array
          fetchVehicles(vehicleIds); // Fetch vehicle details
        } else {
          console.log("No such document!");
        }
      }
    };

    fetchUserData();
  }, []);

  const fetchVehicleImages = useCallback(async (vehicleId) => {
    const imagesRef = ref(storage, `listing/${vehicleId}/photos`);
    const imageList = await listAll(imagesRef);
    const imageUrls = await Promise.all(
      imageList.items.map((imageRef) => getDownloadURL(imageRef))
    );

    // Move the "front" image to the first position
    const frontImageIndex = imageUrls.findIndex(url => url.includes("front"));
    if (frontImageIndex > -1) {
      const [frontImage] = imageUrls.splice(frontImageIndex, 1);
      imageUrls.unshift(frontImage);
    }

    return imageUrls;
  }, [storage]);

  const fetchVehicles = async (vehicleIds) => {
    setLoading(true);
    try {
      const allReceipts = []; // Collect all receipts across vehicles

      const vehicleList = await Promise.all(
        vehicleIds.map(async (vehicleId) => {
          const vehicleDocRef = doc(db, 'listing', vehicleId);
          const vehicleDoc = await getDoc(vehicleDocRef);

          if (vehicleDoc.exists()) {
            const vehicleData = vehicleDoc.data();
            const images = await fetchVehicleImages(vehicleId);

            // Fetch receipts for the vehicle
            const receiptsQuery = collection(db, `listing/${vehicleId}/receipts`);
            const receiptsSnapshot = await getDocs(receiptsQuery);
            const receipts = receiptsSnapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }));

            // Add receipts to the global list
            allReceipts.push(...receipts);

            return {
              id: vehicleId,
              make: vehicleData.make,
              model: vehicleData.model,
              year: vehicleData.year,
              images: images,
              boughtAt: vehicleData.boughtAt || 0, // Ensure default value
              ai_estimated_price: vehicleData.ai_estimated_price || 0, // Ensure default value
              receipts,
            };
          } else {
            console.log(`Vehicle with ID ${vehicleId} does not exist.`);
            return null;
          }
        })
      );

      setVehicles(vehicleList.filter(Boolean)); // Filter out null values
      setGarageReceipts(allReceipts); // Store all receipts
    } catch (error) {
      console.error("Error fetching vehicles:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateGarageSum = (type) => {
    switch (type) {
      case 'Current Value':
        // Sum of AI-estimated prices across all vehicles
        return vehicles.reduce((sum, vehicle) => sum + (vehicle.ai_estimated_price || 0), 0);
      case 'Total Spent':
        // Sum of purchase price (boughtAt) and all receipts across all vehicles
        return vehicles.reduce((sum, vehicle) => {
          const vehicleReceiptsTotal = vehicle.receipts.reduce((rSum, receipt) => rSum + (receipt.price || 0), 0);
          return sum + vehicle.boughtAt + vehicleReceiptsTotal;
        }, 0);
      case 'Only Purchase Price':
        // Sum of purchase price (boughtAt) across all vehicles
        return vehicles.reduce((sum, vehicle) => sum + vehicle.boughtAt, 0);
      case 'Repair':
        // Sum of purchase price and all receipts in the "Repair" category across all vehicles
        return vehicles.reduce((sum, vehicle) => {
          const repairReceiptsTotal = vehicle.receipts
            .filter(receipt => receipt.category === 'Repair')
            .reduce((rSum, receipt) => rSum + (receipt.price || 0), 0);
          return sum + vehicle.boughtAt + repairReceiptsTotal;
        }, 0);
      case 'Scheduled Maintenance':
        // Sum of purchase price and all receipts in the "Scheduled Maintenance" category across all vehicles
        return vehicles.reduce((sum, vehicle) => {
          const maintenanceReceiptsTotal = vehicle.receipts
            .filter(receipt => receipt.category === 'Scheduled Maintenance')
            .reduce((rSum, receipt) => rSum + (receipt.price || 0), 0);
          return sum + vehicle.boughtAt + maintenanceReceiptsTotal;
        }, 0);
      case 'Cosmetic Mods':
        // Sum of purchase price and all receipts in the "Cosmetic Mods" category across all vehicles
        return vehicles.reduce((sum, vehicle) => {
          const cosmeticReceiptsTotal = vehicle.receipts
            .filter(receipt => receipt.category === 'Cosmetic Mods')
            .reduce((rSum, receipt) => rSum + (receipt.price || 0), 0);
          return sum + vehicle.boughtAt + cosmeticReceiptsTotal;
        }, 0);
      case 'Performance Mods':
        // Sum of purchase price and all receipts in the "Performance Mods" category across all vehicles
        return vehicles.reduce((sum, vehicle) => {
          const performanceReceiptsTotal = vehicle.receipts
            .filter(receipt => receipt.category === 'Performance Mods')
            .reduce((rSum, receipt) => rSum + (receipt.price || 0), 0);
          return sum + vehicle.boughtAt + performanceReceiptsTotal;
        }, 0);
      default:
        return 0;
    }
  };

  const handleSumBoxClick = () => {
    const sumTypes = ['Current Value', 'Total Spent', 'Only Purchase Price', 'Repair', 'Scheduled Maintenance', 'Cosmetic Mods', 'Performance Mods'];
    const currentIndex = sumTypes.indexOf(sumType);
    const nextIndex = (currentIndex + 1) % sumTypes.length;
    setSumType(sumTypes[nextIndex]);
  };

  const [currentIndex, setCurrentIndex] = useState(0);

  const handleDotClick = (index) => {
    setCurrentIndex(index);
  };

  const handleDeleteVehicle = async (vehicleId) => {
    const user = auth.currentUser;
    if (!user) return;

    const confirmDelete = confirm("Are you sure you want to delete this vehicle?");
    if (!confirmDelete) return;

    try {
      // Delete vehicle document from Firestore
      await deleteDoc(doc(db, "listing", vehicleId));

      // Remove vehicle ID from the user's vehicles array in the members collection
      const userDocRef = doc(db, "members", user.uid);
      await updateDoc(userDocRef, {
        vehicles: arrayRemove(vehicleId),
      });

      // Delete all associated files from Firebase Storage
      const storageRef = ref(storage, `listing/${vehicleId}`);
      await deleteObject(storageRef);

      // Update the local state to remove the deleted vehicle
      setVehicles((prevVehicles) => prevVehicles.filter((vehicle) => vehicle.id !== vehicleId));

      alert("Vehicle deleted successfully.");
    } catch (error) {
      console.error("Error deleting vehicle:", error);
      alert("Failed to delete vehicle. Please try again.");
    }
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div className="min-h-screen p-6 bg-gray-100 text-black relative">
      {/* Exit Button */}
      <button 
        onClick={() => router.push('/myDashboard_page')}
        className="absolute top-4 left-4 bg-none border-none text-xl text-gray-600 cursor-pointer"
        title="Back to Dashboard"
      >
        ⏎
      </button>

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">{firstName ? `${firstName}'s Garage` : "Loading..."}</h1>
        <div
          className="absolute top-4 right-4 bg-white p-2 rounded-lg shadow-md border border-gray-300 cursor-pointer"
          onClick={handleSumBoxClick}
        >
          <p className="text-xs text-gray-500">{sumType}</p>
          <p className="text-md">${Number(calculateGarageSum(sumType)).toFixed(2)}</p>
        </div>
      </div>

      {vehicles.length === 0 ? (
        <div className="text-center">
          <p className="text-gray-600 text-lg mb-4">No vehicle yet? Add one!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vehicles.map((vehicle) => (
            <div
              key={vehicle.id}
              className="bg-white p-2 rounded-lg shadow-md relative flex flex-col"
              onClick={() => router.push(`/vehicleCard_page?id=${vehicle.id}`)}
            >
              {/* Delete Button */}
              <div className="absolute top-2 left-2 justify-start z-50">
  <button
    onClick={() => handleDeleteVehicle(vehicle.id)}
    className="bg-purple-500 text-white p-1 rounded-full hover:bg-purple-600 focus:outline-none"
    title="Delete Vehicle"
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth="1.5"
      stroke="currentColor"
      className="h-4 w-4"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
      />
    </svg>
  </button>
</div>

              {/* Carousel */}
              <div className="carousel-container relative mb-4 w-48 h-48">
                <div className="carousel-images overflow-hidden w-full h-full">
                  {vehicle.images.length > 0 && (
                    <Image
                      src={vehicle.images[currentIndex]} 
                      alt={`${vehicle.make} ${vehicle.model}`}
                      width={200}
                      height={200}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  )}
                </div>

                {/* Dot navigation */}
                <div className="carousel-dots absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-2">
                  {vehicle.images.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => handleDotClick(index)}
                      className={`w-3 h-3 rounded-full ${currentIndex === index ? 'bg-purple-500' : 'bg-gray-300'}`}
                    ></button>
                  ))}
                </div>
              </div>

              {/* Vehicle info */}
              <div className="text-center">
                <h2 className="text-xl font-semibold">
                {vehicle.year} {vehicle.make} {vehicle.model} 
                </h2>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Vehicle Button */}
      <div className="text-center mt-6">
        <button
          className="bg-purple-700 text-white px-6 py-2 rounded-full hover:bg-purple-800"
          onClick={() => router.push("/addVehicle_page")}
        >
          ➕ Add Vehicle
        </button>
      </div>
    </div>
  );
};

export default MyGarage;