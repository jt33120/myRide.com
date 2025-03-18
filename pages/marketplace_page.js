import { useState, useEffect, useCallback } from "react";
import { db } from "../lib/firebase";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/router";
import { getStorage, ref, listAll, getDownloadURL } from "firebase/storage";
import Image from 'next/image';

export default function MarketplacePage() {
  const [vehicles, setVehicles] = useState([]);
  const router = useRouter();

  // Firebase storage instance
  const storage = getStorage();

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

  useEffect(() => {
    async function fetchVehicles() {
      const marketplaceRef = collection(db, "on_marketplace");
      const marketplaceSnapshot = await getDocs(marketplaceRef);
      let vehicleList = [];
  
      for (const vehicleDoc of marketplaceSnapshot.docs) {
        const vehicleId = vehicleDoc.id;
        const vehicleRef = doc(db, "listing", vehicleId);
        const vehicleSnap = await getDoc(vehicleRef);
  
        if (vehicleSnap.exists()) {
          const vehicleData = vehicleSnap.data();
          const marketplaceData = vehicleDoc.data(); // Fetch data from "on_marketplace" collection
  
          let ownerName = "Unknown Seller";
          if (vehicleData.uid) {
            const ownerRef = doc(db, "members", vehicleData.uid);
            const ownerSnap = await getDoc(ownerRef);
            if (ownerSnap.exists()) {
              ownerName = ownerSnap.data().firstName || "Unknown Seller";
            }
          }
  
          // Fetch images from Firebase Storage
          const images = await fetchVehicleImages(vehicleId);
  
          vehicleList.push({
            id: vehicleId,
            make: vehicleData.make || "Unknown Make",
            model: vehicleData.model || "Unknown Model",
            year: vehicleData.year || "Unknown Year",
            owner: ownerName,
            images: images, // Set the fetched images
            price: marketplaceData.price || "N/A", // Fetch price from "on_marketplace"
          });
        }
      }
      setVehicles(vehicleList);
    }
  
    fetchVehicles();
  }, [fetchVehicleImages]);

  const [currentIndex, setCurrentIndex] = useState(0);

  const handleDotClick = (index) => {
    setCurrentIndex(index);
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Marketplace</h1>
  
      {/* AI Prompt Placeholder */}
      <div className="mb-4">
        <p className="text-gray-600 text-lg">No filters anymore, a simple AI prompt is coming soon!</p>
      </div>
  
      {/* Display Vehicles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {vehicles.map((vehicle) => (
          <div
            key={vehicle.id}
            className="p-4 border rounded-lg shadow-md cursor-pointer hover:shadow-lg transition flex items-center"
            onClick={() => router.push(`/vehicleCard_page?id=${vehicle.id}`)}
          >
            {/* Carousel on the left */}
            <div className="carousel-container relative mr-4 w-48 h-48">
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
  
            {/* Vehicle info on the right */}
            <div className="ml-4">
              <h2 className="text-lg font-semibold">{vehicle.make} {vehicle.model}</h2>
              <p className="text-gray-600">Year: {vehicle.year}</p>
              <p className="text-purple-500 xl font-bold text-600"> ${vehicle.price}</p> {/* Display price */}
              <p className="text-gray-500 text-sm">By {vehicle.owner}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};