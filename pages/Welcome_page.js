'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import {
  MagnifyingGlassIcon,
  WrenchIcon,
  UserPlusIcon,
  PlusCircleIcon,
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

  const fetchVehicleImages = useCallback(async (vehicleId) => {
    const imagesRef = ref(storage, `listing/${vehicleId}/photos`);
    const imageList = await listAll(imagesRef);
    const imageUrls = await Promise.all(
      imageList.items.map((imageRef) => getDownloadURL(imageRef))
    );
    const frontImageIndex = imageUrls.findIndex((url) => url.includes('front'));
    if (frontImageIndex > -1) {
      const [frontImage] = imageUrls.splice(frontImageIndex, 1);
      imageUrls.unshift(frontImage);
    }
    return imageUrls;
  }, []);

  const fetchSellerProfile = async (uid) => {
    if (!uid) return { profilePicture: '/default-profile.png', firstName: 'Unknown Seller', rating: 0 };
    try {
      const userRef = doc(db, 'members', uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const userData = userSnap.data();
        const profilePictureRef = ref(storage, `members/${uid}/profilepicture.png`);
        const profilePicture = await getDownloadURL(profilePictureRef).catch(() => '/default-profile.png');
        return {
          profilePicture,
          firstName: userData.firstName || 'Unknown Seller',
          rating: userData.rating || 0,
        };
      }
    } catch (error) {
      console.error('Error fetching seller profile:', error);
    }
    return { profilePicture: '/default-profile.png', firstName: 'Unknown Seller', rating: 0 };
  };

  useEffect(() => {
    async function fetchVehicles() {
      const marketplaceRef = collection(db, 'on_marketplace');
      const marketplaceSnapshot = await getDocs(marketplaceRef);
      let vehicleList = [];

      for (const vehicleDoc of marketplaceSnapshot.docs) {
        const vehicleId = vehicleDoc.id;
        const vehicleRef = doc(db, 'listing', vehicleId);
        const vehicleSnap = await getDoc(vehicleRef);

        if (vehicleSnap.exists()) {
          const vehicleData = vehicleSnap.data();
          const marketplaceData = vehicleDoc.data();

          const { profilePicture, firstName, rating } = await fetchSellerProfile(vehicleData.uid);
          const images = await fetchVehicleImages(vehicleId);

          vehicleList.push({
            id: vehicleId,
            make: vehicleData.make || 'Unknown Make',
            model: vehicleData.model || 'Unknown Model',
            year: vehicleData.year || 'Unknown Year',
            owner: firstName,
            profilePicture,
            rating,
            images,
            price: marketplaceData.price || 'N/A',
          });
        }
      }

      setVehicles(vehicleList);
    }

    fetchVehicles();
  }, [fetchVehicleImages]);

  return (
    <div className="flex flex-col min-h-screen pb-5">
      {/* Header */}
      <header className="py-4 bg-black">
        <div className="container mx-auto text-center">
          <h1 className="text-5xl font-bold text-white">MyRide</h1>
        </div>
      </header>

      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center flex-1 overflow-hidden bg-black">
        <div className="absolute inset-0 opacity-10 mix-blend-overlay bg-[url('/logo.png')] bg-center bg-no-repeat bg-contain" />
        <div className="relative z-10 px-6 text-center">
          <h2 className="pt-5 text-4xl font-extrabold text-white md:text-7xl">
            Find Your Next Ride
          </h2>
          <p className="mt-4 text-xl text-gray-300">
            Your marketplace & garage in one place
          </p>

          {/* Search */}
          <form onSubmit={handleSearch} className="flex justify-center mt-8">
            <div className="relative w-80">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by make, model, license..."
                className="w-full py-3 pl-4 pr-12 text-gray-800 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                type="submit"
                className="absolute inset-y-0 right-0 flex items-center px-4 text-white rounded-r-lg bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              >
                <MagnifyingGlassIcon className="w-5 h-5" />
              </button>
            </div>
          </form>

          {/* CTA */}
          <div className="flex flex-col justify-center gap-4 pb-5 mt-8 sm:flex-row ">
            <Link href="/login_page" className="px-8 py-3 font-semibold text-white rounded-lg shadow-lg bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
              Sign In
            </Link>
            <Link href="/signup_page" className="px-8 py-3 font-semibold text-white rounded-lg shadow-lg bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
              Sign Up 🚀
            </Link>
            <Link href="/addVehicle_page" className="px-8 py-3 font-semibold text-white rounded-lg shadow-lg bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600">
              Log a Service 🛠️
            </Link>
          </div>
        </div>
      </section>

      {/* Marketplace Carousel Section */}
      <section className="py-12 bg-gray-100">
        <h2 className="mb-6 text-3xl font-semibold text-center text-gray-800">Featured Vehicles</h2>
        <div className="px-4 overflow-x-auto whitespace-nowrap">
          {vehicles.map((vehicle) => (
            <div key={vehicle.id} className="inline-block w-64 mr-4 transition bg-white rounded-lg shadow-md hover:shadow-lg">
              <Image
                src={vehicle.images[0] || '/default-vehicle.png'}
                alt={`${vehicle.make} ${vehicle.model}`}
                width={256}
                height={160}
                className="object-cover w-full h-40 rounded-t-lg"
              />
              <div className="p-3">
                <h3 className="font-bold text-md">
                  {vehicle.year} {vehicle.make} {vehicle.model}
                </h3>
                <p className="text-sm text-gray-600">${vehicle.price}</p>
                <p className="text-sm text-gray-500">Seller: {vehicle.owner}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 bg-black">
  <h2 className="mb-12 text-4xl font-bold text-center text-white">How It Works</h2>
  <div className="container grid grid-cols-1 gap-8 px-6 mx-auto sm:grid-cols-2 md:grid-cols-4">
    
    {/* Create Account */}
    <div className="flex flex-col items-center p-6 text-center text-white transition border border-purple-600 bg-white/5 rounded-2xl hover:bg-white hover:text-black hover:scale-105">
      <div className="flex items-center justify-center mb-4 text-purple-400 rounded-full w-14 h-14 bg-purple-900/20">
        <UserPlusIcon className="w-8 h-8" />
      </div>
      <h3 className="mb-1 text-lg font-semibold">Create Account</h3>
      <p className="text-sm text-gray-400">Set up your profile in seconds.</p>
    </div>

    {/* Add Your Vehicle */}
    <div className="flex flex-col items-center p-6 text-center text-white transition border border-purple-600 bg-white/5 rounded-2xl hover:bg-white hover:text-black hover:scale-105">
      <div className="flex items-center justify-center mb-4 text-purple-400 rounded-full w-14 h-14 bg-purple-900/20">
        <PlusCircleIcon className="w-8 h-8" />
      </div>
      <h3 className="mb-1 text-lg font-semibold">Add Your Vehicle</h3>
      <p className="text-sm text-gray-400">Import VIN, photos & details.</p>
    </div>

    {/* Browse Marketplace */}
    <div className="flex flex-col items-center p-6 text-center text-white transition border border-purple-600 bg-white/5 rounded-2xl hover:bg-white hover:text-black hover:scale-105">
      <div className="flex items-center justify-center mb-4 text-purple-400 rounded-full w-14 h-14 bg-purple-900/20">
        <MagnifyingGlassIcon className="w-8 h-8" />
      </div>
      <h3 className="mb-1 text-lg font-semibold">Browse Marketplace</h3>
      <p className="text-sm text-gray-400">Find what you need with AI power.</p>
    </div>

    {/* Log Maintenance */}
    <div className="flex flex-col items-center p-6 text-center text-white transition border border-purple-600 bg-white/5 rounded-2xl hover:bg-white hover:text-black hover:scale-105">
      <div className="flex items-center justify-center mb-4 text-purple-400 rounded-full w-14 h-14 bg-purple-900/20">
        <WrenchIcon className="w-8 h-8" />
      </div>
      <h3 className="mb-1 text-lg font-semibold">Log Maintenance</h3>
      <p className="text-sm text-gray-400">Keep your history up to date.</p>
    </div>
  </div>
</section>

      {/* Footer */}
      <footer className="py-6 bg-gray-800">
        <div className="container mx-auto space-y-2 text-center text-gray-400">
          <p>© {new Date().getFullYear()} MyRide. All rights reserved.</p>
          <div className="flex justify-center space-x-4">
            <Link href="/terms" className="hover:text-white">Terms</Link>
            <Link href="/privacy" className="hover:text-white">Privacy</Link>
            <Link href="/contact" className="hover:text-white">Contact</Link>
            <Link href="/blog" className="hover:text-white">Blog</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
