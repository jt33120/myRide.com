import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { auth, db, storage } from '../lib/firebase';
import {
  doc,
  getDoc,
  collection,
  getDocs,
  deleteDoc,
  updateDoc,
  arrayRemove,
} from 'firebase/firestore';
import { ref, listAll, getDownloadURL, deleteObject } from 'firebase/storage';
import Image from 'next/image';
import { motion } from 'framer-motion';
import NavBar from '../components/Navbar';
import { PlusIcon } from '@heroicons/react/24/outline';

export default function MyGarage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const user = auth.currentUser;
      if (!user) return;
      const userRef = doc(db, 'members', user.uid);
      const snap = await getDoc(userRef);
      if (!snap.exists()) return;
      const data = snap.data();
      setFirstName(data.firstName);
      if (data.vehicles?.length) {
        const list = await Promise.all(
          data.vehicles.map(async (id) => {
            const vRef = doc(db, 'listing', id);
            const vSnap = await getDoc(vRef);
            if (!vSnap.exists()) return null;
            const vData = vSnap.data();
            const imgsRef = ref(storage, `listing/${id}/photos`);
            const files = await listAll(imgsRef);
            const urls = await Promise.all(files.items.map((f) => getDownloadURL(f)));
            const images = urls.filter((u) => !u.includes('vehicleVideo'));
            const rSnap = await getDocs(collection(db, `listing/${id}/receipts`));
            const receipts = rSnap.docs.map((d) => d.data());
            return { id, ...vData, images, receipts };
          })
        );
        setVehicles(list.filter(Boolean));
      }
      setLoading(false);
    }
    load();
  }, []);

  const openVehicle = (id) => router.push(`/vehicleCard_page/${id}`);
  const addVehicle = () => router.push('/addVehicle_page');
  const deleteVehicle = async (id) => {
    if (!confirm('Remove this vehicle?')) return;
    const user = auth.currentUser;
    if (!user) return;
    const imgsRef = ref(storage, `listing/${id}/photos`);
    const fl = await listAll(imgsRef);
    await Promise.all(fl.items.map((f) => deleteObject(f)));
    await deleteDoc(doc(db, 'listing', id));
    await updateDoc(doc(db, 'members', user.uid), { vehicles: arrayRemove(id) });
    setVehicles((v) => v.filter((x) => x.id !== id));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center flex-1 min-h-screen text-gray-300 bg-gray-900">
        <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="block w-8 h-8 border-4 border-purple-500 rounded-full border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen text-white bg-gray-900">
      <NavBar />
      <main className="flex-1 p-6 pt-32">
        <motion.h1
          className="pb-4 mb-8 text-5xl font-extrabold text-center text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500"
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6 }}
        >
          {firstName}'s Garage
        </motion.h1>

        <motion.div
          className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
          initial="hidden"
          animate="show"
        >
          {vehicles.map((veh) => {
            const totalCost = veh.receipts.reduce((sum, r) => sum + (r.price || 0), 0);
            return (
              <motion.div key={veh.id} className="overflow-hidden transition-shadow bg-gray-800 shadow-lg rounded-xl hover:shadow-2xl">
                <div className="grid h-48 grid-cols-2 gap-1">
                  {veh.images.slice(0, 4).map((img, idx) => (
                    <div className="relative w-full h-24" key={idx}>
                      <Image src={img} alt={veh.make} fill className="object-cover" />
                    </div>
                  ))}
                </div>
                <div className="p-4">
                  <h3 className="mb-2 text-xl font-bold">{veh.year} {veh.make} {veh.model}</h3>
                  <div className="grid grid-cols-2 text-sm text-gray-300 gap-x-4">
                    <p><strong>Color:</strong> {veh.color}</p>
                    <p><strong>KMs:</strong> {veh.kilometers}</p>
                    <p><strong>Power:</strong> {veh.horsepower} HP</p>
                    <p><strong>Fuel:</strong> {veh.fuelType}</p>
                    <p><strong>Transmission:</strong> {veh.transmission}</p>
                  </div>
                  <p className="mt-4 text-sm font-semibold text-green-400">Total Spent: ${totalCost.toFixed(2)}</p>
                  <div className="flex flex-col gap-2 mt-4 md:flex md:flex-row md:justify-between">
                    <button onClick={() => openVehicle(veh.id)} className="px-10 py-2 font-medium bg-purple-600 rounded-lg hover:bg-purple-700">Details</button>
                    <button onClick={() => deleteVehicle(veh.id)} className="px-10 py-2 font-medium bg-red-600 rounded-lg hover:bg-red-700">Delete</button>
                  </div>
                </div>
              </motion.div>
            );
          })}

          {[...Array(2)].map((_, i) => (
            <div key={`add-slot-${i}`} className="flex items-center justify-center bg-gray-800 cursor-pointer rounded-xl hover:shadow-xl" onClick={addVehicle}>
              <div className="flex flex-col items-center text-purple-400">
                <PlusIcon className="w-10 h-10" />
                <span className="mt-2 font-medium">Add Vehicle</span>
              </div>
            </div>
          ))}
        </motion.div>
      </main>
      <footer className="p-4 text-center text-gray-400 bg-gray-800">
        © {new Date().getFullYear()} MyRide
      </footer>
    </div>
  );
}
