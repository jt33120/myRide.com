import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import NavBar from '../components/Navbar';
import { 
  MagnifyingGlassIcon, 
  WrenchIcon, 
  UserPlusIcon, 
  PlusCircleIcon, 
  ChevronLeftIcon, 
  ChevronRightIcon 
} from '@heroicons/react/24/outline';
import { db, storage } from '../lib/firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { ref, listAll, getDownloadURL } from 'firebase/storage';

export default function WelcomePage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [vehicles, setVehicles] = useState([]);

  const handleSearch = (e) => {
    e.preventDefault();
    router.push(`/marketplace_page?search=${encodeURIComponent(query)}`);
  };

  const fetchVehicleImages = useCallback(async (id) => {
    const imagesRef = ref(storage, `listing/${id}/photos`);
    const list = await listAll(imagesRef);
    const urls = await Promise.all(list.items.map((item) => getDownloadURL(item)));
    const front = urls.find((url) => url.includes('front'));
    return front ? [front, ...urls.filter((url) => url !== front)] : urls;
  }, []);

  const fetchSeller = async (uid) => {
    if (!uid) return { profilePicture: '/default-profile.png', firstName: 'Unknown Seller' };
    try {
      const snap = await getDoc(doc(db, 'members', uid));
      if (snap.exists()) {
        const data = snap.data();
        const picUrl = await getDownloadURL(ref(storage, `members/${uid}/profilepicture.png`)).catch(() => '/default-profile.png');
        return { profilePicture: picUrl, firstName: data.firstName || 'Unknown Seller' };
      }
    } catch (error) {
      console.error('Error fetching seller:', error);
    }
    return { profilePicture: '/default-profile.png', firstName: 'Unknown Seller' };
  };

  useEffect(() => {
    (async () => {
      const snap = await getDocs(collection(db, 'on_marketplace'));
      const list = [];
      for (const docSnap of snap.docs) {
        const id = docSnap.id;
        const listingSnap = await getDoc(doc(db, 'listing', id));
        if (!listingSnap.exists()) continue;
        const data = listingSnap.data();
        const { profilePicture, firstName } = await fetchSeller(data.uid);
        const images = await fetchVehicleImages(id);
        list.push({
          id,
          make: data.make || 'Unknown Make',
          model: data.model || 'Unknown Model',
          year: data.year || 'Unknown Year',
          owner: firstName,
          profilePicture,
          images,
          price: docSnap.data().price || 'N/A',
          type: data.type || 'car',
        });
      }
      setVehicles(list);
    })();
  }, [fetchVehicleImages]);

  const cars = vehicles.filter((v) => !['motorcycle', 'moto'].includes(v.type.toLowerCase()));
  const motorcycles = vehicles.filter((v) => ['motorcycle', 'moto'].includes(v.type.toLowerCase()));

  const cardVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    hover: { scale: 1.05, boxShadow: '0px 10px 15px rgba(0,0,0,0.1)' },
  };

  const carsRef = useRef(null);
  const motosRef = useRef(null);
  const scrollByOffset = (ref) => { if (ref.current) ref.current.scrollBy({ left: 300, behavior: 'smooth' }); };
  const scrollByOffsetBack = (ref) => { if (ref.current) ref.current.scrollBy({ left: -300, behavior: 'smooth' }); };

  const renderItemsOrPlaceholders = (items) => {
    if (items.length > 0) {
      return items.map((v, idx) => (
        <motion.div
          key={v.id}
          variants={cardVariants}
          initial="initial"
          animate="animate"
          transition={{ delay: idx * 0.1 }}
          whileHover="hover"
          className="inline-block w-64 mr-4 overflow-hidden bg-white rounded-lg shadow-md scroll-snap-start"
        >
          <Image
            src={v.images[0] || '/default-vehicle.png'}
            alt={`${v.make} ${v.model}`}
            width={256}
            height={160}
            className="object-cover w-full h-40"
          />
          <div className="p-4">
            <h3 className="font-bold text-md">{v.year} {v.make} {v.model}</h3>
            <p className="mt-1 text-sm text-gray-600">€{v.price}</p>
            <p className="mt-1 text-sm text-gray-500">Seller: {v.owner}</p>
          </div>
        </motion.div>
      ));
    }
    return Array.from({ length: 3 }).map((_, idx) => (
      <div
        key={idx}
        className="inline-block w-64 mr-4 overflow-hidden bg-white rounded-lg shadow-md opacity-50 scroll-snap-start"
      >
        <div className="w-full h-40 bg-gray-200 animate-pulse" />
        <div className="p-4">
          <div className="w-3/4 h-4 mb-2 bg-gray-300 rounded animate-pulse" />
          <div className="w-1/2 h-3 bg-gray-300 rounded animate-pulse" />
        </div>
      </div>
    ));
  };

  return (
    <div className="flex flex-col min-h-screen">
      <NavBar />

      <motion.section
        className="relative py-20 text-center text-white bg-black"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        <div className="absolute inset-0 opacity-10 mix-blend-overlay bg-[url('/logo.png')] bg-center bg-no-repeat bg-contain" />
        <div className="container relative z-10 px-6 mx-auto">
          <motion.h1
            className="text-5xl font-extrabold md:text-7xl"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.7 }}
          >Find Your Next Ride</motion.h1>
          <motion.p
            className="mt-4 text-lg text-gray-300 md:text-2xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >Your marketplace & garage in one place</motion.p>

          <form onSubmit={handleSearch} className="flex justify-center mt-8">
            <motion.div whileHover={{ y: -2 }} transition={{ type: 'spring', stiffness: 300 }} className="relative w-80">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by make, model, license..."
                className="w-full py-3 pl-4 pr-12 text-gray-800 transition-shadow duration-300 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button type="submit" className="absolute inset-y-0 right-0 flex items-center px-4 text-white transition-transform duration-300 rounded-r-lg bg-gradient-to-r from-purple-500 to-pink-500 hover:scale-110">
                <MagnifyingGlassIcon className="w-5 h-5" />
              </button>
            </motion.div>
          </form>

          <motion.div className="grid max-w-xl grid-cols-1 gap-6 px-6 mx-auto mt-10 sm:grid-cols-2 md:px-0">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="flex items-center justify-center py-3 font-semibold text-white transition-transform duration-300 shadow-lg cursor-pointer bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl"
              onClick={() => router.push('/login_page')}
            >
              Sign In
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="flex items-center justify-center py-3 font-semibold text-white transition-transform duration-300 shadow-lg cursor-pointer bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl"
              onClick={() => router.push('/signup_page')}
            >
              Sign Up 🚀
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="flex items-center justify-center py-3 font-semibold text-white transition-transform duration-300 shadow-lg cursor-pointer sm:col-span-2 bg-gradient-to-r from-green-500 to-blue-500 rounded-xl"
              onClick={() => router.push('/addVehicle_page')}
            >
              Log a Service 🛠️
            </motion.div>
          </motion.div>
        </div>
      </motion.section>

      {[
        { title: 'Available Cars', items: cars, ref: carsRef },
        { title: 'Available Motorcycles', items: motorcycles, ref: motosRef },
      ].map(({ title, items, ref }) => (
        <section key={title} className="relative py-12 bg-gray-100">
          <h2 className="mb-6 text-3xl font-semibold text-center text-gray-800">{title}</h2>
          <div className="absolute justify-between hidden transform -translate-y-1/2 md:flex top-1/2 left-4 right-4">
            <button onClick={() => scrollByOffsetBack(ref)} className="p-2 bg-white rounded-lg shadow-md hover:bg-gray-200">
              <ChevronLeftIcon className="w-6 h-6 text-gray-700" />
            </button>
            <button onClick={() => scrollByOffset(ref)} className="p-2 bg-white rounded-lg shadow-md hover:bg-gray-200">
              <ChevronRightIcon className="w-6 h-6 text-gray-700" />
            </button>
          </div>
          <div ref={ref} className="px-6 overflow-x-auto whitespace-nowrap scroll-smooth snap-x snap-mandatory touch-pan-x">
            {renderItemsOrPlaceholders(items)}
          </div>
        </section>
      ))}

      <section className="py-16 bg-black">
        <h2 className="mb-12 text-4xl font-bold text-center text-white">How It Works</h2>
        <div className="container grid grid-cols-1 gap-8 px-6 mx-auto sm:grid-cols-2 md:grid-cols-4">
          {[
            { icon: <UserPlusIcon className="w-8 h-8 text-purple-400" />, title: 'Create Account', desc: 'Set up your profile in seconds.' },
            { icon: <PlusCircleIcon className="w-8 h-8 text-purple-400" />, title: 'Add Your Vehicle', desc: 'Import VIN, photos & details.' },
            { icon: <MagnifyingGlassIcon className="w-8 h-8 text-purple-400" />, title: 'Browse Marketplace', desc: 'Find what you need with AI power.' },
            { icon: <WrenchIcon className="w-8 h-8 text-purple-400" />, title: 'Log Maintenance', desc: 'Keep your history up to date.' },
          ].map(({ icon, title, desc }, idx) => (
            <motion.div
              key={title}
              variants={cardVariants}
              initial="initial"
              animate="animate"
              transition={{ delay: idx * 0.1 }}
              whileHover="hover"
              className="flex flex-col items-center p-6 text-center text-white transition-transform duration-300 border border-purple-600 rounded-lg bg-white/5"
            >
              <div className="flex items-center justify-center mb-4 rounded-lg bg-purple-900/20 w-14 h-14">{icon}</div>
              <h3 className="mb-1 text-lg font-semibold text-white transition-colors duration-300 hover:text-black">{title}</h3>
              <p className="text-sm text-gray-400">{desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <footer className="py-6 bg-gray-800">
        <div className="container mx-auto text-center text-gray-400">
          <p>© {new Date().getFullYear()} MyRide. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}