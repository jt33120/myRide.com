import React from "react";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="hidden py-6 bg-gray-900 md:block">
      <div className="container mx-auto space-y-2 text-center text-gray-400">
        <p>© {new Date().getFullYear()} MyRide. All rights reserved.</p>
        <div className="flex justify-center space-x-4">
          <Link href="/terms" className="hover:text-white">
            Terms
          </Link>
          <Link href="/privacy" className="hover:text-white">
            Privacy
          </Link>
          <Link href="/help_page" className="hover:text-white">
            Contact
          </Link>
          
        </div>
      </div>
    </footer>
  );
}
