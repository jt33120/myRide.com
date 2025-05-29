// pages/vehicleCard/[id].jsx
import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/router";
import { auth, db, storage } from "../../lib/firebase";
import { ChevronDown, ChevronUp } from "lucide-react";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  setLogLevel,
  setDoc,
  deleteDoc,
} from "firebase/firestore";
import {
  ref,
  listAll,
  getDownloadURL,
  uploadBytesResumable,
  uploadString,
  deleteObject, // added for removing documents
} from "firebase/storage";
import Image from "next/image";
import "chart.js/auto";
import { onAuthStateChanged } from "firebase/auth";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Share2 } from "lucide-react";
import {
  Car,
  MapPin,
  Palette,
  Gauge,
  Key,
  Fuel,
  Users,
  AlignLeft,
  Info,
  Zap,
  Droplets,
  PlusCircle, // added for file upload icon
  Eye, // view icon (owner only)
  Edit,
  Download, // new download icon
} from "lucide-react";
import dynamic from "next/dynamic";
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });
import { Loader2 } from "lucide-react";

// Helper: convert chartData to ApexCharts series,
// now handles both raw numeric arrays and {x,y} objets
function buildSeries(chartData) {
  return chartData.datasets.map((ds) => ({
    name: ds.label,
    data: ds.data.map((pt, i) =>
      pt && pt.x !== undefined && pt.y !== undefined
        ? pt
        : { x: chartData.labels[i], y: pt }
    ),
  }));
}

function formatDateMMDDYYYY(dateObj) {
  const d = new Date(dateObj);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

// ApexCharts default options, design revu
const defaultOptions = {
  chart: {
    id: "vehicle-value-chart",
    toolbar: { show: false },
    background: "#1f2937",
  },
  colors: ["#34d399", "#60a5fa", "#a78bfa", "#f87171"],
  dataLabels: {
    enabled: true,
    offsetY: -6,
    style: { fontSize: "10px", colors: ["#1f2937"] },
  },
  stroke: { curve: "smooth", width: 2 },
  markers: { size: 4, hover: { size: 6 } },
  grid: {
    show: true,
    borderColor: "#374151",
    strokeDashArray: 6,
    yaxis: { lines: { show: true } },
  },
  xaxis: {
    type: "datetime",
    tickAmount: 6,
    labels: {
      datetimeUTC: false,
      format: "dd MMM",
      style: { colors: "#9ca3af", fontSize: "11px" },
    },
  },
  yaxis: {
    title: { text: "Value ($)", style: { color: "#9ca3af" } },
    labels: {
      style: { colors: "#fff" },
      formatter: (val) => `$${val.toLocaleString()}`,
    },
  },
  tooltip: {
    theme: "dark",
    x: { format: "dd MMM yy" },
    y: { formatter: (val) => `$${val.toFixed(2)}` },
  },
  legend: {
    position: "top",
    labels: { colors: "#f3f4f8" },
  },
};

// Icônes et catégories

const icons = {
  Year: <Key className="w-4 h-4 mr-2" />,
  Make: <Car className="w-4 h-4 mr-2" />,
  Model: <Car className="w-4 h-4 mr-2" />,
  City: <MapPin className="w-4 h-4 mr-2" />,
  State: <MapPin className="w-4 h-4 mr-2" />,
  VIN: <Key className="w-4 h-4 mr-2" />,
  Mileage: <Gauge className="w-4 h-4 mr-2" />,
  Color: <Palette className="w-4 h-4 mr-2" />,
  Engine: <Fuel className="w-4 h-4 mr-2" />,
  Transmission: <Fuel className="w-4 h-4 mr-2" />,
  Description: <AlignLeft className="w-4 h-4 mr-2" />,
  Owner: <Users className="w-4 h-4 mr-2" />,
  Horsepower: <Zap className="w-4 h-4 mr-2" />,
  "Fuel Type": <Droplets className="w-4 h-4 mr-2" />,
};

// Modal de synchronisation du manuel
function OwnerManualModal({ vehicleId, onClose, onSync }) {
  const [manualUrl, setManualUrl] = useState("");
  const [loading, setLoading] = useState(false); // Added loading state

  const handleSync = async () => {
    if (!manualUrl.trim()) return toast.error("URL required");
    setLoading(true); // Show loading message
    try {
      await setDoc(
        doc(db, "listing", vehicleId),
        { ownerManual: manualUrl },
        { merge: true }
      );
      const snap = await getDoc(doc(db, "listing", vehicleId));
      const v = snap.data();
      const res = await fetch("/api/getMaintenanceFrequency", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year: v.year,
          make: v.make,
          model: v.model,
          type: v.vehicleType,
          url: manualUrl,
        }),
      });
      const json = await res.json();
      const path = `listing/${vehicleId}/docs/maintenanceTable.json`;
      const storageRef = ref(storage, path);
      await uploadString(storageRef, JSON.stringify(json.response), "raw");
      toast.success("Manual synced and AI data saved");
      onSync();
      onClose();
    } catch (e) {
      console.error(e);
      toast.error("Failed to sync manual");
    } finally {
      setLoading(false); // Hide loading message
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
      <div className="p-6 border rounded shadow-lg bg-neutral-800 border-neutral-700 w-80">
        <h2 className="mb-4 text-xl text-white">Sync Owner Manual</h2>
        <input
          type="text"
          placeholder="Enter the URL of the PDF manual"
          className="w-full p-2 mb-4 text-white border rounded border-neutral-600 bg-neutral-700"
          value={manualUrl}
          onChange={(e) => setManualUrl(e.target.value)}
        />
        <p className="mb-4 text-sm text-neutral-400">
          Need help finding a manual? Visit{" "}
          <a
            href="https://www.carmanualsonline.info/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:underline"
          >
            Car Manuals Online
          </a>{" "}
          or check the{" "}
          <span className="text-blue-400">manufacturer&apos;s website</span>.
        </p>
        {loading ? (
          <p className="mb-4 text-sm text-neutral-400">
            Syncing manual, please wait...
          </p>
        ) : (
          <button
            type="button"
            className="w-full py-2 mb-2 text-white bg-purple-600 rounded hover:bg-purple-700"
            onClick={handleSync}
          >
            Save
          </button>
        )}
        <button
          type="button"
          className="w-full py-2 text-white rounded bg-neutral-600 hover:bg-neutral-500"
          onClick={onClose}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ReceiptForm: update labels, placeholders, buttons, errors
function ReceiptForm({ vehicleId, initialData, onClose, onSaved }) {
  const isEdit = Boolean(initialData);
  const [title, setTitle] = useState(initialData?.title || "");
  const [date, setDate] = useState(
    initialData?.date
      ? new Date(initialData.date.seconds * 1000).toISOString().split("T")[0]
      : ""
  );
  const [category, setCategory] = useState(initialData?.category || "");
  const [mileage, setMileage] = useState(initialData?.mileage || "");
  const [price, setPrice] = useState(initialData?.price || "");
  const [files, setFiles] = useState([]);
  const [existing] = useState(initialData?.urls || []);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null); // For full preview modal
  const [toDelete, setToDelete] = useState([]); // Track files marked for deletion

  // Mark a file for deletion (but don't delete from storage yet)
  const handleMarkDelete = (url) => {
    setToDelete((prev) => [...prev, url]);
  };

  // Unmark a file for deletion
  const handleUnmarkDelete = (url) => {
    setToDelete((prev) => prev.filter((u) => u !== url));
  };

  // Actually delete files from Firebase Storage after Save
  const deleteMarkedFiles = async () => {
    for (const url of toDelete) {
      try {
        const baseUrl = `listing/${vehicleId}/docs/receipts/`;
        const fileName = url.split("%2F").pop().split("?")[0];
        const filePath = baseUrl + decodeURIComponent(fileName);
        await deleteObject(ref(storage, filePath));
      } catch (e) {
        console.error(e);
        toast.error("Error deleting file: " + url);
      }
    }
  };

  const handleSubmit = async () => {
    if (!title || !date || !category || !price) {
      return toast.error("All fields are required");
    }
    setUploading(true);
    try {
      // Remove marked-for-deletion files from the urls array
      const keptExisting = existing.filter((url) => !toDelete.includes(url));
      // Upload new files
      const receiptId =
        initialData?.id ||
        doc(collection(db, `listing/${vehicleId}/receipts`)).id;
      const uploadedUrls = [];
      for (let file of files) {
        // preserve file extension
        const ext = file.name.substring(file.name.lastIndexOf("."));
        const name = `${receiptId}-${Date.now()}${ext}`;
        const storageRef = ref(
          storage,
          `listing/${vehicleId}/docs/receipts/${name}`
        );
        const snap = await uploadBytesResumable(storageRef, file);
        uploadedUrls.push(await getDownloadURL(snap.ref));
      }
      const receipt = {
        title,
        date: new Date(date),
        category,
        mileage: isNaN(+mileage) ? null : +mileage,
        price: +price,
        urls: [...keptExisting, ...uploadedUrls],
      };
      await setDoc(
        doc(db, `listing/${vehicleId}/receipts`, receiptId),
        receipt,
        { merge: true }
      );

      // Delete files from storage only after successful save
      await deleteMarkedFiles();

      // --- Update vehicle mileage if needed ---
      const vehicleRef = doc(db, "listing", vehicleId);
      const vehicleSnap = await getDoc(vehicleRef);
      if (vehicleSnap.exists()) {
        const vehicleData = vehicleSnap.data();
        const currentMileage = Number(vehicleData.mileage) || 0;
        const newMileage = isNaN(+mileage) ? currentMileage : Number(mileage);
        if (newMileage > currentMileage) {
          await setDoc(vehicleRef, { mileage: newMileage }, { merge: true });
        }
      }

      // Call the aiEstimator API
      const vehicleSnap2 = await getDoc(doc(db, "listing", vehicleId));
      if (vehicleSnap2.exists()) {
        const vehicleData = vehicleSnap2.data();
        const response = await fetch("/api/aiEstimator", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            make: vehicleData.make,
            model: vehicleData.model,
            year: vehicleData.year,
            mileage: vehicleData.mileage,
            city: vehicleData.city,
            state: vehicleData.state,
            zip: vehicleData.zip,
            color: vehicleData.color,
            title: vehicleData.title,
            vehicleId: vehicleId,
          }),
        });

        if (!response.ok) {
          console.error("Failed to fetch AI estimation");
          toast.error("Failed to fetch AI estimation");
        } else {
          toast.success("AI estimation updated successfully");
        }
      }

      toast.success(isEdit ? "Receipt updated" : "Receipt saved");
      onSaved(receipt);
      onClose();
    } catch (e) {
      console.error(e);
      toast.error("Error saving receipt");
    } finally {
      setUploading(false);
    }
  };

  // Reset all changes if cancel is clicked
  const handleCancel = () => {
    setToDelete([]);
    setFiles([]);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
      <div className="w-full max-w-md p-8 border rounded-lg shadow-xl bg-neutral-800 border-neutral-700">
        <h2 className="mb-6 text-2xl font-semibold text-center text-white">
          {isEdit ? "Edit Receipt" : "Add Receipt"}
        </h2>
        <input
          placeholder="Title"
          className="w-full p-3 mb-4 text-white border rounded border-neutral-600 bg-neutral-700"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <input
          type="date"
          className="w-full p-3 mb-4 text-white border rounded border-neutral-600 bg-neutral-700"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <select
          className="w-full p-3 mb-4 text-white border rounded border-neutral-600 bg-neutral-700"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">Category</option>
          <option>Repair</option>
          <option>Scheduled Maintenance</option>
          <option>Cosmetic Mods</option>
          <option>Performance Mods</option>
          <option>Paperwork & Taxes</option>
        </select>
        <input
          placeholder="Mileage"
          className="w-full p-3 mb-4 text-white border rounded border-neutral-600 bg-neutral-700"
          value={mileage}
          onChange={(e) => setMileage(e.target.value)}
        />
        <input
          type="number"
          placeholder="Price"
          className="w-full p-3 mb-4 text-white border rounded border-neutral-600 bg-neutral-700"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />

        {/* Existing files preview and delete */}
        {existing.length > 0 && (
          <div className="mb-4">
            <div className="mb-2 font-semibold text-white">Existing Files:</div>
            <div className="flex flex-wrap gap-3">
              {existing.map((url, idx) => {
                const marked = toDelete.includes(url);
                return (
                  <div key={url} className="relative group">
                    <button
                      type="button"
                      onClick={() => setPreviewUrl(url)}
                      style={{
                        padding: 0,
                        border: "none",
                        background: "none",
                        cursor: marked ? "not-allowed" : "pointer",
                        opacity: marked ? 0.4 : 1,
                      }}
                      title={marked ? "Will be deleted" : "Click to enlarge"}
                      disabled={marked}
                    >
                      {url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                        <img
                          src={url}
                          alt={`Receipt file ${idx + 1}`}
                          className="object-contain w-20 h-20 bg-white border rounded"
                          style={{ maxWidth: 80, maxHeight: 80 }}
                        />
                      ) : (
                        <iframe
                          src={url}
                          title={`PDF preview ${idx + 1}`}
                          className="bg-white border rounded"
                          style={{
                            width: 80,
                            height: 80,
                            objectFit: "contain",
                            display: "block",
                            background: "#fff",
                            pointerEvents: "none",
                          }}
                        />
                      )}
                    </button>
                    {/* Delete/Undo button: simple cross, no background */}
                    {marked ? (
                      <button
                        type="button"
                        onClick={() => handleUnmarkDelete(url)}
                        className="absolute top-0 right-0 p-1 text-lg text-green-400 hover:text-green-600"
                        title="Undo delete"
                        style={{ background: "none", border: "none" }}
                      >
                        &#8634;
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleMarkDelete(url)}
                        className="absolute top-0 right-0 p-1 text-lg text-white hover:text-pink-400"
                        title="Mark for deletion"
                        style={{ background: "none", border: "none" }}
                      >
                        ×
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            {toDelete.length > 0 && (
              <div className="mt-2 text-xs text-pink-400">
                Files marked for deletion will be removed after saving.
              </div>
            )}
          </div>
        )}

        {/* Full preview modal */}
        {previewUrl && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80">
            <div className="relative flex flex-col items-center w-full max-w-2xl p-4 bg-white rounded-lg shadow-xl">
              <button
                className="absolute text-2xl text-gray-700 top-2 right-2 hover:text-pink-500"
                onClick={() => setPreviewUrl(null)}
                title="Close"
                style={{ background: "none", border: "none" }}
              >
                ×
              </button>
              {previewUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                <div
                  style={{
                    width: "100%",
                    height: "70vh",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "#fff",
                  }}
                >
                  <img
                    src={previewUrl}
                    alt="Full preview"
                    style={{
                      maxWidth: "100%",
                      maxHeight: "100%",
                      objectFit: "contain",
                      borderRadius: "0.5rem",
                      background: "#fff",
                      display: "block",
                    }}
                  />
                </div>
              ) : (
                <iframe
                  src={previewUrl}
                  title="PDF Full Preview"
                  className="w-full"
                  style={{ minHeight: "70vh", background: "#fff" }}
                />
              )}
            </div>
          </div>
        )}

        <input
          type="file"
          multiple
          className="w-full mb-4 text-white"
          onChange={(e) => setFiles(Array.from(e.target.files))}
        />
        <div className="flex justify-between">
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 text-white rounded bg-neutral-600 hover:bg-neutral-500"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={uploading}
            className="button-main"
          >
            {uploading ? "Uploading..." : "Save Receipt"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Composant principal
export default function VehicleCardPage() {
  const router = useRouter();
  const [showInfo, setShowInfo] = useState(false);
  const { id } = router.query;

  // Hooks dans un ordre fixe
  const [user, setUser] = useState(null);
  const [vehicle, setVehicle] = useState(null);
  const [ownerName, setOwnerName] = useState("");
  const [receipts, setReceipts] = useState([]);
  const [images, setImages] = useState([]);
  const [aiRec, setAiRec] = useState("");
  const [timeWindow, setTimeWindow] = useState("Last Year");
  const [isListed, setIsListed] = useState(false);
  const [salePrice, setSalePrice] = useState(null);
  const [showManual, setShowManual] = useState(false);
  const [showReceiptForm, setShowReceiptForm] = useState(false);
  const [editingReceipt, setEditingReceipt] = useState(null);
  const [allDocs, setAllDocs] = useState([]);
  const [selectedItem, setSelectedItem] = useState("Total Spent");
  // Added state for enlarged image index
  const [enlargedIdx, setEnlargedIdx] = useState(null);
  // Add state definition for marketplace modal:
  const [showMarketplaceModal, setShowMarketplaceModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    year: "",
    make: "",
    model: "",
    city: "",
    state: "",
    vin: "",
    mileage: "",
    color: "",
    engine: "",
    transmission: "",
    horsepower: "",
    fuelType: "",
    vehicleType: "",
    boughtAt: "",
    purchaseYear: "",
    // Additional maintenance fields
    withoutPurchasePrice: "",
    repairCost: "",
    scheduledMaintenance: "",
    cosmeticMods: "",
    performanceMods: "",
  });
  const [aiQuestion, setAiQuestion] = useState(""); // State for the question
  const [aiAnswer, setAiAnswer] = useState(""); // State for the AI's answer
  const [loadingAiQuestion, setLoadingAiQuestion] = useState(false); // Renamed to avoid conflict
  // Ajout de l'état manquant pour les maintenance records
  const [, setLoadingMaintenanceRec] = useState(false);
  const [selectedReceiptUrls, setSelectedReceiptUrls] = useState([]); // Updated state
  const [receiptToDelete, setReceiptToDelete] = useState(null);
  const [selectedAdminDocUrl, setSelectedAdminDocUrl] = useState(null); // New state for admin document modal
  const [loading, setLoading] = useState(true);

  // ...inside VehicleCardPage component...
  const handleShare = async () => {
    try {
      // Fetch the current user's firstName from Firebase
      const userRef = doc(db, "members", auth.currentUser.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        console.error("User data not found.");
        return;
      }

      const { firstName } = userSnap.data();

      // Prepare the share data
      const shareData = {
        title: `${firstName} invites you to check this ${vehicle.year} ${vehicle.make} ${vehicle.model}`,
        url: window.location.href,
      };

      // Use the Web Share API if available
      if (navigator.share) {
        try {
          await navigator.share(shareData);
          console.log("Page shared successfully");
        } catch (error) {
          console.error("Error sharing the page:", error);
        }
      } else {
        // Fallback for browsers that don't support the Web Share API
        navigator.clipboard.writeText(shareData.url).then(() => {
          alert("Link copied to clipboard!");
        });
      }
    } catch (error) {
      console.error("Error fetching user data for sharing:", error);
    }
  };

  useEffect(() => setLogLevel("debug"), []);
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) router.push("/Welcome_page");
      else setUser(u);
    });
    return unsub;
  }, [router]);

  // Fetch global data
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    (async () => {
      const snapV = await getDoc(doc(db, "listing", id));
      if (!snapV.exists()) return;
      const v = snapV.data();
      setVehicle(v);
      setAiRec(v.aiRecommendation || "No AI recommendation");

      const snapU = await getDoc(doc(db, "members", v.uid));
      setOwnerName(snapU.data()?.firstName || "");

      const snapR = await getDocs(collection(db, `listing/${id}/receipts`));
      setReceipts(
        snapR.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (b.date?.seconds || 0) - (a.date?.seconds || 0))
      );

      const listPhotos = await listAll(ref(storage, `listing/${id}/photos/`));
      setImages(
        await Promise.all(listPhotos.items.map((i) => getDownloadURL(i)))
      );

      const mpSnap = await getDoc(doc(db, "on_marketplace", id));
      if (mpSnap.exists()) {
        setIsListed(true);
        setSalePrice(mpSnap.data().price);
      }

      const docsList = await listAll(ref(storage, `listing/${id}/docs/`));
      const docs = await Promise.all(
        docsList.items.map(async (item) => ({
          name: item.name,
          url: await getDownloadURL(item),
        }))
      );
      setAllDocs(docs);
      setLoading(false);
    })();
  }, [id]);

  // Update AI value estimation
  useEffect(() => {
    if (!id) return;

    async function fetchVehicleData() {
      try {
        // Fetch vehicle data from Firestore
        const vehicleRef = doc(db, "listing", id);
        const vehicleSnap = await getDoc(vehicleRef);

        if (vehicleSnap.exists()) {
          const vehicleData = vehicleSnap.data();
          setVehicle(vehicleData);

          // Call the aiEstimator API for this vehicle
          const response = await fetch("/api/aiEstimator", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              make: vehicleData.make,
              model: vehicleData.model,
              year: vehicleData.year,
              mileage: vehicleData.mileage,
              city: vehicleData.city,
              state: vehicleData.state,
              zip: vehicleData.zip,
              color: vehicleData.color,
              title: vehicleData.title,
              vehicleId: id,
            }),
          });

          if (!response.ok) {
            console.error("Failed to fetch AI estimation");
            toast.error("Failed to fetch AI estimation");
          } else {
            // Refetch the vehicle data to get the updated `ai_estimated_value`
            const updatedVehicleSnap = await getDoc(vehicleRef);
            if (updatedVehicleSnap.exists()) {
              setVehicle(updatedVehicleSnap.data());
            }
          }
        } else {
          console.error("Vehicle not found in Firestore.");
          toast.error("Vehicle not found.");
        }
      } catch (error) {
        console.error("Error fetching vehicle data:", error);
        toast.error("Error fetching vehicle data.");
      }
    }

    fetchVehicleData();
  }, [id]);

  // Update formData when vehicle is loaded in edit mode
  useEffect(() => {
    if (vehicle && editMode) {
      setFormData({
        year: vehicle.year || "",
        make: vehicle.make || "",
        model: vehicle.model || "",
        city: vehicle.city || "",
        state: vehicle.state || "",
        vin: vehicle.vin || "",
        mileage: vehicle.mileage || "",
        color: vehicle.color || "",
        engine: vehicle.engine || "",
        transmission: vehicle.transmission || "",
        horsepower: vehicle.horsepower || "",
        fuelType: vehicle.fuelType || "",
        vehicleType: vehicle.vehicleType || "",
        boughtAt: vehicle.boughtAt || "",
        purchaseYear: vehicle.purchaseYear || "",
        withoutPurchasePrice: vehicle.withoutPurchasePrice || "",
        repairCost: vehicle.repairCost || "",
        scheduledMaintenance: vehicle.scheduledMaintenance || "",
        cosmeticMods: vehicle.cosmeticMods || "",
        performanceMods: vehicle.performanceMods || "",
        description: vehicle.description || "", // added to load existing description
      });
    }
  }, [vehicle, editMode]);

  const handleFormChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };
  // Update the form submit handler in edit mode to use native alert like in remove from marketplace
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    try {
      await setDoc(doc(db, "listing", id), formData, { merge: true });
      setVehicle({ ...vehicle, ...formData });
      toast.success("Vehicle updated successfully"); // Native alert on save
      setEditMode(false);
    } catch {
      toast.error("Error updating vehicle");
    }
  };

  const askAi = async () => {
    if (!aiQuestion.trim()) return toast.error("Veuillez entrer une question.");
    setLoadingAiQuestion(true);
    try {
      console.log("Données envoyées à l'API AI :", {
        prompt: aiQuestion,
        vehicleId: id,
        vehicleDetails: vehicle,
      });
      const res = await fetch("/api/aiMaintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: aiQuestion,
          vehicleId: id,
          vehicleDetails: vehicle,
        }),
      });
      const data = await res.json();
      console.log("Réponse de l'API AI :", data);
      if (!res.ok) throw new Error(data.error || "Erreur");
      setAiAnswer(data.answer || "Aucune réponse disponible.");
    } catch (e) {
      console.error("Erreur API AI :", e.message);
      setAiAnswer(`Erreur : ${e.message}`);
    } finally {
      setLoadingAiQuestion(false);
    }
  };

  // Fonction pour obtenir la recommandation de maintenance basée sur le mileage
  const fetchMaintenanceRec = async () => {
    setLoadingMaintenanceRec(true);

    try {
      // Fetch the vehicle document from Firestore
      const snap = await getDoc(doc(db, "listing", id));
      if (!snap.exists()) {
        throw new Error("Vehicle not found");
      }

      // Get the aiRecommendation field from the document
      const vehicleData = snap.data();
      setAiRec(
        vehicleData.aiRecommendation || "No AI recommendation available."
      );
    } catch (error) {
      console.error("Error fetching AI recommendation:", error.message);
      setAiRec("Error fetching AI recommendation.");
    } finally {
      setLoadingMaintenanceRec(false);
    }
  };

  // Rafraîchir la recommandation à l'affichage ou si le mileage change
  useEffect(() => {
    if (
      vehicle?.mileage &&
      vehicle?.engine &&
      vehicle?.model &&
      vehicle?.year
    ) {
      fetchMaintenanceRec();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicle?.mileage, vehicle?.engine, vehicle?.model, vehicle?.year]);

  // Marketplace handlers
  const confirmAdd = async (priceInput) => {
    const price = parseFloat(priceInput);
    if (isNaN(price) || price <= 0) {
      toast.error("Please enter a valid price");
      return;
    }
    try {
      await setDoc(doc(db, "on_marketplace", id), { listingId: id, price });
      setIsListed(true);
      setSalePrice(price);
      toast.success("Vehicle listed!");
    } catch {
      toast.error("Unable to list vehicle");
    }
  };
  const removeFromMarketplace = async () => {
    try {
      await deleteDoc(doc(db, "on_marketplace", id));
      setIsListed(false);
      setSalePrice(null);
      toast.info("Vehicle removed from marketplace");
    } catch {
      toast.error("Unable to remove vehicle");
    }
  };

  // Calcul des sommes
  const calculateSum = (type) => {
    switch (type) {
      case "Total Spent":
        return (
          receipts.reduce((sum, receipt) => sum + (receipt.price || 0), 0) +
          (Number(vehicle?.boughtAt) || 0)
        );
      case "Without Purchase Price":
        return receipts.reduce((sum, receipt) => sum + (receipt.price || 0), 0);
      case "Repair":
      case "Scheduled Maintenance":
      case "Cosmetic Mods":
      case "Performance Mods":
      case "Paperwork & Taxes":
        return receipts
          .filter((receipt) => receipt.category === type)
          .reduce((sum, receipt) => sum + (receipt.price || 0), 0);
      default:
        return 0;
    }
  };

  // Chart base
  const baseChart = useMemo(() => {
    if (!vehicle?.boughtAt || !vehicle?.purchaseYear)
      // Correction : Utilisation de purchaseYear
      return { labels: [], datasets: [] };
    const purchasePrice = vehicle.boughtAt;
    const purchaseYear = Number(vehicle.purchaseYear); // Correction : Utilisation de purchaseYear
    const now = new Date();
    let start = new Date(now),
      countPoints = 0;
    if (timeWindow === "Last Week") {
      start.setDate(now.getDate() - 7);
      countPoints = 7;
    } else if (timeWindow === "Last Month") {
      start.setMonth(now.getMonth() - 1);
      countPoints = 8;
    } else {
      start.setFullYear(now.getFullYear() - 1);
      countPoints = 12;
    }
    const dates = Array.from(
      { length: countPoints },
      (_, i) =>
        new Date(
          start.getTime() +
            (now.getTime() - start.getTime()) * (i / (countPoints - 1))
        )
    );
    const rate = 0.15;
    const k = 0.18;
    const straight = dates.map(
      (d) =>
        purchasePrice *
        Math.pow(1 - rate, d.getFullYear() + d.getMonth() / 12 - purchaseYear)
    );
    const exponential = dates.map(
      (d) =>
        purchasePrice *
        Math.exp(-k * (d.getFullYear() + d.getMonth() / 12 - purchaseYear))
    );
    const straightSeries = dates.map((d, i) => ({
      x: d.getTime(),
      y: straight[i],
    }));
    const expSeries = dates.map((d, i) => ({
      x: d.getTime(),
      y: exponential[i],
    }));
    return {
      labels: [], // datetime axis ignore labels array
      datasets: [
        {
          label: "Straight",
          data: straightSeries,
          fill: false,
          borderWidth: 2,
        },
        { label: "Exponential", data: expSeries, fill: false, borderWidth: 2 },
      ],
    };
  }, [vehicle, timeWindow]);

  // Chart avec points AI
  const chartData = useMemo(() => {
    if (!vehicle || !Array.isArray(vehicle.ai_estimated_value)) {
      console.warn("Vehicle data or AI estimated values are missing.");
      return {
        ...baseChart,
        datasets: [...baseChart.datasets],
      };
    }

    const aiArray = vehicle.ai_estimated_value;
    const now = new Date();
    let startDate = new Date(now),
      countPoints = 0;
    if (timeWindow === "Last Week") {
      startDate.setDate(now.getDate() - 7);
      countPoints = 7;
    } else if (timeWindow === "Last Month") {
      startDate.setMonth(now.getMonth() - 1);
      countPoints = 8;
    } else {
      startDate.setFullYear(now.getFullYear() - 1);
      countPoints = 12;
    }

    // Parse and filter AI points based on the time window
    const aiRaw = aiArray
      .map((e) => {
        const [val, date] = e.split(/-(.+)/);
        const d = new Date(date);
        return isNaN(d) ? null : { x: d, y: +val };
      })
      .filter((p) => p && p.x >= startDate && p.x <= now);

    // Downsample to countPoints
    const sampledAi = [];
    if (aiRaw.length && countPoints > 1) {
      for (let i = 0; i < countPoints; i++) {
        const idx = Math.floor((i * (aiRaw.length - 1)) / (countPoints - 1));
        const pt = aiRaw[idx];
        sampledAi.push({ x: pt.x.getTime(), y: pt.y });
      }
    } else {
      sampledAi.push(...aiRaw.map((pt) => ({ x: pt.x.getTime(), y: pt.y })));
    }

    // Add a point for `boughtAt` using `createdAt` as the x-axis, and filter it
    const boughtAtPoint =
      vehicle?.boughtAt && vehicle?.createdAt
        ? { x: new Date(vehicle.createdAt.seconds * 1000), y: vehicle.boughtAt }
        : null;
    const filteredBoughtAtPoint =
      boughtAtPoint && boughtAtPoint.x >= startDate && boughtAtPoint.x <= now
        ? { x: boughtAtPoint.x.getTime(), y: boughtAtPoint.y }
        : null;

    return {
      ...baseChart,
      datasets: [
        ...baseChart.datasets,
        {
          label: "AI Estimated",
          data: sampledAi,
          parsing: false,
          pointRadius: 4,
          borderColor: "blue",
          backgroundColor: "blue",
        },
        {
          label: "Bought At",
          data: filteredBoughtAtPoint ? [filteredBoughtAtPoint] : [],
          borderColor: "red",
          backgroundColor: "red",
          pointRadius: 6,
          pointStyle: "circle",
        },
      ],
    };
  }, [baseChart, vehicle, timeWindow]);

  // Si l'utilisateur n'est pas connecté, rediriger vers la page de bienvenue
  if (!user) return null;
  if (loading || !vehicle) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-900">
        <Loader2 className="w-12 h-12 mb-4 text-purple-500 animate-spin" />
        <span className="text-lg text-white">Loading vehicle...</span>
      </div>
    );
  }

  // Si en mode édition, afficher le formulaire refait
  if (editMode) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4 py-10 bg-gradient-to-b from-neutral-900 to-neutral-800">
        <div className="w-full max-w-6xl p-8 rounded-lg shadow-2xl bg-neutral-800">
          <h1 className="mb-8 text-4xl font-bold text-center md:mt-14">
            Edit Vehicle
          </h1>
          <form
            onSubmit={handleFormSubmit}
            className="grid grid-cols-1 gap-6 md:grid-cols-3"
          >
            {/* General Fields */}
            <div className="space-y-4">
              <div>
                <label className="block mb-1 text-sm font-semibold">Year</label>
                <input
                  type="text"
                  name="year"
                  value={formData.year}
                  onChange={handleFormChange}
                  className="w-full p-2 border rounded-md border-neutral-600 bg-neutral-700"
                />
              </div>
              <div>
                <label className="block mb-1 text-sm font-semibold">Make</label>
                <input
                  type="text"
                  name="make"
                  value={formData.make}
                  onChange={handleFormChange}
                  className="w-full p-2 border rounded-md border-neutral-600 bg-neutral-700"
                />
              </div>
              <div>
                <label className="block mb-1 text-sm font-semibold">
                  Model
                  <input
                    type="text"
                    name="model"
                    value={formData.model}
                    onChange={handleFormChange}
                    className="w-full p-2 border rounded-md border-neutral-600 bg-neutral-700"
                  />
                </label>
              </div>
              <div>
                <label className="block mb-1 text-sm font-semibold">
                  City
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleFormChange}
                    className="w-full p-2 border rounded-md border-neutral-600 bg-neutral-700"
                  />
                </label>
              </div>
              <div>
                <label className="block mb-1 text-sm font-semibold">
                  State
                  <input
                    type="text"
                    name="state"
                    value={formData.state}
                    onChange={handleFormChange}
                    className="w-full p-2 border rounded-md border-neutral-600 bg-neutral-700"
                  />
                </label>
              </div>
              <div>
                <label className="block mb-1 text-sm font-semibold">
                  VIN
                  <input
                    type="text"
                    name="vin"
                    value={formData.vin}
                    onChange={handleFormChange}
                    className="w-full p-2 border rounded-md border-neutral-600 bg-neutral-700"
                  />
                </label>
              </div>
              <div>
                <label className="block mb-1 text-sm font-semibold">
                  Mileage
                  <input
                    type="number"
                    name="mileage"
                    value={formData.mileage}
                    onChange={handleFormChange}
                    className="w-full p-2 border rounded-md border-neutral-600 bg-neutral-700"
                  />
                </label>
              </div>
              <div>
                <label className="block mb-1 text-sm font-semibold">
                  Color
                  <input
                    type="text"
                    name="color"
                    value={formData.color}
                    onChange={handleFormChange}
                    className="w-full p-2 border rounded-md border-neutral-600 bg-neutral-700"
                  />
                </label>
              </div>
            </div>
            {/* Technical Fields */}
            <div className="space-y-4">
              <div>
                <label className="block mb-1 text-sm font-semibold">
                  Engine
                  <input
                    type="text"
                    name="engine"
                    value={formData.engine}
                    onChange={handleFormChange}
                    className="w-full p-2 border rounded-md border-neutral-600 bg-neutral-700"
                  />
                </label>
              </div>
              <div>
                <label className="block mb-1 text-sm font-semibold">
                  Transmission
                  <input
                    type="text"
                    name="transmission"
                    value={formData.transmission}
                    onChange={handleFormChange}
                    className="w-full p-2 border rounded-md border-neutral-600 bg-neutral-700"
                  />
                </label>
              </div>
              <div>
                <label className="block mb-1 text-sm font-semibold">
                  Horsepower
                  <input
                    type="text"
                    name="horsepower"
                    value={formData.horsepower}
                    onChange={handleFormChange}
                    className="w-full p-2 border rounded-md border-neutral-600 bg-neutral-700"
                  />
                </label>
              </div>
              <div>
                <label className="block mb-1 text-sm font-semibold">
                  Fuel Type
                  <input
                    type="text"
                    name="fuelType"
                    value={formData.fuelType}
                    onChange={handleFormChange}
                    className="w-full p-2 border rounded-md border-neutral-600 bg-neutral-700"
                  />
                </label>
              </div>
              <div>
                <label className="block mb-1 text-sm font-semibold">
                  Vehicle Type
                  <input
                    type="text"
                    name="vehicleType"
                    value={formData.vehicleType}
                    onChange={handleFormChange}
                    className="w-full p-2 border rounded-md border-neutral-600 bg-neutral-700"
                  />
                </label>
              </div>
              <div>
                <label className="block mb-1 text-sm font-semibold">
                  Purchase Price
                  <input
                    type="number"
                    name="boughtAt"
                    value={formData.boughtAt}
                    onChange={handleFormChange}
                    className="w-full p-2 border rounded-md border-neutral-600 bg-neutral-700"
                  />
                </label>
              </div>
              <div>
                <label className="block mb-1 text-sm font-semibold">
                  Purchase Year
                  <input
                    type="number"
                    name="purchaseYear"
                    value={formData.purchaseYear}
                    onChange={handleFormChange}
                    className="w-full p-2 border rounded-md border-neutral-600 bg-neutral-700"
                  />
                </label>
              </div>
            </div>
            {/* Maintenance Fields */}
            <div className="space-y-4">
              <div>
                {/* Fixed the label syntax */}
                <label>
                  Repair Cost
                  <input
                    type="number"
                    name="repairCost"
                    value={formData.repairCost}
                    onChange={handleFormChange}
                    className="w-full p-2 border rounded-md border-neutral-600 bg-neutral-700"
                  />
                </label>
              </div>
              <div>
                <label className="block mb-1 text-sm font-semibold">
                  Scheduled Maintenance
                  <input
                    type="number"
                    name="scheduledMaintenance"
                    value={formData.scheduledMaintenance}
                    onChange={handleFormChange}
                    className="w-full p-2 border rounded-md border-neutral-600 bg-neutral-700"
                  />
                </label>
              </div>
              <div>
                <label className="block mb-1 text-sm font-semibold">
                  Cosmetic Mods
                  <input
                    type="number"
                    name="cosmeticMods"
                    value={formData.cosmeticMods}
                    onChange={handleFormChange}
                    className="w-full p-2 border rounded-md border-neutral-600 bg-neutral-700"
                  />
                </label>
              </div>
              <div>
                <label className="block mb-1 text-sm font-semibold">
                  Performance Mods
                  <input
                    type="number"
                    name="performanceMods"
                    value={formData.performanceMods}
                    onChange={handleFormChange}
                    className="w-full p-2 border rounded-md border-neutral-600 bg-neutral-700"
                  />
                </label>
              </div>
              <div>
                <label className="block mb-1 text-sm font-semibold">
                  Paperwork & Taxes
                  <input
                    type="number"
                    name="paperworkTaxes"
                    value={formData.paperworkTaxes}
                    onChange={handleFormChange}
                    className="w-full p-2 border rounded-md border-neutral-600 bg-neutral-700"
                  />
                </label>
              </div>
            </div>
            {/* Full-width Description Field */}
            <div className="md:col-span-3">
              <label className="block mb-1 text-sm font-semibold">
                Description
                <textarea
                  name="description"
                  value={formData.description || ""}
                  onChange={handleFormChange}
                  className="w-full p-2 border rounded-md resize-y border-neutral-600 bg-neutral-700"
                  rows="4"
                  placeholder="Edit vehicle description..."
                ></textarea>
              </label>
            </div>
            <div className="flex justify-center mt-6 space-x-6 md:col-span-3">
              <button
                type="submit"
                className="px-6 py-3 font-medium bg-green-600 rounded hover:bg-green-700"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setEditMode(false)}
                className="px-6 py-3 font-medium rounded bg-neutral-600 hover:bg-neutral-500"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // add helper to request fullscreen
  function requestFullScreen(el) {
    if (el.requestFullscreen) el.requestFullscreen();
  }

  const removeDocument = async (docType) => {
    const docObj = allDocs.find((d) => d.name.toLowerCase().includes(docType));
    if (!docObj) return toast.error("No document found");
    const path = `listing/${id}/docs/${docObj.name}`;
    try {
      await deleteObject(ref(storage, path)); // Assurez-vous que l'utilisateur a les permissions nécessaires
      toast.success("Document removed");
      setAllDocs((prev) => prev.filter((d) => d.name !== docObj.name));
    } catch (e) {
      console.error(e);
      toast.error("Error removing document");
    }
  };

  // New helper function to upload or modify admin documents
  const handleUploadAdminDocument = async (type, file) => {
    // Prompt the user for the deadline date
    const deadline = prompt(
      `Please enter the deadline (end of validity) for the ${type} document in the format MM-DD-YYYY:`
    );

    // Validate the entered date
    if (!deadline || !/^\d{2}-\d{2}-\d{4}$/.test(deadline)) {
      toast.error("Invalid date format. Please use MM-DD-YYYY.");
      return;
    }

    const ext = file.name.substring(file.name.lastIndexOf("."));
    const name = `${type}-${deadline}${ext}`; // Append the deadline to the document name
    const path = `listing/${id}/docs/${name}`;
    const storageRef = ref(storage, path);

    try {
      await uploadBytesResumable(storageRef, file);
      const url = await getDownloadURL(storageRef);
      toast.success(`${type} document uploaded with deadline ${deadline}`);
      setAllDocs((prevDocs) => [
        ...prevDocs.filter((d) => !d.name.toLowerCase().includes(type)),
        { name, url },
      ]);
    } catch (e) {
      console.error(e);
      toast.error(`Error uploading ${type} document`);
    }
  };

  // add helper to download receipt URLs
  function handleDownloadReceipt(urls) {
    urls.forEach((url) => {
      const original = decodeURIComponent(url.split("/").pop().split("?")[0]);
      const isImage = /\.(jpe?g|png|gif|webp)$/i.test(original);
      const name = isImage
        ? original
        : original.replace(/\.[^/.]+$/, "") + ".pdf";
      const link = document.createElement("a");
      link.href = url;
      link.download = name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  }

  // Finance values from AI dataset
  const rawAiData =
    chartData.datasets.find((ds) => ds.label === "AI Estimated")?.data || [];
  const aiSeries =
    rawAiData.map((pt) => (pt && pt.y !== undefined ? pt.y : Number(pt))) || [];
  const aiCurrentValue = aiSeries[aiSeries.length - 1] || 0;
  const aiVariationPct =
    aiSeries.length > 1
      ? ((aiCurrentValue / aiSeries[0] - 1) * 100).toFixed(2)
      : null;

  return (
    <>
      <ToastContainer />
      <div className="container px-4 py-10 mx-auto text-white md:pt-28 bg-zinc-900">
        {/* Header */}
        <header className="flex items-center justify-center gap-2 pt-8 mb-8 text-center">
          <h1 className="text-4xl font-bold">
            {vehicle.year} {vehicle.make} {vehicle.model}
          </h1>
          <button
            onClick={handleShare}
            className="flex items-center justify-center w-10 h-10 ml-3 transition rounded-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            title="Share this vehicle"
            type="button"
          >
            <Share2 className="w-6 h-6 text-white" />
          </button>
        </header>
        {/* Gallery + Vehicle Info Section */}
        <div className="grid gap-8 md:grid-cols-2">
          {/* Photo gallery: display only 4 images */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-2">
            {images.slice(0, 4).map((url, i) => (
              <div
                key={i}
                className="relative pb-[100%] cursor-pointer rounded-lg shadow-lg transition transform hover:scale-105"
                onClick={() => setEnlargedIdx(i)}
              >
                <Image
                  src={url}
                  alt={`Vehicle ${i}`}
                  fill
                  className="object-cover rounded-lg"
                />
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between mb-2 md:hidden">
            <h2 className="text-2xl font-bold">Vehicle Info</h2>
            <button
              onClick={() => setShowInfo((v) => !v)}
              className="p-2 ml-3 transition group" // No rounded, no bg, just padding for click area
              title={showInfo ? "Hide Info" : "Show Info"}
              type="button"
            >
              {showInfo ? (
                <ChevronUp className="w-6 h-6 text-purple-400 transition-colors group-hover:text-pink-500" />
              ) : (
                <ChevronDown className="w-6 h-6 text-purple-400 transition-colors group-hover:text-pink-500" />
              )}
            </button>
          </div>

          {/* Vehicle Info & Actions Card */}
          <div
            className={`p-6 border rounded-lg shadow-lg bg-neutral-800 border-neutral-700 ${
              showInfo ? "" : "hidden"
            } md:block`}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Vehicle Info</h2>
              {user.uid === vehicle.uid && (
                <button
                  onClick={() => setEditMode(true)}
                  className="p-1 transition group"
                  title="Edit Vehicle"
                  type="button"
                >
                  <Edit className="w-6 h-6 text-purple-400 transition-colors group-hover:text-pink-500" />
                </button>
              )}
            </div>
            {/* Updated Vehicle Info container: force 2 columns on all screens */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                { label: "Year", value: vehicle.year },
                { label: "Make", value: vehicle.make },
                { label: "Model", value: vehicle.model },
                { label: "City", value: vehicle.city },
                { label: "State", value: vehicle.state },
                { label: "VIN", value: vehicle.vin },
                { label: "Mileage", value: vehicle.mileage },
                { label: "Color", value: vehicle.color },
                { label: "Engine", value: vehicle.engine },
                { label: "Transmission", value: vehicle.transmission },
                {
                  label: "Horsepower",
                  value: vehicle.horsepower
                    ? `${vehicle.horsepower} HP`
                    : "N/A",
                },
                { label: "Fuel Type", value: vehicle.fuelType },
                { label: "Vehicle Type", value: vehicle.vehicleType || "N/A" },
                {
                  label: "Purchase Price",
                  value: vehicle.boughtAt ? `$${vehicle.boughtAt}` : "N/A",
                },
                {
                  label: "Purchase Year",
                  value: vehicle.purchaseYear || "N/A",
                },
                { label: "Owner", value: ownerName },
              ].map((item, idx) => (
                <div key={idx} className="flex flex-col text-left">
                  <div className="flex items-center">
                    {icons[item.label]}
                    <span className="mr-2 text-neutral-400">{item.label}:</span>
                  </div>
                  <span className="font-medium">
                    {item.label === "Color" ? (
                      <>
                        <span
                          className="inline-block w-3 h-3 mr-1 rounded-full"
                          style={{
                            backgroundColor:
                              vehicle.color?.toLowerCase() || "#ccc", // Ajout d'une valeur par défaut
                          }}
                        />
                        {item.value}
                      </>
                    ) : (
                      item.value || "N/A"
                    )}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-6">
              <h3 className="flex items-center mb-1 text-lg font-medium">
                <Info className="w-4 h-4 mr-2" /> Vehicle Condition
              </h3>
              <span className="inline-block px-3 py-1 text-xs font-semibold text-green-800 bg-green-200 rounded-xl">
                Excellent
              </span>
            </div>
          </div>
        </div>
        {/* Enlarged image modal showing full gallery */}
        {enlargedIdx !== null && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75"
            onClick={() => setEnlargedIdx(null)} // Ferme le modal au clic en dehors
          >
            <button
              className="absolute text-2xl text-white top-4 right-4 hover:text-gray-300"
              onClick={() => setEnlargedIdx(null)} // Bouton pour fermer le modal
            >
              &times;
            </button>
            <div className="relative w-full max-w-2xl max-h-[80vh] flex items-center">
              {/* Flèche gauche */}
              <button
                className="absolute left-[-50px] z-10 p-3 text-white bg-gray-800 rounded-full shadow-lg hover:bg-gray-700"
                onClick={(e) => {
                  e.stopPropagation();
                  setEnlargedIdx((prev) =>
                    prev > 0 ? prev - 1 : images.length - 1
                  );
                }}
              >
                &#8249;
              </button>
              {/* Image agrandie */}
              <Image
                src={images[enlargedIdx]} // Utilise l'index pour afficher l'image correcte
                alt={`Vehicle ${enlargedIdx}`}
                className="object-contain max-w-full max-h-full"
                width={1000}
                height={700}
                priority
              />
              {/* Flèche droite */}
              <button
                className="absolute right-[-50px] z-10 p-3 text-white bg-gray-800 rounded-full shadow-lg hover:bg-gray-700"
                onClick={(e) => {
                  e.stopPropagation();
                  setEnlargedIdx((prev) =>
                    prev < images.length - 1 ? prev + 1 : 0
                  );
                }}
              >
                &#8250;
              </button>
            </div>
          </div>
        )}
        {/* NEW: Description Card */}
        <div className="max-w-4xl p-6 mx-auto mt-8 border rounded-lg shadow-lg bg-neutral-800 border-neutral-700">
          <h2 className="mb-4 text-2xl font-bold">Description</h2>
          <p className="text-lg">
            {vehicle.description || "No description provided"}
          </p>
        </div>
        {/* Redesigned layout for everything after Vehicle Info: */}
        {/* Redesigned layout for everything after Vehicle Info */}
        <section className="w-full max-w-6xl grid-cols-1 gap-8 mx-auto mt-12 lg:grid-cols-2">
          <div className="grid max-w-6xl grid-cols-1 gap-8 mx-auto lg:grid-cols-2">
            {/* Left Column: Maintenance & Receipts */}
            <div className="p-6 border rounded-lg shadow-lg bg-neutral-800 border-neutral-700">
              <div className="flex items-center justify-between pb-2 mb-4 border-b">
                <h2 className="text-2xl font-bold text-white">
                  Maintenance & Receipts
                </h2>
                {!vehicle.ownerManual ? (
                  <button
                    onClick={() => setShowManual(true)}
                    className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded hover:bg-purple-700"
                  >
                    Sync Owner Manual
                  </button>
                ) : (
                  <span className="text-xs italic text-neutral-600">
                    Owner Manual Synced
                  </span>
                )}
              </div>

              <div className="flex space-x-4 justify-items-center">
                {/* Dropdown for selecting a value */}
                <div className="flex flex-col gap-4 mx-auto justify-items-center">
                  <select
                    className="p-2 text-white border rounded bg-neutral-700 border-neutral-600 min-w-[160px]"
                    value={selectedItem || ""}
                    onChange={(e) => setSelectedItem(e.target.value)}
                  >
                    <option value="" disabled>
                      Select a value
                    </option>
                    {[
                      {
                        label: "Total Spent",
                        value: `$${calculateSum("Total Spent").toFixed(2)}`,
                      },
                      {
                        label: "Without Purchase Price",
                        value: `$${calculateSum(
                          "Without Purchase Price"
                        ).toFixed(2)}`,
                      },
                      {
                        label: "Repair",
                        value: `$${calculateSum("Repair").toFixed(2)}`,
                      },
                      {
                        label: "Scheduled Maintenance",
                        value: `$${calculateSum(
                          "Scheduled Maintenance"
                        ).toFixed(2)}`,
                      },
                      {
                        label: "Cosmetic Mods",
                        value: `$${calculateSum("Cosmetic Mods").toFixed(2)}`,
                      },
                      {
                        label: "Performance Mods",
                        value: `$${calculateSum("Performance Mods").toFixed(
                          2
                        )}`,
                      },
                      {
                        label: "Paperwork & Taxes",
                        value: `$${calculateSum("Paperwork & Taxes").toFixed(
                          2
                        )}`,
                      },
                    ].map((item, idx) => (
                      <option key={idx} value={item.label}>
                        {item.label}
                      </option>
                    ))}
                  </select>

                  {/* Value card */}
                  <div className="flex flex-col justify-center items-start min-w-[160px] px-6 py-4 rounded-lg bg-neutral-900 border border-neutral-700 shadow-lg">
                    {selectedItem ? (
                      <>
                        <span className="text-lg font-semibold text-white">
                          {selectedItem}
                        </span>
                        <span className="mt-1 text-2xl font-bold text-green-400">
                          {
                            [
                              {
                                label: "Total Spent",
                                value: `$${calculateSum("Total Spent").toFixed(
                                  2
                                )}`,
                              },
                              {
                                label: "Without Purchase Price",
                                value: `$${calculateSum(
                                  "Without Purchase Price"
                                ).toFixed(2)}`,
                              },
                              {
                                label: "Repair",
                                value: `$${calculateSum("Repair").toFixed(2)}`,
                              },
                              {
                                label: "Scheduled Maintenance",
                                value: `$${calculateSum(
                                  "Scheduled Maintenance"
                                ).toFixed(2)}`,
                              },
                              {
                                label: "Cosmetic Mods",
                                value: `$${calculateSum(
                                  "Cosmetic Mods"
                                ).toFixed(2)}`,
                              },
                              {
                                label: "Performance Mods",
                                value: `$${calculateSum(
                                  "Performance Mods"
                                ).toFixed(2)}`,
                              },
                              {
                                label: "Paperwork & Taxes",
                                value: `$${calculateSum(
                                  "Paperwork & Taxes"
                                ).toFixed(2)}`,
                              },
                            ].find((item) => item.label === selectedItem)?.value
                          }
                        </span>
                      </>
                    ) : (
                      <span className="text-sm text-neutral-400">
                        Select a value to see its amount
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-4 text-xs font-semibold text-white">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xl font-semibold text-white">
                    AI Recommendation
                  </h3>
                  <button
                    onClick={async () => {
                      try {
                        // Call the analyzeManual API directly
                        const res = await fetch("/api/analyzeManual", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            vehicleId: id,
                            currentMileage: vehicle.mileage,
                          }),
                        });

                        if (!res.ok) {
                          throw new Error(
                            `API error: ${res.status} ${res.statusText}`
                          );
                        }

                        // Fetch the updated aiRecommendation field from Firestore
                        const snap = await getDoc(doc(db, "listing", id));
                        if (!snap.exists()) {
                          throw new Error("Vehicle not found");
                        }

                        const vehicleData = snap.data();
                        setAiRec(
                          vehicleData.aiRecommendation ||
                            "No AI recommendation available."
                        );
                        toast.success(
                          "AI Recommendation refreshed successfully!"
                        );
                      } catch (error) {
                        console.error(
                          "Error refreshing AI recommendation:",
                          error.message
                        );
                        toast.error("Failed to refresh AI recommendation.");
                      }
                    }}
                    className="p-2 text-purple-500 transition rounded-full hover:text-pink-500"
                    title="Refresh AI Recommendation"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="1.5"
                      stroke="currentColor"
                      className="w-6 h-6"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
                      />
                    </svg>
                  </button>
                </div>
                <pre className="p-3 whitespace-pre-wrap rounded bg-neutral-700 txt-xs">
                  {aiRec}
                </pre>
              </div>
              <div className="mt-4">
                <h3 className="mb-2 text-xl font-semibold text-white">
                  Ask AI
                </h3>
                <input
                  type="text"
                  placeholder="Ask a question about your vehicle..."
                  className="w-full p-3 mb-4 text-white border rounded border-neutral-600 bg-neutral-700"
                  value={aiQuestion}
                  onChange={(e) => setAiQuestion(e.target.value)}
                />
                <button
                  onClick={askAi}
                  disabled={loadingAiQuestion}
                  className="w-full mb-4 button-main"
                >
                  {loadingAiQuestion ? "Loading..." : "Ask AI"}
                </button>
                {aiAnswer && (
                  <div className="p-4 text-white rounded bg-neutral-700">
                    <h3 className="mb-2 text-lg font-semibold">AI Response:</h3>
                    <p>{aiAnswer}</p>
                  </div>
                )}
              </div>
              {/* Receipts Section */}
              <div className="mt-4">
                <h3 className="mb-2 text-xl font-semibold text-white">
                  Receipts
                </h3>
                <div className="max-h-[30vh] overflow-y-auto">
                  {receipts.length ? (
                    <div className="space-y-2">
                      {receipts.map((r) => (
                        <div
                          key={r.id}
                          className="flex items-center justify-between gap-4"
                        >
                          {/* Title left, price center, icons right */}
                          <div className="flex-1 min-w-0">
                            <button
                              onClick={() => {
                                if (r.urls && r.urls.length > 0) {
                                  setSelectedReceiptUrls(r.urls);
                                }
                              }}
                              className="block w-full text-left text-purple-500 truncate hover:underline hover:text-pink-500"
                              title={r.title}
                            >
                              {r.date
                                ? formatDateMMDDYYYY(
                                    r.date.seconds ? r.date.seconds * 1000 : r.date
                                  )
                                : ""}
                              <br />
                              <span className="font-medium">{r.title}</span>
                            </button>
                          </div>
                          <div className="flex items-center flex-shrink-0 min-w-[100px] justify-center">
                            <span className="font-semibold text-neutral-400">
                              ${r.price.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex items-center flex-shrink-0 min-w-[70px] justify-end">
                            {vehicle.uid === user.uid ? (
                              <>
                                <button
                                  onClick={() => {
                                    setEditingReceipt(r);
                                    setShowReceiptForm(true);
                                  }}
                                  className="p-1 text-purple-400 transition rounded hover:text-pink-500"
                                  title="Edit Receipt"
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth="1.5"
                                    stroke="currentColor"
                                    className="w-5 h-5"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
                                    />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => setReceiptToDelete(r)}
                                  className="p-1 transition rounded text-purple500 hover:text-pink-500"
                                  title="Delete Receipt"
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth="1.5"
                                    stroke="currentColor"
                                    className="w-6 h-6"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M6 18 18 6M6 6l12 12"
                                    />
                                  </svg>
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleDownloadReceipt(r.urls)}
                                className="p-1 ml-auto"
                                disabled={!(r.urls && r.urls.length > 0)}
                                title="Download receipt"
                              >
                                <Download className="w-6 h-6 text-blue-400 hover:text-blue-500" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p>No receipts</p>
                  )}
                </div>
                {vehicle.uid === user.uid && (
                  <div className="flex space-x-4">
                    <button
                      onClick={() => {
                        setEditingReceipt(null);
                        setShowReceiptForm(true);
                      }}
                      className="mt-3 button-main"
                    >
                      + Add Receipt
                    </button>
                  </div>
                )}
              </div>
            </div>
            {/* Right Column: Admin Documents & Depreciation */}
            <div className="space-y-8">
              {/* Documents */}
              <div className="p-6 border rounded-lg shadow-lg bg-neutral-800 border-neutral-700">
                <h2 className="pb-2 mb-4 text-2xl font-bold text-white border-b">
                  Paperwork
                </h2>
                {/* Grid for Title, Registration and Inspection */}
                <div className="flex gap-2 p-2 overflow-x-auto no-scrollbar">
                  {["title", "registration", "inspection"].map((type) => {
                    const docObj = allDocs.find((d) =>
                      d.name.toLowerCase().includes(type)
                    );
                    const labels = {
                      title: "Title",
                      registration: "Registration",
                      inspection: "Inspection",
                    };
                    const iconSrcs = {
                      title: "/title_icon.png",
                      registration: "/registration_icon.png",
                      inspection: "/inspection_icon.png",
                    };
                    const deadlineMatch =
                      docObj?.name.match(/\d{2}-\d{2}-\d{4}/);
                    const deadline = deadlineMatch
                      ? new Date(deadlineMatch[0])
                      : null;
                    const isExpired = deadline && deadline < new Date();
                    const bgColor = !docObj
                      ? "bg-gray-500"
                      : isExpired
                      ? "bg-pink-900"
                      : "bg-purple-900";

                    // --- Ajouter ici ---
                    let iconFilter = "";
                    if (bgColor.includes("purple")) {
                      iconFilter =
                        "invert(1) hue-rotate(270deg) brightness(1.2)";
                    } else if (bgColor.includes("pink")) {
                      iconFilter =
                        "invert(1) sepia(1) hue-rotate(290deg) saturate(4) brightness(1.1)";
                    } else {
                      iconFilter = "invert(0.7) brightness(1.2)";
                    }

                    return (
                      <div
                        key={type}
                        className={`flex-shrink-0 flex flex-col items-center p-4 rounded-lg ${bgColor}`}
                        style={{ minWidth: 140, maxWidth: 180 }}
                      >
                        {vehicle.uid === user.uid ? (
                          <>
                            <div className="flex items-center justify-center w-10 h-16 mb-2">
                              <img
                                src={iconSrcs[type]}
                                alt={labels[type]}
                                className="object-contain w-8 h-8"
                                style={{ filter: iconFilter }}
                              />
                            </div>
                            <span className="text-sm font-medium text-white">
                              {labels[type]}
                            </span>

                            {docObj ? (
                              <>
                                <div className="flex flex-col items-center mt-1 space-y-1">
                                  <button
                                    onClick={() =>
                                      setSelectedAdminDocUrl(docObj.url)
                                    }
                                    className="cursor-pointer"
                                    title="View document"
                                  >
                                    <Eye className="w-8 h-8 text-purple-300 hover:text-purple-400" />
                                  </button>
                                  <div className="flex space-x-2">
                                    {/* Edit button on the left */}
                                    <button
                                      onClick={() =>
                                        document
                                          .getElementById(
                                            `modify-file-input-${type}`
                                          )
                                          .click()
                                      }
                                      className="text-purple-200 hover:text-pink-200"
                                      title="Modify document"
                                    >
                                      <Edit className="w-4 h-4" />
                                    </button>
                                    {/* Cross (delete) button on the right */}
                                    <button
                                      onClick={() => removeDocument(type)}
                                      className="text-purple-200 hover:text-pink-200"
                                      title="Delete document"
                                    >
                                      <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        strokeWidth="1.5"
                                        stroke="currentColor"
                                        className="w-5 h-5"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          d="M6 18 18 6M6 6l12 12"
                                        />
                                      </svg>
                                    </button>
                                  </div>
                                </div>
                                <input
                                  id={`modify-file-input-${type}`}
                                  type="file"
                                  className="hidden"
                                  onChange={(e) =>
                                    e.target.files[0] &&
                                    handleUploadAdminDocument(
                                      type,
                                      e.target.files[0]
                                    )
                                  }
                                />
                              </>
                            ) : (
                              <>
                                <label
                                  htmlFor={`file-input-${type}`}
                                  className="mt-1 cursor-pointer"
                                  title="Add document"
                                >
                                  <PlusCircle className="w-8 h-8 text-gray-200 hover:text-gray-100" />
                                </label>
                                <input
                                  id={`file-input-${type}`}
                                  type="file"
                                  className="hidden"
                                  onChange={(e) =>
                                    e.target.files[0] &&
                                    handleUploadAdminDocument(
                                      type,
                                      e.target.files[0]
                                    )
                                  }
                                />
                              </>
                            )}
                          </>
                        ) : (
                          <>
                            <div
                              className={`w-16 h-16 flex items-center justify-center mb-2`}
                            >
                              <img
                                src={iconSrcs[type]}
                                alt={labels[type]}
                                className="object-contain w-8 h-8"
                                style={{ filter: iconFilter }}
                              />
                            </div>
                            <h3 className="text-sm font-medium text-white">
                              {labels[type]}
                            </h3>
                            <span className="mt-1 text-xs text-gray-300">
                              {docObj
                                ? isExpired
                                  ? "Expired"
                                  : "Valid"
                                : "Not Added"}
                            </span>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* notice for non-owners */}
                {vehicle.uid !== user.uid && (
                  <p className="mt-4 text-sm text-center text-gray-400">
                    Only the vehicle owner can view and manage these documents.
                  </p>
                )}
              </div>
              {/* Finance section */}
              <section className="p-6 rounded-lg shadow-lg bg-neutral-800">
                {/* En-tête KPI */}
                <div className="flex flex-col items-start justify-between md:flex-row">
                  <div>
                    <h3 className="text-xl font-semibold text-white">
                      ESTIMATED AI VALUE
                    </h3>
                    <p className="text-3xl font-bold text-green-400">
                      ${aiCurrentValue.toLocaleString()}
                    </p>
                  </div>
                  <div className="mt-2 md:mt-0">
                    <h4 className="text-sm text-neutral-400">AI VARIATION</h4>
                    {aiVariationPct !== null && (
                      <p
                        className={`text-xl font-semibold ${
                          aiVariationPct >= 0
                            ? "text-green-400"
                            : "text-red-400"
                        }`}
                      >
                        {Math.abs(aiVariationPct)}%
                      </p>
                    )}
                  </div>
                </div>
                {/* Graphique + sélecteur */}
                <div className="mb-6">
                  <div className="flex items-center justify-end mb-2">
                    <select
                      className="p-2 text-white rounded bg-neutral-900"
                      value={timeWindow}
                      onChange={(e) => setTimeWindow(e.target.value)}
                    >
                      <option value="Last Week">1 week</option>
                      <option value="Last Month">1 month</option>
                      <option value="Last Year">1 year</option>
                    </select>
                  </div>
                  <div className="w-auto rounded-lg h-80">
                    <Chart
                      options={defaultOptions}
                      series={buildSeries(chartData)}
                      type="line"
                      height="100%"
                    />
                  </div>
                </div>
                {/* End Finance Section */}

                {/* Actions */}
                <div className="flex flex-col items-center justify-between space-y-3 md:flex-row md:space-y-0 md:space-x-4">
                  {user.uid === vehicle.uid &&
                    (isListed ? (
                      <button
                        onClick={removeFromMarketplace}
                        className="w-full px-6 py-2 text-red-400 bg-transparent border border-red-400 rounded md:w-auto hover:bg-red-500/10"
                      >
                        Remove from Marketplace
                      </button>
                    ) : (
                      <button
                        onClick={() => setShowMarketplaceModal(true)}
                        className="w-full px-6 py-2 text-white rounded md:w-auto bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                      >
                        Add to Marketplace
                      </button>
                    ))}
                  <button
                    onClick={handleShare}
                    className="flex items-center justify-center w-full px-6 py-2 rounded md:w-auto bg-neutral-700 hover:bg-neutral-600"
                  >
                    <Share2 className="w-5 h-5 mr-2 text-white" /> Share
                  </button>
                </div>
              </section>

              {/* Receipt Form Modal */}
              {showReceiptForm && (
                <ReceiptForm
                  vehicleId={id}
                  initialData={editingReceipt}
                  onClose={() => setShowReceiptForm(false)}
                  onSaved={() => window.location.reload()}
                />
              )}
              {/* Marketplace Modal */}
              {showMarketplaceModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
                  <div className="w-full max-w-sm p-6 text-white border rounded shadow-xl bg-neutral-800 border-neutral-700">
                    <h2 className="mb-4 text-xl font-bold text-center">
                      Add to Marketplace
                    </h2>
                    <label className="block mb-2 text-white">
                      Price ($):
                      <input
                        type="number"
                        step="0.01"
                        value={salePrice || ""}
                        onChange={(e) => setSalePrice(e.target.value)}
                        className="w-full p-2 mb-4 text-white border rounded border-neutral-600 bg-neutral-700"
                      />
                    </label>
                    <div className="flex justify-end space-x-4">
                      <button
                        type="button"
                        onClick={() => setShowMarketplaceModal(false)}
                        className="px-4 py-2 rounded bg-neutral-600 hover:bg-neutral-500"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          confirmAdd(salePrice);
                          setShowMarketplaceModal(false);
                        }}
                        className="px-4 py-2 bg-green-600 rounded hover:bg-green-700"
                      >
                        Confirm
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {/* Owner Manual Modal */}
              {showManual && (
                <OwnerManualModal
                  vehicleId={id}
                  onClose={() => setShowManual(false)}
                  onSync={() => window.location.reload()}
                />
              )}
            </div>{" "}
            // close inner grid
          </div>{" "}
        </section>{" "}
        <secton />
      </div>{" "}
    </> // close Fragment
  ); // end of return
} // end of VehicleCardPage
