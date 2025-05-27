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

  if (!user) {
    return <p className="text-center text-white">Loading...</p>; // Show loading message
  }

  return (
    <section className="flex flex-col min-h-screen px-4 py-6 text-white md:hidden bg-zinc-900">
      
      {/* Header */}
      <header className="mb-6 text-center">
        <h1 className="text-2xl font-bold">Documents</h1>
        <p className="mt-2 text-gray-400">
          Téléchargez vos documents essentiels.
        </p>
      </header>

      {/* Cards */}
      <main className="flex-1 space-y-4 overflow-auto">
        {["registration", "insurance", "maintenance"].map((type) => {
          const url = documents[type];
          const label =
            type === "registration"
              ? "Motorcycle Checklist"
              : type === "insurance"
              ? "Bill of Sale Template"
              : "Car Checklist";
          const desc =
            type === "registration"
              ? "Guide d’achat moto (XLSX)"
              : type === "insurance"
              ? "Modèle de facture de vente (PDF)"
              : "Guide d’achat voiture (XLSX)";

          return (
            <article
              key={type}
              className="flex flex-col p-4 bg-white rounded-lg shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-gray-800">{label}</h2>
                  <p className="mt-1 text-sm text-gray-600">{desc}</p>
                </div>
                {url ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-6 h-6 text-green-500"
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
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-6 h-6 text-red-500"
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
                )}
              </div>
              <a
                href={url || "#"}
                download={!!url}
                className={`mt-4 block w-full text-center py-2 rounded-lg font-medium ${
                  url
                    ? "bg-purple-600 text-white hover:bg-purple-700"
                    : "bg-gray-300 text-gray-600 cursor-not-allowed"
                }`}
              >
                {url ? "Download" : "Unavailable"}
              </a>
            </article>
          );
        })}
      </main>
    </section>
  );
};

export default DocumentsPage;
