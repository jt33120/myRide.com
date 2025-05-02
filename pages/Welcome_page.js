'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import {
   MagnifyingGlassIcon,
   WrenchIcon,
   UserPlusIcon,
   PlusCircleIcon
  } from '@heroicons/react/24/outline';

export default function WelcomePage() {
  const router = useRouter();
  const [query, setQuery] = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    router.push(`/marketplace_page?search=${encodeURIComponent(query)}`);
  };

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
          <div className="flex flex-col justify-center gap-4 pb-5 mt-8 sm:flex-row">
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

      {/* How It Works */}
      <section className="py-12 bg-white">
        <h2 className="mb-8 text-3xl font-semibold text-center text-gray-800">
          How It Works
        </h2>
        <div className="container grid grid-cols-1 gap-8 mx-auto sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col items-center text-center">
            <UserPlusIcon className="w-10 h-10 mb-4 text-purple-600"  />
            <h3 className="font-semibold">Create Account</h3>
            <p className="text-sm text-gray-500">Set up your profile in seconds.</p>
          </div>
          <div className="flex flex-col items-center text-center">
            <PlusCircleIcon className="w-10 h-10 mb-4 text-purple-600" />
            <h3 className="font-semibold">Add Your Vehicle</h3>
            <p className="text-sm text-gray-500">Import VIN, photos & details.</p>
          </div>
          <div className="flex flex-col items-center text-center">
            <MagnifyingGlassIcon className="w-10 h-10 mb-4 text-purple-600" />
            <h3 className="font-semibold">Browse Marketplace</h3>
            <p className="text-sm text-gray-500">Find what you need with AI power.</p>
          </div>
          <div className="flex flex-col items-center text-center">
            <WrenchIcon className="w-10 h-10 mb-4 text-purple-600" />
            <h3 className="font-semibold">Log Maintenance</h3>
            <p className="text-sm text-gray-500">Keep your history up to date.</p>
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
