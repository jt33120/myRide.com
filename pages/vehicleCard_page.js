import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { auth, db, storage } from '../lib/firebase';
import { doc, getDoc, collection, getDocs, query, where, addDoc, deleteDoc, setDoc } from 'firebase/firestore';
import { ref, listAll, getDownloadURL, uploadBytesResumable, deleteObject } from 'firebase/storage';
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import Image from "next/image";
import { Line } from 'react-chartjs-2';
import 'chart.js/auto';


const ImageCarousel = ({ imageUrls }) => {
  const settings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 1,  // Show only one image per slide
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 5000,
  };

  return (
    <div className="carousel-container mb-6">
      {imageUrls.length > 0 ? (
        <Slider {...settings}>
          {imageUrls.map((url, index) => (
            <div key={index} className="w-full h-[50vh]">
              <Image
                src={url}
                alt={`Vehicle Image ${index + 1}`}
                width={800}  // Set fixed width
                height={450} // Set fixed height
                className="rounded-lg shadow-lg cursor-pointer"
                onClick={() => window.open(url, "_blank")}
                style={{ objectFit: "cover", width: "100%", height: "100%" }}
              />
            </div>
          ))}
        </Slider>
      ) : (
        <p>No images found</p>
      )}
    </div>
  );
};

const ReceiptForm = ({ onClose, onSave, receiptTitle, setReceiptTitle, receiptDate, setReceiptDate, receiptCategory, setReceiptCategory, receiptMileage, setReceiptMileage, setReceiptFiles, receiptPrice, setReceiptPrice, uploading, isEditing = false }) => {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-96 relative">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-600 hover:text-gray-800"
        >
          ✖
        </button>
        <h2 className="text-2xl font-semibold mb-4">{isEditing ? 'Edit Receipt' : 'Add Receipt'}</h2>
        <input
          type="text"
          placeholder="Receipt title"
          value={receiptTitle}
          onChange={(e) => setReceiptTitle(e.target.value)}
          className="border border-gray-300 p-2 rounded-md w-full mb-2"
        />
        <input
          type="date"
          value={receiptDate}
          onChange={(e) => setReceiptDate(e.target.value)}
          className="border border-gray-300 p-2 rounded-md w-full mb-2"
        />
        <select
          value={receiptCategory}
          onChange={(e) => setReceiptCategory(e.target.value)}
          className="border border-gray-300 p-2 rounded-md w-full mb-2"
        >
          <option value="">Select Category</option>
          <option value="Repair">Repair</option>
          <option value="Scheduled Maintenance">Scheduled Maintenance</option>
          <option value="Cosmetic Mods">Cosmetic Mods</option>
          <option value="Performance Mods">Performance Mods</option>
        </select>
        <input
          type="text"
          placeholder="Mileage (or 'Unknown')"
          value={receiptMileage}
          onChange={(e) => setReceiptMileage(e.target.value)}
          className="border border-gray-300 p-2 rounded-md w-full mb-2"
        />
        <input
          type="number"
          placeholder="Price"
          value={receiptPrice}
          onChange={(e) => setReceiptPrice(e.target.value)}
          className="border border-gray-300 p-2 rounded-md w-full mb-2"
        />
        <input
          type="file"
          multiple
          onChange={(e) => setReceiptFiles(e.target.files)}
          className="border border-gray-300 p-2 rounded-md w-full mb-2"
        />
        <button
          onClick={onSave}
          className="bg-purple-700 text-white px-6 py-2 rounded-full w-full hover:bg-purple-800"
          disabled={uploading}
        >
          {uploading ? <div className="loader"></div> : isEditing ? 'Update' : 'Save'}
        </button>
      </div>
    </div>
  );
};

const OwnerManualModal = ({ onClose, vehicleId }) => {
  const [manualUrl, setManualUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleSaveOwnerManual = async () => {
    if (!manualUrl) {
      setError('Please provide a URL for the owner manual.');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const vehicleRef = doc(db, 'listing', vehicleId);
      await setDoc(vehicleRef, { ownerManual: manualUrl }, { merge: true });

      alert('Owner manual URL saved successfully!');
      setOwnerManualUrl(manualUrl); // Update state with new URL
      onClose(); // Close the modal
    } catch (error) {
      console.error('owner manual URL:', error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-96 relative">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-600 hover:text-gray-800"
        >
          ✖
        </button>
        <h2 className="text-2xl font-semibold mb-4">Sync Owner Manual</h2>
        <input
          type="text"
          placeholder="Enter the URL of the owner manual PDF"
          value={manualUrl}
          onChange={(e) => setManualUrl(e.target.value)}
          className="border border-gray-300 p-2 rounded-md w-full mb-4"
        />
        {error && <p className="text-red-500 mb-4">{error}</p>}
        <button
          onClick={handleSaveOwnerManual}
          className="bg-purple-700 text-white px-6 py-2 rounded-full w-full hover:bg-purple-800"
          disabled={uploading}
        >
          {uploading ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  );
};

const VehicleCardPage = () => {
  const [vehicleData, setVehicleData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [receipts, setReceipts] = useState([]);
  const [showReceiptForm, setShowReceiptForm] = useState(false);
  const [receiptCategory, setReceiptCategory] = useState('');
  const [receiptTitle, setReceiptTitle] = useState('');
  const [receiptDate, setReceiptDate] = useState('');
  const [receiptMileage, setReceiptMileage] = useState('');
  const [receiptFiles, setReceiptFiles] = useState([]);
  const [receiptPrice, setReceiptPrice] = useState('');
  const [imageUrls, setImageUrls] = useState([]);
  const [, setExistingDocuments] = useState({ title: null, inspection: null, registration: null });
  const router = useRouter();
  const { id } = router.query;
  const user = auth.currentUser;
  const [conversationId, setConversationId] = useState(null);
  const [ownerName, setOwnerName] = useState('');
  const [sumType, setSumType] = useState('Total Spent'); // State to track the current sum type
  const [showOwnerManualModal, setShowOwnerManualModal] = useState(false);
  const [currentMileage, setCurrentMileage] = useState(null); // State for current mileage
  const [showEditReceiptForm, setShowEditReceiptForm] = useState(false);
  const [editingReceipt, setEditingReceipt] = useState(null); // State for editing receipt
  const [refreshing, setRefreshing] = useState(false); // State for refresh button
  const [aiRecommendation, setAIRecommendation] = useState(null); // State for AI recommendation
  const [, setOwnerManualUrl] = useState(null); // State for owner manual URL
  const [aiEstimation, setAiEstimation] = useState(null); // State for AI estimation

  const [aiQuestion, setAiQuestion] = useState('');
  const [aiAnswer, setAiAnswer] = useState('');
  const [loadingAi, setLoadingAi] = useState(false);

  const [showAiBox, setShowAiBox] = useState(false); // State for toggling AI box

  const handleAskAi = async () => {
    if (!aiQuestion.trim()) return;

    setLoadingAi(true);
    try {
      const response = await fetch('/api/aiMaintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: aiQuestion,
          vehicleDetails: {
            make: vehicleData.make,
            model: vehicleData.model,
            year: vehicleData.year,
            mileage: vehicleData.mileage,
            color: vehicleData.color,
            engine: vehicleData.engine,
            transmission: vehicleData.transmission,
          },
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setAiAnswer(data.answer);
      } else {
        setAiAnswer('Failed to get a response. Please try again.');
      }
    } catch (error) {
      console.error('Error asking AI:', error);
      setAiAnswer('An error occurred. Please try again.');
    } finally {
      setLoadingAi(false);
    }
  };

  const calculateSum = (type) => {
    switch (type) {
      case 'Total Spent':
        return receipts.reduce((sum, receipt) => sum + (receipt.price || 0), vehicleData.boughtAt || 0);
      case 'Without Purchase Price':
        return receipts.reduce((sum, receipt) => sum + (receipt.price || 0), 0);
      case 'Repair':
      case 'Scheduled Maintenance':
      case 'Cosmetic Mods':
      case 'Performance Mods':
        return receipts
          .filter(receipt => receipt.category === type)
          .reduce((sum, receipt) => sum + (receipt.price || 0), 0);
      default:
        return 0;
    }
  };

  useEffect(() => {
    if (!id) return;

    const fetchRecommendations = async () => {
      setLoading(true);
      try {
        // Fetch vehicle data
        const vehicleRef = doc(db, 'listing', id);
        const vehicleDoc = await getDoc(vehicleRef);

        if (!vehicleDoc.exists()) {
          throw new Error('Vehicle not found.');
        }

        const vehicleData = vehicleDoc.data();
        const ownerManual = vehicleData.ownerManual;
        if (!ownerManual) {
          throw new Error('Owner manual URL not available.');
        }
        setOwnerManualUrl(ownerManual);

        // Fetch receipts
        const receiptsRef = collection(db, `listing/${id}/receipts`);
        const receiptsSnapshot = await getDocs(receiptsRef);
        const receiptsData = receiptsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setReceipts(receiptsData);

        // Call the analyzeManual API
        const analyzeResponse = await fetch('/api/analyzeManual', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: ownerManual,
            receipts: receiptsData.map((r) => ({
              title: r.title,
              mileage: r.mileage || 'Unknown',
            })),
          }),
        });

        const analyzeData = await analyzeResponse.json();

        if (!analyzeResponse.ok) {
          throw new Error(analyzeData.error || 'Failed to fetch AI recommendations.');
        }

        setAIRecommendation(analyzeData.recommendations || 'No recommendations available.');
      } catch (error) {
        console.error('Error fetching recommendations:', error);
        setAIRecommendation('Failed to fetch recommendations.');
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, [id]);
  const handleSumBoxClick = () => {
    const sumTypes = ['Total Spent', 'Without Purchase Price', 'Repair', 'Scheduled Maintenance', 'Cosmetic Mods', 'Performance Mods'];
    const currentIndex = sumTypes.indexOf(sumType);
    const nextIndex = (currentIndex + 1) % sumTypes.length;
    setSumType(sumTypes[nextIndex]);
  };

  const calculateResaleValue = () => {
    if (!vehicleData || !vehicleData.boughtAt || !vehicleData.boughtIn) return 'N/A';
    const purchasePrice = vehicleData.boughtAt;
    const purchaseYear = vehicleData.boughtIn;
    const currentYear = new Date().getFullYear();
    const age = currentYear - purchaseYear;
    const depreciationRate = 0.15; // 15% annual depreciation

    // Straight-Line Depreciation
    const straightLineValue = purchasePrice * Math.pow((1 - depreciationRate), age);

    // Exponential Depreciation
    const k = 0.18; // Depreciation factor
    const exponentialValue = purchasePrice * Math.exp(-k * age);

    return {
      straightLineValue: straightLineValue.toFixed(2),
      exponentialValue: exponentialValue.toFixed(2),
    };
  };

  const plotDepreciationCurve = () => {
    if (!vehicleData || !vehicleData.boughtAt || !vehicleData.boughtIn) return { labels: [], data: [] };
    const purchasePrice = vehicleData.boughtAt;
    const purchaseYear = vehicleData.boughtIn;
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: (currentYear - purchaseYear) + 6 }, (_, i) => purchaseYear + i);
    const depreciationRate = 0.15; // 15% annual depreciation
    const k = 0.18; // Depreciation factor

    const straightLineValues = years.map(year => purchasePrice * Math.pow((1 - depreciationRate), year - purchaseYear));
    const exponentialValues = years.map(year => purchasePrice * Math.exp(-k * (year - purchaseYear)));

    return {
      labels: years,
      datasets: [
        {
          label: 'Straight-Line Depreciation',
          data: straightLineValues,
          borderColor: 'rgba(75, 192, 192, 1)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
        },
        {
          label: 'Exponential Depreciation',
          data: exponentialValues,
          borderColor: 'rgba(153, 102, 255, 1)',
          backgroundColor: 'rgba(153, 102, 255, 0.2)',
        },
      ],
    };
  };

  const resaleValue = calculateResaleValue();
  const depreciationData = plotDepreciationCurve();

  useEffect(() => {
    const fetchConversation = async () => {
      if (!vehicleData) return;

      const conversationRef = collection(db, 'conversations');
      const q = query(conversationRef, where('participants', 'array-contains', user.uid));
      const querySnapshot = await getDocs(q);

      const existingConversation = querySnapshot.docs.find(doc => doc.data().participants.includes(vehicleData.uid));

      if (existingConversation) {
        setConversationId(existingConversation.id);
      }
    };

    fetchConversation();
  }, [user, vehicleData]);

  const handleContactSeller = async () => {
    if (!user || !vehicleData) {
      console.error("User or vehicle data is missing");
      return;
    }

    if (!conversationId) {
      const newConversation = {
        participants: [user.uid, vehicleData.uid],
        vehicleName: `${vehicleData.Year} ${vehicleData.Make} ${vehicleData.Model}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const docRef = await addDoc(collection(db, 'conversations'), newConversation);
      setConversationId(docRef.id);

      router.push(`/chat_page?conversationId=${docRef.id}`);
    } else {
      router.push(`/chat_page?conversationId=${conversationId}`);
    }
  };

  useEffect(() => {
    if (!id) return;
  
    const fetchVehicleData = async () => {
      setLoading(true);
      try {
        const vehicleRef = doc(db, 'listing', id);
        const vehicleDoc = await getDoc(vehicleRef);
  
        if (vehicleDoc.exists()) {
          const vehicle = vehicleDoc.data();
          setVehicleData(vehicle);
  
          const user = auth.currentUser;
          if (user && vehicle.uid === user.uid) {
            setIsOwner(true);
          }
  
          const userRef = doc(db, 'members', vehicle.uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            setOwnerName(userSnap.data().firstName);
          }
  
          const receiptsRef = collection(db, `listing/${id}/receipts`);
          const receiptsSnapshot = await getDocs(receiptsRef);
          const sortedReceipts = receiptsSnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .sort((a, b) => b.date.seconds - a.date.seconds); // Sort by date, most recent first
          setReceipts(sortedReceipts);
  
          const folderRef = ref(storage, `listing/${id}/photos/`);
          const result = await listAll(folderRef);
          const urls = await Promise.all(result.items.map(fileRef => getDownloadURL(fileRef)));
          setImageUrls(urls);
  
          const documentsRef = collection(db, `listing/${id}/docs`);
          const documentsSnapshot = await getDocs(documentsRef);
          const existingDocs = documentsSnapshot.docs.map(doc => doc.data());
          const titleDoc = existingDocs.find(doc => doc.title === 'title');
          const inspectionDoc = existingDocs.find(doc => doc.title === 'inspection');
          const registrationDoc = existingDocs.find(doc => doc.title === 'registration');
          setExistingDocuments({
            title: titleDoc ? titleDoc.url : null,
            inspection: inspectionDoc ? inspectionDoc.url : null,
            registration: registrationDoc ? registrationDoc.url : null,
          });


          // Generate upcoming maintenance if ownerManual exists


          // Set current mileage from Firestore
          setCurrentMileage(vehicle.mileage || 'N/A');
        } else {
          console.log("No such document!");
        }
      } catch (error) {
        console.error("Error fetching vehicle data:", error);
      } finally {
        setLoading(false);
      }
    };
  
    fetchVehicleData();
  }, [id]);

  const refreshPage = () => {
    router.reload(); // Reload the current page
  };

  const handleReceiptUpload = async () => {
    console.log('handleReceiptUpload called');
    if (!receiptFiles.length || !receiptTitle || !receiptDate || !receiptCategory || !receiptMileage || !receiptPrice) return;
  
    // Validate mileage input
    if (receiptMileage !== 'Unknown' && isNaN(receiptMileage)) {
      alert('Mileage must be a number or "Unknown"');
      return;
    }
  
    // Debugging: log receiptPrice before parsing
    console.log('receiptPrice before parsing:', receiptPrice);
  
    // Parse the price as a float
    const parsedPrice = parseFloat(receiptPrice);
  
    // Validate parsed price
    if (isNaN(parsedPrice)) {
      alert('Price must be a valid number');
      return;
    }
  
    // Parse the mileage as a number if it's not 'Unknown'
    const parsedMileage = receiptMileage === 'Unknown' ? null : parseFloat(receiptMileage);
  
    setUploading(true);
    const receiptId = receiptTitle.replace(/\s+/g, '-').toLowerCase(); // Use the receipt title as the document ID
  
    const uploadPromises = Array.from(receiptFiles).map(async (file, index) => {
      let fileToUpload = file;
      if (file.type === 'image/heic' || file.type === 'image/heif') {
        try {
          const heic2any = (await import('heic2any')).default;
          const convertedBlob = await heic2any({ blob: file, toType: 'image/jpeg' });
          fileToUpload = new File([convertedBlob], file.name.replace(/\.[^/.]+$/, ".jpg"), { type: 'image/jpeg' });
        } catch (error) {
          console.error("Error converting HEIC image:", error);
        }
      }
      const fileName = `${receiptId}-${index}`;
      const storageRef = ref(storage, `listing/${id}/docs/receipts/${fileName}`);
      const uploadTask = uploadBytesResumable(storageRef, fileToUpload);
  
      return new Promise((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            console.log(`Receipt file ${index + 1} upload is ${progress}% done`);
          },
          (error) => {
            console.error("Error uploading document:", error);
            reject(error);
          },
          async () => {
            try {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              resolve(downloadURL);
            } catch (error) {
              console.error("Error retrieving download URL:", error);
              reject(error);
            }
          }
        );
      });
    });
  
    try {
      const downloadURLs = await Promise.all(uploadPromises);
      const receiptRef = doc(db, `listing/${id}/receipts`, receiptId); // Use the receipt title as the document ID
      const receiptDateObj = new Date(receiptDate);
      if (isNaN(receiptDateObj.getTime())) {
        alert('Invalid receipt date.');
        return;
      }
      await setDoc(receiptRef, {
        title: receiptTitle,
        date: receiptDateObj, // Use parsed date object
        category: receiptCategory,
        mileage: parsedMileage, // Save mileage as a number if it's not 'Unknown'
        price: parsedPrice, // Save price as a number
        urls: downloadURLs,
      });
  
      // Update the mileage in the listing collection
      if (parsedMileage !== null) {
        const listingRef = doc(db, 'listing', id);
        const listingDoc = await getDoc(listingRef);
        if (listingDoc.exists()) {
          const currentMileage = listingDoc.data().mileage || 0;
          const updatedMileage = Math.max(currentMileage, parsedMileage);
          await setDoc(listingRef, { mileage: updatedMileage }, { merge: true });
        }
      }
  
      setUploading(false);
      setReceiptTitle('');
      setReceiptDate('');
      setReceiptCategory('');
      setReceiptMileage('');
      setReceiptPrice('');
      setReceiptFiles([]);
      setShowReceiptForm(false);
      console.log('Receipt uploaded successfully.');
      router.push(`/VehicleCard_page?id=${id}`); 

      // After uploading the receipt, regenerate the upcoming maintenance
      if (vehicleData?.ownerManual) {
        await generateUpcomingMaintenance(vehicleData.ownerManual, [...receipts, {
          title: receiptTitle,
          mileage: receiptMileage,
        }]);
      }

      // Refresh the page automatically
      router.reload();
    } catch (error) {
      console.error("Error uploading receipt files:", error);
      setUploading(false);
    }
  };

  const handleReceiptDelete = async (receiptId, receiptUrls) => {
    try {
      // Delete the receipt document from Firestore
      await deleteDoc(doc(db, `listing/${id}/receipts`, receiptId));

      // Delete the receipt files from Firebase Storage
      const deletePromises = receiptUrls.map(async (url) => {
        const receiptRef = ref(storage, url);
        await deleteObject(receiptRef);
      });

      await Promise.all(deletePromises);

      // Refresh the receipts list
      const receiptsRef = collection(db, `listing/${id}/receipts`);
      const receiptsSnapshot = await getDocs(receiptsRef);
      const sortedReceipts = receiptsSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => b.date.seconds - a.date.seconds); // Sort by date, most recent first
      setReceipts(sortedReceipts);
    } catch (error) {
      console.error("Error deleting receipt:", error);
    }
  };

  useEffect(() => {
    if (!id) return;

    const fetchReceipts = async () => {
      const receiptsRef = collection(db, `listing/${id}/receipts`);
      const receiptsSnapshot = await getDocs(receiptsRef);
      const sortedReceipts = receiptsSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => b.date.seconds - a.date.seconds); // Sort by date, most recent first
      setReceipts(sortedReceipts);
    };

    fetchReceipts();
  }, [id]);

const [uploadingDocType, setUploadingDocType] = useState(null); // State to track which document is uploading

const handleDocumentUpload = async (documentType, file, expirationDate) => {
  if (!file) return;

  if (!expirationDate && documentType !== 'title') {
    alert('Expiration date is required for this document type.');
    return;
  }

  setUploadingDocType(documentType); // Set the uploading state for the specific document type
  setUploading(true);

  try {
    // Delete the previous document if it exists
    const existingDocument = allDocuments.find((doc) => doc.name.includes(documentType));
    if (existingDocument) {
      const existingRef = ref(storage, `listing/${id}/docs/${existingDocument.name}`);
      await deleteObject(existingRef);
      console.log(`Deleted previous ${documentType} document: ${existingDocument.name}`);
    }

    // Format expiration date for the file name (MM-DD-YYYY)
    const formattedExpirationDate = expirationDate
      ? new Date(expirationDate)
          .toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })
          .replace(/\//g, '-')
      : '';

    const fileName = `${documentType}${formattedExpirationDate ? `-${formattedExpirationDate}` : ''}`;
    const storageRef = ref(storage, `listing/${id}/docs/${fileName}`);

    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        console.log(`${documentType} upload is ${progress}% done`);
      },
      (error) => {
        console.error("Error uploading document:", error);
        setUploading(false);
        setUploadingDocType(null);
      },
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          const documentRef = collection(db, `listing/${id}/docs`);
          await setDoc(doc(documentRef, documentType), {
            title: documentType,
            url: downloadURL,
            expirationDate: expirationDate ? new Date(expirationDate) : null,
            date: new Date(),
            isPublic: true,
          });
          setExistingDocuments((prev) => ({ ...prev, [documentType]: { url: downloadURL, expirationDate } }));
          console.log(`${documentType} uploaded successfully.`);
          refreshPage(); // Refresh the page after upload
        } catch (error) {
          console.error("Error retrieving download URL:", error);
        } finally {
          setUploading(false);
          setUploadingDocType(null);
        }
      }
    );
  } catch (error) {
    console.error(`Error handling ${documentType} upload:`, error);
    setUploading(false);
    setUploadingDocType(null);
  }
};


  const handleEditReceipt = (receipt) => {
    setEditingReceipt({
      ...receipt,
      date: receipt.date.seconds ? new Date(receipt.date.seconds * 1000).toISOString().split('T')[0] : '',
    });
    setShowEditReceiptForm(true);
  };

  const handleUpdateReceipt = async () => {
    console.log('handleUpdateReceipt called');
    if (!editingReceipt) return;

    const { id: receiptId, ...updatedData } = editingReceipt;

    // Parse date if provided
    if (updatedData.date) {
      const receiptDateObj = new Date(updatedData.date);
      if (isNaN(receiptDateObj.getTime())) {
        alert('Invalid receipt date.');
        return;
      }
      updatedData.date = receiptDateObj;
    }

    try {
      const receiptRef = doc(db, `listing/${id}/receipts`, receiptId);
      await setDoc(receiptRef, updatedData, { merge: true });

      // Refresh the page automatically
      router.reload();
    } catch (error) {
      console.error('Error updating receipt:', error);
    } finally {
      setShowEditReceiptForm(false);
    }
  };

  const handleRefreshRecommendation = async () => {
    if (!vehicleData?.ownerManual || !receipts) return;

    setRefreshing(true);
    try {
      await generateUpcomingMaintenance(vehicleData.ownerManual, receipts);
    } catch (error) {
      console.error('Error refreshing AI recommendation:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Add missing function to generate upcoming maintenance
  const generateUpcomingMaintenance = async (ownerManualUrl, receipts) => {
    try {
      const response = await fetch('/api/analyzeManual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: ownerManualUrl,
          receipts: receipts.map((r) => ({
            title: r.title,
            mileage: r.mileage || 'Unknown',
          })),
        }),
      });
  
      const data = await response.json();
  
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate upcoming maintenance.');
      }
  
      setAIRecommendation(data.recommendations || 'No recommendations available.');
    } catch (error) {
      console.error('Error generating upcoming maintenance:', error);
      setAIRecommendation('Failed to generate recommendations.');
    }
  };

  // Fetch AI estimation for the vehicle's current market value
  const fetchAiEstimation = async () => {
    if (!vehicleData) return;

    setRefreshing(true); // Show loading state for the reload button
    try {
      const response = await fetch('/api/aiEstimator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          make: vehicleData.make,
          model: vehicleData.model,
          year: vehicleData.year,
          mileage: vehicleData.mileage || 'Unknown',
        }),
      });

      const data = await response.json();

      if (response.ok) {
        const estimation = data.estimation || 'No estimation available.';
        setAiEstimation(estimation);

        // Save the AI estimation to Firebase
        const vehicleRef = doc(db, 'listing', id);
        const numericEstimation = parseFloat(estimation.replace(/[^0-9.]/g, '')); // Extract numeric value
        if (!isNaN(numericEstimation)) {
          await setDoc(vehicleRef, { ai_estimated_price: numericEstimation }, { merge: true });
        }
      } else {
        console.error('Error fetching AI estimation:', data.error);
        setAiEstimation('Failed to fetch AI estimation.');
      }
    } catch (error) {
      console.error('Error fetching AI estimation:', error);
      setAiEstimation('Failed to fetch AI estimation.');
    } finally {
      setRefreshing(false); // Hide loading state for the reload button
    }
  };
  const [allDocuments, setAllDocuments] = useState([]); // State to store all documents
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

  useEffect(() => {
    if (vehicleData) {
      fetchAiEstimation();
    }
  }, [vehicleData]);

  if (loading) return <p>Loading vehicle details...</p>;

  if (!vehicleData) return <p>Vehicle not found.</p>;

  return (
    <div className="min-h-screen p-6 bg-gray-100 text-black relative">
      <button
        onClick={() => router.push('/myVehicles_page')}
        className="return-button"
        title="Back to Dashboard"
      >
        ⏎
      </button>

      <ImageCarousel imageUrls={imageUrls} />

      <h1 className="text-3xl font-bold mb-6 text-center">{ownerName}&apos;s {vehicleData.year} {vehicleData.model}</h1>

      <div className="flex justify-around w-full px-6 mb-6">
        <button onClick={() => document.getElementById('info-section').scrollIntoView({ behavior: 'smooth' })}>
          <Image src="/info.png" alt="Info" width={100} height={100} />
        </button>
        <button onClick={() => document.getElementById('maintenance-section').scrollIntoView({ behavior: 'smooth' })}>
          <Image src="/maintenance.png" alt="Maintenance" width={100} height={100} />
        </button>
        <button onClick={() => document.getElementById('dollar-section').scrollIntoView({ behavior: 'smooth' })}>
          <Image src="/dollar.png" alt="Dollar" width={100} height={100} />
        </button>
      </div>

      {/* Info Section */}
      <section id="info-section" className="snap-start h-auto flex items-center justify-center">
        <div className="w-full h-full bg-gray-200 p-6 rounded-lg shadow-md border border-gray-300 relative overflow-auto">
          {isOwner && (
            <button
              className="absolute top-4 right-4 bg-purple-700 text-white px-2 py-1 rounded-full hover:bg-purple-800 text-sm"
              onClick={() => router.push(`/modifyVehicle_page?id=${id}`)} // Pass the correct vehicle ID
            >
              ✏️ Modify
            </button>
          )}
          <h2 className="text-2xl font-semibold mb-4">
            {vehicleData.year} {vehicleData.make} {vehicleData.model}
          </h2>

          {/* Location Info */}
          <div className="flex space-x-4 text-lg mb-4">
            <p>{vehicleData.city || "N/A"},</p>
            <p>{vehicleData.state || "N/A"},</p>
            <p>{vehicleData.zip || "N/A"}</p>
          </div>

          {/* Description & Mods */}
          <div className="space-y-2 mb-4">
            <p><strong>Description:</strong> {vehicleData.description || "N/A"}</p>
            <p><strong>Cosmetic Defaults:</strong> {vehicleData.cosmeticDefaults || "N/A"}</p>
            <p><strong>Aftermarket Mods:</strong> {vehicleData.aftermarketMods || "N/A"}</p>
          </div>

          {/* Title, VIN & Mileage */}
          <div className="flex space-x-4 text-lg mb-4">
            <p><strong>Title Status:</strong> {vehicleData.title || "N/A"}</p>
            <p><strong>VIN:</strong> {vehicleData.vin || "N/A"}</p>
            <p><strong>Mileage:</strong> {vehicleData.mileage || "N/A"}</p>
          </div>

          {/* Boolean Features (Grouped) */}
          <div className="bg-white p-4 rounded-md shadow-md mb-4">
            <strong>Features:</strong>
            <div className="flex flex-wrap gap-4 mt-2">
              {Object.entries(vehicleData)
                .filter(([, value]) => typeof value === "boolean")
                .map(([key, value]) => (
                  <div key={key} className="flex items-center space-x-2">
                    <input type="checkbox" checked={value} readOnly className="w-4 h-4" />
                    <label>{key.charAt(0).toUpperCase() + key.slice(1)}</label>
                  </div>
                ))}
            </div>
          </div>

          {/* Other Details (Dynamically Displayed) */}
          <div className="grid grid-cols-3 md:grid-cols-3 gap-1">
            {Object.entries(vehicleData)
              .filter(([key, value]) => 
                ![
                  "uid", "imageUrls", "CreatedAt", "RightImage", "RearImage", "OtherImage", "year", "ai_estimated_price",
                  "RightfrontWheelImage", "FrontImage", "DashboardImage", "RightrearWheelImage", "vehicleType", "createdAt",
                  "EngineBayImage", "LeftrearWheelImage", "city", "state", "zip","boughtAt","recommendation",
                  "description", "cosmeticDefaults", "aftermarketMods", "vin", "title", "ownerManual", "model", "make", "mileage","updatedAt"
                ].includes(key) &&
                typeof value !== "boolean" &&  // Exclude boolean fields since they're already displayed
                !(typeof value === 'string' && value.includes("https://firebasestorage"))
              )
              .map(([key, value]) => (
                <div key={key} className="p-2 bg-white rounded-md shadow">
                  <strong>{key.charAt(0).toUpperCase() + key.slice(1)}:</strong> 
                  <span> {value !== null && value !== undefined ? 
                    (value.seconds ? new Date(value.seconds * 1000).toLocaleDateString('en-US') : value.toString()) 
                    : "N/A"}
                  </span>
                </div>
              ))
            }
          </div>
        </div>
      </section>

      
    {/* Maintenance Section */}
{isOwner && (
  <section id="maintenance-section" className="snap-start h-auto flex items-center justify-center">
    <div className="max-w-lg mx-auto bg-gray-200 p-6 rounded-lg shadow-md border border-gray-300 relative">
      <h2 className="text-2xl font-semibold mb-0">Maintenance</h2>
      <p className="text-xs text-gray-500">Maintenance = maximized pleasure and resale value!</p>
      <div className="absolute top-4 right-4 bg-white p-2 rounded-lg shadow-md border border-gray-300 cursor-pointer" onClick={handleSumBoxClick}>
        <p className="text-xs text-gray-500">{sumType}</p>
        <p className="text-s">${Number(calculateSum(sumType)).toFixed(2)}</p>
      </div>

      {/* AI Upcoming Maintenance Header with Sync Button */}
      <div className="mt-6 flex justify-between items-center">
        <h3 className="text-md font-bold text-red-500">
          Maintenance Recommendation
        </h3>
        <p className="text-xs text-gray-500">(Current Mileage: {currentMileage})</p>
        <button
          onClick={() => setShowOwnerManualModal(true)}
          className="bg-purple-500 text-xs text-white px- py-1 rounded-md hover:bg-blue-600"
        >
          Sync Owner Manual
        </button>
      </div>

      {/* AI Recommendation Box */}
      <div className="mt-4 bg-gray-100 p-4 rounded-lg border border-gray-300 text-sm overflow-auto relative">
        <button
          onClick={handleRefreshRecommendation}
          className="absolute top-2 right-2 bg-white p-1 rounded-full shadow-md"
          disabled={refreshing}
          title="Refresh AI Recommendation"
        >
          <Image
            src="/reload-icon.png" // Ensure this path is correct
            alt=""
            width={10}
            height={10}
            className={`cursor-pointer ${refreshing ? 'animate-spin' : ''}`}
          />
        </button>
        <pre className="whitespace-pre-wrap">
          {aiRecommendation
            ? typeof aiRecommendation === 'string'
              ? aiRecommendation
              : JSON.stringify(aiRecommendation, null, 2)
            : "No AI recommendation available."}
        </pre>
      </div>




      {/* Receipt History Section */}
      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-2">History</h3>

        <div className="max-h-48 overflow-y-auto bg-gray-100 p-4 rounded-lg shadow-inner border border-gray-300">
          {receipts.length > 0 ? (
            receipts.map((receipt) => (
              <div key={receipt.id} className="mb-2 flex justify-between items-center bg-white p-2 rounded-md shadow-sm border border-gray-300">
                {receipt.urls && receipt.urls.length > 0 && (
                  <a href={receipt.urls[0]} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    {receipt.title} - {new Date(receipt.date.seconds * 1000).toLocaleDateString()} - ${receipt.price}
                  </a>
                )}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleEditReceipt(receipt)}
                    className="text-green-600 hover:text-green-800"
                    title="Edit Receipt"
                  >
                    ✎
                  </button>
                  <button
                    onClick={() => handleReceiptDelete(receipt.id, receipt.urls)}
                    className="text-red-600 hover:text-red-800"
                    title="Delete Receipt"
                  >
                    ✖
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-500">No receipts available.</p>
          )}
        </div>
        <button
            onClick={() => setShowReceiptForm(true)}
            className="bg-purple-700 text-white text-sm px-4 py-1 mt-2 rounded-full hover:bg-blue-600"
          >
            + Receipt
          </button>
      </div>

          {/* Document Handling Section */}
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

              {/* File Input (Hidden) */}
              {isOwner && (
                <input
                  type="file"
                  id={docType}
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (docType === 'title') {
                      handleDocumentUpload(docType, file, null); // No expiration date for title
                    } else {
                      const expirationDate = prompt('Enter expiration date (MM/DD/YYYY):');
                      if (expirationDate) {
                        handleDocumentUpload(docType, file, expirationDate);
                      } else {
                        alert('Expiration date is required for this document type.');
                      }
                    }
                  }}
                  className="hidden"
                />
              )}

              {/* Upload Button */}
              {isOwner && (
          <label
            htmlFor={docType}
            className="flex items-center mt-2 cursor-pointer"
          >
            {uploadingDocType === docType ? (
              <svg
                className="animate-spin h-5 w-5 text-purple-700 mr-2"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                ></path>
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-purple-700 mr-2"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
                  clipRule="evenodd"
                />
              </svg>
            )}
            <span className="text-black">{documentExists ? 'Update' : 'Add'}</span>
          </label>
        )}
            </div>
          );
        })}
      </div>

      {/* AI Maintenance Question Box with Toggle */}
      <div className="mt-2 bg-white p-2 rounded-lg shadow-md border border-gray-300">
        <h3
          className="text-sm font-semibold mb-1 cursor-pointer"
          onClick={() => setShowAiBox(!showAiBox)}
        >
          Any question? Ask AI! {showAiBox ? '▲' : '▼'}
        </h3>
        {showAiBox && (
          <div>
            <textarea
              value={aiQuestion}
              onChange={(e) => setAiQuestion(e.target.value)}
              placeholder="Type your maintenance-related question here..."
              className="border border-gray-300 p-2 rounded-md w-full mb-2"
            />
            <button
              onClick={handleAskAi}
              className="bg-purple-700 text-white px-4 py-2 rounded-full hover:bg-purple-800"
              disabled={loadingAi}
            >
              {loadingAi ? 'Asking AI...' : 'Ask AI'}
            </button>
            {aiAnswer && (
              <div className="mt-2 bg-gray-100 p-2 rounded-lg border border-gray-300">
                <h4 className="text-md font-semibold">AI Answer:</h4>
                <p>{aiAnswer}</p>
              </div>
            )}
          </div>
        )}
      </div>

        </div>
      </section>
      )}

      {/* Dollar Section */}
      <section id="dollar-section" className="snap-start h-auto flex items-center justify-center">
        <div className="max-w-lg mx-auto bg-gray-200 p-6 rounded-lg shadow-md border border-gray-300">
          <h2 className="text-2xl font-semibold mb-4">Market</h2>
          {!isOwner && (
            <button onClick={handleContactSeller}
              className="bg-purple-600 text-white px-6 py-2 rounded-full w-full hover:bg-blue-700">
              Contact Owner
            </button>
          )}
          {isOwner && (
            <div className="flex justify-around mt-0">
            </div>
          )}
          <div className="mt-4 p-4 bg-white rounded-lg shadow-md border border-gray-300">
            <h3 className="text-lg font-semibold mb-2">Estimated Resale Value</h3>
            <p className="text-xs text-gray-500 mt-2">Disclaimer: These are rough estimations. We are working very hard to make them as accurate as possible.</p>
            <p>Based on straight-line depreciation: ${resaleValue.straightLineValue}</p>
            <p>Based on exponential depreciation: ${resaleValue.exponentialValue}</p>
            
            <div className="flex items-center mt-0">
              <p>{aiEstimation || 'Fetching AI estimation...'}</p>
              <button
                onClick={fetchAiEstimation}
                className="bg-gray-200 p-0.5 rounded-full shadow-md hover:bg-gray-300"
                disabled={refreshing}
                title="Reload AI Estimation"
              >
                <Image
                  src="/reload-icon.png" // Ensure this path is correct
                  alt="Reload"
                  width={16}
                  height={16}
                  className={`cursor-pointer ${refreshing ? 'animate-spin' : ''}`}
                />
              </button>
            </div>
          </div>
          <div className="mt-4 p-4 bg-white rounded-lg shadow-md border border-gray-300">
            <h3 className="text-lg font-semibold mb-2">Depreciation Curve</h3>
            <Line data={depreciationData} />
          </div>
        </div>
      </section>
      <div>
          <p>Here, we gonna add classic marketplace options, but also AI guidelines and estimation of your vehicle value, based on the information and maintenance provided!</p>
        </div>

      {showReceiptForm && (
        <ReceiptForm
          onClose={() => setShowReceiptForm(false)}
          onSave={handleReceiptUpload}
          receiptTitle={receiptTitle}
          setReceiptTitle={setReceiptTitle}
          receiptDate={receiptDate}
          setReceiptDate={setReceiptDate}
          receiptCategory={receiptCategory}
          setReceiptCategory={setReceiptCategory}
          receiptMileage={receiptMileage}
          setReceiptMileage={setReceiptMileage}
          receiptPrice={receiptPrice}
          setReceiptPrice={setReceiptPrice}
          setReceiptFiles={setReceiptFiles}
          uploading={uploading}
        />
      )}

      {showEditReceiptForm && (
        <ReceiptForm
          onClose={() => setShowEditReceiptForm(false)}
          onSave={handleUpdateReceipt}
          receiptTitle={editingReceipt?.title || ''}
          setReceiptTitle={(value) => setEditingReceipt((prev) => ({ ...prev, title: value }))}
          receiptDate={editingReceipt?.date || ''}
          setReceiptDate={(value) => setEditingReceipt((prev) => ({ ...prev, date: value }))}
          receiptCategory={editingReceipt?.category || ''}
          setReceiptCategory={(value) => setEditingReceipt((prev) => ({ ...prev, category: value }))}
          receiptMileage={editingReceipt?.mileage || ''}
          setReceiptMileage={(value) => setEditingReceipt((prev) => ({ ...prev, mileage: value }))}
          receiptPrice={editingReceipt?.price || ''}
          setReceiptPrice={(value) => setEditingReceipt((prev) => ({ ...prev, price: value }))}
          setReceiptFiles={(files) => setEditingReceipt((prev) => ({ ...prev, files }))}
          uploading={uploading}
          isEditing={true}
        />
      )}

      {showOwnerManualModal && (
        <OwnerManualModal
          onClose={() => setShowOwnerManualModal(false)}
          vehicleId={id}
        />
      )}
      
    </div>
  );
};

export default VehicleCardPage;