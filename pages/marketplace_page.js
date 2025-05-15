import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { db, storage, auth } from "../lib/firebase";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { ref, listAll, getDownloadURL } from "firebase/storage";
import { useRouter } from "next/router";

export default function MarketplacePage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState([]);
  const [showAuthPopup, setShowAuthPopup] = useState(false); // État pour la pop-up

  const fetchVehicleImages = useCallback(async (vehicleId) => {
    const imagesRef = ref(storage, `listing/${vehicleId}/photos`);
    const imageList = await listAll(imagesRef).catch(() => ({ items: [] }));
    const imageUrls = await Promise.all(
      imageList.items.map((ref) => getDownloadURL(ref))
    );
    const idx = imageUrls.findIndex((url) => url.includes("front"));
    if (idx > -1) imageUrls.unshift(...imageUrls.splice(idx, 1));
    return imageUrls;
  }, []);

  const fetchSellerProfile = async (uid) => {
    if (!uid)
      return {
        profilePicture: "/default-profile.png",
        firstName: "Unknown Seller",
        rating: 0,
      };
    try {
      const userSnap = await getDoc(doc(db, "members", uid));
      if (userSnap.exists()) {
        const u = userSnap.data();
        const pic = await getDownloadURL(
          ref(storage, `members/${uid}/profilepicture.png`)
        ).catch(() => "/default-profile.png");
        return {
          profilePicture: pic,
          firstName: u.firstName || "Unknown Seller",
          rating: u.rating || 0,
        };
      }
    } catch {}
    return {
      profilePicture: "/default-profile.png",
      firstName: "Unknown Seller",
      rating: 0,
    };
  };

  useEffect(() => {
    (async () => {
      const snap = await getDocs(collection(db, "on_marketplace"));
      const list = [];
      for (const docSnap of snap.docs) {
        const vId = docSnap.id;
        const listing = (await getDoc(doc(db, "listing", vId))).data() || {};
        const { profilePicture, firstName, rating } = await fetchSellerProfile(
          listing.uid
        );
        const images = await fetchVehicleImages(vId);
        list.push({
          id: vId,
          make: listing.make || "Unknown Make",
          model: listing.model || "Unknown Model",
          year: listing.year || "Unknown Year",
          owner: firstName,
          profilePicture,
          rating,
          images,
          price: docSnap.data().price || "N/A",
          mileage: listing.mileage || "N/A",
          city: listing.city || "Unknown",
          engine: listing.engine || "Unknown Engine",
        });
      }
      setVehicles(list);
    })();
  }, [fetchVehicleImages]);

  const handleVehicleClick = (vehicleId) => {
    const user = auth.currentUser; // Vérifie si l'utilisateur est connecté
    if (!user) {
      setShowAuthPopup(true); // Affiche la pop-up si non connecté
    } else {
      router.push(`/vehicleCard_page/${vehicleId}`);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-900 md:pt-28">
      <main className="container py-8 mx-auto">
        <h1 className="mb-2 text-4xl font-bold text-center text-white">
          Marketplace
        </h1>
        <p className="mb-8 text-center text-gray-400">
          No filters anymore, a simple AI prompt is coming soon! An invitation
          will be required to access the marketplace. Vehicle details will be
          AI-verified to protect the buyer by ensuring they are pre-verified.
        </p>
        {/* Vehicle Cards */}
        <div className="grid grid-cols-1 gap-6 px-4 sm:grid-cols-2 lg:grid-cols-3">
          {vehicles.length
            ? vehicles.map((vehicle) => (
                <div
                  key={vehicle.id}
                  onClick={() => handleVehicleClick(vehicle.id)}
                  className="transition duration-300 transform bg-white border border-gray-200 shadow-md cursor-pointer rounded-xl hover:shadow-lg hover:scale-105"
                >
                  <div className="relative h-48 overflow-hidden rounded-t-xl">
                    <Image
                      src={vehicle.images[0] || "/default-vehicle.png"}
                      alt={`${vehicle.make} ${vehicle.model}`}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-bold text-gray-800">
                        {vehicle.year} {vehicle.make} {vehicle.model}
                      </h3>
                      <span className="px-2 py-1 text-sm font-medium text-white bg-blue-600 rounded">
                        {vehicle.engine}
                      </span>
                    </div>
                    <p className="text-lg font-semibold text-blue-600">
                      €{vehicle.price}
                    </p>
                    <p className="text-sm text-gray-600">
                      Mileage: {vehicle.mileage || "N/A"} miles
                    </p>
                    <p className="text-sm text-gray-600">
                      Location: {vehicle.city || ""}
                    </p>
                    <div className="flex items-center mt-3">
                      <Image
                        src={vehicle.profilePicture}
                        alt={vehicle.owner}
                        width={40}
                        height={40}
                        className="border border-gray-300 rounded-full"
                      />
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-700">
                          {vehicle.owner}
                        </p>
                        <p className="text-xs text-gray-500">
                          Rating: {vehicle.rating} ★
                        </p>
                      </div>
                    </div>
                    {/* Contact Seller Button */}
                    <div className="mt-4">
                      <button
                        onClick={() =>
                          alert("Contact Seller for " + vehicle.model)
                        }
                        className="w-full px-4 py-2 text-white transition bg-green-600 rounded-lg hover:bg-green-700"
                      >
                        Contact Seller
                      </button>
                    </div>
                  </div>
                </div>
              ))
            : Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-64 bg-gray-200 rounded-xl animate-pulse"
                />
              ))}
        </div>
      </main>

      {/* Auth Popup */}
      {showAuthPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
          <div className="w-full max-w-sm p-8 bg-white rounded-lg shadow-xl">
            <h2 className="mb-4 text-2xl font-bold text-center text-gray-800">
              Sign In or Sign Up
            </h2>
            <p className="mb-6 text-center text-gray-600">
              You need to be logged in to view the details of this listing.
            </p>
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => router.push("/login_page")}
                className="px-6 py-2 text-white transition bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                Sign In
              </button>
              <button
                onClick={() => router.push("/signup_page")}
                className="px-6 py-2 text-white transition bg-green-600 rounded-lg hover:bg-green-700"
              >
                Sign Up
              </button>
            </div>
            <button
              onClick={() => setShowAuthPopup(false)}
              className="w-full mt-6 text-sm text-center text-gray-500 hover:underline"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
