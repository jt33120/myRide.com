import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { auth, storage } from "../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { ref, getDownloadURL } from "firebase/storage";

const DocumentsPage = () => {
  const [user, setUser] = useState(null);
  const [documents, setDocuments] = useState({
    registration: null,
    insurance: null,
    maintenance: null,
  });
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.push("/login_page"); // Redirect to login page if not logged in
      } else {
        setUser(currentUser);
      }
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    const fetchDocumentUrls = async () => {
      try {
        const motorcycleChecklistRef = ref(
          storage,
          "public/BUY_MOTORCYCLE_CHECKLIST.xlsx"
        );
        const billOfSaleRef = ref(storage, "public/BillOfSale_Template.pdf");
        const carChecklistRef = ref(storage, "public/BUY_CAR_CHECKLIST.xlsx");

        const registrationURL = await getDownloadURL(motorcycleChecklistRef);
        const insuranceURL = await getDownloadURL(billOfSaleRef);
        const maintenanceURL = await getDownloadURL(carChecklistRef);

        setDocuments({
          registration: registrationURL,
          insurance: insuranceURL,
          maintenance: maintenanceURL,
        });
      } catch (error) {
        console.error("Error fetching document URLs:", error);
      }
    };
    fetchDocumentUrls();
  }, []);

  // const handleView = (type) => {
  //   alert(`Viewing ${documents[type]}`);
  // };

  if (!user) {
    return <p className="text-center text-white">Loading...</p>; // Show loading message
  }

  return (
    <div className="container min-h-screen py-10 mx-auto text-white bg-zmx-auto ">
      {/* Title Section */}
      <div className="mb-10 text-center md:mt-32 ">
        <h1 className="text-4xl font-bold text-white">Documents</h1>
        <p className="mt-2 text-gray-400">
          Manage and upload all your essential documents here. Ensure everything
          is up to date for a seamless experience.
        </p>
      </div>

      {/* Cards Section */}
      <div className="grid grid-cols-1 gap-6 px-6 sm:grid-cols-2 lg:grid-cols-3">
        {[
          {
            type: "registration",
            title: "Motorcycle Checklist",
            subtitle: "How to buy a used motorcycle? (XLSX)",
          },
          {
            type: "insurance",
            title: "Bill of Sale Template",
            subtitle: "Template for vehicle sale (PDF)",
          },
          {
            type: "maintenance",
            title: "Car Checklist",
            subtitle: "How to buy a used car? (XLSX)",
          },
        ].map(({ type, title, subtitle }) => (
          <div
            key={type}
            className="p-6 text-center transition bg-white border-4 border-gray-500 shadow-md rounded-xl hover:shadow-lg hover:scale-105"
          >
            <h2 className="mb-2 text-lg font-semibold text-gray-800">
              {title}
            </h2>
            <p className="mb-4 text-sm text-gray-600">{subtitle}</p>
            <div className="mb-4">
              {documents[type] ? (
                <span className="text-green-500">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-8 h-8 mx-auto"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </span>
              ) : (
                <span className="text-red-500">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-8 h-8 mx-auto"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </span>
              )}
            </div>
            {documents[type] ? (
              <a
                href={documents[type]}
                download
                className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white transition bg-purple-600 rounded-lg hover:bg-purple-700"
              >
                Download
              </a>
            ) : (
              <span className="text-gray-500">Not available</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default DocumentsPage;
