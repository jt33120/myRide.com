import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar";

export default function DocumentsPage() {
  const [documents, setDocuments] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const response = await fetch("/api/documents");
        if (!response.ok) {
          throw new Error(`Error: ${response.statusText}`);
        }
        const data = await response.json();
        setDocuments(data);
      } catch (err) {
        console.error("Failed to fetch documents:", err);
        setError("Failed to load documents. Please try again later.");
      }
    };

    fetchDocuments();
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-black to-gray-800">
      <Navbar />
      <div className="flex-grow py-12 mt-24">
        <div className="container px-6 mx-auto">
          <div className="max-w-4xl p-8 mx-auto bg-white rounded-lg shadow-md">
            <h1 className="text-3xl font-bold text-gray-800">Documents</h1>
            {error ? (
              <p className="mt-4 text-red-600">{error}</p>
            ) : (
              <ul className="mt-6 space-y-4">
                {documents.map((doc) => (
                  <li key={doc.id} className="p-4 bg-gray-100 rounded-lg">
                    <h2 className="text-lg font-semibold">{doc.title}</h2>
                    <p className="text-gray-600">{doc.description}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
