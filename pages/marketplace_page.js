import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import { db } from "../lib/firebase";
import { collection, getDocs } from "firebase/firestore";

export default function MarketplacePage() {
  const [marketplaceItems, setMarketplaceItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(collection(db, "on_marketplace"));
        const items = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setMarketplaceItems(items);
      } catch (error) {
        console.error("Error fetching marketplace items:", error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <p className="text-lg font-semibold text-gray-700">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-200">
      <Navbar />
      <div className="container mx-auto py-10">
        <h1 className="text-4xl font-bold text-center text-gray-800 mb-8">
          Marketplace
        </h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {marketplaceItems.map((item) => (
            <div
              key={item.id}
              className="p-4 bg-white shadow-lg rounded-lg hover:shadow-xl transition"
            >
              <h2 className="text-xl font-semibold text-gray-800">
                {item.listingId}
              </h2>
              <p className="text-gray-600 mt-2">Price: ${item.price}</p>
              <button
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                onClick={() => alert(`View details for ${item.listingId}`)}
              >
                View Details
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
