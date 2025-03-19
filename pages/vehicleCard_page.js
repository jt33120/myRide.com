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

const ReceiptForm = ({ onClose, onSave, receiptTitle, setReceiptTitle, receiptDate, setReceiptDate, receiptCategory, setReceiptCategory, receiptMileage, setReceiptMileage, setReceiptFiles, receiptPrice, setReceiptPrice, uploading }) => {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-96 relative">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-600 hover:text-gray-800"
        >
          ✖
        </button>
        <h2 className="text-2xl font-semibold mb-4">Add Receipt</h2>
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
          {uploading ? <div className="loader"></div> : 'Save'}
        </button>
      </div>
    </div>
  );
};

const VehicleCardPage = () => {
  const [vehicleData, setVehicleData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [, setDocuments] = useState({ title: '', inspection: '', registration: '' });
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
  const [existingDocuments, setExistingDocuments] = useState({ title: null, inspection: null, registration: null });
  const router = useRouter();
  const { id } = router.query;
  const [isListed, setIsListed] = useState(false);
  const user = auth.currentUser;
  const [conversationId, setConversationId] = useState(null);
  const [ownerName, setOwnerName] = useState('');
  const [, setTotalAmountSpent] = useState(0);
  const [sumType, setSumType] = useState('Total Spent'); // State to track the current sum type

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
  
          const totalSpent = sortedReceipts.reduce((sum, receipt) => sum + (receipt.price || 0), 0);
          setTotalAmountSpent(totalSpent);
  
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

  const handleDocumentChange = async (e, documentType) => {
    const file = e.target.files[0];
    if (file) {
      if (typeof window !== 'undefined' && (file.type === 'image/heic' || file.type === 'image/heif')) {
        try {
          const heic2any = (await import('heic2any')).default;
          const convertedBlob = await heic2any({ blob: file, toType: 'image/jpeg' });
          const convertedFile = new File([convertedBlob], file.name.replace(/\.[^/.]+$/, ".jpg"), { type: 'image/jpeg' });
          setDocuments((prev) => ({ ...prev, [documentType]: convertedFile }));
          await handleDocumentUpload(documentType, convertedFile);
        } catch (error) {
          console.error("Error converting HEIC image:", error);
        }
      } else {
        setDocuments((prev) => ({ ...prev, [documentType]: file }));
        await handleDocumentUpload(documentType, file);
      }
    }
  };

  const handleSellVehicle = async (id) => {
    try {
      await setDoc(doc(db, "on_marketplace", id), {
        listedAt: new Date(),
        status: "listed",
      });
      alert("Vehicle listed for sale!");
    } catch (error) {
      console.error("Error listing vehicle:", error);
      alert("Failed to list vehicle.");
    }
  };

  const handleRemoveListing = async (id) => {
    try {
      await deleteDoc(doc(db, "on_marketplace", id));
      alert("Vehicle removed from listing.");
    } catch (error) {
      console.error("Error removing listing:", error);
      alert("Failed to remove listing.");
    }
  };

  useEffect(() => {
    const checkIfListed = async () => {
      const listingRef = doc(db, "on_marketplace", id);
      const listingSnap = await getDoc(listingRef);

      if (listingSnap.exists()) {
        setIsListed(true);
      } else {
        setIsListed(false);
      }
    };

    if (id) {
      checkIfListed();
    }
  }, [id]);

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
    const parsedMileage = receiptMileage === 'Unknown' ? receiptMileage : parseFloat(receiptMileage);
  
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
      await setDoc(receiptRef, {
        title: receiptTitle,
        date: new Date(receiptDate),
        category: receiptCategory,
        mileage: parsedMileage, // Save mileage as a number if it's not 'Unknown'
        price: parsedPrice, // Save price as a number
        urls: downloadURLs,
      });
      setUploading(false);
      setReceiptTitle('');
      setReceiptDate('');
      setReceiptCategory('');
      setReceiptMileage('');
      setReceiptPrice('');
      setReceiptFiles([]);
      setShowReceiptForm(false);
      console.log('Receipt uploaded successfully.');
      router.replace(`/VehicleCard_page?id=${id}#maintenance-section`); // Refresh the page and scroll to the maintenance section
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

  const handleDocumentUpload = async (documentType, file) => {
    if (!file) return;
  
    setUploading(true);
  
    try {
      // Generate a unique file name using the document type, vehicle ID, and timestamp
      const timestamp = Date.now();
      const fileExtension = file.name.split('.').pop(); // Extract the file extension
      const fileName = `${documentType}-${id}-${timestamp}.${fileExtension}`;
  
      // Define the storage path
      const storageRef = ref(storage, `listing/${id}/docs/${fileName}`);
  
      // Upload the file
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
        },
        async () => {
          try {
            // Get the download URL
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
  
            // Save the document metadata in Firestore
            const documentRef = collection(db, `listing/${id}/docs`);
            await setDoc(doc(documentRef, documentType), {
              title: documentType,
              url: downloadURL,
              date: new Date(),
              isPublic: true,
            });
  
            // Update the local state
            setExistingDocuments((prev) => ({ ...prev, [documentType]: downloadURL }));
            console.log(`${documentType} uploaded successfully.`);
          } catch (error) {
            console.error("Error retrieving download URL:", error);
          } finally {
            setUploading(false);
          }
        }
      );
    } catch (error) {
      console.error("Error during document upload:", error);
      setUploading(false);
    }
  };

  if (loading) return <p>Loading vehicle details...</p>;

  if (!vehicleData) return <p>Vehicle not found.</p>;

  return (
    <div className="min-h-screen p-6 bg-gray-100 text-black relative">
      <button
        onClick={() => router.push('/myDashboard_page')}
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
<section id="info-section" className="snap-start h-screen flex items-center justify-center">
  <div className="w-full h-full bg-gray-200 p-6 rounded-lg shadow-md border border-gray-300 relative overflow-auto">
    {isOwner && (
      <button
        className="absolute top-4 right-4 bg-purple-700 text-white px-2 py-1 rounded-full hover:bg-purple-800 text-sm"
        onClick={() => router.push(`/modifyVehicle_page?id=${vehicleData.uid}`)}
      >
        ✏️ Modify
      </button>
    )}
    <h2 className="text-2xl font-semibold mb-4">{vehicleData.year} {vehicleData.make} {vehicleData.model}</h2>
    
    {/* Dynamically Display Vehicle Data (excluding UID, specified image fields, and CreatedAt) */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {Object.entries(vehicleData)
        .filter(([key, value]) => key !== "uid" && key !== "imageUrls" && key !== "CreatedAt" && ![
          "RightImage", "RearImage", "OtherImage", "RightfrontWheelImage", 
          "FrontImage", "DashboardImage", "RightrearWheelImage", 
          "EngineBayImage", "LeftrearWheelImage"
        ].includes(key) && !(typeof value === 'string' && value.includes("https://firebasestorage"))) // Exclude 'uid', 'imageUrls', 'CreatedAt', specified image fields, and fields containing Firebase Storage URLs from rendering
        .sort(([keyA], [keyB]) => {
          const order = ["make", "model", "year", "mileage", "color", "engine", "transmission", "fuelType"];
          return order.indexOf(keyA) - order.indexOf(keyB);
        })
        .map(([key, value]) => (
          <div key={key} className="bg-white p-4 rounded-lg shadow-md border border-gray-300">
            <p>
              <strong>{key.charAt(0).toUpperCase() + key.slice(1)}:</strong> {value !== null && value !== undefined ? (typeof value === "boolean" ? (value ? "Yes" : "No") : (value.seconds ? new Date(value.seconds * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : value.toString())) : "N/A"}
            </p>
          </div>
        ))
      }
    </div>
  </div>
</section>


      
      {/* Maintenance Section */}
{isOwner && (
  <section id="maintenance-section" className="snap-start h-screen flex items-center justify-center">
    <div className="max-w-lg mx-auto bg-gray-200 p-6 rounded-lg shadow-md border border-gray-300 relative">
      <h2 className="text-2xl font-semibold mb-4">Maintenance</h2>
      <p className="text-red-600 font-bold mb-4">Next Maintenance: Upcoming update</p>
      <p>Keep your vehicle at its best to maximize pleasure and resale value!</p>
      <div className="absolute top-4 right-4 bg-white p-2 rounded-lg shadow-md border border-gray-300 cursor-pointer" onClick={handleSumBoxClick}>
        <p className="text-xs text-gray-500">{sumType}</p>
        <p className="text-md">${Number(calculateSum(sumType)).toFixed(2)}</p>
      </div>

      {/* Receipt History */}
      <h3 className="text-lg font-semibold mt-6 mb-2">Receipt History:</h3>
      <div className="max-h-48 overflow-y-auto bg-gray-100 p-4 rounded-lg shadow-inner border border-gray-300">
        {receipts.map((receipt) => (
          <div key={receipt.id} className="mb-2 flex justify-between items-center bg-white p-2 rounded-md shadow-sm border border-gray-300">
            {receipt.urls && receipt.urls.length > 0 && (
              <a href={receipt.urls[0]} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                {receipt.title} - {new Date(receipt.date.seconds * 1000).toLocaleDateString()} - ${receipt.price}
              </a>
            )}
            <button
              onClick={() => handleReceiptDelete(receipt.id, receipt.urls)}
              className="text-red-600 hover:text-red-800"
              title="Delete Receipt"
            >
              ✖
            </button>
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-2">
        <button
          onClick={() => setShowReceiptForm(true)}
          className="bg-purple-700 text-white text-sm px-4 py-1 rounded-full hover:bg-blue-700"
        >
          + Receipt
        </button>
      </div>

      {/* Document Handling Section */}
      <div className="flex justify-around w-full px-6 mt-6">
        {['title', 'registration', 'inspection'].map((docType) => (
          <div key={docType} className="w-1/3 text-center relative">
            {/* Document Title */}
            <p className="text-xs text-gray-500 mb-1">{docType.charAt(0).toUpperCase() + docType.slice(1)}</p>
            <a
              href={existingDocuments[docType] || '#'}
              target={existingDocuments[docType] ? "_blank" : "_self"}
              rel="noopener noreferrer"
              onClick={(e) => {
                if (!existingDocuments[docType]) {
                  e.preventDefault();
                  document.getElementById(docType).click(); // Trigger file input click
                }
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
                  existingDocuments[docType] ? 'border-green-500' : 'border-red-500'
                }`}
                style={{
                  objectFit: "cover",
                  filter: existingDocuments[docType] ? 'none' : 'grayscale(100%)',
                }}
              />

              {/* Loader Overlay (if uploading) */}
              {uploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full">
                  <div className="loader"></div>
                </div>
              )}

              {/* "Click to view" Overlay (only when document exists & not uploading) */}
              {!uploading && existingDocuments[docType] && (
                <div className="absolute inset-0 flex items-center justify-center bg-green-500 bg-opacity-80 text-white text-xs rounded-full">
                  Click to view
                </div>
              )}
            </a>

            {/* File Input (Hidden) */}
            <input
              type="file"
              id={docType}
              onChange={(e) => handleDocumentChange(e, docType)}
              className="hidden"
            />

            {/* Upload Button */}
            <label
              htmlFor={docType}
              className="flex items-center mt-2 cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-700 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              <span className="text-black">{existingDocuments[docType] ? 'Update' : 'Add'}</span>
            </label>
          </div>
        ))}
      </div>

          </div>
        </section>
      )}

      {/* Dollar Section */}
      <section id="dollar-section" className="snap-start h-screen flex items-center justify-center">
        <div className="max-w-lg mx-auto bg-gray-200 p-6 rounded-lg shadow-md border border-gray-300">
          <h2 className="text-2xl font-semibold mb-4">Market</h2>
          {!isOwner && (
            <button onClick={handleContactSeller}
              className="bg-purple-600 text-white px-6 py-2 rounded-full w-full hover:bg-blue-700">
              Contact Seller
            </button>
          )}
          {isOwner && (
            <div className="flex justify-around mt-4">
              <button
                onClick={() => {
                  if (isListed) {
                    handleRemoveListing(id);
                  } else {
                    handleSellVehicle(id);
                  }
                }}
                className={`bg-gray-600 text-white px-6 py-2 rounded-full hover:${isListed ? 'bg-red-700' : 'bg-green-700'}`}
              >
                {isListed ? 'Remove from Listing' : 'Add to Listing'}
              </button>
            </div>
          )}
          <div className="mt-4 p-4 bg-white rounded-lg shadow-md border border-gray-300">
            <h3 className="text-lg font-semibold mb-2">Estimated Resale Value</h3>
            <p>Based on straight-line depreciation: ${resaleValue.straightLineValue}</p>
            <p>Based on exponential depreciation: ${resaleValue.exponentialValue}</p>
            <p className="text-xs text-gray-500 mt-2">Disclaimer: This is a very rough estimation and should not be used as a reference.</p>
          </div>
          <div className="mt-4 p-4 bg-white rounded-lg shadow-md border border-gray-300">
            <h3 className="text-lg font-semibold mb-2">Depreciation Curve</h3>
            <Line data={depreciationData} />
          </div>
        </div>
      </section>
    </div>
  );
};

export default VehicleCardPage;