// pages/vehicleCard_page.jsx
import React, { useEffect, useState } from "react";
import { FaFileAlt, FaRegAddressCard, FaClipboardCheck } from "react-icons/fa";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
; // Assurez-vous que le chemin d'importation est correct

export default function VehicleCardPage({ vehicleId }) {
  const [vehicle, setVehicle] = useState({});

  useEffect(() => {
    async function fetchVehicleDetails() {
      try {
        const vehicleRef = doc(db, "listing", vehicleId); // Assurez-vous que `vehicleId` est défini
        const vehicleSnap = await getDoc(vehicleRef);

        if (vehicleSnap.exists()) {
          const vehicleData = vehicleSnap.data();
          setVehicle({
            ...vehicleData,
            price: vehicleData.price || "N/A", // Assurez-vous que le prix est inclus
          });
        }
      } catch (error) {
        console.error("Error fetching vehicle details:", error);
      }
    }

    fetchVehicleDetails();
  }, [vehicleId]);

  return (
    <>
      <div className="container px-4 py-10 mx-auto text-white bg-zinc-900 md:pt-28">
        {/* Header */}
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-bold">
            {vehicle.make} {vehicle.model} - {vehicle.engine}
          </h1>
        </header>
        {/* Gallery + Vehicle Info Section */}
        <div className="grid gap-8 md:grid-cols-2">
          {/* Photo gallery */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-2">
            {/* {images.slice(0, 4).map((url, i) => (
              <div
                key={i}
                className="relative pb-[100%] cursor-pointer rounded-lg shadow-lg transition transform hover:scale-105 bg-gray-800"
                onClick={() => setEnlargedIdx(i)}
              >
                <Image
                  src={url}
                  alt={`Vehicle ${i}`}
                  fill
                  className="object-cover rounded-lg"
                />
              </div>
            ))} */}
          </div>
          {/* Vehicle Info & Actions Card */}
          <div className="p-6 bg-gray-800 border border-gray-700 rounded-lg shadow-lg">
            <h2 className="mb-4 text-2xl font-bold">Vehicle Details</h2>
            <p className="mb-2">
              <span className="font-semibold">Make:</span> {vehicle.make}
            </p>
            <p className="mb-2">
              <span className="font-semibold">Model:</span> {vehicle.model}
            </p>
            <p className="mb-2">
              <span className="font-semibold">Year:</span> {vehicle.year}
            </p>
            <p className="mb-2">
              <span className="font-semibold">Engine:</span> {vehicle.engine}
            </p>
            <button className="px-4 py-2 mt-4 text-white bg-purple-600 rounded-lg hover:bg-purple-700">
              Contact Seller
            </button>
          </div>
        </div>

        {/* Redesigned Lower Section */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Redesigned Documents Section */}
          <section className="p-6 bg-gray-800 rounded-lg shadow-lg">
            <h2 className="pb-2 mb-4 text-2xl font-bold text-center border-b">
              Vehicle Documents
            </h2>
            <div className="flex flex-wrap justify-center gap-6">
              <div className="flex flex-col items-center p-4 transition border border-gray-700 rounded-lg hover:shadow-xl">
                <FaFileAlt className="mb-2 text-5xl text-blue-500" />
                <h3 className="text-lg font-semibold">Title</h3>
                <p className="text-sm text-center text-gray-300">
                  Proves legal ownership.
                </p>
              </div>
              <div className="flex flex-col items-center p-4 transition border border-gray-700 rounded-lg hover:shadow-xl">
                <FaRegAddressCard className="mb-2 text-5xl text-green-500" />
                <h3 className="text-lg font-semibold">Registration</h3>
                <p className="text-sm text-center text-gray-300">
                  Verifies registration with authorities.
                </p>
              </div>
              <div className="flex flex-col items-center p-4 transition border border-gray-700 rounded-lg hover:shadow-xl">
                <FaClipboardCheck className="mb-2 text-5xl text-yellow-500" />
                <h3 className="text-lg font-semibold">Inspection</h3>
                <p className="text-sm text-center text-gray-300">
                  Confirms safety and emission standards.
                </p>
              </div>
            </div>
          </section>

          {/* Redesigned Additional Info Section */}
          <section className="flex flex-col items-center p-6 bg-gray-800 rounded-lg shadow-lg">
            <h2 className="pb-2 mb-4 text-2xl font-bold text-center border-b">
              Additional Information
            </h2>
            <p className="text-sm text-center text-gray-300">
              View maintenance history, warranty details and other relevant
              information.
            </p>
            {/* Optionally, add more details here */}
          </section>
        </div>
      </div>
    </>
  );
}
