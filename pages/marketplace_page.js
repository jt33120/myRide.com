import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { db, storage, auth } from "../lib/firebase";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { ref, listAll, getDownloadURL } from "firebase/storage";
import { useRouter } from "next/router";

export default function MarketplacePage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState([]);
  const [showAuthPopup, setShowAuthPopup] = useState(false);

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

  useEffect(() => {
    (async () => {
      const snap = await getDocs(collection(db, "on_marketplace"));
      const list = [];
      for (const docSnap of snap.docs) {
        const vId = docSnap.id;
        const listing = (await getDoc(doc(db, "listing", vId))).data() || {};
        const images = await fetchVehicleImages(vId);
        list.push({
          id: vId,
          make: listing.make || "Unknown Make",
          model: listing.model || "Unknown Model",
          year: listing.year || "Unknown Year",
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
    const user = auth.currentUser;
    if (!user) setShowAuthPopup(true);
    else router.push(`/vehicleCard_page/${vehicleId}`);
  };

  return (
    <section className="flex flex-col min-h-screen mb-16 bg-zinc-900">
      {/* header mobile */}
      <header className="py-4 text-center bg-gray-800">
        <h1 className="text-3xl font-bold text-white">Marketplace</h1>
      </header>

      <main className="flex-grow px-4 py-6 space-y-4 overflow-auto">
        {vehicles.map((v) => (
          <article
            key={v.id}
            onClick={() => handleVehicleClick(v.id)}
            className="overflow-hidden bg-white rounded-lg shadow-lg cursor-pointer"
          >
            {/* image + badge moteur */}
            <div className="relative h-48">
              <Image
                src={v.images[0] || "/default-vehicle.png"}
                alt={`${v.make} ${v.model}`}
                fill
                className="object-cover"
              />
              <span className="absolute px-2 py-1 text-xs text-white bg-purple-600 rounded top-2 right-2">
                {v.engine}
              </span>
            </div>

            {/* infos */}
            <div className="p-4">
              <h2 className="text-lg font-semibold text-gray-800">
                {v.year} {v.make} {v.model}
              </h2>
              <p className="mt-1 font-bold text-purple-600">€{v.price}</p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  alert("Contact Seller for " + v.model);
                }}
                className="w-full py-2 mt-4 font-medium text-white bg-green-600 rounded-lg"
              >
                Contact Seller
              </button>
            </div>
          </article>
        ))}

        {/* skeleton loader */}
        {!vehicles.length &&
          Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-48 bg-gray-700 rounded-lg animate-pulse"
            />
          ))}
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
    </section>
  );
}
