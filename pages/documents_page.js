import React, { useEffect, useState } from "react";
import { storage } from "../lib/firebase";
import { ref, getDownloadURL } from "firebase/storage";


const DocumentsPage = () => {
  const [buyMotorcycleChecklistUrl, setBuyMotorcycleChecklistUrl] = useState("");
  const [billOfSaleUrl, setBillOfSaleUrl] = useState("");
  const [buyCarChecklistUrl, setBuyCarChecklistUrl] = useState("");

  useEffect(() => {
    const fetchDocumentUrls = async () => {
      try {
        const motorcycleChecklistRef = ref(
          storage,
          "public/BUY_MOTORCYCLE_CHECKLIST.xlsx"
        );
        const billOfSaleRef = ref(storage, "public/BillOfSale_Template.pdf");
        const carChecklistRef = ref(storage, "public/BUY_CAR_CHECKLIST.xlsx");

        const motorcycleChecklistUrl = await getDownloadURL(
          motorcycleChecklistRef
        );
        const billOfSaleUrl = await getDownloadURL(billOfSaleRef);
        const carChecklistUrl = await getDownloadURL(carChecklistRef);

        setBuyMotorcycleChecklistUrl(motorcycleChecklistUrl);
        setBillOfSaleUrl(billOfSaleUrl);
        setBuyCarChecklistUrl(carChecklistUrl);
      } catch (error) {
        console.error("Error fetching document URLs:", error);
      }
    };

    fetchDocumentUrls();
  }, []);

  return (
    <div className="min-h-screen px-6 pt-20 text-black bg-gray-100">
      <h1 className="page-heading">Documents</h1>
      <p className="page-subheading">
        Our goal is to simplify your life with pre-filled documents. To come:
        all digitalized bill of sale, signed electronically, all safe. We will
        also add AI guidelines for specific checklists per model.
      </p>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 space-between-boxes">
        <div className="relative card">
          <div className="card-content">
            <h2 className="card-title">Motorcycle Checklist</h2>
            <p className="card-description">
              How to buy a used motorcycle? (XLSX)
            </p>
          </div>
          <a
            href={buyMotorcycleChecklistUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute right-0 transform -translate-y-1/2 top-1/2 button-primary"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
              className="size-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"
              />
            </svg>
          </a>
        </div>
        <div className="relative card">
          <div className="card-content">
            <h2 className="card-title">Bill of Sale Template</h2>
            <p className="card-description">Template for vehicle sale (PDF)</p>
          </div>
          <a
            href={billOfSaleUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute right-0 transform -translate-y-1/2 top-1/2 button-primary"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
              className="size-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"
              />
            </svg>
          </a>
        </div>
        <div className="relative card">
          <div className="card-content">
            <h2 className="card-title">Car Checklist</h2>
            <p className="card-description">How to buy a used car? (XLSX)</p>
          </div>
          <a
            href={buyCarChecklistUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute right-0 transform -translate-y-1/2 top-1/2 button-primary"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
              className="size-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"
              />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
};

export default DocumentsPage;
