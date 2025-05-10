"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/router";
import {
  MagnifyingGlassIcon,
  WrenchIcon,
  UserPlusIcon,
  PlusCircleIcon,
} from "@heroicons/react/24/outline";

import { auth, db, storage } from "../lib/firebase"; // Assurez-vous que `auth` est bien importé
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { ref, listAll, getDownloadURL } from "firebase/storage";

export default function WelcomePage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [vehicles, setVehicles] = useState([]);
  const [showAuthPopup, setShowAuthPopup] = useState(false); // État pour la pop-up
  const [selectedVehicleId, setSelectedVehicleId] = useState(null); // Véhicule sélectionné

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
    const frontImageIndex = imageUrls.findIndex((url) => url.includes("front"));
    if (frontImageIndex > -1) {
      const [frontImage] = imageUrls.splice(frontImageIndex, 1);
      imageUrls.unshift(frontImage);
    }
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
      const userRef = doc(db, "members", uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const userData = userSnap.data();
        const profilePictureRef = ref(
          storage,
          `members/${uid}/profilepicture.png`
        );
        const profilePicture = await getDownloadURL(profilePictureRef).catch(
          () => "/default-profile.png"
        );
        return {
          profilePicture,
          firstName: userData.firstName || "Unknown Seller",
          rating: userData.rating || 0,
        };
      }
    } catch (error) {
      console.error("Error fetching seller profile:", error);
    }
    return {
      profilePicture: "/default-profile.png",
      firstName: "Unknown Seller",
      rating: 0,
    };
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

          const { profilePicture, firstName, rating } =
            await fetchSellerProfile(vehicleData.uid);
          const images = await fetchVehicleImages(vehicleId);

          vehicleList.push({
            id: vehicleId,
            make: vehicleData.make || "Unknown Make",
            model: vehicleData.model || "Unknown Model",
            year: vehicleData.year || "Unknown Year",
            engine: vehicleData.engine || "Unknown Engine", // Récupération de l'information "engine"
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

  // séparer voitures et motos
  const cars = vehicles.filter(
    (v) =>
      !["motorcycle", "moto"].includes(
        v.make?.toLowerCase() || v.model?.toLowerCase()
      )
  );
  const motorcycles = vehicles.filter((v) =>
    ["motorcycle", "moto"].includes(
      v.make?.toLowerCase() || v.model?.toLowerCase()
    )
  );

  const handleVehicleClick = (vehicleId) => {
    const user = auth.currentUser; // Vérifie si l'utilisateur est connecté
    if (!user) {
      setSelectedVehicleId(vehicleId);
      setShowAuthPopup(true); // Affiche la pop-up si non connecté
    } else {
      router.push(`/vehicleCard_page/${vehicleId}`);
    }
  };

  return (
    <div className="flex flex-col min-h-screen pb-5">
      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center flex-1 overflow-hidden bg-gradient-to-b from-gray-900 to-gray-800">
        <div className="absolute inset-0 bg-black" />
        <div className="relative z-10 px-6 text-center md:mt-40">
          <h2 className="text-4xl font-extrabold text-white max-sm:mt-5 md:text-7xl">
            Find Your Next Ride
          </h2>
          <p className="mt-4 text-xl text-gray-300">
            Your marketplace & garage in one place
          </p>

          {/* CTA */}
          <div className="flex flex-col justify-center gap-4 pb-5 mt-8 sm:flex-row">
            <Link
              href="/login_page"
              className="px-8 py-3 font-semibold text-white rounded-lg shadow-lg bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              Sign In
            </Link>
            <Link
              href="/signup_page"
              className="px-8 py-3 font-semibold text-white rounded-lg shadow-lg bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              Sign Up 🚀
            </Link>
            <Link
              href="/addVehicle_page"
              className="px-8 py-3 font-semibold text-white rounded-lg shadow-lg bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600"
            >
              Log a Service 🛠️
            </Link>
          </div>
        </div>
      </section>

      {/* Marketplace Carousel Section */}
      <section className="py-12 bg-gray-800">
        {/* Featured Cars */}
        <h2 className="mb-8 text-4xl font-extrabold text-center text-white">
          Featured Cars
        </h2>
        <div className="px-4 py-4 overflow-x-auto whitespace-nowrap sm:overflow-visible sm:whitespace-normal">
          <div className="inline-flex space-x-4 sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:gap-6">
            {cars.map((vehicle) => (
              <div
                key={vehicle.id}
                onClick={() => handleVehicleClick(vehicle.id)}
                className="min-w-[14rem] sm:min-w-auto flex-shrink-0 transition transform bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl border border-gray-300 shadow-lg hover:shadow-2xl hover:scale-105 duration-300 cursor-pointer"
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
                    <span className="px-2 py-1 text-sm font-medium text-white bg-gray-800 rounded">
                      {vehicle.engine || "Unknown Engine"}
                    </span>
                  </div>
                  <p className="text-lg font-semibold text-blue-600">
                    €{vehicle.price}
                  </p>

                  {/* Seller Information */}
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
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Featured Motorcycles */}
        <h2 className="mt-8 mb-8 text-4xl font-extrabold text-center text-white">
          Featured Motorcycles
        </h2>
        <div className="px-4 py-4 overflow-x-scroll scroll-smooth whitespace-nowrap sm:overflow-visible sm:whitespace-normal">
          <div className="inline-flex space-x-4 sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:gap-6">
            {motorcycles.length
              ? motorcycles.map((vehicle) => (
                  <div
                    key={vehicle.id}
                    onClick={() =>
                      router.push(`/vehicleCard_page/${vehicle.id}`)
                    }
                    className="min-w-[12rem] sm:min-w-auto flex-shrink-0 transition transform bg-white rounded-xl border border-gray-300 shadow-md hover:shadow-xl hover:scale-105 duration-300 cursor-pointer scroll-snap-align-start"
                  >
                    <div className="relative h-48">
                      <Image
                        src={vehicle.images[0] || "/default-vehicle.png"}
                        alt={`${vehicle.make} ${vehicle.model}`}
                        fill
                        className="object-cover rounded-t-xl"
                      />
                    </div>
                    <div className="p-4">
                      <h3 className="mb-2 text-xl font-semibold text-gray-900">
                        {vehicle.year} {vehicle.make} {vehicle.model}
                      </h3>
                      <p className="text-lg font-bold text-blue-600">
                        €{vehicle.price}
                      </p>
                      <p className="mt-2 text-sm text-gray-600">
                        Seller: {vehicle.owner}
                      </p>
                    </div>
                  </div>
                ))
              : Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="min-w-[12rem] h-64 flex-shrink-0 bg-gray-200 rounded-xl animate-pulse scroll-snap-align-start"
                  />
                ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-12 text-white bg-gray-900">
        <h2 className="mb-10 text-3xl font-bold text-center">How It Works</h2>
        <div className="grid grid-cols-1 gap-6 px-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: UserPlusIcon,
              title: "Create Account",
              desc: "Set up your profile in seconds.",
            },
            {
              icon: PlusCircleIcon,
              title: "Add Vehicle",
              desc: "Import VIN, photos & details.",
            },
            {
              icon: MagnifyingGlassIcon,
              title: "Browse Marketplace",
              desc: "Find what you need with AI power.",
            },
            {
              icon: WrenchIcon,
              title: "Log Maintenance",
              desc: "Keep your history up to date.",
            },
          ].map(({ icon: Icon, title, desc }, i) => (
            <div
              key={i}
              className="flex flex-col items-center p-6 text-center transition bg-gray-800 rounded-lg shadow-md hover:shadow-lg hover:bg-gray-700"
            >
              <div className="flex items-center justify-center mb-4 bg-purple-600 rounded-full w-14 h-14">
                <Icon className="w-8 h-8 text-white" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">{title}</h3>
              <p className="text-sm text-gray-300">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 bg-gray-900">
        <div className="container mx-auto space-y-2 text-center text-gray-400">
          <p>© {new Date().getFullYear()} MyRide. All rights reserved.</p>
          <div className="flex justify-center space-x-4">
            <Link href="/terms" className="hover:text-white">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-white">
              Privacy
            </Link>
            <Link href="/contact" className="hover:text-white">
              Contact
            </Link>
            <Link href="/blog" className="hover:text-white">
              Blog
            </Link>
          </div>
        </div>
      </footer>

      {/* Auth Popup */}
      {showAuthPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
          <div className="p-8 bg-white rounded-lg shadow-xl max-w-sm w-full">
            <h2 className="mb-4 text-2xl font-bold text-center text-gray-800">
              Sign In or Sign Up
            </h2>
            <p className="mb-6 text-center text-gray-600">
              You need to be logged in to view the details of this listing.
            </p>
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => router.push("/login_page")}
                className="px-6 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition"
              >
                Sign In
              </button>
              <button
                onClick={() => router.push("/signup_page")}
                className="px-6 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700 transition"
              >
                Sign Up
              </button>
            </div>
            <button
              onClick={() => setShowAuthPopup(false)}
              className="mt-6 text-sm text-center text-gray-500 hover:underline w-full"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
