import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { getStorage, ref, listAll, getDownloadURL } from 'firebase/storage';
import Image from 'next/image';

const MyGarage = () => {
  const [firstName, setFirstName] = useState('');
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Firebase storage instance
  const storage = getStorage();

  // Fetch user's first name from Firestore
  useEffect(() => {
    const fetchUserData = async () => {
      const user = auth.currentUser;
      if (user) {
        const userDocRef = doc(db, 'members', user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          setFirstName(userDoc.data().firstName); // Set the first name from Firestore
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

  // Fetch vehicles once user data is available
  useEffect(() => {
    if (!firstName) return; // Wait for firstName to be fetched

    const fetchVehicles = async () => {
      setLoading(true);
      try {
        const user = auth.currentUser;
        if (!user) return;

        const vehiclesQuery = query(
          collection(db, 'listing'),
          where('uid', '==', user.uid)
        );
        const vehiclesSnapshot = await getDocs(vehiclesQuery);

        const vehicleList = await Promise.all(
          vehiclesSnapshot.docs.map(async (doc) => {
            const vehicleData = doc.data();
            const images = await fetchVehicleImages(doc.id);
            return {
              id: doc.id,
              make: vehicleData.make,
              model: vehicleData.model,
              year: vehicleData.year,
              images: images,
            };
          })
        );

        setVehicles(vehicleList);
      } catch (error) {
        console.error("Error fetching vehicles:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchVehicles();
  }, [firstName, fetchVehicleImages]);

  const [currentIndex, setCurrentIndex] = useState(0);

  const handleDotClick = (index) => {
    setCurrentIndex(index);
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

      <h1 className="text-3xl font-bold mb-6 text-center">{firstName ? `${firstName}'s Garage` : "Loading..."}</h1>

      {vehicles.length === 0 ? (
        <div className="text-center">
          <p className="text-gray-600 text-lg mb-4">No vehicle yet? Add one!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vehicles.map((vehicle) => (
            <div
              key={vehicle.id}
              className="bg-white p-4 rounded-lg shadow-md cursor-pointer hover:shadow-lg flex items-center"
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
                <h2 className="text-xl font-semibold">
                  {vehicle.make} {vehicle.model} {vehicle.year}
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