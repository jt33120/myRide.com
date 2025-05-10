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

  const handleView = (type) => {
    alert(`Viewing ${documents[type]}`);
  };

  const handleDelete = (type) => {
    setDocuments((prev) => ({ ...prev, [type]: null }));
  };

  if (!user) {
    return <p className="text-center text-white">Loading...</p>; // Show loading message
  }

  return (
    <div className="container min-h-screen py-10 mx-auto text-white bg-zmx-auto">
      {/* Title Section */}
      <div className="mb-10 text-center md:mt-32">
        <h1 className="text-4xl font-bold text-white">Documents</h1>
        <p className="mt-2 text-gray-400">
          Manage and upload all your essential documents here. Ensure everything
          is up to date for a seamless experience.
        </p>
      </div>

      {/* Cards Section */}
      <div className="grid grid-cols-1 gap-6 px-6 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { type: "registration", title: "Vehicle Registration" },
          { type: "insurance", title: "Insurance" },
          { type: "maintenance", title: "Maintenance Records" },
        ].map(({ type, title }) => (
          <div
            key={type}
            className="p-6 text-center transition bg-gray-800 rounded-lg shadow-lg hover:shadow-xl"
          >
            <h2 className="mb-2 text-xl font-semibold text-white">{title}</h2>
            <div className="mb-4">
              {documents[type] ? (
                <span className="text-green-500">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-6 h-6 mx-auto"
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
                <span className="text-gray-500">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-6 h-6 mx-auto"
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
              <div className="flex justify-center gap-4">
                <button
                  onClick={() => handleView(type)}
                  className="px-4 py-2 text-white transition bg-green-600 rounded-lg hover:bg-green-700"
                >
                  View
                </button>
                <button
                  onClick={() => handleDelete(type)}
                  className="px-4 py-2 text-white transition bg-red-600 rounded-lg hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            ) : (
              <button
                onClick={() => handleUpload(type)}
                className="px-4 py-2 text-white transition bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                Upload Document
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default DocumentsPage;
