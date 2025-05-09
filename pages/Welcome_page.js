import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import NavBar from "../components/Navbar";
import {
  MagnifyingGlassIcon,
  WrenchIcon,
  UserPlusIcon,
  PlusCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import { db, storage } from "../lib/firebase";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { ref, listAll, getDownloadURL } from "firebase/storage";

export default function WelcomePage() {
  const router = useRouter();
  const [queryText, setQueryText] = useState("");
  const [vehicles, setVehicles] = useState(null);
  const carsRef = useRef(null);
  const motosRef = useRef(null);

  const handleSearch = (e) => {
    e.preventDefault();
    router.push(`/marketplace_page?search=${encodeURIComponent(queryText)}`);
  };

  useEffect(() => {
    const loadVehicles = async () => {
      try {
        // 1. Récupère tous les IDs et prix en vente
        const marketSnap = await getDocs(collection(db, "on_marketplace"));
        const marketplaceEntries = marketSnap.docs.map((d) => ({
          id: d.id,
          price: d.data().price || "N/A",
        }));

        // 2. Charge tous les listings Firestore en parallèle
        const listingSnaps = await Promise.all(
          marketplaceEntries.map((entry) => getDoc(doc(db, "listing", entry.id)))
        );

        // 3. Pour chaque listing, récupère images + vendeur en parallèle
        const vehiclesData = await Promise.all(
          listingSnaps.map(async (snap, idx) => {
            if (!snap.exists()) return null;
            const data = snap.data();
            const id = marketplaceEntries[idx].id;

            // Récupération des images
            const imagesRef = ref(storage, `listing/${id}/photos`);
            const items = await listAll(imagesRef);
            const urls = await Promise.all(items.items.map((it) => getDownloadURL(it)));
            const front = urls.find((u) => u.includes("front"));
            const images = front ? [front, ...urls.filter((u) => u !== front)] : urls;

            // Récupération du vendeur
            let seller = { profilePicture: "/default-profile.png", firstName: "Unknown Seller" };
            if (data.uid) {
              try {
                const memberSnap = await getDoc(doc(db, "members", data.uid));
                if (memberSnap.exists()) {
                  const picRef = ref(storage, `members/${data.uid}/profilepicture.png`);
                  const picUrl = await getDownloadURL(picRef).catch(() => "/default-profile.png");
                  const memberData = memberSnap.data();
                  seller = {
                    profilePicture: picUrl,
                    firstName: memberData.firstName || seller.firstName,
                  };
                }
              } catch (e) {
                console.error("fetchSeller error", e);
              }
            }

            return {
              id,
              make: data.make || "Unknown Make",
              model: data.model || "Unknown Model",
              year: data.year || "Unknown Year",
              type: data.type || "car",
              price: marketplaceEntries[idx].price,
              images,
              owner: seller.firstName,
              profilePicture: seller.profilePicture,
            };
          })
        );

        // 4. Mise à jour d'état
        setVehicles(vehiclesData.filter(Boolean));
      } catch (error) {
        console.error("Error loading vehicles:", error);
        setVehicles([]); // pour éviter un loader infini
      }
    };

    loadVehicles();
  }, []);

  // Affiche un loader tant que les données n'arrivent pas
  if (vehicles === null) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-600">Chargement des véhicules…</p>
      </div>
    );
  }

  // Sépare voitures et motos
  const cars = vehicles.filter((v) => !["motorcycle", "moto"].includes(v.type.toLowerCase()));
  const motorcycles = vehicles.filter((v) =>
    ["motorcycle", "moto"].includes(v.type.toLowerCase())
  );

  const cardVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    hover: { scale: 1.05, boxShadow: "0px 10px 15px rgba(0,0,0,0.1)" },
  };

  const scrollByOffset = (ref, dir = 1) => {
    ref.current?.scrollBy({ left: 300 * dir, behavior: "smooth" });
  };

  const renderItems = (items) =>
    items.map((v, idx) => (
      <motion.div
        key={v.id}
        variants={cardVariants}
        initial="initial"
        animate="animate"
        transition={{ delay: idx * 0.1 }}
        whileHover="hover"
        className="inline-block w-64 mr-4 overflow-hidden bg-white rounded-lg shadow-md scroll-snap-start"
      >
        <Link href={`/vehicleCard_page/${v.id}`} legacyBehavior>
          <a>
            <Image
              src={v.images[0] || "/default-vehicle.png"}
              alt={`${v.make} ${v.model}`}
              width={256}
              height={160}
              className="object-cover w-full h-40"
            />
            <div className="p-4">
              <h3 className="font-bold text-gray-800 text-md">
                {v.year} {v.make} {v.model}
              </h3>
              <p className="mt-1 text-sm text-gray-600">€{v.price}</p>
              <div className="flex items-center mt-2">
                <Image
                  src={v.profilePicture}
                  alt="Seller"
                  width={24}
                  height={24}
                  className="rounded-full"
                />
                <p className="ml-2 text-sm text-gray-500">{v.owner}</p>
              </div>
            </div>
          </a>
        </Link>
      </motion.div>
    ));

  return (
    <div className="flex flex-col min-h-screen">
      {/* Navigation */}
      <NavBar>
        <div className="hidden space-x-6 md:flex">
          <Link href="/marketplace_page" className="text-white hover:text-gray-300">
            Marketplace
          </Link>
          <Link href="/myVehicles_page" className="text-white hover:text-gray-300">
            My Garage
          </Link>
          <Link href="/myMessages_page" className="text-white hover:text-gray-300">
            Messages
          </Link>
          <Link href="/userProfile_page" className="text-white hover:text-gray-300">
            Profile
          </Link>
        </div>
      </NavBar>

      {/* Hero & Recherche */}
      <motion.section
        className="relative py-20 text-center text-white bg-black"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        <div className="absolute inset-0 opacity-10 mix-blend-overlay bg-[url('/logo.png')] bg-center bg-no-repeat bg-contain" />
        <div className="container relative z-10 px-6 mx-auto">
          <motion.h1
            className="text-5xl font-extrabold md:text-7xl md:mt-8"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.7 }}
          >
            Find Your Next Ride
          </motion.h1>
          <motion.p
            className="mt-4 text-lg text-gray-300 md:text-2xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            Your marketplace & garage in one place
          </motion.p>

          <form
            onSubmit={handleSearch}
            className="flex flex-col items-center mt-8 space-y-6"
          >
            <div className="flex space-x-4">
              <input
                type="text"
                value={queryText}
                onChange={(e) => setQueryText(e.target.value)}
                placeholder="Search by make, model, or license..."
                className="px-4 py-3 text-gray-800 bg-white border border-gray-300 rounded-lg shadow-sm w-72 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                type="submit"
                className="px-6 py-3 text-white rounded-lg shadow-md bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <MagnifyingGlassIcon className="w-5 h-5" />
              </button>
            </div>
          </form>

          <motion.div className="grid max-w-xl grid-cols-1 gap-6 px-6 mx-auto mt-10 sm:grid-cols-2 md:px-0">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="flex items-center justify-center py-3 font-semibold text-white transition-transform duration-300 shadow-lg cursor-pointer bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl"
              onClick={() => router.push("/login_page")}
            >
              Sign In
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="flex items-center justify-center py-3 font-semibold text-white transition-transform duration-300 shadow-lg cursor-pointer bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl"
              onClick={() => router.push("/signup_page")}
            >
              Sign Up 🚀
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="flex items-center justify-center py-3 font-semibold text-white transition-transform duration-300 shadow-lg cursor-pointer sm:col-span-2 bg-gradient-to-r from-green-500 to-blue-500 rounded-xl"
              onClick={() => router.push("/addVehicle_page")}
            >
              Log a Service 🛠️
            </motion.div>
          </motion.div>
        </div>
      </motion.section>

      {/* Sections Voitures & Motos */}
      {[
        { title: "Available Cars", items: cars, ref: carsRef },
        { title: "Available Motorcycles", items: motorcycles, ref: motosRef },
      ].map(({ title, items, ref }) => (
        <section key={title} className="relative py-12 bg-gradient-to-b from-gray-100 to-gray-200">
          <h2 className="mb-6 text-3xl font-semibold text-center text-gray-800">{title}</h2>
          <div className="absolute justify-between hidden transform -translate-y-1/2 md:flex top-1/2 left-4 right-4">
            <button
              onClick={() => scrollByOffset(ref, -1)}
              className="p-2 bg-white rounded-lg shadow-md hover:bg-gray-200"
            >
              <ChevronLeftIcon className="w-6 h-6 text-gray-700" />
            </button>
            <button
              onClick={() => scrollByOffset(ref, +1)}
              className="p-2 bg-white rounded-lg shadow-md hover:bg-gray-200"
            >
              <ChevronRightIcon className="w-6 h-6 text-gray-700" />
            </button>
          </div>
          <div
            ref={ref}
            className="px-6 overflow-x-auto whitespace-nowrap scroll-smooth snap-x snap-mandatory touch-pan-x"
          >
            {renderItems(items)}
          </div>
        </section>
      ))}

      {/* How It Works */}
      <section className="py-16 bg-black">
        <h2 className="mb-12 text-4xl font-bold text-center text-white">How It Works</h2>
        <div className="container grid grid-cols-1 gap-8 px-6 mx-auto sm:grid-cols-2 md:grid-cols-4">
          {[
            {
              icon: <UserPlusIcon className="w-8 h-8 text-purple-400" />,
              title: "Create Account",
              desc: "Set up your profile in seconds.",
            },
            {
              icon: <PlusCircleIcon className="w-8 h-8 text-purple-400" />,
              title: "Add Your Vehicle",
              desc: "Import VIN, photos & details.",
            },
            {
              icon: <MagnifyingGlassIcon className="w-8 h-8 text-purple-400" />,
              title: "Browse Marketplace",
              desc: "Find what you need with AI power.",
            },
            {
              icon: <WrenchIcon className="w-8 h-8 text-purple-400" />,
              title: "Log Maintenance",
              desc: "Keep your history up to date.",
            },
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
              <div className="flex items-center justify-center mb-4 rounded-lg bg-purple-900/20 w-14 h-14">
                {icon}
              </div>
              <h3 className="mb-1 text-lg font-semibold text-white transition-colors duration-300 hover:text-black">
                {title}
              </h3>
              <p className="text-sm text-gray-400">{desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 bg-gray-800">
        <div className="container mx-auto text-center text-gray-400">
          <p>© {new Date().getFullYear()} MyRide. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
