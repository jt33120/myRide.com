import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, collection, getDocs, deleteDoc, updateDoc, arrayRemove, arrayUnion } from 'firebase/firestore';
import { getStorage, ref, listAll, getDownloadURL, deleteObject } from 'firebase/storage';
import Image from 'next/image';
import Navbar from '../components/Navbar'; // Import Navbar component
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';

// Register chart.js components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const MyGarage = () => {
  const [firstName, setFirstName] = useState('');
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sumType, setSumType] = useState("Garage's Estimated Value"); // Default to "Garage's Estimated Value"
  const router = useRouter();
  const [currentIndexes, setCurrentIndexes] = useState({}); // Track current index for each vehicle

  // Firebase storage instance
  const storage = getStorage();

  const [sumOptions] = useState([
    "Garage's Estimated Value",
    "Garage's total cost",
    "Garage's purchase cost",
    "Cost in Repair",
    "Cost in Scheduled Maintenance",
    "Cost in Cosmetic Mods",
    "Cost in Performance Mods",
  ]);
  const [dropdownOpen, setDropdownOpen] = useState(false); // Track dropdown visibility

  const fetchGarageEstimatedValue = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return 0;

      const userDocRef = doc(db, 'members', user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const vehicleIds = userDoc.data().vehicles || [];
        let totalValue = 0;

        for (const vehicleId of vehicleIds) {
          const vehicleDocRef = doc(db, 'listing', vehicleId);
          const vehicleDoc = await getDoc(vehicleDocRef);

          if (vehicleDoc.exists()) {
            const priceHistory = vehicleDoc.data().ai_estimated_value || [];
            if (priceHistory.length > 0) {
              const lastEntry = priceHistory[priceHistory.length - 1]; // Get the last string in the array
              const [value] = lastEntry.split("-"); // Extract the value before the first "-"
              totalValue += parseFloat(value) || 0; // Convert to number and sum
            }
          }
        }

        return totalValue;
      }
    } catch (error) {
      console.error("Error fetching garage estimated value:", error);
    }
    return 0;
  };

  const [garageValue, setGarageValue] = useState(0); // Initialize with 0 to avoid NaN

  useEffect(() => {
    const fetchAndSetGarageValue = async () => {
      const value = await fetchGarageEstimatedValue();
      setGarageValue(value); // Store the total sum of values
    };

    fetchAndSetGarageValue(); // Fetch the value immediately on page load
  }, []); // Run only once when the component mounts

  useEffect(() => {
    if (sumType === "Garage's Estimated Value") {
    }
  }, [sumType, garageValue]);

  const handleSumTypeSelect = (type) => {
    setSumType(type);
    setDropdownOpen(false); // Close the dropdown after selection
  };

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

    // Filter out "vehicleVideo" from the image URLs
    const filteredImageUrls = imageUrls.filter((url) => !url.includes("vehicleVideo"));

    // Move the "front" image to the first position
    const frontImageIndex = filteredImageUrls.findIndex(url => url.includes("front"));
    if (frontImageIndex > -1) {
      const [frontImage] = filteredImageUrls.splice(frontImageIndex, 1);
      filteredImageUrls.unshift(frontImage);
    }

    return filteredImageUrls;
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
              ai_estimated_value: vehicleData.ai_estimated_value || 0, // Ensure default value
              receipts,
            };
          } else {
            console.log(`Vehicle with ID ${vehicleId} does not exist.`);
            return null;
          }
        })
      );

      setVehicles(vehicleList.filter(Boolean)); // Filter out null values
    } catch (error) {
      console.error("Error fetching vehicles:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateGarageSum = (type) => {
    switch (type) {
      case "Garage's Estimated Value":
        return garageValue; // Use the pre-fetched total value
      case "Garage's total cost":
        // Sum of purchase price (boughtAt) and all receipts across all vehicles
        return vehicles.reduce((sum, vehicle) => {
          const vehicleReceiptsTotal = vehicle.receipts.reduce((rSum, receipt) => rSum + (receipt.price || 0), 0);
          return sum + vehicle.boughtAt + vehicleReceiptsTotal;
        }, 0);
      case "Garage's purchase cost":
        // Sum of purchase price (boughtAt) across all vehicles
        return vehicles.reduce((sum, vehicle) => sum + vehicle.boughtAt, 0);
      case 'Cost in Repair':
        // Sum of purchase price and all receipts in the "Repair" category across all vehicles
        return vehicles.reduce((sum, vehicle) => {
          const repairReceiptsTotal = vehicle.receipts
            .filter(receipt => receipt.category === 'Repair')
            .reduce((rSum, receipt) => rSum + (receipt.price || 0), 0);
          return sum + repairReceiptsTotal;
        }, 0);
      case 'Cost in Scheduled Maintenance':
        // Sum of purchase price and all receipts in the "Scheduled Maintenance" category across all vehicles
        return vehicles.reduce((sum, vehicle) => {
          const maintenanceReceiptsTotal = vehicle.receipts
            .filter(receipt => receipt.category === 'Scheduled Maintenance')
            .reduce((rSum, receipt) => rSum + (receipt.price || 0), 0);
          return sum + maintenanceReceiptsTotal;
        }, 0);
      case 'Cost in Cosmetic Mods':
        // Sum of purchase price and all receipts in the "Cosmetic Mods" category across all vehicles
        return vehicles.reduce((sum, vehicle) => {
          const cosmeticReceiptsTotal = vehicle.receipts
            .filter(receipt => receipt.category === 'Cosmetic Mods')
            .reduce((rSum, receipt) => rSum + (receipt.price || 0), 0);
          return sum + cosmeticReceiptsTotal;
        }, 0);
      case 'Cost in Performance Mods':
        // Sum of purchase price and all receipts in the "Performance Mods" category across all vehicles
        return vehicles.reduce((sum, vehicle) => {
          const performanceReceiptsTotal = vehicle.receipts
            .filter(receipt => receipt.category === 'Performance Mods')
            .reduce((rSum, receipt) => rSum + (receipt.price || 0), 0);
          return sum + performanceReceiptsTotal;
        }, 0);
      default:
        return 0;
    }
  };

  const handleDotClick = (vehicleId, index) => {
    setCurrentIndexes((prev) => ({ ...prev, [vehicleId]: index }));
  };

  const handleDeleteVehicle = async (vehicleId) => {
    const user = auth.currentUser;
    if (!user) return;

    const confirmDelete = confirm("Are you sure you want to delete this vehicle?");
    if (!confirmDelete) return;

    try {
      // Delete all files in the folder from Firebase Storage
      const folderRef = ref(storage, `listing/${vehicleId}/photos`);
      const fileList = await listAll(folderRef);

      if (fileList.items.length === 0) {
        console.log(`No files found in folder listing/${vehicleId}/photos.`);
      }

      // Log files to be deleted
      console.log(`Files to delete in folder listing/${vehicleId}/photos:`, fileList.items.map(file => file.name));

      // Delete each file in the folder
      const deletePromises = fileList.items.map(async (fileRef) => {
        try {
          await deleteObject(fileRef);
          console.log(`Deleted file: ${fileRef.fullPath}`);
        } catch (error) {
          console.error(`Failed to delete file: ${fileRef.fullPath}`, error);
        }
      });
      await Promise.all(deletePromises);

      // Delete the document from the `listing` collection
      await deleteDoc(doc(db, "listing", vehicleId));

      // Remove the vehicle ID from the user's `vehicles` array in the `members` collection
      const userDocRef = doc(db, "members", user.uid);
      await updateDoc(userDocRef, {
        vehicles: arrayRemove(vehicleId),
      });

      // Refresh the vehicles list by re-fetching data
      setVehicles((prevVehicles) => prevVehicles.filter((vehicle) => vehicle.id !== vehicleId));

      alert("Vehicle deleted successfully.");
    } catch (error) {
      console.error("Error deleting vehicle:", error);
      alert("Failed to delete vehicle. Please try again.");
    }
  };

  // Prevent navigation to `vehicleCard_page` when clicking the delete button
  const handleCardClick = (vehicleId, event) => {
    if (event.target.closest(".delete-button")) {
      // If the delete button was clicked, do nothing
      return;
    }
    router.push(`/vehicleCard_page?id=${vehicleId}`);
  };

  const updateEstimatedValues = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const userDocRef = doc(db, 'members', user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const vehicleIds = userDoc.data().vehicles || [];
        const currentDate = new Date();
        const formattedDate = `${String(currentDate.getMonth() + 1).padStart(2, '0')}/${String(currentDate.getDate()).padStart(2, '0')}/${currentDate.getFullYear()}`;

        for (const vehicleId of vehicleIds) {
          const vehicleDocRef = doc(db, 'listing', vehicleId);
          const vehicleDoc = await getDoc(vehicleDocRef);

          if (vehicleDoc.exists()) {
            const vehicleData = vehicleDoc.data();
            const priceHistory = vehicleData.ai_estimated_value || [];
            const lastEntry = priceHistory[priceHistory.length - 1] || '';
            const [, lastDate] = lastEntry.split('-');

            // Update only if the last update was not today
            if (lastDate !== formattedDate) {
              const newValue = vehicleData.ai_estimated_value || 0; // Use the current estimated price
              const newEntry = `${newValue}-${formattedDate}`;
              await updateDoc(vehicleDocRef, {
                ai_estimated_value: arrayUnion(newEntry),
              });
            }
          }
        }
      }
    } catch (error) {
      console.error("Error updating estimated values:", error);
    }
  };

  useEffect(() => {
    updateEstimatedValues(); // Ensure the array is updated at most once a day
  }, []);

  const updateEstimatedValuesOncePerDay = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const userDocRef = doc(db, 'members', user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const vehicleIds = userDoc.data().vehicles || [];
        const currentDate = new Date();
        const formattedDate = `${String(currentDate.getMonth() + 1).padStart(2, '0')}/${String(currentDate.getDate()).padStart(2, '0')}/${currentDate.getFullYear()}`;

        for (const vehicleId of vehicleIds) {
          const vehicleDocRef = doc(db, 'listing', vehicleId);
          const vehicleDoc = await getDoc(vehicleDocRef);

          if (vehicleDoc.exists()) {
            const vehicleData = vehicleDoc.data();
            const aiValues = Array.isArray(vehicleData.ai_estimated_value) ? vehicleData.ai_estimated_value : [];

            // Check if today's date already exists in the array
            if (aiValues.some(entry => entry.endsWith(`-${formattedDate}`))) {
              continue; // Skip if today's valuation already exists
            }

            // Fetch AI estimation from the API
            const response = await fetch('/api/aiEstimator', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                make: vehicleData.make,
                model: vehicleData.model,
                year: vehicleData.year,
                mileage: vehicleData.mileage || 'Unknown',
                color: vehicleData.color || 'Unknown',
                city: vehicleData.city || 'Unknown',
                zip: vehicleData.zip || 'Unknown',
                state: vehicleData.state || 'Unknown',
                title: vehicleData.title || 'Unknown',
                aftermarketMods: vehicleData.aftermarketMods || 'Unknown',
                cosmeticDefaults: vehicleData.cosmeticDefaults || 'Unknown',
              }),
            });

            const data = await response.json();
            if (response.ok && data.estimation) {
              const numericEstimation = parseFloat(data.estimation.replace(/[^0-9.]/g, '')); // Extract numeric value
              if (!isNaN(numericEstimation)) {
                const newEntry = `${numericEstimation}-${formattedDate}`;
                await updateDoc(vehicleDocRef, {
                  ai_estimated_value: [...aiValues, newEntry], // Append the new entry
                });
              }
            } else {
              console.error(`Failed to fetch AI estimation for vehicle ${vehicleId}:`, data.error || 'Unknown error');
            }
          }
        }
      }
    } catch (error) {
      console.error('Error updating AI estimations for vehicles:', error);
    }
  };

  useEffect(() => {
    updateEstimatedValuesOncePerDay(); // Ensure the array is updated at most once a day
  }, []);

  if (loading) return <p>Loading...</p>;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto pt-20 pb-24 p-6 bg-gray-100 text-black">
        {/* Added `pt-20` for top padding and `pb-24` for bottom padding */}
        <div className="flex flex-col items-center mb-6">
          <h1 className="text-3xl font-bold mb-4">{firstName ? `${firstName}'s Garage` : "Loading..."}</h1>
          
          {/* Sum Display */}
          <div className="w-full max-w-md text-center">
            <div className="flex items-center justify-center space-x-2">
              <p className="text-sm text-gray-500">{sumType}</p>
              <button
                onClick={() => setDropdownOpen((prev) => !prev)}
                className="p-1 hover:bg-gray-100 rounded-full transition"
                title="Select Sum Type"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                  className="w-5 h-5"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                </svg>
              </button>
            </div>
            {dropdownOpen && (
              <div className="absolute mt-2 w-48 bg-white shadow-lg rounded-md border border-gray-200 z-10 text-sm">
                {sumOptions.map((option) => (
                  <button
                    key={option}
                    onClick={() => handleSumTypeSelect(option)}
                    className={`block w-full text-left px-4 py-2 text-gray-600 hover:bg-gray-100 ${
                      sumType === option ? "font-bold text-purple-700" : ""
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}
            <div className="flex items-center justify-center mt-2">
              <p className="text-5xl font-extrabold">${Number(calculateGarageSum(sumType)).toFixed(2)}</p>
            </div>
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
                onClick={(event) => handleCardClick(vehicle.id, event)} // Handle card click
              >
                {/* Delete Button */}
                <div className="absolute top-2 left-2 justify-start z-50 delete-button">
                  <button
                    onClick={() => handleDeleteVehicle(vehicle.id)}
                    className="bg-purple-500 text-white p-1 rounded-full hover:bg-purple-600 focus:outline-none"
                    title="Delete Vehicle"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-3">
                      <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                    </svg>
                  </button>
                </div>

                {/* Carousel */}
                <div className="carousel-container relative mb-4 w-48 h-48">
                  <div className="carousel-images overflow-hidden w-full h-full">
                    {vehicle.images.length > 0 && (
                      !vehicle.images[currentIndexes[vehicle.id] || 0].includes("vehicleVideo") && (
                        <Image
                          src={vehicle.images[currentIndexes[vehicle.id] || 0]}
                          alt={`${vehicle.make} ${vehicle.model}`}
                          width={200}
                          height={200}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      )
                    )}
                  </div>

                  {/* Dot navigation */}
                  <div className="carousel-dots absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-2">
                    {vehicle.images.map((_, index) => (
                      <button
                        key={index}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDotClick(vehicle.id, index);
                        }}
                        className={`w-3 h-3 rounded-full ${
                          (currentIndexes[vehicle.id] || 0) === index
                            ? 'bg-purple-500'
                            : 'bg-gray-300'
                        }`}
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
      </div>

      {/* Add Vehicle Button */}
      <button
        className="fixed bottom-16 right-4 bg-gradient-to-r from-purple-500 to-purple-700 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
        onClick={() => router.push("/addVehicle_page")}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="1.5"
          stroke="currentColor"
          className="w-6 h-6"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      </button>

      {/* Navbar */}
      <Navbar />
    </div>
  );
};

export default MyGarage;