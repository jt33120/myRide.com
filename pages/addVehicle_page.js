import { useState } from 'react';
import { useRouter } from 'next/router';
import { auth, db, storage } from '../lib/firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

const usStates = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
];

const AddVehiclePage = () => {
  const [vehicleType, setVehicleType] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [boughtIn, setBoughtIn] = useState('');
  const [boughtAt, setBoughtAt] = useState('');
  const [color, setColor] = useState('');
  const [vin, setVin] = useState('');
  const [title, setTitle] = useState('');
  const [mileage, setMileage] = useState('');
  const [zip, setZip] = useState('');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [interiorColor, setInteriorColor] = useState('');
  const [awd, setAwd] = useState(false);
  const [tracked, setTracked] = useState(false);
  const [garageKept, setGarageKept] = useState(false);
  const [packageLine, setPackageLine] = useState('');
  const [options, setOptions] = useState('');
  const [cc, setCc] = useState('');
  const [dropped, setDropped] = useState(false);
  const [description, setDescription] = useState('');
  const [cosmeticDefaults, setCosmeticDefaults] = useState('');
  const [aftermarketMods, setAftermarketMods] = useState('');
  const [frontImage, setFrontImage] = useState(null);
  const [leftImage, setLeftImage] = useState(null);
  const [rightImage, setRightImage] = useState(null);
  const [rearImage, setRearImage] = useState(null);
  const [dashboardImage, setDashboardImage] = useState(null);
  const [leftFrontWheelImage, setLeftFrontWheelImage] = useState(null);
  const [rightFrontWheelImage, setRightFrontWheelImage] = useState(null);
  const [leftRearWheelImage, setLeftRearWheelImage] = useState(null);
  const [rightRearWheelImage, setRightRearWheelImage] = useState(null);
  const [engineBayImage, setEngineBayImage] = useState(null);
  const [chainImage, setChainImage] = useState(null);
  const [frontWheelImage, setFrontWheelImage] = useState(null);
  const [rearWheelImage, setRearWheelImage] = useState(null);
  const [vehicleVideo, setVehicleVideo] = useState(null);
  const [otherImage, setOtherImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const router = useRouter();


  const handleAddVehicle = async () => {
    setUploading(true);
    const user = auth.currentUser;
    if (!user) {
      alert('You must be logged in to add a vehicle.');
      setUploading(false);
      return;
    }
  
    try {
      const vehicleData = {
        vehicleType,
        make,
        model,
        year,
        boughtIn,
        boughtAt,
        color,
        vin,
        title,
        mileage,
        zip,
        state,
        city,
        interiorColor,
        awd,
        tracked,
        garageKept,
        packageLine,
        options,
        cc,
        dropped,
        description,
        cosmeticDefaults,
        aftermarketMods,
        uid: user.uid,
        createdAt: new Date(),
      };
  
      const timestamp = new Date().toLocaleString('en-US', { timeZone: 'UTC', hour12: false }).replace(/[/,: ]/g, '-');
      const vehicleId = `${vehicleType.toUpperCase()}-${user.uid}-${timestamp}`;
  
      await setDoc(doc(db, 'listing', vehicleId), vehicleData);
  
      const uploadPromises = [
        frontImage && uploadFile(frontImage, `listing/${vehicleId}/photos/frontImage`),
        leftImage && uploadFile(leftImage, `listing/${vehicleId}/photos/leftImage`),
        rightImage && uploadFile(rightImage, `listing/${vehicleId}/photos/rightImage`),
        rearImage && uploadFile(rearImage, `listing/${vehicleId}/photos/rearImage`),
        dashboardImage && uploadFile(dashboardImage, `listing/${vehicleId}/photos/dashboardImage`),
        leftFrontWheelImage && uploadFile(leftFrontWheelImage, `listing/${vehicleId}/photos/leftFrontWheelImage`),
        rightFrontWheelImage && uploadFile(rightFrontWheelImage, `listing/${vehicleId}/photos/rightFrontWheelImage`),
        leftRearWheelImage && uploadFile(leftRearWheelImage, `listing/${vehicleId}/photos/leftRearWheelImage`),
        rightRearWheelImage && uploadFile(rightRearWheelImage, `listing/${vehicleId}/photos/rightRearWheelImage`),
        engineBayImage && uploadFile(engineBayImage, `listing/${vehicleId}/photos/engineBayImage`),
        chainImage && uploadFile(chainImage, `listing/${vehicleId}/photos/chainImage`),
        frontWheelImage && uploadFile(frontWheelImage, `listing/${vehicleId}/photos/frontWheelImage`),
        rearWheelImage && uploadFile(rearWheelImage, `listing/${vehicleId}/photos/rearWheelImage`),
        vehicleVideo && uploadFile(vehicleVideo, `listing/${vehicleId}/photos/vehicleVideo`),
        otherImage && uploadFile(otherImage, `listing/${vehicleId}/photos/otherImage`),
      ].filter(Boolean);
  
      await Promise.all(uploadPromises);
  
      setUploading(false);
      router.push(`/vehicleCard_page?id=${vehicleId}`);
    } catch (error) {
      console.error("Error adding vehicle:", error);
      setUploading(false);
    }
  };
  

  const uploadFile = async (file, path) => {
    const storageRef = ref(storage, path);
    const uploadTask = uploadBytesResumable(storageRef, file);

    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          console.log(`Image upload is ${progress}% done`);
        },
        (error) => {
          console.error("Error uploading image:", error);
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
  };

  return (
    <div className="min-h-screen p-6 bg-gray-100 text-black">
      <h1 className="text-3xl font-bold mb-6 text-center">Add Vehicle</h1>
      <div className="form-container">
        <div className="form-section">
          <label className="form-label">Vehicle Type</label>
          <select value={vehicleType} onChange={(e) => setVehicleType(e.target.value)}>
            <option value="">Select Vehicle Type</option>
            <option value="car">Car</option>
            <option value="motorcycle">Motorcycle</option>
          </select>
        </div>
        <div className="form-section">
          <label className="form-label">Make</label>
          <input type="text" value={make} onChange={(e) => setMake(e.target.value)} required />
        </div>
        <div className="form-section">
          <label className="form-label">Model</label>
          <input type="text" value={model} onChange={(e) => setModel(e.target.value)} required />
        </div>
        <div className="form-section">
          <label className="form-label">Year</label>
          <input type="text" value={year} onChange={(e) => setYear(e.target.value)} required />
        </div>
        <div className="form-section">
          <label className="form-label">Bought in</label>
          <input type="text" value={boughtIn} onChange={(e) => setBoughtIn(e.target.value)} required />
        </div>
        <div className="form-section">
          <label className="form-label">Bought at</label>
          <input type="text" value={boughtAt} onChange={(e) => setBoughtAt(e.target.value)} required />
        </div>
        <div className="form-section">
          <label className="form-label">Color</label>
          <input type="text" value={color} onChange={(e) => setColor(e.target.value)} />
        </div>
        <div className="form-section">
          <label className="form-label">VIN</label>
          <input type="text" value={vin} onChange={(e) => setVin(e.target.value)} required />
        </div>
        <div className="form-section">
          <label className="form-label">Title</label>
          <select value={title} onChange={(e) => setTitle(e.target.value)} required>
            <option value="">Select Title Status</option>
            <option value="clean">Clean</option>
            <option value="salvage">Salvage</option>
            <option value="rebuilt">Rebuilt</option>
          </select>
        </div>
        <div className="form-section">
          <label className="form-label">Mileage</label>
          <input type="text" value={mileage} onChange={(e) => setMileage(e.target.value)} required />
        </div>
        <div className="form-section">
          <label className="form-label">ZIP Code</label>
          <input type="text" value={zip} onChange={(e) => setZip(e.target.value)} maxlength="5" pattern="\d*" />
        </div>
        <div className="form-section">
          <label className="form-label">State</label>
          <select value={state} onChange={(e) => setState(e.target.value)}>
            <option value="">Select State</option>
            {usStates.map((state, index) => (
              <option key={index} value={state}>{state}</option>
            ))}
          </select>
        </div>
        <div className="form-section">
          <label className="form-label">City</label>
          <input type="text" value={city} onChange={(e) => setCity(e.target.value)} />
        </div>
        {vehicleType === 'car' && (
          <>
            <div className="form-section">
              <label className="form-label">Interior Color</label>
              <input type="text" value={interiorColor} onChange={(e) => setInteriorColor(e.target.value)} />
            </div>
            <div className="form-section">
              <label className="form-label">All Wheel Drive</label>
              <input type="checkbox" checked={awd} onChange={(e) => setAwd(e.target.checked)} />
            </div>
            <div className="form-section">
              <label className="form-label">Specific line (sportline, package, etc)</label>
              <input type="text" value={packageLine} onChange={(e) => setPackageLine(e.target.value)} />
            </div>
            <div className="form-section">
              <label className="form-label">Options</label>
              <input type="text" value={options} onChange={(e) => setOptions(e.target.value)} />
            </div>
          </>
        )}
        {vehicleType === 'motorcycle' && (
          <>
            <div className="form-section">
              <label className="form-label">CC</label>
              <input type="text" value={cc} onChange={(e) => setCc(e.target.value)} />
            </div>
            <div className="form-section">
              <label className="form-label">Dropped</label>
              <input type="checkbox" checked={dropped} onChange={(e) => setDropped(e.target.checked)} />
            </div>
          </>
        )}
        <div className="form-section">
          <label className="form-label">Tracked</label>
          <input type="checkbox" checked={tracked} onChange={(e) => setTracked(e.target.checked)} />
        </div>
        <div className="form-section">
          <label className="form-label">Garage kept</label>
          <input type="checkbox" checked={garageKept} onChange={(e) => setGarageKept(e.target.checked)} />
        </div>
        <div className="form-section">
          <label className="form-label">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="form-section">
          <label className="form-label">Cosmetic Defaults</label>
          <textarea value={cosmeticDefaults} onChange={(e) => setCosmeticDefaults(e.target.value)} />
        </div>
        <div className="form-section">
          <label className="form-label">Aftermarket Mods</label>
          <textarea value={aftermarketMods} onChange={(e) => setAftermarketMods(e.target.value)} />
        </div>
        <div className="form-section">
          <label className="form-label">Front Image</label>
          <input type="file" onChange={(e) => setFrontImage(e.target.files[0])} required />
        </div>
        <div className="form-section">
          <label className="form-label">Left Image</label>
          <input type="file" onChange={(e) => setLeftImage(e.target.files[0])} required />
        </div>
        <div className="form-section">
          <label className="form-label">Right Image</label>
          <input type="file" onChange={(e) => setRightImage(e.target.files[0])} required />
        </div>
        <div className="form-section">
          <label className="form-label">Rear Image</label>
          <input type="file" onChange={(e) => setRearImage(e.target.files[0])} required />
        </div>
        <div className="form-section">
          <label className="form-label">Dashboard Image</label>
          <input type="file" onChange={(e) => setDashboardImage(e.target.files[0])} required />
        </div>
        {vehicleType === 'car' && (
          <>
            <div className="form-section">
              <label className="form-label">Left Front Wheel Image</label>
              <input type="file" onChange={(e) => setLeftFrontWheelImage(e.target.files[0])} required />
            </div>
            <div className="form-section">
              <label className="form-label">Right Front Wheel Image</label>
              <input type="file" onChange={(e) => setRightFrontWheelImage(e.target.files[0])} required />
            </div>
            <div className="form-section">
              <label className="form-label">Left Rear Wheel Image</label>
              <input type="file" onChange={(e) => setLeftRearWheelImage(e.target.files[0])} required />
            </div>
            <div className="form-section">
              <label className="form-label">Right Rear Wheel Image</label>
              <input type="file" onChange={(e) => setRightRearWheelImage(e.target.files[0])} required />
            </div>
            <div className="form-section">
              <label className="form-label">Engine Bay Image</label>
              <input type="file" onChange={(e) => setEngineBayImage(e.target.files[0])} required />
            </div>
          </>
        )}
        {vehicleType === 'motorcycle' && (
          <>
            <div className="form-section">
              <label className="form-label">Chain Image</label>
              <input type="file" onChange={(e) => setChainImage(e.target.files[0])} required />
            </div>
            <div className="form-section">
              <label className="form-label">Front Wheel Image</label>
              <input type="file" onChange={(e) => setFrontWheelImage(e.target.files[0])} required />
            </div>
            <div className="form-section">
              <label className="form-label">Rear Wheel Image</label>
              <input type="file" onChange={(e) => setRearWheelImage(e.target.files[0])} required />
            </div>
          </>
        )}
        <div className="form-section">
          <label className="form-label">Vehicle Video</label>
          <input type="file" onChange={(e) => setVehicleVideo(e.target.files[0])} />
        </div>
        <div className="form-section">
          <label className="form-label">Other Image</label>
          <input type="file" onChange={(e) => setOtherImage(e.target.files[0])} />
        </div>
        <button
          onClick={handleAddVehicle}
          className="btn"
          disabled={uploading}
        >
          {uploading ? <div className="loader"></div> : 'Add Vehicle'}
        </button>
      </div>
    </div>
  );
};

export default AddVehiclePage;