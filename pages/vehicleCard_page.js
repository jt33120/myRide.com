import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { auth, db, storage } from '../lib/firebase';
import { doc, getDoc, collection, getDocs, query, where, addDoc, deleteDoc, setDoc, setLogLevel, updateDoc, arrayUnion } from 'firebase/firestore';
import { ref, listAll, getDownloadURL, uploadBytesResumable, deleteObject, uploadString } from 'firebase/storage';
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import Image from "next/image";
import { Line } from 'react-chartjs-2';
import 'chart.js/auto';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Navbar from "../components/Navbar";

const ImageCarousel = ({ imageUrls }) => {
  const settings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 5000,
  };

  return (
    <div className="carousel-container mb-6">
      {imageUrls.length > 0 ? (
        <Slider {...settings}>
          {imageUrls.map((url, index) => (
            <div key={index} className="w-full h-[50vh] relative">
              {url.includes("vehicleVideo") ? (
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full h-full flex items-center justify-center bg-gray-200 rounded-lg"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="1.5"
                    stroke="currentColor"
                    className="w-16 h-16 text-gray-500"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z"
                    />
                  </svg>
                </a>
              ) : (
                <Image
                  src={url}
                  alt={`Vehicle Image ${index + 1}`}
                  width={800}
                  height={450}
                  className="rounded-lg shadow-lg cursor-pointer"
                  onClick={() => window.open(url, "_blank")}
                  style={{ objectFit: "cover", width: "100%", height: "100%" }}
                  priority={index === 0} // Add priority to the first image
                />
              )}
            </div>
          ))}
        </Slider>
      ) : (
        <p>No images or videos found</p>
      )}
    </div>
  );
};

const ReceiptForm = ({ id, onClose, receiptTitle, setReceiptTitle, receiptDate, setReceiptDate, receiptCategory, setReceiptCategory, receiptMileage, setReceiptMileage, receiptFiles = [], setReceiptFiles, receiptPrice, setReceiptPrice, uploading, isEditing = false }) => {
  const [errors, setErrors] = useState({});
  const [newFiles, setNewFiles] = useState([]); // Track newly added files

  const validateForm = () => {
    const newErrors = {};

    // Ensure receiptDate is a string before validation
    const receiptDateString = receiptDate ? String(receiptDate) : '';

    // Required field checks
    if (!receiptTitle.trim()) newErrors.receiptTitle = "Receipt title is required.";
    if (!receiptDateString.trim()) newErrors.receiptDate = "Receipt date is required.";
    if (!receiptCategory.trim()) newErrors.receiptCategory = "Receipt category is required.";

    // Handle mileage - check if it's a number or 'Unknown'
    if (receiptMileage === undefined || receiptMileage === null || (receiptMileage !== 'Unknown' && isNaN(Number(receiptMileage)))) {
      newErrors.receiptMileage = "Mileage must be a valid number.";
    } else if (receiptMileage !== 'Unknown' && Number(receiptMileage) < 0) {
      newErrors.receiptMileage = "Mileage cannot be negative.";
    }

    // Price validation
    if (receiptPrice === undefined || receiptPrice === null || isNaN(Number(receiptPrice))) {
      newErrors.receiptPrice = "Price must be a valid number.";
    } else if (Number(receiptPrice) < 0) {
      newErrors.receiptPrice = "They paid you for that? Price must be greater than 0.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      setNewFiles((prevFiles) => [...prevFiles, ...files]); // Track new files separately
      setErrors((prevErrors) => ({ ...prevErrors, receiptFiles: null })); // Clear file-related errors
    }
  };

  const handleFileDelete = async (index, isNewFile) => {
    if (isNewFile) {
      setNewFiles((prevFiles) => prevFiles.filter((_, i) => i !== index)); // Remove new file
    } else {
      const fileToDelete = receiptFiles[index];
      try {
        // Delete file from Firebase Storage
        const fileRef = ref(storage, fileToDelete);
        await deleteObject(fileRef);

        // Update Firestore to remove the URL from the "urls" field
        const receiptRef = doc(db, `listing/${id}/receipts`, receiptTitle.replace(/\s+/g, '-').toLowerCase());
        const updatedUrls = receiptFiles.filter((_, i) => i !== index);
        await setDoc(receiptRef, { urls: updatedUrls }, { merge: true });

        // Update local state
        setReceiptFiles(updatedUrls);

        // Provide user feedback
        alert('File deleted successfully!');
      } catch (error) {
        console.error('Error deleting file:', error);
      }
    }
  };

  const handleInputChange = (field, value) => {
    switch (field) {
      case "receiptTitle":
        setReceiptTitle(value);
        if (value.trim()) setErrors((prevErrors) => ({ ...prevErrors, receiptTitle: null }));
        break;
      case "receiptDate":
        setReceiptDate(value);
        if (value.trim()) setErrors((prevErrors) => ({ ...prevErrors, receiptDate: null }));
        break;
      case "receiptCategory":
        setReceiptCategory(value);
        if (value.trim()) setErrors((prevErrors) => ({ ...prevErrors, receiptCategory: null }));
        break;
      case "receiptMileage":
        setReceiptMileage(value);
        if (value.trim() && (value === "Unknown" || !isNaN(Number(value)))) {
          setErrors((prevErrors) => ({ ...prevErrors, receiptMileage: null }));
        }
        break;
      case "receiptPrice":
        setReceiptPrice(value);
        if (value.trim() && !isNaN(Number(value))) {
          setErrors((prevErrors) => ({ ...prevErrors, receiptPrice: null }));
        }
        break;
      default:
        break;
    }
  };

  const updateMaintenanceTable = async (receiptData) => {
    try {
      console.log("Updating maintenance table...");
      const updateResponse = await fetch(`/api/updateMaintenanceTable`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleId: id,
          currentMileage: receiptData.mileage,
        }),
      });

      if (!updateResponse.ok) {
        throw new Error("Failed to update maintenance table.");
      }

      toast.success("Maintenance table successfully updated."); // Show success message
      console.log("Maintenance table updated successfully.");
    } catch (error) {
      console.error("Error updating maintenance table:", error);
      toast.error("Failed to update maintenance table. Please try again."); // Show error message
      throw error; // Rethrow to stop further execution
    }
  };

  const generateAIRecommendation = async (receiptData) => {
    try {
      console.log("Generating AI recommendations...");
      const analyzeResponse = await fetch(`/api/analyzeManual`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleId: id,
          currentMileage: receiptData.mileage,
        }),
      });

      if (!analyzeResponse.ok) {
        throw new Error("Failed to generate AI recommendations.");
      }

      const recommendationData = await analyzeResponse.json();
      console.log("AI recommendation fetched:", recommendationData.recommendation);

      // Save the recommendation in Firestore
      const recommendationRef = doc(db, `listing/${id}`);
      await setDoc(recommendationRef, { aiRecommendation: recommendationData.recommendation }, { merge: true });

      toast.success("AI recommendation successfully updated."); // Show success message
      console.log("AI recommendation saved successfully.");
    } catch (error) {
      console.error("Error generating AI recommendation:", error);
      toast.error("Failed to generate AI recommendation. Please try again."); // Show error message
      throw error; // Rethrow to stop further execution
    }
  };

  const updateMaintenanceAndRecommendation = async (receiptData) => {
    try {

      // Step 1: Update the maintenance table
      await updateMaintenanceTable(receiptData);

      // Step 2: Generate AI recommendations
      await generateAIRecommendation(receiptData);
; // Stop loading spinner
    } catch (error) {
      console.error("Error during maintenance table or AI recommendation update:", error);; // Stop loading spinner on error
    }
  };

  const updateAiEstimationForToday = async () => {
    try {
      const currentDate = new Date();
      const formattedDate = `${String(currentDate.getMonth() + 1).padStart(2, '0')}/${String(currentDate.getDate()).padStart(2, '0')}/${currentDate.getFullYear()}`;

      const vehicleRef = doc(db, 'listing', id);
      const vehicleDoc = await getDoc(vehicleRef);

      if (vehicleDoc.exists()) {
        const vehicleData = vehicleDoc.data();
        const aiValues = Array.isArray(vehicleData.ai_estimated_value) ? vehicleData.ai_estimated_value : [];

        // Remove any existing entry for today's date
        const filteredAiValues = aiValues.filter(entry => !entry.endsWith(`-${formattedDate}`));

        // Fetch AI estimation from the API
        const response = await fetch('/api/aiEstimator', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            make: vehicleData.make,
            model: vehicleData.model,
            year: vehicleData.year,
            mileage: vehicleData.mileage || 'Unknown',
            color: vehicleData.color || 'Unknown',
            city: vehicleData.city || 'Unknown',
            zip: vehicleData.zip || 'Unknown',
            state: vehicleData.state || 'Unknown',
            title: vehicleData.title || 'Unknown',
            aftermarketMods: vehicleData.aftermarketMods || 'Unknown',
            cosmeticDefaults: vehicleData.cosmeticDefaults || 'Unknown',
          }),
        });

        const data = await response.json();
        if (response.ok && data.estimation) {
          const numericEstimation = parseFloat(data.estimation.replace(/[^0-9.]/g, '')); // Extract numeric value
          if (!isNaN(numericEstimation)) {
            const newEntry = `${numericEstimation}-${formattedDate}`;
            await updateDoc(vehicleRef, {
              ai_estimated_value: [...filteredAiValues, newEntry], // Overwrite today's entry
            });
          }
        } else {
          console.error('Failed to fetch AI estimation:', data.error || 'Unknown error');
        }
      }
    } catch (error) {
      console.error('Error updating AI estimation for today:', error);
    }
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      let downloadURLs = [...receiptFiles]; // Start with existing files

      // Upload new files to Firebase Storage
      if (newFiles.length > 0) {
        const uploadPromises = newFiles.map(async (file, index) => {
          const fileName = `${receiptTitle.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}-${index + downloadURLs.length}.png`; // Ensure unique file names
          const storageRef = ref(storage, `listing/${id}/docs/receipts/${fileName}`);
          const uploadTask = uploadBytesResumable(storageRef, file);

          return new Promise((resolve, reject) => {
            uploadTask.on(
              'state_changed',
              null,
              (error) => reject(error),
              async () => {
                try {
                  const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                  resolve(downloadURL);
                } catch (error) {
                  reject(error);
                }
              }
            );
          });
        });

        const newFileURLs = await Promise.all(uploadPromises);
        downloadURLs = [...downloadURLs, ...newFileURLs]; // Combine existing and new file URLs
      }

      // Save receipt data to Firestore
      const receiptRef = doc(db, `listing/${id}/receipts`, receiptTitle.replace(/\s+/g, '-').toLowerCase());
      const receiptDateObj = new Date(receiptDate);

      if (isNaN(receiptDateObj.getTime())) {
        alert('Invalid receipt date.');
        return;
      }

      const receiptData = {
        title: receiptTitle,
        date: receiptDateObj,
        category: receiptCategory,
        mileage: receiptMileage === 'Unknown' ? null : parseFloat(receiptMileage),
        price: parseFloat(receiptPrice),
        urls: downloadURLs,
      };

      await setDoc(receiptRef, receiptData);

      // Update maintenance table and fetch recommendation
      await updateMaintenanceAndRecommendation(receiptData);

      // Update AI estimation for today after receipt upload
      await updateAiEstimationForToday();

      // Reset form state
      setNewFiles([]);
      setErrors({});
      setReceiptTitle('');
      setReceiptDate('');
      setReceiptCategory('');
      setReceiptMileage('');
      setReceiptPrice('');
      setReceiptFiles([]);
      onClose();

      // Refresh the page after successful save
      window.location.reload();
    } catch (error) {
      console.error('Error saving receipt:', error);
      alert('Failed to save receipt. Please try again.');
    } finally {
      setUploading(false); // Hide loading indicator
    }
  };

  const handleUpdateReceipt = async () => {
    if (!validateForm()) return;

    try {
      let downloadURLs = [...receiptFiles]; // Start with existing files

      // Upload new files to Firebase Storage
      if (newFiles.length > 0) {
        const uploadPromises = newFiles.map(async (file, index) => {
          const fileName = `${receiptTitle.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}-${index + downloadURLs.length}.png`; // Ensure unique file names
          const storageRef = ref(storage, `listing/${id}/docs/receipts/${fileName}`);
          const uploadTask = uploadBytesResumable(storageRef, file);

          return new Promise((resolve, reject) => {
            uploadTask.on(
              'state_changed',
              null,
              (error) => reject(error),
              async () => {
                try {
                  const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                  resolve(downloadURL);
                } catch (error) {
                  reject(error);
                }
              }
            );
          });
        });

        const newFileURLs = await Promise.all(uploadPromises);
        downloadURLs = [...downloadURLs, ...newFileURLs]; // Combine existing and new file URLs
      }

      // Update receipt data in Firestore
      const receiptRef = doc(db, `listing/${id}/receipts`, receiptTitle.replace(/\s+/g, '-').toLowerCase());
      const receiptDateObj = new Date(receiptDate);

      if (isNaN(receiptDateObj.getTime())) {
        alert('Invalid receipt date.');
        return;
      }

      const receiptData = {
        title: receiptTitle,
        date: receiptDateObj,
        category: receiptCategory,
        mileage: receiptMileage === 'Unknown' ? null : parseFloat(receiptMileage),
        price: parseFloat(receiptPrice),
        urls: downloadURLs,
      };

      await setDoc(receiptRef, receiptData);

      // Update maintenance table and fetch recommendation
      await updateMaintenanceAndRecommendation(receiptData);

      // Update AI estimation for today after receipt upload
      await updateAiEstimationForToday();

      // Reset form state
      setNewFiles([]);
      setErrors({});
      setReceiptTitle('');
      setReceiptDate('');
      setReceiptCategory('');
      setReceiptMileage('');
      setReceiptPrice('');
      setReceiptFiles([]);
      onClose();

      // Refresh the page after successful update
      window.location.reload();
    } catch (error) {
      console.error('Error updating receipt:', error);
      alert('Failed to update receipt. Please try again.');
    } finally {
      setUploading(false); // Hide loading indicator
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
        <h2 className="text-2xl font-semibold mb-4">{isEditing ? 'Edit Receipt' : 'Add Receipt'}</h2>
        <input
          type="text"
          placeholder="Receipt title"
          value={receiptTitle}
          onChange={(e) => handleInputChange("receiptTitle", e.target.value)}
          className="border border-gray-300 p-2 rounded-md w-full mb-2"
        />
        {errors.receiptTitle && <p className="text-red-500 text-sm">{errors.receiptTitle}</p>}
        <input
          type="date"
          value={receiptDate}
          onChange={(e) => handleInputChange("receiptDate", e.target.value)}
          className="border border-gray-300 p-2 rounded-md w-full mb-2"
        />
        {errors.receiptDate && <p className="text-red-500 text-sm">{errors.receiptDate}</p>}
        <select
          value={receiptCategory}
          onChange={(e) => handleInputChange("receiptCategory", e.target.value)}
          className="border border-gray-300 p-2 rounded-md w-full mb-2"
        >
          <option value="">Select Category</option>
          <option value="Repair">Repair</option>
          <option value="Scheduled Maintenance">Scheduled Maintenance</option>
          <option value="Cosmetic Mods">Cosmetic Mods</option>
          <option value="Performance Mods">Performance Mods</option>
        </select>
        {errors.receiptCategory && <p className="text-red-500 text-sm">{errors.receiptCategory}</p>}
        <input
          type="text"
          placeholder="Mileage (or 'Unknown')"
          value={receiptMileage}
          onChange={(e) => handleInputChange("receiptMileage", e.target.value)}
          className="border border-gray-300 p-2 rounded-md w-full mb-2"
        />
        {errors.receiptMileage && <p className="text-red-500 text-sm">{errors.receiptMileage}</p>}
        <input
          type="number"
          placeholder="Price"
          value={receiptPrice}
          onChange={(e) => handleInputChange("receiptPrice", e.target.value)}
          className="border border-gray-300 p-2 rounded-md w-full mb-2"
        />
        {errors.receiptPrice && <p className="text-red-500 text-sm">{errors.receiptPrice}</p>}
        
        {/* File List */}
        <div className="mb-4">
          <p className="font-semibold mb-2">Files:</p>
          {receiptFiles.map((file, index) => (
            <div key={index} className="flex items-center justify-between mb-2">
              <a
                href={file}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                File{index + 1}
              </a>
              <button
                onClick={() => handleFileDelete(index, false)}
                className="text-red-500 hover:text-red-700"
                title="Delete File"
              >
                ✖
              </button>
            </div>
          ))}
          {newFiles.map((file, index) => (
            <div key={index} className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-700">{file.name}</span>
              <button
                onClick={() => handleFileDelete(index, true)}
                className="text-red-500 hover:text-red-700"
                title="Delete File"
              >
                ✖
              </button>
            </div>
          ))}
          <input
            type="file"
            multiple
            onChange={handleFileChange}
            className="border border-gray-300 p-2 rounded-md w-full"
          />
          <p className="text-xs text-gray-500 mt-1">Add file</p>
        </div>
        {errors.receiptFiles && <p className="text-red-500 text-sm">{errors.receiptFiles}</p>}
        
        <button
          onClick={isEditing ? handleUpdateReceipt : handleSave}
          className="bg-purple-700 text-white px-6 py-2 rounded-full w-full hover:bg-purple-800"
          disabled={uploading}
        >
          {uploading ? <div className="loader animate-spin"></div> : isEditing ? 'Update' : 'Save'}
        </button>
      </div>
    </div>
  );
};

const OwnerManualModal = ({ onClose, vehicleId }) => {
  const [manualUrl, setManualUrl] = useState('');
  const handleSyncOwnerManual = async () => {
    if (!manualUrl) {
      alert("Please enter a valid URL");
      return;
    }

    try {
      // Save the URL to Firestore
      await setDoc(doc(db, "listing", vehicleId), { ownerManual: manualUrl }, { merge: true });
      alert("URL saved successfully!");

      // Fetch vehicle data from Firestore
      const docRef = doc(db, "listing", vehicleId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        throw new Error("No vehicle data found in Firestore.");
      }

      const vehicleData = docSnap.data();
      const { ownerManual, year, make, model, vehicleType: type } = vehicleData;

      if (!ownerManual || !year || !make || !model || !type) {
        throw new Error("Incomplete vehicle data. Please check the database.");
      }

      // Send data to AI
      const response = await fetch("/api/getMaintenanceFrequency", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year, make, model, type, url: ownerManual }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error response:", errorData);
        throw new Error(errorData.error || "Failed to get AI response");
      }

      const data = await response.json();
      console.log("AI Response:", data);

      // Save AI response to Firebase Storage
      const storagePath = `listing/${vehicleId}/docs/maintenanceTable.json`;
      const storageRef = ref(storage, storagePath);

      await uploadString(storageRef, JSON.stringify(data.response), "raw");
      alert(`AI response saved successfully to: ${storagePath}`);
    } catch (error) {
      console.error("Error:", error);
      alert("Failed to process: " + error.message);
    } finally {
      onClose(); // Close the modal after processing
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
        <button
          onClick={handleSyncOwnerManual}
          className="bg-purple-700 text-white px-6 py-2 rounded-full w-full hover:bg-purple-800"
          disabled={loading}
        >
          {loading ? 'Processing...' : 'Save & Sync'}
        </button>
      </div>
    </div>
  );
};

const LoginModal = ({ onClose, onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async () => {
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      const redirect = router.query.redirect || router.asPath; // Use the current page as the default redirect
      onLoginSuccess();
      router.push(redirect); // Navigate to the intended page
    } catch (err) {
      console.error('Login error:', err);
      setError('Invalid email or password. Please try again.');
    } finally {
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
        <h2 className="text-2xl font-semibold mb-4">Sign In</h2>
        {error && <p className="text-red-500 mb-4">{error}</p>}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border border-gray-300 p-2 rounded-md w-full mb-2"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="border border-gray-300 p-2 rounded-md w-full mb-4"
        />
        <button
          onClick={handleLogin}
          className="bg-purple-700 text-white px-6 py-2 rounded-full w-full hover:bg-purple-800"
          disabled={loading}
        >
          {loading ? 'Signing In...' : 'Sign In'}
        </button>
        <p className="text-center mt-4">
          Don&apos;t have an account?{' '}
          <button
            onClick={() => {
              onClose();
              router.push('/signup_page');
            }}
            className="text-blue-500 hover:underline"
          >
            Sign Up
          </button>
        </p>
      </div>
    </div>
  );
};

// Enable Firestore debug logging
setLogLevel("debug");

const VehicleCardPage = () => {
  const [vehicleData, setVehicleData] = useState(null);
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
  const [conversationId, setConversationId] = useState(null);
  const [ownerName, setOwnerName] = useState('');
  const [sumType, setSumType] = useState('Total Spent');
  const [showOwnerManualModal, setShowOwnerManualModal] = useState(false);
  const [, setCurrentMileage] = useState(null);
  const [showEditReceiptForm, setShowEditReceiptForm] = useState(false);
  const [editingReceipt, setEditingReceipt] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [aiRecommendation, setAIRecommendation] = useState(null);
  const [, setOwnerManualUrl] = useState(null);
  const [aiEstimation, setAiEstimation] = useState(null);
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiAnswer, setAiAnswer] = useState('');
  const [loadingAi, setLoadingAi] = useState(false);
  const [showAiBox, setShowAiBox] = useState(false);
  const [hideVin, setHideVin] = useState(false);
  const [authenticatedUser, setAuthenticatedUser] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isOnMarketplace, setIsOnMarketplace] = useState(false); // Ensure this is always initialized

  const router = useRouter();
  const { id } = router.query;
  const user = auth.currentUser;

  const toggleHideVin = async () => {
    try {
      const vehicleRef = doc(db, 'listing', id);
      await setDoc(vehicleRef, { hideVin: !hideVin }, { merge: true });
      setHideVin((prev) => !prev); // Toggle the state locally
    } catch (error) {
      console.error('Error toggling VIN visibility:', error);
    }
  };

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
      try {
        // Fetch vehicle data
        const vehicleRef = doc(db, 'listing', id);
        const vehicleDoc = await getDoc(vehicleRef);

        if (!vehicleDoc.exists()) {
          throw new Error('Vehicle not found.');
        }

        const vehicleData = vehicleDoc.data();
        const ownerManual = vehicleData.ownerManual;
        const currentMileage = vehicleData.mileage; // Correctly fetch current mileage
        if (!ownerManual) {
          throw new Error('Owner manual URL not available.');
        }
        setOwnerManualUrl(ownerManual);
        setCurrentMileage(currentMileage); // Set current mileage in state

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
            vehicleId: id, // Pass the correct vehicleId
            currentMileage, // Pass the correct currentMileage
          }),
        });

        const analyzeData = await analyzeResponse.json();

        if (!analyzeResponse.ok) {
          throw new Error(analyzeData.error || 'Failed to fetch AI recommendations.');
        }

        setAIRecommendation(analyzeData.recommendation || 'No recommendations available.');
      } catch (error) {
        console.error('Error fetching recommendations:', error);
        setAIRecommendation('Failed to fetch recommendations.');
      } finally {
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
        vehicleName: `${vehicleData.year} ${vehicleData.make} ${vehicleData.model}`,
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
      try {
        console.log('Fetching vehicle data for ID:', id);
        const vehicleRef = doc(db, 'listing', id);
        const vehicleDoc = await getDoc(vehicleRef);

        if (vehicleDoc.exists()) {
          const vehicle = vehicleDoc.data();
          console.log('Vehicle data fetched successfully:', vehicle);
          setVehicleData(vehicle);

          // Initialize hideVin state from Firestore
          setHideVin(vehicle.hideVin || false);

          const user = auth.currentUser;
          if (user && vehicle.uid === user.uid) {
            setIsOwner(true);
          }

          console.log('Fetching owner data for UID:', vehicle.uid);
          const userRef = doc(db, 'members', vehicle.uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            setOwnerName(userSnap.data().firstName);
          } else {
            console.warn('Owner data not found for UID:', vehicle.uid);
          }

          console.log('Fetching receipts for vehicle ID:', id);
          const receiptsRef = collection(db, `listing/${id}/receipts`);
          const receiptsSnapshot = await getDocs(receiptsRef);
          const sortedReceipts = receiptsSnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .sort((a, b) => b.date.seconds - a.date.seconds); // Sort by date, most recent first
          setReceipts(sortedReceipts);

          console.log('Fetching photos for vehicle ID:', id);
          const folderRef = ref(storage, `listing/${id}/photos/`);
          const result = await listAll(folderRef);
          const urls = await Promise.all(result.items.map(fileRef => getDownloadURL(fileRef)));
          setImageUrls(urls);

          console.log('Fetching documents for vehicle ID:', id);
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
          console.error('Vehicle not found for ID:', id);
        }
      } catch (error) {
        console.error('Error fetching vehicle data:', error);
      } finally {
      }
    };

    fetchVehicleData();
  }, [id]);

  const refreshPage = () => {
    router.reload(); // Reload the current page
  };

  const handleReceiptUpload = async () => {
    if (!receiptTitle || !receiptDate || !receiptCategory || !receiptMileage || !receiptPrice) {
      alert('Please fill in all required fields.');
      return;
    }
  
    if (receiptMileage !== 'Unknown' && isNaN(receiptMileage)) {
      alert('Mileage must be a number or "Unknown".');
      return;
    }
  
    const parsedPrice = parseFloat(receiptPrice);
    if (isNaN(parsedPrice)) {
      alert('Price must be a valid number.');
      return;
    }
  
    const parsedMileage = receiptMileage === 'Unknown' ? null : parseFloat(receiptMileage);
  
    setUploading(true); // Show loading spinner
  
    try {
      //  generate a new id in case the field title has been modified
      const receiptId = doc(collection(db, `listing/${id}/receipts`)).id;
  
      // Upload files to Firebase Storage
      const uploadPromises = Array.from(receiptFiles).map(async (file, index) => {
        const fileName = `${receiptId}-${index}`;
        const storageRef = ref(storage, `listing/${id}/docs/receipts/${fileName}`);
        const uploadTask = uploadBytesResumable(storageRef, file);
  
        return new Promise((resolve, reject) => {
          uploadTask.on(
            'state_changed',
            null,
            (error) => {
              console.error(`Error uploading file ${fileName}:`, error);
              reject(error);
            },
            async () => {
              try {
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                resolve(downloadURL);
              } catch (error) {
                console.error(`Error retrieving download URL for file ${fileName}:`, error);
                reject(error);
              }
            }
          );
        });
      });
  
      const downloadURLs = await Promise.all(uploadPromises);
  
      // Save or update receipt data in Firestore
      const receiptRef = doc(db, `listing/${id}/receipts`, receiptId);
      const receiptDateObj = new Date(receiptDate);
  
      if (isNaN(receiptDateObj.getTime())) {
        alert('Invalid receipt date.');
        setUploading(false);
        return;
      }
  
      await setDoc(receiptRef, {
        title: receiptTitle,
        date: receiptDateObj,
        category: receiptCategory,
        mileage: parsedMileage,
        price: parsedPrice,
        urls: downloadURLs,
      }, { merge: true }); // Merge to update existing receipt
  
      console.log('Receipt uploaded successfully.');
  
      await updateMaintenanceAndRecommendation({ mileage: parsedMileage }); // Trigger AI recommendation refresh
  
      // Update AI estimation for today after receipt upload
      await updateAiEstimationForToday();
  
      // Refresh the page
      router.reload();
    } catch (error) {
      console.error('Error uploading receipt files or updating Firestore:', error);
    } finally {
      setUploading(false); // Hide loading spinner
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
  
      console.log('Receipt deleted successfully.');
    } catch (error) {
      console.error("Error deleting receipt:", error);
      throw new Error("Failed to delete receipt."); // Re-throw the error to propagate it
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

  const handleEditReceipt = (receipt) => {
    setEditingReceipt(receipt); // Pass the entire receipt object, including its ID
    setShowEditReceiptForm(true);
  };
  
const handleUpdateReceipt = async () => {
  const newErrors = {};

  // Validate mileage
  if (editingReceipt.mileage === undefined || editingReceipt.mileage === null || editingReceipt.mileage === "") {
    newErrors.mileage = "Mileage is required.";
  } else if (editingReceipt.mileage !== "Unknown" && isNaN(Number(editingReceipt.mileage))) {
    newErrors.mileage = "Enter a valid number for mileage or 'Unknown'.";
  }

  // Validate price
  if (editingReceipt.price === undefined || editingReceipt.price === null || editingReceipt.price === "") {
    newErrors.price = "Price is required.";
  } else if (isNaN(Number(editingReceipt.price))) {
    newErrors.price = "Enter a valid number for price.";
  }

  setErrors(newErrors);

  if (Object.keys(newErrors).length > 0) {
    return;
  }

  try {// Start loading spinner
    // Delete the old receipt using handleReceiptDelete with receipt URLs
    console.log("Deleting old receipt...");
    await handleReceiptDelete(editingReceipt.id, editingReceipt.files);

    // Prepare updated data for the new receipt
    const newReceiptId = doc(collection(db, `listing/${id}/receipts`)).id;
    const updatedData = {
      title: editingReceipt.title,
      date: editingReceipt.date ? new Date(editingReceipt.date) : null,
      category: editingReceipt.category,
      mileage: editingReceipt.mileage,
      price: editingReceipt.price,
    };

    // Recreate all previous files under the new receipt title name
    let downloadURLs = [];
    const allFiles = [...editingReceipt.files, ...newFiles]; // Combine old and new files
    if (allFiles.length > 0) {
      const uploadPromises = allFiles.map(async (file, index) => {
        const fileName = `${editingReceipt.title.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}-${index}`;
        const storageRef = ref(storage, `listing/${id}/docs/receipts/${fileName}`);

        // If the file is a URL (existing file), fetch it and reupload
        if (typeof file === "string") {
          const response = await fetch(file);
          const blob = await response.blob();
          const uploadTask = uploadBytesResumable(storageRef, blob);

          return new Promise((resolve, reject) => {
            uploadTask.on(
              "state_changed",
              null,
              (error) => reject(error),
              async () => {
                try {
                  const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                  resolve(downloadURL);
                } catch (error) {
                  reject(error);
                }
              }
            );
          });
        } else {
          // If the file is a new file, upload it directly
          const uploadTask = uploadBytesResumable(storageRef, file);

          return new Promise((resolve, reject) => {
            uploadTask.on(
              "state_changed",
              null,
              (error) => reject(error),
              async () => {
                try {
                  const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                  resolve(downloadURL);
                } catch (error) {
                  reject(error);
                }
              }
            );
          });
        }
      });

      downloadURLs = await Promise.all(uploadPromises);
    }

    // Add the new file URLs to the updated data
    updatedData.files = downloadURLs;

    // Save the new receipt document in Firestore
    const newReceiptRef = doc(db, `listing/${id}/receipts`, newReceiptId);
    await setDoc(newReceiptRef, updatedData);

    console.log("Receipt updated successfully.");
    router.reload();
  } catch (error) {
    console.error("Error updating receipt:", error);
  } finally {// Stop loading spinner
    setShowEditReceiptForm(false);
  }
};

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
          color: vehicleData.color || 'Unknown',
          city: vehicleData.city || 'Unknown',
          zip: vehicleData.zip || 'Unknown',
          state: vehicleData.state || 'Unknown',
          title: vehicleData.title || 'Unknown',
          aftermarketMods: vehicleData.aftermarketMods || 'Unknown',
          cosmeticDefaults: vehicleData.cosmeticDefaults || 'Unknown',
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
          const currentDate = new Date();
          const formattedDate = `${String(currentDate.getMonth() + 1).padStart(2, '0')}/${String(currentDate.getDate()).padStart(2, '0')}/${currentDate.getFullYear()}`;
          const newEntry = `${numericEstimation}-${formattedDate}`; // Format: value-MM/DD/YYYY

          await updateDoc(vehicleRef, {
            ai_estimated_value: arrayUnion(newEntry), // Append the new entry to the array
          });
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

  const handleShare = async () => {
    try {
      // Fetch the current user's firstName from Firebase
      const userRef = doc(db, 'members', auth.currentUser.uid);
      const userSnap = await getDoc(userRef);
  
      if (!userSnap.exists()) {
        console.error('User data not found.');
        return;
      }
  
      const { firstName } = userSnap.data();
  
      // Prepare the share data
      const shareData = {
        title: `${firstName} invites you to check this ${vehicleData.year} ${vehicleData.make} ${vehicleData.model}`,
        url: window.location.href,
      };
  
      // Use the Web Share API if available
      if (navigator.share) {
        try {
          await navigator.share(shareData);
          console.log('Page shared successfully');
        } catch (error) {
          console.error('Error sharing the page:', error);
        }
      } else {
        // Fallback for browsers that don't support the Web Share API
        navigator.clipboard.writeText(shareData.url).then(() => {
          alert('Link copied to clipboard!');
        });
      }
    } catch (error) {
      console.error('Error fetching user data for sharing:', error);
    }
  };

  useEffect(() => {
    // Listen for authentication state changes
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setAuthenticatedUser(currentUser);
      if (!currentUser) {
        setShowLoginModal(false); // Ensure login modal is not shown
        router.push('/Welcome_page'); // Redirect to Welcome_page on logout
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!id) return;

    const checkMarketplaceStatus = async () => {
      try {
        const marketplaceRef = doc(db, "on_marketplace", id);
        const marketplaceDoc = await getDoc(marketplaceRef);

        setIsOnMarketplace(marketplaceDoc.exists()); // Set the state based on whether the document exists
      } catch (error) {
        console.error("Error checking marketplace status:", error);
      }
    };

    checkMarketplaceStatus();
  }, [id]);

  if (!authenticatedUser) {
    // Show login modal if the user is not signed in
    return (
      <div className="relative min-h-screen bg-gray-100 flex items-center justify-center">
        {showLoginModal && (
          <LoginModal
            onClose={() => setShowLoginModal(false)}
            onLoginSuccess={() => {
              setShowLoginModal(false);
              router.reload(); // Reload the page after successful login
            }}
          />
        )}
        <div className="absolute inset-0 bg-gray-100 z-0"></div>
      </div>
    );
  }


  if (!vehicleData) return <p>Vehicle not found.</p>;

  const renderBoolean = (value) => (value ? "Yes" : "No");

  const handleAddDocument = (type) => {
    console.log(`Adding document of type: ${type}`);
    document.getElementById(type).click(); // Trigger the file input click
  };

  return (
    <div className="min-h-screen pt-20 p-6 bg-gray-100 text-black relative">
      <Navbar
        leftContent={
          <button
            onClick={() => router.push("/myVehicles_page")}
            className="bg-gray-200 p-2 rounded-full shadow-md hover:bg-gray-300"
            title="Go Back"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
              className="h-6 w-6 text-gray-600"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 19.5 8.25 12l7.5-7.5"
              />
            </svg>
          </button>
        }
      />
      <ToastContainer />

      <ImageCarousel imageUrls={imageUrls} />

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-center">
          {ownerName}&apos;s {vehicleData.year} {vehicleData.model}
        </h1>
        <button
          onClick={handleShare}
          className="flex items-center justify-center bg-gray-200 p-2 rounded-full shadow-md hover:bg-gray-300"
          title="Share this page"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 8.25H7.5a2.25 2.25 0 0 0-2.25 2.25v9a2.25 2.25 0 0 0 2.25 2.25h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25H15m0-3-3-3m0 0-3 3m3-3V15" />
          </svg>

        </button>
      </div>

      <div className="flex justify-around w-full px-6 mb-6">
      <button
        onClick={() => document.getElementById('info-section').scrollIntoView({ behavior: 'smooth' })}
        className="p-4 rounded-full bg-gray-200 hover:bg-gray-300"
        title="Info Section"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="1.5"
          stroke="currentColor"
          className="h-10 w-10 text-gray-600"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
          />
        </svg>
      </button>
      <button
        onClick={() => document.getElementById('maintenance-section').scrollIntoView({ behavior: 'smooth' })}
        className="p-4 rounded-full bg-gray-200 hover:bg-gray-300"
        title="Maintenance Section"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="1.5"
          stroke="currentColor"
          className="h-10 w-10 text-gray-600"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437L10 10"
          />
        </svg>
      </button>
      <button
        onClick={() => document.getElementById('dollar-section').scrollIntoView({ behavior: 'smooth' })}
        className="p-4 rounded-full bg-gray-200 hover:bg-gray-300"
        title="Dollar Section"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="1.5"
          stroke="currentColor"
          className="h-10 w-10 text-gray-600"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z"
          />
        </svg>
      </button>
    </div>

      {/* Info Section */}
      <section id="info-section" className="snap-start h-auto flex items-center justify-center">
        <div className="w-full h-full bg-gray-200 p-6 rounded-lg shadow-md border border-gray-300 relative overflow-auto">
          {isOwner && (
            <button
            className="absolute top-4 right-4 bg-purple-700 text-white p-2 rounded-full hover:bg-purple-800"
            onClick={() => router.push(`/modifyVehicle_page?id=${id}`)} // Pass the correct vehicle ID
            title="Modify Vehicle"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
  <path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1-1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
</svg>


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
            <p>
              <strong>VIN:</strong>{" "}
              {isOwner || !hideVin ? (
                vehicleData.vin || "N/A"
              ) : (
                "Hidden"
              )}
              {isOwner && (
                <button
                  onClick={toggleHideVin}
                  className="ml-2 text-sm text-blue-500 hover:underline flex items-center"
                >
                  {hideVin ? (
                    <>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="1.5"
                        stroke="currentColor"
                        className="w-4 h-4 mr-1"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88"
                        />
                      </svg>
                      Unhide
                    </>
                  ) : (
                    <>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="1.5"
                        stroke="currentColor"
                        className="w-4 h-4 mr-1"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88"
                        />
                      </svg>
                      Hide
                    </>
                  )}
                </button>
              )}
            </p>
            <p><strong>Mileage:</strong> {vehicleData.mileage || "N/A"}</p>
          </div>

          {/* Boolean Features (Grouped) */}
          <div className="bg-white p-4 rounded-md shadow-md mb-4">
            <strong>Features:</strong>
            <div className="flex flex-wrap gap-4 mt-2">
              {Object.entries(vehicleData)
                .filter(([key, value]) => typeof value === "boolean" && key !== "hideVin")
                .map(([key, value]) => (
                  <div key={key} className="flex items-center space-x-2">
                    <label>{key.charAt(0).toUpperCase() + key.slice(1)}: {renderBoolean(value)}</label>
                  </div>
                ))}
            </div>
          </div>

          {/* Other Details (Dynamically Displayed) */}
          <div className="grid grid-cols-3 md:grid-cols-3 gap-1">
            {Object.entries(vehicleData)
              .filter(([key, value]) => 
                ![
                  "uid", "imageUrls", "CreatedAt", "RightImage", "RearImage", "OtherImage", "year", "ai_estimated_value",
                  "RightfrontWheelImage", "FrontImage", "DashboardImage", "RightrearWheelImage", "vehicleType", "createdAt",
                  "EngineBayImage", "LeftrearWheelImage", "city", "state", "zip","boughtAt","recommendation",
                  "description", "cosmeticDefaults", "marketfetch_estimation","aiRecommendation","aftermarketMods", "vin", "title", "ownerManual", "model", "make", "mileage","updatedAt"
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
<section id="maintenance-section" className="snap-start h-auto flex items-center justify-center">
  <div className="max-w-lg mx-auto bg-gray-200 p-6 rounded-lg shadow-md border border-gray-300 relative">
    <h2 className="text-2xl font-semibold mb-0">Maintenance</h2>
    <p className="text-xs text-gray-500">Maintenance = maximized pleasure and resale value!</p>
    <div className="absolute top-4 right-4 bg-white p-2 rounded-lg shadow-md border border-gray-300 cursor-pointer" onClick={handleSumBoxClick}>
      <p className="text-xs text-gray-500">{sumType}</p>
      <p className="text-s">${Number(calculateSum(sumType)).toFixed(2)}</p>
    </div>

    {/* AI Upcoming Maintenance Header */}
    <div className="mt-6 flex justify-between items-center">
      <h3 className="text-md font-bold text-blue-500">
        Maintenance Recommendation
      </h3>
      <p className="text-xs text-gray-500">(Current Mileage: {vehicleData.mileage})</p>
      {isOwner && !vehicleData.ownerManual && (
        <button
          onClick={() => setShowOwnerManualModal(true)}
          className="bg-gradient-to-r from-purple-500 to-pink-700 text-white font-semibold px-6 py-2 rounded shadow-md hover:from-blue-600 hover:to-blue-800 transition duration-300"
        >
          Sync Owner Manual
        </button>
      )}
    </div>

    {/* AI Recommendation Box */}
    <div className="mt-4 bg-gray-100 p-4 rounded-lg border border-gray-300 text-sm overflow-auto relative">
      {refreshing ? (
        <div className="loader animate-spin mx-auto"></div>
      ) : (
        <pre className="whitespace-pre-wrap">
          {aiRecommendation
            ? typeof aiRecommendation === 'string'
              ? aiRecommendation
              : JSON.stringify(aiRecommendation, null, 2)
            : "No AI recommendation available."}
        </pre>
      )}
    </div>

    {/* Receipt History Section */}
    <div className="mt-6">
      <h3 className="text-lg font-semibold mb-2">History</h3>
      <div className="max-h-48 overflow-y-auto bg-gray-100 p-4 rounded-lg shadow-inner border border-gray-300">
  {receipts.length > 0 ? (
    receipts.map((receipt) => (
      <div key={receipt.id} className="mb-2 flex justify-between items-center bg-white p-2 rounded-md shadow-sm border border-gray-300">
        {receipt.urls && receipt.urls.length > 0 && (
          <a
            href={isOwner ? receipt.urls[0] : '#'}
            target={isOwner ? "_blank" : "_self"}
            rel="noopener noreferrer"
            className={`text-blue-600 hover:underline ${!isOwner && 'cursor-not-allowed text-gray-400'}`}
            onClick={(e) => {
              if (!isOwner) e.preventDefault();
            }}
            >
            {receipt.title} - {new Date(receipt.date.seconds * 1000).toLocaleDateString()} - ${receipt.price}
            </a>
          )}
          {isOwner && (
            <div className="flex items-center space-x-2">
            <button
              onClick={() => handleEditReceipt(receipt)}
              className="text-purple-600 hover:text-purple-800"
              title="Edit Receipt"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" className="size-6">
              <path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1-1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
              </svg>
            </button>
            <button
              onClick={async () => {
              await handleReceiptDelete(receipt.id, receipt.urls);
              refreshPage(); // Reload the page after deleting the receipt
              }}
              className="text-red-600 hover:text-red-800"
              title="Delete Receipt"
            >
              ✖
            </button>
            </div>
          )}
          </div>
        ))
        ) : (
        <p className="text-gray-500">No receipts available.</p>
        )}
      </div>

          {isOwner && (
          <button
            onClick={() => setShowReceiptForm(true)}
            className="bg-purple-700 text-white text-sm px-4 py-1 mt-2 rounded-2xl hover:bg-blue-600"
          >
            + Receipt
          </button>
          )}
        </div>

        {/* Document Handling Section */}
    <div className="flex justify-around w-full px-6 mt-6">
      {['title', 'registration', 'inspection'].map((docType) => {
        const matchingDocument = allDocuments.find(doc => doc.name.includes(docType));
        const documentExists = !!matchingDocument;
        const isDue = documentExists && (docType === 'inspection' || docType === 'registration') 
          ? isDateDue(matchingDocument.name) 
          : false;

        return (
          <div key={docType} className="w-1/3 text-center relative">
            <p className="text-xs text-gray-500 mb-1">{docType.charAt(0).toUpperCase() + docType.slice(1)}</p>
            <a
              href={documentExists && isOwner ? matchingDocument.url : '#'}
              target={documentExists && isOwner ? "_blank" : "_self"}
              rel="noopener noreferrer"
              onClick={(e) => {
                if (!documentExists || !isOwner) e.preventDefault();
              }}
              className="relative inline-block"
            >
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
                onClick={() => {
                  if (!documentExists) handleAddDocument(docType);
                }}
              />
              {documentExists && (
                <div
                  className={`absolute inset-0 flex items-center justify-center ${
                    isDue ? 'bg-red-500' : 'bg-green-500'
                  } bg-opacity-80 text-white text-xs rounded-full`}
                >
                  {isDue ? 'Expired' : isOwner ? 'Click to view' : 'Owner Access Only'}
                </div>
              )}
            </a>
            {isOwner && (
              <input
                type="file"
                id={docType}
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (docType === 'title') {
                    handleDocumentUpload(docType, file, null);
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

    {/* AI Maintenance Question Box */}
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

      {/* Dollar Section */}
      <section id="dollar-section" className="snap-start h-auto flex items-center justify-center">
        <div className="max-w-lg mx-auto bg-gray-200 p-6 rounded-lg shadow-md border border-gray-300">
          <h2 className="text-2xl font-semibold mb-4">Market</h2>
          {!isOwner && (
            <button
            onClick={handleContactSeller}
            className="flex items-center justify-center bg-purple-600 text-white px-6 py-2 rounded-full w-full hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
              className="h-6 w-6 mr-2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 0 1-.825-.242m9.345-8.334a2.126 2.126 0 0 0-.476-.095 48.64 48.64 0 0 0-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0 0 11.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155"
              />
            </svg>
            Contact Owner
          </button>
          )}
          {isOwner && (
            <div className="flex justify-around mt-0">
              {isOnMarketplace ? (
                // Red button to remove the vehicle from the marketplace
                <button
                  onClick={async () => {
                    try {
                      const marketplaceRef = doc(db, "on_marketplace", id);
                      await deleteDoc(marketplaceRef);
                      alert("Vehicle removed from marketplace.");
                      setIsOnMarketplace(false); // Update state
                    } catch (error) {
                      console.error("Error removing vehicle from marketplace:", error);
                      alert("Failed to remove vehicle from marketplace.");
                    }
                  }}
                  className="bg-red-600 text-white px-6 py-2 rounded-2xl hover:bg-red-700"
                >
                  Remove from Marketplace
                </button>
              ) : (
                // Green button to add the vehicle to the marketplace
                <button
                  onClick={async () => {
                    const price = prompt("Enter the price for the vehicle:");
                    if (!price || isNaN(price)) {
                      alert("Please enter a valid number for the price.");
                      return;
                    }

                    try {
                      const marketplaceRef = doc(db, "on_marketplace", id);
                      await setDoc(marketplaceRef, {
                        listedAt: new Date(),
                        price: parseFloat(price),
                        status: "listed",
                      });
                      alert("Vehicle added to marketplace.");
                      setIsOnMarketplace(true); // Update state
                    } catch (error) {
                      console.error("Error adding vehicle to marketplace:", error);
                      alert("Failed to add vehicle to marketplace.");
                    }
                  }}
                  className="bg-green-600 text-white px-6 py-2 rounded-2xl hover:bg-green-700"
                >
                  Add to Marketplace
                </button>
              )}
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
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                  className={`h-3 w-3 cursor-pointer ${refreshing ? 'animate-spin' : ''}`}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
                  />
                </svg>
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
          <p>Here, we gonna add classic marketplace options, but also pro vehicle evaluation (it cost $300 a month, we need more members first !). We will improve the AI, digitalize your docs, use AI to retrieve the info automatically. We will use AI to create a 3D version of your vehicle!</p>
        </div>

      {showReceiptForm && (
        <ReceiptForm
          id={id} // Pass the vehicle ID to the ReceiptForm
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
          id={id}
          onClose={() => setShowEditReceiptForm(false)}
          onSave={handleUpdateReceipt}
          receiptTitle={editingReceipt?.title || ''}
          setReceiptTitle={(value) => setEditingReceipt((prev) => ({ ...prev, title: value }))}
          receiptDate={editingReceipt?.date ? new Date(editingReceipt.date.seconds * 1000).toISOString().split('T')[0] : ''}
          setReceiptDate={(value) => setEditingReceipt((prev) => ({ ...prev, date: value }))}
          receiptCategory={editingReceipt?.category || ''}
          setReceiptCategory={(value) => setEditingReceipt((prev) => ({ ...prev, category: value }))}
          receiptMileage={editingReceipt?.mileage || ''}
          setReceiptMileage={(value) => setEditingReceipt((prev) => ({ ...prev, mileage: value }))}
          receiptPrice={editingReceipt?.price || ''}
          setReceiptPrice={(value) => setEditingReceipt((prev) => ({ ...prev, price: value }))}
          setReceiptFiles={(files) => setEditingReceipt((prev) => ({ ...prev, files }))}
          receiptFiles={editingReceipt?.urls || []}
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