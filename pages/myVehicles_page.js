import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { auth, db, storage } from "../lib/firebase";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  deleteDoc,
  updateDoc,
  arrayRemove,
} from "firebase/firestore";
import { ref, listAll, getDownloadURL, deleteObject } from "firebase/storage";
import Image from "next/image";
import { motion } from "framer-motion";
import NavBar from "../components/Navbar";
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";

export default function MyGarage() {
  const router = useRouter();

  // States
  const [firstName, setFirstName] = useState("");
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (!currentUser) {
        setIsAuthenticated(false);
        setLoading(false);
        setShowModal(true);
        return;
      }
      setIsAuthenticated(true);

      async function load() {
        const userRef = doc(db, "members", currentUser.uid);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          const data = snap.data();
          setFirstName(data.firstName || "");

          if (data.vehicles?.length) {
            const list = await Promise.all(
              data.vehicles.map(async (id) => {
                const vSnap = await getDoc(doc(db, "listing", id));
                if (!vSnap.exists()) return null;
                const vData = vSnap.data();

                // fetch images
                const imgsRef = ref(storage, `listing/${id}/photos`);
                const files = await listAll(imgsRef);
                const urls = await Promise.all(
                  files.items.map((f) => getDownloadURL(f))
                );
                const images = urls.filter((u) => !u.includes("vehicleVideo"));

                // fetch receipts
                const rSnap = await getDocs(
                  collection(db, `listing/${id}/receipts`)
                );
                const receipts = rSnap.docs.map((d) => d.data());

                return { id, ...vData, images, receipts };
              })
            );
            setVehicles(list.filter(Boolean));
          }
        }
        setLoading(false);
      }
      load();
    });
    return () => unsubscribe();
  }, []);

  const openVehicle = (id) => router.push(`/vehicleCard_page/${id}`);
  const addVehicle = () => router.push("/addVehicle_page");
  const goToLogin = () => router.push("/login_page");
  const goToSignUp = () => router.push("/signup_page");

  const deleteVehicle = async (id) => {
    if (!confirm("Remove this vehicle?")) return;
    const user = auth.currentUser;
    if (!user) return;

    const imgsRef = ref(storage, `listing/${id}/photos`);
    const fl = await listAll(imgsRef);
    await Promise.all(fl.items.map((f) => deleteObject(f)));

    await deleteDoc(doc(db, "listing", id));
    await updateDoc(doc(db, "members", user.uid), {
      vehicles: arrayRemove(id),
    });

    setVehicles((v) => v.filter((x) => x.id !== id));
  };

  const totalGarageValue = vehicles.reduce(
    (sum, veh) => sum + (veh.boughtAt || 0),
    0
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center flex-1 min-h-screen text-gray-300 bg-gray-900">
        <motion.span
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1 }}
          className="block w-8 h-8 border-4 border-purple-500 rounded-full border-t-transparent"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen text-white bg-gray-900">
      <NavBar />
      <main className="relative flex-1 p-6 pt-32">
        {showModal && !isAuthenticated && (
          <div className="fixed inset-0 z-20 flex items-center justify-center bg-black bg-opacity-75">
            <motion.div
              className="relative max-w-sm p-8 text-center bg-gray-800 shadow-2xl rounded-2xl"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <button
                className="absolute top-4 right-4"
                onClick={() => setShowModal(false)}
              >
                <XMarkIcon className="w-6 h-6 text-gray-400 hover:text-white" />
              </button>
              <h2 className="mb-4 text-2xl font-bold">Welcome!</h2>
              <p className="mb-6 text-gray-300">
                To unlock all features of your garage, please log in or create
                an account.
              </p>
              <div className="flex justify-center gap-4">
                <button
                  onClick={goToLogin}
                  className="px-4 py-2 font-medium bg-purple-600 rounded-lg hover:bg-purple-700"
                >
                  Log In
                </button>
                <button
                  onClick={goToSignUp}
                  className="px-4 py-2 font-medium bg-green-600 rounded-lg hover:bg-green-700"
                >
                  Sign Up
                </button>
              </div>
            </motion.div>
          </div>
        )}

        <motion.h1
          className="pb-4 mb-2 text-5xl font-extrabold text-center text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500"
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6 }}
        >
          {isAuthenticated ? `${firstName}'s Garage` : "My Garage"}
        </motion.h1>
        <p className="mb-8 text-lg font-semibold text-center text-gray-300">
          Net Value of Garage: ${totalGarageValue.toLocaleString()}
        </p>
        <motion.div
          className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
          initial="hidden"
          animate="show"
        >
          {isAuthenticated ? (
            <>
              {vehicles.map((veh) => {
                const maintenanceItems = [
                  {
                    label: "Without Purchase Price",
                    value: veh.withoutPurchasePrice || 0,
                  },
                  { label: "Repair", value: veh.repairCost || 0 },
                  {
                    label: "Scheduled Maintenance",
                    value: veh.scheduledMaintenance || 0,
                  },
                  { label: "Cosmetic Mods", value: veh.cosmeticMods || 0 },
                  {
                    label: "Performance Mods",
                    value: veh.performanceMods || 0,
                  },
                ];
                const receiptsTotal = veh.receipts.reduce(
                  (s, r) => s + (r.price || 0),
                  0
                );
                const maintenanceTotal = maintenanceItems.reduce(
                  (s, it) => s + it.value,
                  0
                );
                const totalCost = receiptsTotal + maintenanceTotal;

                return (
                  <motion.div
                    key={veh.id}
                    className="overflow-hidden bg-gray-800 shadow-lg rounded-xl hover:shadow-2xl"
                  >
                    <div className="grid h-48 grid-cols-2 gap-1">
                      {veh.images.slice(0, 4).map((img, idx) => (
                        <div key={idx} className="relative w-full h-24">
                          <Image
                            src={img}
                            alt={veh.make}
                            fill
                            className="object-cover"
                          />
                        </div>
                      ))}
                    </div>
                    <div className="p-4">
                      <h3 className="mb-2 text-xl font-bold">
                        {veh.year} {veh.make} {veh.model}
                      </h3>
                      <div className="grid grid-cols-2 text-sm text-gray-300 gap-x-4">
                        <p>
                          <strong>Color:</strong> {veh.color}
                        </p>
                        <p>
                          <strong>Mileage:</strong> {veh.mileage} miles
                        </p>
                        <p>
                          <strong>Power:</strong> {veh.horsepower} HP
                        </p>
                        <p>
                          <strong>Fuel:</strong> {veh.fuelType}
                        </p>
                        <p>
                          <strong>Transmission:</strong> {veh.transmission}
                        </p>
                      </div>
                      <div className="pt-2 mt-4 text-sm text-gray-300 border-t border-gray-700">
                        <h4 className="mb-1 font-semibold">Maintenance</h4>
                        {maintenanceItems.map((it) => (
                          <div key={it.label} className="flex justify-between">
                            <span>{it.label}:</span>
                            <span>${it.value.toFixed(2)}</span>
                          </div>
                        ))}
                        <div className="flex justify-between mt-2 font-semibold text-green-400">
                          <span>Total Spent:</span>
                          <span>${totalCost.toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 mt-4 md:flex-row md:justify-between">
                        <button
                          onClick={() => openVehicle(veh.id)}
                          className="px-10 py-2 font-medium bg-purple-600 rounded-lg hover:bg-purple-700"
                        >
                          Details
                        </button>
                        <button
                          onClick={() => deleteVehicle(veh.id)}
                          className="px-10 py-2 font-medium bg-red-600 rounded-lg hover:bg-red-700"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}

              {/* Empty Add Vehicle Cards */}
              {[...Array(2)].map((_, i) => (
                <div
                  key={`add-${i}`}
                  className="flex flex-col items-center justify-center h-64 bg-gray-800 cursor-pointer rounded-xl hover:shadow-xl"
                  onClick={addVehicle}
                >
                  <PlusIcon className="w-12 h-12 text-purple-400" />
                  <span className="mt-2 font-medium text-gray-300">
                    Add Vehicle
                  </span>
                </div>
              ))}
            </>
          ) : (
            [...Array(3)].map((_, i) => (
              <div
                key={i}
                className="flex flex-col items-center justify-center h-64 bg-gray-800 cursor-pointer rounded-xl hover:shadow-xl"
                onClick={() => setShowModal(true)}
              >
                <PlusIcon className="w-12 h-12 text-purple-400" />
                <span className="mt-2 font-medium text-gray-300">
                  Add Vehicle
                </span>
              </div>
            ))
          )}
        </motion.div>
      </main>
      <footer className="p-4 text-center text-gray-400 bg-gray-800">
        © {new Date().getFullYear()} MyRide
      </footer>
    </div>
  );
}
