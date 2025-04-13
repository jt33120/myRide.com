import { useState, useEffect, useCallback } from "react";
import { db, storage } from "../lib/firebase";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { ref, listAll, getDownloadURL } from "firebase/storage";
import Image from "next/image";
import { useRouter } from "next/router";

export default function MarketplacePage() {
  const [vehicles, setVehicles] = useState([]);
  const router = useRouter();

  const fetchVehicleImages = useCallback(async (vehicleId) => {
    const imagesRef = ref(storage, `listing/${vehicleId}/photos`);
    const imageList = await listAll(imagesRef);
    const imageUrls = await Promise.all(
      imageList.items.map((imageRef) => getDownloadURL(imageRef))
    );

    const frontImageIndex = imageUrls.findIndex((url) => url.includes("front"));
    if (frontImageIndex > -1) {
      const [frontImage] = imageUrls.splice(frontImageIndex, 1);
      imageUrls.unshift(frontImage);
    }

    return imageUrls;
  }, []);

  const fetchSellerProfile = async (uid) => {
    if (!uid) return { profilePicture: "/default-profile.png", firstName: "Unknown Seller", rating: 0 };

    try {
      const userRef = doc(db, "members", uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const userData = userSnap.data();
        const profilePictureRef = ref(storage, `members/${uid}/profilepicture.png`);
        const profilePicture = await getDownloadURL(profilePictureRef).catch(() => "/default-profile.png");
        const firstName = userData.firstName || "Unknown Seller";
        const rating = userData.rating || 0;
        return { profilePicture, firstName, rating };
      }
    } catch (error) {
      console.error("Error fetching seller profile:", error);
    }

    return { profilePicture: "/default-profile.png", firstName: "Unknown Seller", rating: 0 };
  };

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
          const marketplaceData = vehicleDoc.data();

          const { profilePicture, firstName, rating } = await fetchSellerProfile(vehicleData.uid);

          const images = await fetchVehicleImages(vehicleId);

          vehicleList.push({
            id: vehicleId,
            make: vehicleData.make || "Unknown Make",
            model: vehicleData.model || "Unknown Model",
            year: vehicleData.year || "Unknown Year",
            owner: firstName,
            profilePicture,
            rating,
            images,
            price: marketplaceData.price || "N/A",
          });
        }
      }
      setVehicles(vehicleList);
    }

    fetchVehicles();
  }, [fetchVehicleImages]);

  const renderStars = (rating) => {
    const stars = [];
    for (let i = 0; i < 5; i++) {
      stars.push(
        <svg
          key={i}
          xmlns="http://www.w3.org/2000/svg"
          fill={i < rating ? "currentColor" : "none"}
          viewBox="0 0 24 24"
          stroke="currentColor"
          className="w-4 h-4 text-yellow-500"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l2.122 6.564a1 1 0 0 0 .95.69h6.905c.969 0 1.371 1.24.588 1.81l-5.588 4.06a1 1 0 0 0-.364 1.118l2.122 6.564c.3.921-.755 1.688-1.54 1.118l-5.588-4.06a1 1 0 0 0-1.176 0l-5.588 4.06c-.784.57-1.838-.197-1.54-1.118l2.122-6.564a1 1 0 0 0-.364-1.118L2.34 11.99c-.783-.57-.38-1.81.588-1.81h6.905a1 1 0 0 0 .95-.69l2.122-6.564z"
          />
        </svg>
      );
    }
    return stars;
  };

  return (
    <div className="min-h-screen pt-20 px-6 bg-gray-100 text-black">
      <h1 className="page-heading">Marketplace</h1>
      <p className="page-subheading">
        No filters anymore, a simple AI prompt is coming soon! An invitation
        will be required to access the marketplace. Vehicle details will be
        AI-verified to protect the buyer by ensuring they are pre-verified.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {vehicles.map((vehicle) => (
          <div
            key={vehicle.id}
            className="card cursor-pointer hover:shadow-lg transition"
            onClick={() => router.push(`/vehicleCard_page?id=${vehicle.id}`)}
          >
            <div className="relative">
              <Image
                src={vehicle.images[0] || "/default-vehicle.png"}
                alt={`${vehicle.make} ${vehicle.model}`}
                width={400}
                height={300}
                className="w-full h-48 object-cover rounded-t-lg"
              />
            </div>
            <div className="p-4">
              <h2 className="card-title text-lg font-bold">
                {vehicle.year} {vehicle.make} {vehicle.model}
              </h2>
              <p className="card-description text-sm text-gray-500">
                ${vehicle.price}
              </p>
              <p className="card-description text-sm text-gray-500">
                Seller: {vehicle.owner}
              </p>
              <div className="flex items-center space-x-2 mt-2">
                <Image
                  src={vehicle.profilePicture}
                  alt="Seller Profile"
                  width={32}
                  height={32}
                  className="rounded-full"
                />
                <div className="flex">{renderStars(vehicle.rating)}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}