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

  const [filters, setFilters] = useState({
    make: '',
    model: '',
    year: '',
    zip: '',
    state: '',
    city: '',
  });
  
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prevFilters) => ({
      ...prevFilters,
      [name]: value,
    }));
  };
  
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
          
          // Apply filters
          const matchesFilters =
            (filters.make === '' || vehicleData.make === filters.make) &&
            (filters.model === '' || vehicleData.model === filters.model) &&
            (filters.year === '' || vehicleData.year.toString() === filters.year) &&
            (filters.zip === '' || vehicleData.zip === filters.zip) &&
            (filters.state === '' || vehicleData.state === filters.state) &&
            (filters.city === '' || vehicleData.city === filters.city);
  
          if (matchesFilters) {
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
            });
          }
        }
      }
      setVehicles(vehicleList);
    }
  
    fetchVehicles();
  }, [filters, fetchVehicleImages]);
  
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleDotClick = (index) => {
    setCurrentIndex(index);
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Marketplace</h1>
  
      {/* Filter Section */}
      <div className="mb-4">
        <div className="flex flex-wrap gap-4">
          {/* Make Filter */}
          <select
            name="make"
            value={filters.make}
            onChange={handleFilterChange}
            className="p-2 border rounded"
          >
            <option value="">Select Make</option>
            {/* Add options dynamically based on available makes */}
            <option value="Toyota">Toyota</option>
            <option value="Honda">Honda</option>
            {/* Add other options as necessary */}
          </select>
  
          {/* Model Filter */}
          <select
            name="model"
            value={filters.model}
            onChange={handleFilterChange}
            className="p-2 border rounded"
          >
            <option value="">Select Model</option>
            {/* Add options dynamically based on available models */}
            <option value="Camry">Camry</option>
            <option value="Civic">Civic</option>
            {/* Add other options as necessary */}
          </select>
  
          {/* Year Filter */}
          <select
            name="year"
            value={filters.year}
            onChange={handleFilterChange}
            className="p-2 border rounded"
          >
            <option value="">Select Year</option>
            <option value="2022">2022</option>
            <option value="2021">2021</option>
            {/* Add other options as necessary */}
          </select>
  
          {/* Location Filters */}
          <input
            type="text"
            name="zip"
            value={filters.zip}
            onChange={handleFilterChange}
            placeholder="ZIP Code"
            className="p-2 border rounded"
          />
          <input
            type="text"
            name="state"
            value={filters.state}
            onChange={handleFilterChange}
            placeholder="State"
            className="p-2 border rounded"
          />
          <input
            type="text"
            name="city"
            value={filters.city}
            onChange={handleFilterChange}
            placeholder="City"
            className="p-2 border rounded"
          />
        </div>
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
              <p className="text-gray-500 text-sm">By {vehicle.owner}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};