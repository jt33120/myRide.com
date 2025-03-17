import React, { useEffect, useState } from 'react';
import { storage } from '../lib/firebase'; // Firebase Storage import
import { ref, getDownloadURL } from 'firebase/storage'; // Firebase Storage methods

const DocumentsPage = () => {
  const [buyMotorcycleChecklistUrl, setBuyMotorcycleChecklistUrl] = useState('');
  const [billOfSaleUrl, setBillOfSaleUrl] = useState('');
  const [buyCarChecklistUrl, setBuyCarChecklistUrl] = useState('');

  useEffect(() => {
    const fetchDocumentUrls = async () => {
      try {
        // Get URLs for each document stored in Firebase Storage
        const motorcycleChecklistRef = ref(storage, 'BUY_MOTORCYCLE_CHECKLIST.xlsx');
        const billOfSaleRef = ref(storage, 'BillOfSale_Template.pdf');
        const carChecklistRef = ref(storage, 'BUY_CAR_CHECKLIST.xlsx');

        const motorcycleChecklistUrl = await getDownloadURL(motorcycleChecklistRef);
        const billOfSaleUrl = await getDownloadURL(billOfSaleRef);
        const carChecklistUrl = await getDownloadURL(carChecklistRef);

        // Set the URLs to state
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
    <div className="documents-page">
      <h1>Download Documents</h1>
      <p> Our goal is to simplify your life, with pre-filled documents. To come : all digitalised bill of sale, to sign electronically, all safe. We will also add AI guidelines for specific checklist per model</p>

      <div className="document-list">
        <ul>
          <li>
            <a href={buyMotorcycleChecklistUrl} target="_blank" rel="noopener noreferrer">
              Download Checklist : How to buy a used motorcycle? (XLSX)
            </a>
          </li>
          <li>
            <a href={billOfSaleUrl} target="_blank" rel="noopener noreferrer">
              Download Bill Of Sale Template (PDF)
            </a>
          </li>
          <li>
            <a href={buyCarChecklistUrl} target="_blank" rel="noopener noreferrer">
            Download Checklist : How to buy a used car?  (XLSX)
            </a>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default DocumentsPage;
