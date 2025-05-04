import React, { useEffect, useState } from "react";
import { storage } from "../lib/firebase";
import { ref, getDownloadURL } from "firebase/storage";
import Navbar from "../components/Navbar";
import { ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import { DocumentTextIcon, DocumentCheckIcon, ChevronDoubleRightIcon } from "@heroicons/react/24/solid";
import { motion } from "framer-motion";

export default function DocumentsPage() {
  const [docs, setDocs] = useState({ motorcycle: "", billOfSale: "", car: "" });

  useEffect(() => {
    async function fetchUrls() {
      const paths = {
        motorcycle: "public/BUY_MOTORCYCLE_CHECKLIST.xlsx",
        billOfSale:  "public/BillOfSale_Template.pdf",
        car:         "public/BUY_CAR_CHECKLIST.xlsx",
      };
      try {
        const entries = await Promise.all(
          Object.entries(paths).map(async ([k, p]) => {
            const url = await getDownloadURL(ref(storage, p));
            return [k, url];
          })
        );
        setDocs(Object.fromEntries(entries));
      } catch (e) {
        console.error("Failed to fetch documents:", e);
      }
    }
    fetchUrls();
  }, []);

  const items = [
    {
      key: "motorcycle",
      title: "Motorcycle Checklist",
      desc: "Step-by-step XLSX guide",
      url:  docs.motorcycle,
      Icon: DocumentCheckIcon
    },
    {
      key: "billOfSale",
      title: "Bill of Sale Template",
      desc: "Legal PDF contract",
      url:  docs.billOfSale,
      Icon: DocumentTextIcon
    },
    {
      key: "car",
      title: "Car Checklist",
      desc: "Complete XLSX checklist",
      url:  docs.car,
      Icon: DocumentCheckIcon
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-100 to-white">
      <Navbar />

      <div className="max-w-5xl px-6 py-16 mx-auto">
        {/* Title */}
        <h1 className="mb-6 text-5xl font-extrabold text-center text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-700">
          Documents Library
        </h1>
        <p className="mb-12 text-center text-gray-600">
          Download and get instant access to essential vehicle documents with one click.
        </p>

        {/* Grid */}
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {items.map(({ key, title, desc, url, Icon }, i) => (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, type: "spring", stiffness: 100 }}
            >
              {/* Gradient border container */}
              <div className="p-1 transition-transform transform shadow-lg rounded-2xl bg-gradient-to-r from-pink-500 to-purple-700 hover:shadow-2xl hover:scale-105">
                {/* Card */}
                <div className="flex flex-col h-full p-6 bg-white rounded-2xl">
                  {/* Icon */}
                  <div className="flex items-center justify-center w-12 h-12 mb-4 rounded-full bg-gradient-to-tr from-pink-500 to-purple-700">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  {/* Title & Description */}
                  <h2 className="mb-2 text-xl font-semibold text-gray-800">{title}</h2>
                  <p className="flex-1 text-gray-500">{desc}</p>
                  {/* Download button */}
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center px-4 py-2 mt-6 font-medium text-white transition rounded-lg bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600"
                  >
                    <ArrowDownTrayIcon className="w-5 h-5 mr-2" />
                    Download
                    <ChevronDoubleRightIcon className="w-4 h-4 ml-1 animate-pulse" />
                  </a>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
