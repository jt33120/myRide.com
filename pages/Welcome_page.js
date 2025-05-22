import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/router";
import {
  MagnifyingGlassIcon,
  WrenchIcon,
  UserPlusIcon,
  PlusCircleIcon,
  ArrowTrendingUpIcon,
} from "@heroicons/react/24/outline";
// import intro3D from "../public/icons/intro-3d.png";
// import track3D from "../public/icons/track-3d.png";
// import optimise3D from "../public/icons/optimise-3d.png";

import { auth, db, storage } from "../lib/firebase";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { ref, listAll, getDownloadURL } from "firebase/storage";
import Spinner from "../components/Spinner"; // or your preferred loader
import { CarFront } from "lucide-react";
export default function WelcomePage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState([]);
  const [showAuthPopup, setShowAuthPopup] = useState(false);
  const [loading, setLoading] = useState(true);

  const SLIDE_DATA = [
    {
      key: "INTRO",
      title: "WELCOME",
      graphic: "/welcome.png",
      headline: "MyRideYour all-in-one garage & marketplace.",
      desc: "Your vehicle is one of your most important assets. Unlike other assets, it depreciates. Limiting that depreciation is challenging — even professionals struggle with it. At MyRide, we make it easy for everyone.",
    },
    {
      key: "TRACK",
      title: "TRACK",
      graphic: "/track.png",
      headline: "Save all your receipts related to all your vehicles",
      desc: "The AI tracks your spending on repairs, modifications, and regular maintenance — and guides you on exactly what maintenance task to perform next.",
    },
    {
      key: "OPTIMISE",
      title: "OPTIMIZE",
      graphic: "/optimise.png",
      headline: "AI-support car valuation and tracking over time",
      desc: "Our AI gives you an accurate, real-time estimate of your car’s value based on its condition, maintenance, and usage. Track it over time and get tips to boost it — no more lowball offers.",
    },
    {
      key: "SELL",
      title: "SELL",
      graphic: "/sell.png",
      headline: "Add a vehicle in 30sec. List it in 10sec.",
      desc: "We’re building the safest vehicle marketplace ever. With full maintenance records, invite-only access, and crypto-enabled smart transactions, we ensure a trusted community of serious buyers and sellers.",
    },
  ];

  const [currentSlide, setCurrentSlide] = useState(0);
  const containerRef = useRef(null);

  const fetchVehicleImages = useCallback(async (vehicleId) => {
    const imagesRef = ref(storage, `listing/${vehicleId}/photos`);
    const imageList = await listAll(imagesRef);
    const imageUrls = await Promise.all(
      imageList.items.map((imageRef) => getDownloadURL(imageRef))
    );
    const frontIndex = imageUrls.findIndex((url) => url.includes("front"));
    if (frontIndex > -1) {
      const [front] = imageUrls.splice(frontIndex, 1);
      imageUrls.unshift(front);
    }
    return imageUrls;
  }, []);

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollLeft / el.clientWidth);
    setCurrentSlide(idx);
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
        const data = userSnap.data();
        const picRef = ref(storage, `members/${uid}/profilepicture.png`);
        const profilePicture = await getDownloadURL(picRef).catch(
          () => "/default-profile.png"
        );
        return {
          profilePicture,
          firstName: data.firstName || "Unknown Seller",
          rating: data.rating || 0,
        };
      }
    } catch (e) {
      console.error("Error fetching seller profile:", e);
    }
    return {
      profilePicture: "/default-profile.png",
      firstName: "Unknown Seller",
      rating: 0,
    };
  };

  // Chargement des véhicules
  useEffect(() => {
    async function fetchVehicles() {
      const snap = await getDocs(collection(db, "on_marketplace"));
      const list = await Promise.all(
        snap.docs.map(async (docSnap) => {
          const id = docSnap.id;
          const dataSnap = await getDoc(doc(db, "listing", id));
          const data = dataSnap.data();
          if (!data) return null;
          const marketData = docSnap.data();
          // fetch profile & images in parallel
          const [{ profilePicture, firstName: owner, rating }, images] =
            await Promise.all([
              fetchSellerProfile(data.uid),
              fetchVehicleImages(id),
            ]);
          return {
            ...data,
            id,
            vehicleType: data.vehicleType || "car",
            owner,
            profilePicture,
            rating,
            images,
            price: marketData.price || "N/A",
          };
        })
      );
      setVehicles(list.filter(Boolean));
      setLoading(false);
    }
    fetchVehicles();
  }, [fetchVehicleImages]);

  // Séparation voitures / motos
  const cars = vehicles.filter(
    (v) => !["motorcycle", "moto"].includes(v.vehicleType.toLowerCase())
  );
  const motorcycles = vehicles.filter((v) =>
    ["motorcycle", "moto"].includes(v.vehicleType.toLowerCase())
  );

  const handleVehicleClick = (id) => {
    if (!auth.currentUser) setShowAuthPopup(true);
    else router.push(`/vehicleCard_page/${id}`);
  };

  // map slide.key to icon
  const SlideIcon = {
    INTRO: CarFront,
    TRACK: MagnifyingGlassIcon,
    OPTIMISE: WrenchIcon,
    SELL: ArrowTrendingUpIcon,
  };

  return loading ? (
    <div className="flex items-center justify-center h-screen">
      <Spinner />
    </div>
  ) : (
    <section>
      {/* Home mobile */}
      <section className="relative h-screen md:hidden bg-[url(/fond-mobil.png)] bg-cover bg-center">
        {/* Overlay sombre */}
        <div className="absolute inset-0" />

        {/* Barre de progression */}
        <div className="absolute left-0 right-0 flex px-6 space-x-2 top-6">
          {SLIDE_DATA.map((_, i) => (
            <div
              key={i}
              className={`flex-1 h-1 rounded-3xl transition-colors ${
                i === currentSlide ? "bg-[#E31FFF]" : "bg-gray-700/40"
              }`}
            />
          ))}
        </div>

        <div className="relative z-10 flex flex-col h-full px-6 pt-16 pb-8">
          {/* Logo */}
          <div className="flex items-center mb-4">
            <Image
              src="/logoWB.png"
              alt="MyRide"
              width={94}
              height={94}
              className="w-12 h-auto" // Tailwind fixes width, height auto
              style={{ height: "auto" }} // ensure aspect ratio
            />
            <span className="ml-3 text-2xl font-bold text-white">MyRide</span>
          </div>
          <h1 className="mb-4 text-5xl font-bold text-white">
            Track. Optimize.
            <br />
            Sell for more.
          </h1>
          {/* Carousel */}
          <div
            ref={containerRef}
            onScroll={handleScroll}
            className="flex flex-1 overflow-x-auto snap-x snap-mandatory no-scrollbar"
            style={{ scrollSnapType: "x mandatory" }}
          >
            {SLIDE_DATA.map((slide) => {
              const Icon = SlideIcon[slide.key];
              return (
                <div
                  key={slide.key}
                  className="flex flex-col items-center flex-shrink-0 w-full px-4 text-center snap-start"
                >
                  <h2 className="w-full mt-10 mb-4 text-3xl font-semibold text-center text-white uppercase border-b-2 rounded-3xl">
                    {slide.title}
                  </h2>
                  <div className="grid grid-cols-1 gap-4 px-4 mt-5 mb-12 md:grid-cols-2">
                    {[slide.headline, slide.desc].map((text, i) => (
                      <div
                        key={i}
                        className="flex flex-col items-center p-6 rounded-lg bg-opacity-70 bg-zinc-500"
                      >
                        {/* Only show the icon in the first box (headline) */}
                        {i === 0 && <Icon className="w-8 h-8 mb-3 text-white" />}
                        {/* Show nothing in the second box (desc) */}
                        <p className="text-white">{text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <Link
            href="/signup_page"
            className="button-main mt-4 mb-4 text-center mx-auto"
            style={{ marginBottom: "60px" }} // extra bottom margin for navbar
          >
            Get Started
          </Link>
        </div>
      </section>
      {/* FIN HOME MOBILE */}

      <div className="hidden min-h-screen pb-5 md:flex md:flex-col md:pb-0 md:mx-auto md:max-w-5xl md:items-center">
        {/* Hero */}
        <section className="relative flex flex-col items-center justify-center flex-1 overflow-hidden bg-gradient-to-b from-gray-900 to-gray-800">
          <div className="absolute inset-0 bg-black" />
          <div className="relative z-10 px-24 text-center md:mt-40">
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
                Log a Vehicle 🛠️
              </Link>
            </div>
          </div>
        </section>

        {/* Marketplace Carousel Section */}
        <section className="px-1 py-12 bg-gray-800">
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
                      onClick={() => handleVehicleClick(vehicle.id)}
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
        <section className="py-12 text-white bg-gray-800">
          <h2 className="mb-10 text-3xl font-bold text-center">How It Works</h2>
          <div className="grid grid-cols-1 gap-6 px-6 sm:grid-cols-2 lg:grid-cols-4 ">
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
                className="flex flex-col items-center p-6 text-center transition bg-gray-700 rounded-lg shadow-md hover:shadow-lg hover:bg-gray-700"
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
    </section>
  );
}
