import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { storage } from '../lib/firebase';
import { ref, listAll, getDownloadURL } from 'firebase/storage';
import Image from 'next/image';

const DebugPage = () => {
  const router = useRouter();
  const { id } = router.query; // Retrieve the id from the query parameters

  const [allDocuments, setAllDocuments] = useState([]); // State to store all documents
  const isOwner = true; // Replace with actual logic to determine ownership

  useEffect(() => {
    if (!id) return;
    const fetchDocuments = async () => {
      try {
        const folderRef = ref(storage, `listing/${id}/docs`);
        const result = await listAll(folderRef);

        // Fetch all document URLs
        const documentPromises = result.items.map(async (item) => {
          const url = await getDownloadURL(item);
          return { name: item.name, url };
        });

        const documents = await Promise.all(documentPromises);
        setAllDocuments(documents);
      } catch (error) {
        console.error('Error fetching documents:', error);
      }
    };

    fetchDocuments();
  }, [id]);

  const isDateDue = (fileName) => {
    const dateMatch = fileName.match(/\d{2}-\d{2}-\d{4}/); // Match date in format MM-DD-YYYY
    if (!dateMatch) return false;

    const fileDate = new Date(dateMatch[0]);
    const today = new Date();

    return fileDate < today; // Return true if the date is due
  };

  return (
    <div className="min-h-screen p-6 bg-gray-100 text-black">
      <div className="flex justify-around w-full px-6 mt-6">
         {['title', 'registration', 'inspection'].map((docType) => {
          // Check if a document matching the type exists
          const matchingDocument = allDocuments.find(doc => doc.name.includes(docType));
          const documentExists = !!matchingDocument;

          // Check if the document is due (only for inspection and registration)
          const isDue = documentExists && (docType === 'inspection' || docType === 'registration') 
            ? isDateDue(matchingDocument.name) 
            : false;

          return (
            <div key={docType} className="w-1/3 text-center relative">
              {/* Document Title */}
              <p className="text-xs text-gray-500 mb-1">{docType.charAt(0).toUpperCase() + docType.slice(1)}</p>
              <a
                href={documentExists ? matchingDocument.url : '#'}
                target={documentExists ? "_blank" : "_self"}
                rel="noopener noreferrer"
                onClick={(e) => {
                  if (!documentExists) e.preventDefault(); // Prevent click if no document exists
                }}
                className="relative inline-block"
              >
                {/* Image */}
                <Image
                  src={`/${docType}_icon.png`}
                  alt={`${docType} icon`}
                  width={100}
                  height={100}
                  className={`cursor-pointer rounded-full border-2 ${
                    documentExists ? (isDue ? 'border-red-500' : 'border-green-500') : 'border-gray-300'
                  }`}
                  style={{
                    objectFit: "cover",
                    filter: documentExists ? 'none' : 'grayscale(100%)',
                  }}
                />

                {/* Overlay */}
                {documentExists && (
                  <div
                    className={`absolute inset-0 flex items-center justify-center ${
                      isDue ? 'bg-red-500' : 'bg-green-500'
                    } bg-opacity-80 text-white text-xs rounded-full`}
                  >
                    {isDue ? 'Expired' : 'Click to view'}
                  </div>
                )}
              </a>

              {/* Upload Button */}
              {isOwner && (
                <label
                  htmlFor={docType}
                  className="flex items-center mt-2 cursor-pointer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-700 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  <span className="text-black">{documentExists ? 'Update' : 'Add'}</span>
                </label>
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
};

export default DebugPage;
