import React from "react";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-gradient-to-r from-indigo-700 via-purple-700 to-pink-600 text-white py-10 px-4 shadow-2xl">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center">
        <div className="text-lg font-semibold mb-4 md:mb-0">
          © {new Date().getFullYear()} MyRide. All rights reserved.
        </div>
        <div className="flex space-x-6">
          <Link href="/terms" className="hover:text-gray-200 transition">
            Terms
          </Link>
          <Link href="/privacy" className="hover:text-gray-200 transition">
            Privacy
          </Link>
          <Link href="/contact" className="hover:text-gray-200 transition">
            Contact
          </Link>
          <Link href="/blog" className="hover:text-gray-200 transition">
            Blog
          </Link>
        </div>
      </div>
      <div className="mt-6 text-center text-sm text-gray-300">
        <p>Follow us on social media:</p>
        <div className="flex justify-center space-x-4 mt-2">
          <Link
            href="https://twitter.com"
            className="hover:text-white transition"
          >
            Twitter
          </Link>
          <Link
            href="https://facebook.com"
            className="hover:text-white transition"
          >
            Facebook
          </Link>
          <Link
            href="https://instagram.com"
            className="hover:text-white transition"
          >
            Instagram
          </Link>
        </div>
      </div>
    </footer>
  );
}
