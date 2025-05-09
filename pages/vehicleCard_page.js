// pages/vehicleCard_page.jsx
import React from "react";
import { FaFileAlt, FaRegAddressCard, FaClipboardCheck } from "react-icons/fa";

export default function VehicleCardPage({ vehicle }) {
  // ...existing code...

  return (
    <div className="min-h-screen pt-16 text-white bg-gray-900">
      {/* ...existing components... */}

      <div className="max-w-6xl px-4 py-10 mx-auto">
        {/* Vehicle Info Section */}
        <section className="mb-10">
          {/* ...existing vehicle info code... */}
        </section>

        {/* Redesigned Lower Section */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Redesigned Documents Section */}
          <section className="p-6 bg-gray-800 rounded-lg shadow-lg">
            <h2 className="pb-2 mb-4 text-2xl font-bold text-center border-b">
              Vehicle Documents
            </h2>
            <div className="flex flex-wrap justify-center gap-6">
              <div className="flex flex-col items-center p-4 transition border border-gray-700 rounded-lg hover:shadow-xl">
                <FaFileAlt className="mb-2 text-5xl text-blue-500" />
                <h3 className="text-lg font-semibold">Title</h3>
                <p className="text-sm text-center text-gray-300">
                  Proves legal ownership.
                </p>
              </div>
              <div className="flex flex-col items-center p-4 transition border border-gray-700 rounded-lg hover:shadow-xl">
                <FaRegAddressCard className="mb-2 text-5xl text-green-500" />
                <h3 className="text-lg font-semibold">Registration</h3>
                <p className="text-sm text-center text-gray-300">
                  Verifies registration with authorities.
                </p>
              </div>
              <div className="flex flex-col items-center p-4 transition border border-gray-700 rounded-lg hover:shadow-xl">
                <FaClipboardCheck className="mb-2 text-5xl text-yellow-500" />
                <h3 className="text-lg font-semibold">Inspection</h3>
                <p className="text-sm text-center text-gray-300">
                  Confirms safety and emission standards.
                </p>
              </div>
            </div>
          </section>

          {/* Redesigned Additional Info Section */}
          <section className="flex flex-col items-center p-6 bg-gray-800 rounded-lg shadow-lg">
            <h2 className="pb-2 mb-4 text-2xl font-bold text-center border-b">
              Additional Information
            </h2>
            <p className="text-sm text-center text-gray-300">
              View maintenance history, warranty details and other relevant
              information.
            </p>
            {/* Optionally, add more details here */}
          </section>
        </div>
      </div>

      {/* ...existing components... */}
    </div>
  );
}
