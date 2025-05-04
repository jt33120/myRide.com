import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import { auth, db, storage } from '../../lib/firebase';
import { doc, getDoc, collection, getDocs, setLogLevel } from 'firebase/firestore';
import { ref, listAll, getDownloadURL } from 'firebase/storage';
import Image from 'next/image';
import { Line } from 'react-chartjs-2';
import 'chart.js/auto';
import { onAuthStateChanged } from 'firebase/auth';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Car, MapPin, Palette, Gauge, Key, Fuel, Users, AlignLeft, Info, Zap, Droplets } from 'lucide-react';

const sumTypes = [
  'Total Spent',
  'Without Purchase Price',
  'Repair',
  'Scheduled Maintenance',
  'Cosmetic Mods',
  'Performance Mods',
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
  
  'Fuel Type': <Droplets className="w-4 h-4 mr-2" />,

  
};

const VehicleCardPage = () => {
    const router = useRouter();
    const { id } = router.query;

  const [user, setUser] = useState(null);
  const [vehicle, setVehicle] = useState(null);
  const [ownerName, setOwnerName] = useState('');
  const [receipts, setReceipts] = useState([]);
  const [images, setImages] = useState([]);

  const [aiRec, setAiRec] = useState('');
  const [aiQ, setAiQ] = useState('');
  const [aiA, setAiA] = useState('');
  const [loadingAi, setLoadingAi] = useState(false);

  const [timeWindow, setTimeWindow] = useState('Last Year');
  const [enlargedIdx, setEnlargedIdx] = useState(null);

  const prevImage = e => { e.stopPropagation(); setEnlargedIdx(i => (i - 1 + images.length) % images.length); };
  const nextImage = e => { e.stopPropagation(); setEnlargedIdx(i => (i + 1) % images.length); };

  useEffect(() => setLogLevel('debug'), []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => {
      if (!u) router.push('/Welcome_page');
      else setUser(u);
    });
    return unsub;
  }, [router]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const snapV = await getDoc(doc(db, 'listing', id));
      if (!snapV.exists()) return;
      const v = snapV.data();
      setVehicle(v);
      setAiRec(v.aiRecommendation || 'Pas de recommandation AI');

      const snapU = await getDoc(doc(db, 'members', v.uid));
      setOwnerName(snapU.data()?.firstName || '');

      const snapR = await getDocs(collection(db, `listing/${id}/receipts`));
      setReceipts(
        snapR.docs.map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (b.date?.seconds || 0) - (a.date?.seconds || 0))
      );

      const list = await listAll(ref(storage, `listing/${id}/photos/`));
      setImages(await Promise.all(list.items.map(i => getDownloadURL(i))));
    })();
  }, [id]);

  const calcSum = type => {
    const base = Number(vehicle?.boughtAt) || 0;
    const tot = receipts.reduce((s, r) => s + (Number(r.price) || 0), 0);
    if (type === 'Total Spent') return base + tot;
    if (type === 'Without Purchase Price') return tot;
    return receipts
      .filter(r => r.category === type)
      .reduce((s, r) => s + (Number(r.price) || 0), 0);
  };

  const askAi = async () => {
    if (!aiQ.trim()) return;
    setLoadingAi(true);
    try {
      const res = await fetch('/api/aiMaintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiQ, vehicleId: id, vehicleDetails: vehicle }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erreur');
      setAiA(json.answer || 'Pas de réponse');
    } catch (e) {
      setAiA(`Erreur : ${e.message}`);
    } finally {
      setLoadingAi(false);
    }
  };

  const buildChart = () => {
    if (!vehicle?.boughtAt || !vehicle?.boughtIn) return { labels: [], datasets: [] };
    const price = vehicle.boughtAt;
    const startYear = Number(vehicle.boughtIn);
    const now = new Date();
    const start = new Date(now);
    if (timeWindow === 'Last Week') start.setDate(now.getDate() - 7);
    else if (timeWindow === 'Last Month') start.setMonth(now.getMonth() - 1);
    else start.setFullYear(now.getFullYear() - 1);

    const dates = [];
    for (let d = new Date(start); d <= now; d.setDate(d.getDate() + 1)) dates.push(new Date(d));
    const rate = 0.15, k = 0.18;
    const straight = dates.map(d => price * Math.pow(1 - rate, (d.getFullYear() + d.getMonth()/12) - startYear));
    const expo = dates.map(d => price * Math.exp(-k * ((d.getFullYear() + d.getMonth()/12) - startYear)));

    return {
      labels: dates.map(d => d.toLocaleDateString()),
      datasets: [
        { label: 'Straight', data: straight, fill: false, borderWidth: 2 },
        { label: 'Exponential', data: expo, fill: false, borderWidth: 2 },
      ],
    };
  };

  const chartData = useMemo(buildChart, [vehicle, timeWindow]);

  if (!user) return null;
  if (!vehicle) return <p className="p-6 text-center text-gray-700">Loading…</p>;

  return (
    <div className="min-h-screen px-4 py-8 text-white bg-neutral-900 sm:px-8">
  <ToastContainer />

  <div className="mb-8 text-center md:mt-12">
    <h1 className="text-4xl font-bold tracking-tight">{vehicle.make} {vehicle.model} {vehicle.year} - {vehicle.engine}</h1>
  </div>

  <div className="grid gap-6 md:grid-cols-2">
    {/* Photos */}
    <div className="grid grid-cols-2 gap-2">
      {images.map((url, i) => (
        <div key={i} className="relative pb-[100%] cursor-pointer" onClick={() => setEnlargedIdx(i)}>
          <Image src={url} alt={`Vehicle ${i}`} fill style={{ objectFit: 'cover' }} className="rounded" />
        </div>
      ))}
    </div>

    {/* Vehicle Info */}
    <div className="p-4 border bg-neutral-800 border-neutral-700">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-white">Vehicle Info</h2>
        <button
          onClick={() => router.push(`/edit-vehicle/${id}`)}
          className="px-3 py-1 text-sm font-medium text-white transition bg-blue-600 rounded hover:bg-blue-700"
        >
          ✏️ Edit
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
        {[
          { label: 'Year', value: vehicle.year },
          { label: 'Make', value: vehicle.make },
          { label: 'Model', value: vehicle.model },
          { label: 'City', value: vehicle.city },
          { label: 'State', value: vehicle.state },
          { label: 'VIN', value: vehicle.vin },
          { label: 'Mileage', value: vehicle.mileage },
          { label: 'Color', value: vehicle.color },
          { label: 'Engine', value: vehicle.engine },
          { label: 'Transmission', value: vehicle.transmission },
          { label: 'Horsepower', value: vehicle.horsepower ? `${vehicle.horsepower} HP` : 'N/A' },
          { label: 'Fuel Type', value: vehicle.fuelType },
          { label: 'Owner', value: ownerName },
        ].map((item, idx) => (
          <div key={idx} className="flex items-center">
            {icons[item.label]}
            <span className="w-24 mr-2 text-neutral-400">{item.label}:</span>
            <span className="font-medium text-white">
              {item.label === 'Color' ? (
                <>
                  <span className="inline-block w-3 h-3 mr-1 rounded-full" style={{ backgroundColor: vehicle.color?.toLowerCase() || '#ccc' }}></span>
                  {item.value}
                </>
              ) : (
                item.value || 'N/A'
              )}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <h3 className="flex items-center mb-1 font-medium text-white">
          <Info className="w-4 h-4 mr-2" /> Vehicle Condition
        </h3>
        <span className="inline-block px-2 py-1 text-xs font-semibold text-green-800 bg-green-200 rounded">Excellent</span>
      </div>
    </div>
  </div>

  {/* Description Card */}
  <div className="p-4 mt-6 border bg-neutral-800 border-neutral-700">
    <h2 className="flex items-center text-xl font-semibold text-white">
      <AlignLeft className="w-5 h-5 mr-2" /> Description
    </h2>
    <p className="mt-2 text-sm text-white whitespace-pre-wrap">
      {vehicle.description || 'No description provided.'}
    </p>
  </div>

      

<div className="grid gap-6 mt-6 md:grid-cols-2">
  <div className="p-4 border bg-neutral-800 border-neutral-700">
    <h2 className="pb-2 mb-4 text-xl font-semibold border-b border-neutral-700">Maintenance</h2>
    <ul className="space-y-2">
      {sumTypes.map(type => (
        <li key={type} className="flex justify-between px-2 py-1 bg-neutral-700">
          <span>{type}</span>
          <span>${calcSum(type).toFixed(2)}</span>
        </li>
      ))}
    </ul>

    <div className="mt-4">
      <h3 className="font-medium">AI Recommendation</h3>
      <pre className="p-2 mt-1 text-sm whitespace-pre-wrap bg-neutral-700">{aiRec}</pre>
    </div>

    <div className="mt-4">
      <h3 className="font-medium">Receipts</h3>
      {receipts.length ? (
        <ul className="overflow-auto text-sm max-h-40">
          {receipts.map(r => (
            <li key={r.id} className="flex justify-between">
              <span>{r.title}</span>
              <span>${Number(r.price).toFixed(2)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-neutral-400">No receipts</p>
      )}
    </div>

    <div className="mt-4">
      <h3 className="font-medium">Ask AI</h3>
      <textarea
        rows={3}
        value={aiQ}
        onChange={e => setAiQ(e.target.value)}
        className="w-full p-2 text-white border bg-neutral-700 border-neutral-600"
        placeholder="Ask something..."
      />
      <button
        onClick={askAi}
        disabled={loadingAi}
        className="px-4 py-2 mt-2 text-white rounded-lg bg-gradient-to-r from-pink-500 to-purple-600"
      >
        {loadingAi ? 'Loading…' : 'Send'}
      </button>
      {aiA && (
        <div className="p-2 mt-2 text-sm bg-neutral-700">{aiA}</div>
      )}
    </div>
  </div>

  <div className="p-4 border bg-neutral-800 border-neutral-700">
    <h2 className="pb-2 mb-4 text-xl font-semibold border-b border-neutral-700">Market</h2>
    <label className="block mb-1 text-sm">Time Window</label>
    <select
      value={timeWindow}
      onChange={e => setTimeWindow(e.target.value)}
      className="w-full p-2 mb-4 text-white border bg-neutral-700 border-neutral-600"
    >
      <option>Last Week</option>
      <option>Last Month</option>
      <option>Last Year</option>
    </select>
    <div className="h-48">
      <Line data={chartData} options={{ maintainAspectRatio: false }} />
    </div>
  </div>
</div>

{enlargedIdx !== null && images.length > 0 && (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80"
    onClick={() => setEnlargedIdx(null)}
  >
    <button onClick={prevImage} className="absolute text-5xl font-bold text-white left-6">‹</button>
    <div className="relative w-11/12 h-5/6">
      <Image src={images[enlargedIdx]} alt="Zoomed" fill style={{ objectFit: 'contain' }} />
    </div>
    <button onClick={nextImage} className="absolute text-5xl font-bold text-white right-6">›</button>
  </div>
)}
    </div>
  );
};

export default VehicleCardPage;
