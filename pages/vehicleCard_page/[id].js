// pages/vehicleCard/[id].jsx
import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/router";
import { auth, db, storage } from "../../lib/firebase";
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
import { Line } from "react-chartjs-2";
import "chart.js/auto";
import { onAuthStateChanged } from "firebase/auth";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
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
  FileText, // added for Registration Document
  Shield, // added for Insurance Certificate
  Clipboard, // added for Inspection Document
  PlusCircle, // added for file upload icon
  Eye, // added for view document icon
} from "lucide-react";

// Icônes et catégories
const sumTypes = [
  "Total Spent",
  "Without Purchase Price",
  "Repair",
  "Scheduled Maintenance",
  "Cosmetic Mods",
  "Performance Mods",
];
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
            className="w-full py-2 mb-2 text-white bg-purple-600 rounded hover:bg-purple-700"
            onClick={handleSync}
          >
            Save
          </button>
        )}
        <button
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

  const handleSubmit = async () => {
    if (!title || !date || !category || !price) {
      return toast.error("All fields are required");
    }
    setUploading(true);
    try {
      const receiptId =
        initialData?.id ||
        doc(collection(db, `listing/${vehicleId}/receipts`)).id;
      const uploadedUrls = [];
      for (let file of files) {
        const name = `${receiptId}-${Date.now()}`;
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
        urls: [...existing, ...uploadedUrls],
      };
      await setDoc(
        doc(db, `listing/${vehicleId}/receipts`, receiptId),
        receipt,
        { merge: true }
      );
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
        <input
          type="file"
          multiple
          className="w-full mb-4 text-white"
          onChange={(e) => setFiles(Array.from(e.target.files))}
        />
        <div className="flex justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-white rounded bg-neutral-600 hover:bg-neutral-500"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={uploading}
            className="px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700"
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
  const [, setMaintenanceRec] = useState(null);
  // Ajout de l'état manquant pour les maintenance records
  const [, setLoadingMaintenanceRec] = useState(false);

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
    })();
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
      const res = await fetch("/api/aiMileageRecommendation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mileage: vehicle.mileage,
          engine: vehicle.engine,
          model: vehicle.model,
          year: vehicle.year,
        }),
      });

      if (!res.ok) {
        throw new Error(`API error: ${res.status} ${res.statusText}`);
      }

      const data = await res.json();
      setMaintenanceRec(
        data.recommendation ?? "Aucune recommandation disponible."
      );
    } catch {
      setMaintenanceRec("Erreur lors de la récupération de la recommandation.");
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
  // Calcul des sommes
  const calcSum = (type) => {
    const receiptsTotal = receipts.reduce(
      (sum, r) => sum + (Number(r.price) || 0),
      0
    );
    const wpp = Number(vehicle.withoutPurchasePrice) || 0;
    const rep = Number(vehicle.repairCost) || 0;
    const sched = Number(vehicle.scheduledMaintenance) || 0;
    const cos = Number(vehicle.cosmeticMods) || 0;
    const perf = Number(vehicle.performanceMods) || 0;
    switch (type) {
      case "Total Spent":
        return receiptsTotal + wpp + rep + sched + cos + perf;
      case "Without Purchase Price":
        return wpp;
      case "Repair":
        return rep;
      case "Scheduled Maintenance":
        return sched;
      case "Cosmetic Mods":
        return cos;
      case "Performance Mods":
        return perf;
      default:
        return receipts
          .filter((r) => r.category === type)
          .reduce((sum, r) => sum + (Number(r.price) || 0), 0);
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
    const start = new Date(now);
    if (timeWindow === "Last Week") start.setDate(now.getDate() - 7);
    else if (timeWindow === "Last Month") start.setMonth(now.getMonth() - 1);
    else start.setFullYear(now.getFullYear() - 1);
    const dates = [];
    for (let d = new Date(start); d <= now; d.setDate(d.getDate() + 1)) {
      dates.push(new Date(d));
    }
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
    return {
      labels: dates.map((d) => d.toLocaleDateString()),
      datasets: [
        { label: "Straight", data: straight, fill: false, borderWidth: 2 },
        {
          label: "Exponential",
          data: exponential,
          fill: false,
          borderWidth: 2,
        },
      ],
    };
  }, [vehicle, timeWindow]);

  // Chart avec points AI
  const chartData = useMemo(() => {
    const aiArray = Array.isArray(vehicle?.ai_estimated_value)
      ? vehicle.ai_estimated_value
      : []; // Ajoutez une valeur par défaut
    const aiPts = aiArray.map((e) => {
      const [val, date] = e.split("-");
      return { x: new Date(date), y: +val };
    });
    return {
      ...baseChart,
      datasets: [
        ...baseChart.datasets,
        { label: "AI Estimated", data: aiPts, parsing: false, pointRadius: 4 },
      ],
    };
  }, [baseChart, vehicle]);

  if (!user) return null;
  if (!vehicle) return <p>Loading…</p>;

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
                  required
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
                  required
                  className="w-full p-2 border rounded-md border-neutral-600 bg-neutral-700"
                />
              </div>
              <div>
                <label className="block mb-1 text-sm font-semibold">
                  Model
                </label>
                <input
                  type="text"
                  name="model"
                  value={formData.model}
                  onChange={handleFormChange}
                  required
                  className="w-full p-2 border rounded-md border-neutral-600 bg-neutral-700"
                />
              </div>
              <div>
                <label className="block mb-1 text-sm font-semibold">City</label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleFormChange}
                  required
                  className="w-full p-2 border rounded-md border-neutral-600 bg-neutral-700"
                />
              </div>
              <div>
                <label className="block mb-1 text-sm font-semibold">
                  State
                </label>
                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleFormChange}
                  required
                  className="w-full p-2 border rounded-md border-neutral-600 bg-neutral-700"
                />
              </div>
              <div>
                <label className="block mb-1 text-sm font-semibold">VIN</label>
                <input
                  type="text"
                  name="vin"
                  value={formData.vin}
                  onChange={handleFormChange}
                  className="w-full p-2 border rounded-md border-neutral-600 bg-neutral-700"
                />
              </div>
              <div>
                <label className="block mb-1 text-sm font-semibold">
                  Mileage
                </label>
                <input
                  type="number"
                  name="mileage"
                  value={formData.mileage}
                  onChange={handleFormChange}
                  required
                  className="w-full p-2 border rounded-md border-neutral-600 bg-neutral-700"
                />
              </div>
              <div>
                <label className="block mb-1 text-sm font-semibold">
                  Color
                </label>
                <input
                  type="text"
                  name="color"
                  value={formData.color}
                  onChange={handleFormChange}
                  className="w-full p-2 border rounded-md border-neutral-600 bg-neutral-700"
                />
              </div>
            </div>
            {/* Technical Fields */}
            <div className="space-y-4">
              <div>
                <label className="block mb-1 text-sm font-semibold">
                  Engine
                </label>
                <input
                  type="text"
                  name="engine"
                  value={formData.engine}
                  onChange={handleFormChange}
                  required
                  className="w-full p-2 border rounded-md border-neutral-600 bg-neutral-700"
                />
              </div>
              <div>
                <label className="block mb-1 text-sm font-semibold">
                  Transmission
                </label>
                <input
                  type="text"
                  name="transmission"
                  value={formData.transmission}
                  onChange={handleFormChange}
                  required
                  className="w-full p-2 border rounded-md border-neutral-600 bg-neutral-700"
                />
              </div>
              <div>
                <label className="block mb-1 text-sm font-semibold">
                  Horsepower
                </label>
                <input
                  type="text"
                  name="horsepower"
                  value={formData.horsepower}
                  onChange={handleFormChange}
                  className="w-full p-2 border rounded-md border-neutral-600 bg-neutral-700"
                />
              </div>
              <div>
                <label className="block mb-1 text-sm font-semibold">
                  Fuel Type
                </label>
                <input
                  type="text"
                  name="fuelType"
                  value={formData.fuelType}
                  onChange={handleFormChange}
                  required
                  className="w-full p-2 border rounded-md border-neutral-600 bg-neutral-700"
                />
              </div>
              <div>
                <label className="block mb-1 text-sm font-semibold">
                  Vehicle Type
                </label>
                <input
                  type="text"
                  name="vehicleType"
                  value={formData.vehicleType}
                  onChange={handleFormChange}
                  required
                  className="w-full p-2 border rounded-md border-neutral-600 bg-neutral-700"
                />
              </div>
              <div>
                <label className="block mb-1 text-sm font-semibold">
                  Purchase Price
                </label>
                <input
                  type="number"
                  name="boughtAt"
                  value={formData.boughtAt}
                  onChange={handleFormChange}
                  required
                  className="w-full p-2 border rounded-md border-neutral-600 bg-neutral-700"
                />
              </div>
              <div>
                <label className="block mb-1 text-sm font-semibold">
                  Purchase Year
                </label>
                <input
                  type="number"
                  name="purchaseYear"
                  value={formData.purchaseYear}
                  onChange={handleFormChange}
                  required
                  className="w-full p-2 border rounded-md border-neutral-600 bg-neutral-700"
                />
              </div>
            </div>
            {/* Maintenance Fields */}
            <div className="space-y-4">
              <div>
                {/* Fixed the label syntax */}
                <label>Repair Cost</label>
                <input
                  type="number"
                  name="repairCost"
                  value={formData.repairCost}
                  onChange={handleFormChange}
                  required
                  className="w-full p-2 border rounded-md border-neutral-600 bg-neutral-700"
                />
              </div>
              <div>
                <label className="block mb-1 text-sm font-semibold">
                  Scheduled Maintenance
                </label>
                <input
                  type="number"
                  name="scheduledMaintenance"
                  value={formData.scheduledMaintenance}
                  onChange={handleFormChange}
                  required
                  className="w-full p-2 border rounded-md border-neutral-600 bg-neutral-700"
                />
              </div>
              <div>
                <label className="block mb-1 text-sm font-semibold">
                  Cosmetic Mods
                </label>
                <input
                  type="number"
                  name="cosmeticMods"
                  value={formData.cosmeticMods}
                  onChange={handleFormChange}
                  className="w-full p-2 border rounded-md border-neutral-600 bg-neutral-700"
                />
              </div>
              <div>
                <label className="block mb-1 text-sm font-semibold">
                  Performance Mods
                </label>
                <input
                  type="number"
                  name="performanceMods"
                  value={formData.performanceMods}
                  onChange={handleFormChange}
                  className="w-full p-2 border rounded-md border-neutral-600 bg-neutral-700"
                />
              </div>
            </div>
            {/* Full-width Description Field */}
            <div className="md:col-span-3">
              <label className="block mb-1 text-sm font-semibold">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description || ""}
                onChange={handleFormChange}
                required
                className="w-full p-2 border rounded-md resize-y border-neutral-600 bg-neutral-700"
                rows="4"
                placeholder="Edit vehicle description..."
              ></textarea>
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

  return (
    <>
      <ToastContainer />
      <div className="container px-4 py-10 mx-auto text-white md:pt-28 bg-zinc-900">
        {/* Header */}
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-bold">
            {vehicle.make} {vehicle.model} - {vehicle.engine}
          </h1>
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

          {/* Vehicle Info & Actions Card */}
          <div className="hidden p-6 border rounded-lg shadow-lg bg-neutral-800 border-neutral-700 md:block">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Vehicle Info</h2>
              {user.uid === vehicle.uid && (
                <button
                  onClick={() => setEditMode(true)}
                  className="px-4 py-2 text-sm font-medium text-white transition bg-blue-600 rounded hover:bg-blue-700"
                >
                  ✏️ Edit
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
              <span className="inline-block px-3 py-1 text-xs font-semibold text-green-800 bg-green-200 rounded-full">
                Excellent
              </span>
            </div>
            {user.uid === vehicle.uid && (
              <div className="mt-6 text-center">
                {isListed ? (
                  <button
                    onClick={removeFromMarketplace}
                    className="px-6 py-2 text-white transition bg-red-600 rounded hover:bg-red-700"
                  >
                    Remove from Marketplace
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      if (!vehicle.vin || vehicle.vin.trim() === "") {
                        toast.error(
                          "Veuillez renseigner le VIN avant de lister sur le marketplace"
                        );
                        return;
                      }
                      setShowMarketplaceModal(true);
                    }}
                    className="px-6 py-2 text-white transition bg-green-600 rounded hover:bg-green-700"
                  >
                    Add to Marketplace
                  </button>
                )}
              </div>
            )}
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
                className="object-contain w-full h-full"
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
        {/* End of Vehicle Info Card */}
        {/* End of Vehicle Info Card */}
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
              <h2 className="pb-2 mb-4 text-2xl font-bold text-white border-b">
                Maintenance & Receipts
              </h2>
              <ul className="space-y-2">
                {sumTypes.map((type) => (
                  <li
                    key={type}
                    className="flex justify-between p-1 rounded bg-neutral-700"
                  >
                    <span>{type}</span>
                    <span>${calcSum(type).toFixed(2)}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-4 text-xl font-semibold text-white">
                <h3 className="mb-2 text-xl font-semibold text-white">
                  AI Recommendation
                </h3>
                <pre className="p-3 whitespace-pre-wrap rounded bg-neutral-700">
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
                  className="w-full py-2 mb-4 text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
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
              {/* Corrected Receipts Section */}
              <div className="mt-4">
                <h3 className="mb-2 text-xl font-semibold text-white">
                  Receipts
                </h3>
                {receipts.length ? (
                  <div className="space-y-2">
                    {receipts.map((r) => (
                      <div
                        key={r.id}
                        className="flex items-center justify-between"
                      >
                        <span>
                          {r.title} - ${r.price.toFixed(2)}
                        </span>
                        {vehicle.uid === user.uid && (
                          <div className="space-x-2">
                            <button
                              onClick={() => {
                                setEditingReceipt(r);
                                setShowReceiptForm(true);
                              }}
                            >
                              ✏️
                            </button>
                            <button
                              onClick={async () => {
                                await deleteDoc(
                                  doc(db, `listing/${id}/receipts`, r.id)
                                );
                                window.location.reload();
                              }}
                            >
                              ✖️
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>No receipts</p>
                )}
                {vehicle.uid === user.uid && (
                  <div className="flex space-x-4">
                    <button
                      onClick={() => {
                        setEditingReceipt(null);
                        setShowReceiptForm(true);
                      }}
                      className="px-4 py-2 mt-3 bg-blue-600 rounded hover:bg-blue-700"
                    >
                      + Add Receipt
                    </button>
                    <button
                      onClick={() => setShowManual(true)}
                      className="px-4 py-2 mt-3 bg-purple-600 rounded hover:bg-purple-700"
                    >
                      Sync Owner Manual
                    </button>
                  </div>
                )}
              </div>
            </div>
            {/* Right Column: Admin Documents & Depreciation */}
            <div className="space-y-8">
              {/* Admin Documents */}
              <div className="p-6 border rounded-lg shadow-lg bg-neutral-800 border-neutral-700">
                <h2 className="pb-2 mb-4 text-2xl font-bold text-white border-b">
                  Admin Documents
                </h2>
                {/* Nouvelle grille à 3 colonnes pour Title, Registration et Inspection */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  {["title", "registration", "inspection"].map((type) => {
                    const docObj = allDocs.find((d) =>
                      d.name.toLowerCase().includes(type)
                    );
                    const isDue =
                      docObj?.name.match(/\d{2}-\d{2}-\d{4}/) &&
                      new Date(docObj.name.match(/\d{2}-\d{2}-\d{4}/)[0]) <
                        new Date();
                    const labels = {
                      title: "Title",
                      registration: "Registration",
                      inspection: "Inspection",
                    };
                    let bgColor = "bg-gray-500";
                    if (docObj) {
                      bgColor = isDue
                        ? "bg-red-500"
                        : type === "title"
                        ? "bg-blue-500"
                        : type === "registration"
                        ? "bg-green-500"
                        : type === "inspection"
                        ? "bg-purple-500"
                        : "bg-gray-500";
                    }
                    const IconComponent =
                      type === "title"
                        ? FileText
                        : type === "registration"
                        ? Shield
                        : Clipboard;
                    return (
                      <div
                        key={type}
                        className="flex flex-col items-center p-4 bg-gray-700 rounded-lg"
                      >
                        <div
                          className={`w-16 h-16 flex items-center justify-center rounded-full mb-2 ${bgColor}`}
                        >
                          <IconComponent className="w-8 h-8 text-white" />
                        </div>
                        <span className="text-sm font-medium text-white">
                          {labels[type]}
                        </span>
                        {docObj ? (
                          <div className="flex flex-col items-center mt-1">
                            <a
                              href={docObj.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="cursor-pointer"
                            >
                              <Eye className="w-8 h-8 text-blue-300 hover:text-blue-400" />
                            </a>
                            {vehicle.uid === user.uid && (
                              <button
                                onClick={() => removeDocument(type)}
                                className="mt-1 text-xs text-red-500 hover:text-red-600"
                              >
                                Supprimer
                              </button>
                            )}
                          </div>
                        ) : vehicle.uid === user.uid ? (
                          <>
                            <label
                              htmlFor={`file-input-${type}`}
                              className="mt-1 cursor-pointer"
                            >
                              <PlusCircle className="w-8 h-8 text-gray-200 hover:text-gray-100" />
                            </label>
                            <input
                              id={`file-input-${type}`}
                              type="file"
                              className="hidden"
                              onChange={() => {
                                /* upload logic */
                              }}
                            />
                          </>
                        ) : (
                          <span className="mt-1 text-xs text-gray-400">
                            Owner only
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* Depreciation Chart */}
              <div className="p-6 border rounded-lg shadow-lg bg-neutral-800 border-neutral-700">
                <h2 className="pb-2 mb-4 text-2xl font-bold text-white border-b">
                  Depreciation Curve
                </h2>
                <select
                  className="p-2 mb-4 text-white rounded bg-neutral-700"
                  value={timeWindow}
                  onChange={(e) => setTimeWindow(e.target.value)}
                >
                  <option value="Last Week">Last Week</option>
                  <option value="Last Month">Last Month</option>
                  <option value="Last Year">Last Year</option>
                </select>
                <div className="h-64">
                  <Line
                    data={chartData}
                    options={{ maintainAspectRatio: false }}
                  />
                </div>
              </div>
            </div>
          </div>
          {/* Receipt Form Modal */}
          {showReceiptForm && (
            <ReceiptForm
              vehicleId={id}
              initialData={editingReceipt}
              onClose={() => setShowReceiptForm(false)}
              onSaved={() => window.location.reload()}
            />
          )}
        </section>
        {/* Marketplace Modal */}
        {showMarketplaceModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
            <div className="w-full max-w-sm p-6 text-white border rounded shadow-xl bg-neutral-800 border-neutral-700">
              <h2 className="mb-4 text-xl font-bold text-center">
                Add to Marketplace
              </h2>
              <label className="block mb-2 text-white">Price ($):</label>
              <input
                type="number"
                step="0.01"
                value={salePrice || ""}
                onChange={(e) => setSalePrice(e.target.value)}
                className="w-full p-2 mb-4 text-white border rounded border-neutral-600 bg-neutral-700"
              />
              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => setShowMarketplaceModal(false)}
                  className="px-4 py-2 rounded bg-neutral-600 hover:bg-neutral-500"
                >
                  Cancel
                </button>
                <button
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
      </div>
    </>
  );
}
