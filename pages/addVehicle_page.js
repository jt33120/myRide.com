import { useState, useEffect } from 'react';
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getFirestore, doc, setDoc, getDoc, collection, getDocs } from "firebase/firestore";
import { getAuth } from "firebase/auth"; // Import Firebase Authentication
import heic2any from 'heic2any';
import { useRouter } from 'next/router';

const storage = getStorage();
const db = getFirestore();
const auth = getAuth(); // Initialize Firebase Authentication

const uploadFilesToFirebase = async (formData, vehicleId) => {
  const fileUrls = {};
  const files = Object.keys(formData).filter(key => key.includes('Image') || key === 'vehicleVideo');

  for (const fileKey of files) {
    if (formData[fileKey]) {
      let file = formData[fileKey];

      // Convert HEIC/HEIF images to PNG
      if (file.type === 'image/heic' || file.type === 'image/heif') {
        try {
          const convertedBlob = await heic2any({ blob: file, toType: 'image/png' });
          file = new File([convertedBlob], file.name.replace(/\.[^/.]+$/, ".png"), { type: 'image/png' });
        } catch (error) {
          console.error("Error converting HEIC image:", error);
          continue;
        }
      }

      const folder = fileKey.includes('Image') ? 'photos' : 'docs';
      const fileName = `${fileKey}.png`; // Rename the file based on its purpose
      const storageRef = ref(storage, `listing/${vehicleId}/${folder}/${fileName}`);
      await uploadBytes(storageRef, file);
      const fileUrl = await getDownloadURL(storageRef);
      fileUrls[fileKey] = fileUrl;
    }
  }

  return fileUrls;
};

const handleSubmit = async (e, formData, setLoading, router) => {
  e.preventDefault();
  setLoading(true);

  const mandatoryFields = ['make', 'year', 'model', 'vin', 'title', 'mileage', 'frontImage', 'leftImage', 'rightImage', 'rearImage', 'dashboardImage'];
  for (const field of mandatoryFields) {
    if (!formData[field]) {
      alert(`Please fill in the ${field} field.`);
      setLoading(false);
      return;
    }
  }

  try {
    const transformedFormData = {
      ...formData,
      make: formData.make.toUpperCase(),
      model: formData.model.toUpperCase(),
      city: formData.city.toUpperCase(),
      color: formData.color.toUpperCase(),
      year: Number(formData.year),
      mileage: Number(formData.mileage),
      boughtIn: Number(formData.boughtIn),
      boughtAt: Number(formData.boughtAt),
    };

    const filteredFormData = { ...transformedFormData };
    if (formData.type === "car") {
      delete filteredFormData.cc;
      delete filteredFormData.chainImage;
      delete filteredFormData.dropped;
    } else if (formData.type === "motorcycle") {
      delete filteredFormData.interiorColor;
      delete filteredFormData.awd;
      delete filteredFormData.package;
      delete filteredFormData.option;
      delete filteredFormData.leftfrontWheelImage;
      delete filteredFormData.rightfrontWheelImage;
      delete filteredFormData.leftrearWheelImage;
      delete filteredFormData.rightrearWheelImage;
      delete filteredFormData.engineBayImage;
    }

    const timestamp = new Date().toLocaleString('en-US', { timeZone: 'UTC', hour12: false }).replace(/[/,: ]/g, '-');
    const vehicleId = `${filteredFormData.type.toUpperCase()}-${auth.currentUser.uid}-${timestamp}`;

    const fileUrls = await uploadFilesToFirebase(filteredFormData, vehicleId);

    const vehicleData = {
      ...filteredFormData,
      ...fileUrls,
      uid: auth.currentUser.uid,
      createdAt: new Date()
    };

    await setDoc(doc(db, "listing", vehicleId), vehicleData);

    const userDocRef = doc(db, 'members', auth.currentUser.uid);
    await updateDoc(userDocRef, {
      vehicles: arrayUnion(vehicleId)
    });

    const makeDocRef = doc(db, 'vehicles', filteredFormData.type.toLowerCase(), filteredFormData.make, filteredFormData.year);
    const makeDoc = await getDoc(makeDocRef);

    if (!makeDoc.exists()) {
      await setDoc(makeDocRef, { [filteredFormData.model]: true });
    } else {
      const modelData = makeDoc.data();
      if (!modelData[filteredFormData.model]) {
        await setDoc(makeDocRef, { [filteredFormData.model]: true }, { merge: true });
      }
    }

    alert("Vehicle added successfully!");
    router.push('/myDashboard_page');
  } catch (error) {
    console.error("Error uploading files or saving data:", error);
    alert("There was an error while submitting the form.");
  } finally {
    setLoading(false);
  }
};

const usStates = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
];

const VehicleForm = () => {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const [formData, setFormData] = useState({
    type: "car",
    make: "",
    year: "",
    model: "",
    zip: "",
    state: "",
    city: "",
    color: "",
    vin: "",
    title: "",
    mileage: "",
    tracked: false,
    dropped: false,
    interiorColor: "",
    awd: false,
    package: "",
    option: "",
    cc: "",
    modifications: "",
    maintenance: "",
    aftermarketMods: "",
    boughtIn: "",
    boughtAt: "",
    cosmeticDefaults: "",
    description: "",
    garageKept: false,
    frontImage: null,
    leftImage: null,
    rightImage: null,
    rearImage: null,
    leftfrontWheelImage: null,
    rightfrontWheelImage: null,
    leftrearWheelImage: null,
    rightrearWheelImage: null,
    engineBayImage: null,
    dashboardImage: null,
    chainImage: null,
    vehicleVideo: null,
    otherImage: null,
  });

  const handleChange = (e) => {
    const { name, value, files, type, checked } = e.target;

    if (files) {
      setFormData(prevData => ({
        ...prevData,
        [name]: files[0],
      }));
    } else if (type === 'checkbox') {
      setFormData(prevData => ({
        ...prevData,
        [name]: checked,
      }));
    } else {
      setFormData(prevData => ({
        ...prevData,
        [name]: value,
      }));
    }
  };

  return (
    <div className="form-container">
      <h2 className="form-title">Add a Vehicle</h2>
      <p>We recommend you to be next to your vehicle, as photos are required!</p>
      <form onSubmit={(e) => handleSubmit(e, formData, setLoading, router)} className="vehicle-form">
        {loading && <div className="loading-spinner"></div>}
        {!loading && (
          <>
            <h3>General Details</h3>
            <input type="text" name="make" placeholder="Make" value={formData.make} onChange={handleChange} required />
            <input type="text" name="model" placeholder="Model" value={formData.model} onChange={handleChange} required />
            <input type="text" name="year" placeholder="Year" value={formData.year} onChange={handleChange} required />
            <input type="text" name="vin" placeholder="VIN" value={formData.vin} onChange={handleChange} required />
            <input type="text" name="mileage" placeholder="Mileage" value={formData.mileage} onChange={handleChange} required />
            <input type="text" name="color" placeholder="Color" value={formData.color} onChange={handleChange} />
            <input type="text" name="zip" placeholder="ZIP Code" value={formData.zip} onChange={handleChange} />
            <select name="state" value={formData.state} onChange={handleChange}>
              <option value="">Select State</option>
              {usStates.map((state, index) => (
                <option key={index} value={state}>{state}</option>
              ))}
            </select>

            <h3>Photos</h3>
            <input type="file" name="frontImage" onChange={handleChange} required />
            <input type="file" name="leftImage" onChange={handleChange} required />
            <input type="file" name="rightImage" onChange={handleChange} required />
            <input type="file" name="rearImage" onChange={handleChange} required />
            <input type="file" name="dashboardImage" onChange={handleChange} required />

            <h3>Additional Details</h3>
            <textarea name="description" placeholder="Description" value={formData.description} onChange={handleChange} />
            <textarea name="cosmeticDefaults" placeholder="Cosmetic Defaults" value={formData.cosmeticDefaults} onChange={handleChange} />
            <textarea name="aftermarketMods" placeholder="Aftermarket Mods" value={formData.aftermarketMods} onChange={handleChange} />

            <button type="submit">Submit</button>
          </>
        )}
      </form>
    </div>
  );
};

export default VehicleForm;
