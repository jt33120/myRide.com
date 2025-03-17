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

      // Determine the folder based on the fileKey
      const folder = fileKey.includes('Image') ? 'photos' : 'docs';
      const fileName = `${fileKey}.png`; // Rename the file based on its purpose
      const storageRef = ref(storage, `listing/${vehicleId}/${folder}/${fileName}`);
      await uploadBytes(storageRef, file);
      const fileUrl = await getDownloadURL(storageRef);
      fileUrls[fileKey] = fileUrl;
    }
  }

  console.log(fileUrls); // Debug log to see if URLs are getting saved correctly
  return fileUrls;
};

const handleSubmit = async (e, formData, setLoading,router) => {
  e.preventDefault();
  setLoading(true); // Set loading to true

  // Check for mandatory fields
  const mandatoryFields = ['make', 'year', 'model', 'vin', 'title', 'mileage', 'frontImage', 'leftImage', 'rightImage', 'rearImage', 'dashboardImage'];
  for (const field of mandatoryFields) {
    if (!formData[field]) {
      alert(`Please fill in the ${field} field.`);
      setLoading(false); // Set loading to false
      return;
    }
  }

  try {
    // Transform specific fields to uppercase
    const transformedFormData = {
      ...formData,
      make: formData.make.toUpperCase(),
      model: formData.model.toUpperCase(),
      city: formData.city.toUpperCase(),
      color: formData.color.toUpperCase(),
      year: Number(formData.year), // Convert year to number
      mileage: Number(formData.mileage), // Convert mileage to number
      boughtIn: Number(formData.boughtIn), // Convert  to number
      boughtAt: Number(formData.boughtAt), // Convert  to number
      
    };

    // Filter out fields that are not relevant to the vehicle type
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

    // Generate vehicle ID
    const timestamp = new Date().toLocaleString('en-US', { timeZone: 'UTC', hour12: false }).replace(/[/,: ]/g, '-');
    const vehicleId = `${filteredFormData.type.toUpperCase()}-${auth.currentUser.uid}-${timestamp}`;

    // First, upload files
    const fileUrls = await uploadFilesToFirebase(filteredFormData, vehicleId);

    // Now, save the form data including file URLs in Firestore
    const vehicleData = {
      ...filteredFormData,
      ...fileUrls, // Include the uploaded file URLs
      uid: auth.currentUser.uid, // Add the current user's UID
      createdAt: new Date()
    };

    // Store data in Firestore under a 'vehicles' collection
    await setDoc(doc(db, "listing", vehicleId), vehicleData);

    const userDocRef = doc(db, 'members', auth.currentUser.uid);
    await updateDoc(userDocRef, {
      vehicles: arrayUnion(vehicleId)
    });

    // Check if make, year, and model exist, if not, add them
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
    router.push('/myDashboard_page'); // Redirect to the dashboard page
  } catch (error) {
    console.error("Error uploading files or saving data:", error);
    alert("There was an error while submitting the form.");
  } finally {
    setLoading(false); // Set loading to false
  }
};

const usStates = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
];

const VehicleForm = () => {
  const [loading, setLoading] = useState(false); // Add loading state
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
    // images
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

  const [vehicleMakes, setVehicleMakes] = useState([]);
  const [vehicleModels, setVehicleModels] = useState([]);
  const [currentStep, setCurrentStep] = useState(1);

  useEffect(() => {
    const fetchVehicleMakes = async () => {
      const makesSnapshot = await getDocs(collection(db, 'vehicles', 'car', 'makes'));
      const makesData = makesSnapshot.docs.map(doc => doc.vehicleId);
      setVehicleMakes(makesData);
    };

    fetchVehicleMakes();
  }, []);

  useEffect(() => {
    const fetchVehicleModels = async () => {
      if (formData.make) {
        const modelsSnapshot = await getDocs(collection(db, 'vehicles', 'car', 'makes', formData.make.toUpperCase(), 'models'));
        const modelsData = modelsSnapshot.docs.map(doc => doc.vehicleId);
        setVehicleModels(modelsData);
      } else {
        setVehicleModels([]);
      }
    };

    fetchVehicleModels();
  }, [formData.make]);

  useEffect(() => {
    // Ensure this code only runs on the client side
    if (typeof window !== 'undefined') {
      // Client-side code that uses `window`
      console.log('Client-side code running');
    }
  }, []);

  const handleChange = (e) => {
    const { name, value, files, type, checked } = e.target;
  
    if (files) {
      setFormData(prevData => ({
        ...prevData,
        [name]: files[0],  // Save only the first file
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

  const handleNextStep = () => {
    setCurrentStep(currentStep + 1);
  };

  const handlePreviousStep = () => {
    setCurrentStep(currentStep - 1);
  };

  return (
    <div className="form-container">
      <h2 className="form-title">Add a Vehicle</h2>
      <p>I know it super ugly but it works (or at least, it should). It will be a bit longer than for marketplace to fill the form, but your vehicles deserve it. I recommend you to be next to your vehicle, photos are required!</p>
      <form onSubmit={(e) => handleSubmit(e, formData, setLoading, router)} className="vehicle-form">
        {loading && <div className="loading-spinner"></div>} {/* Add loading spinner */}
        {!loading && currentStep === 1 && (

        <div className="form-section frame" style={{ border: '2px solid #e42fee' }}>
          <h3>General Details</h3>

          <div className="form-section">
            <label className="form-label">Vehicle Type</label>
            <select name="type" value={formData.type} onChange={handleChange} className="form-input">
              <option value="car">Car</option>
              <option value="motorcycle">Motorcycle</option>
            </select>
          </div>

          <div className="form-section">
            <label className="form-label">Make *</label>
            <input
              type="text"
              name="make"
              value={formData.make}
              onChange={handleChange}
              list="makes"
              className="form-input"
              placeholder="Enter Make"
              required
            />
            <datalist id="makes">
              {vehicleMakes.map((make) => (
                <option key={make} value={make} />
              ))}
            </datalist>
          </div>

          <div className="form-section">
            <label className="form-label">Model *</label>
            <input
              type="text"
              name="model"
              value={formData.model}
              onChange={handleChange}
              list="models"
              className="form-input"
              placeholder="Enter Model"
              required
            />
            <datalist id="models">
              {vehicleModels.map((model) => (
                <option key={model} value={model} />
              ))}
            </datalist>
          </div>

          <div className="form-section">
            <label className="form-label">Year *</label>
            <input
              type="text"
              name="year"
              value={formData.year}
              onChange={handleChange}
              className="form-input"
              placeholder="Enter Year"
              required
            />
          </div>

          <div className="form-section">
            <label className="form-label">Bought in *</label>
            <input
              type="text"
              name="year"
              value={formData.boughtIn}
              onChange={handleChange}
              className="form-input"
              placeholder="Enter Year"
              required
            />
          </div>

          <div className="form-section">
            <label className="form-label">Bought at *</label>
            <input
              type="text"
              name="boughtAt"
              value={formData.boughtAt}
              onChange={handleChange}
              className="form-input"
              placeholder="Enter price you bought your vehicle at"
              required
            />
          </div>

          <div className="form-section">
            <label className="form-label">Color</label>
            <input
              type="text"
              name="color"
              value={formData.color}
              onChange={handleChange}
              className="form-input"
              placeholder="Enter Color"
            />
          </div>

          <div className="form-section">
            <label className="form-label">VIN *</label>
            <input
              type="text"
              name="vin"
              value={formData.vin}
              onChange={handleChange}
              className="form-input"
              placeholder="Enter VIN"
              required
            />
          </div>

          <div className="form-section">
            <label className="form-label">Title *</label>
            <select name="title" value={formData.title} onChange={handleChange} className="form-input" required>
              <option value="">Select Title Status</option>
              <option value="clean">Clean</option>
              <option value="salvage">Salvage</option>
              <option value="rebuilt">Rebuilt</option>
            </select>
          </div>

          

          <div className="form-section">
            <label className="form-label">Mileage *</label>
            <input
              type="text"
              name="mileage"
              value={formData.mileage}
              onChange={handleChange}
              className="form-input"
              placeholder="Enter Mileage"
              required
            />
          </div>

          <div className="form-section">
            <label className="form-label">ZIP Code</label>
            <input
              type="text"
              name="zip"
              value={formData.zip}
              onChange={handleChange}
              className="form-input"
              placeholder="Enter ZIP Code"
              maxLength="5"
              pattern="\d*"
            />
          </div>

          <div className="form-section">
            <label className="form-label">State</label>
            <select name="state" value={formData.state} onChange={handleChange} className="form-input">
              <option value="">Select State</option>
              {usStates.map((state, index) => (
                <option key={index} value={state}>{state}</option>
              ))}
            </select>
          </div>

          <div className="form-section">
            <label className="form-label">City</label>
            <input
              type="text"
              name="city"
              value={formData.city}
              onChange={handleChange}
              className="form-input"
              placeholder="Enter City"
            />
          </div>

          <div className="form-section">
            <button type="button" onClick={handleNextStep} className="form-button next-button">
              Next
            </button>
          </div>
        </div>
      )}


        {!loading && currentStep === 2 && (
          <div className="form-section frame" style={{ border: '2px solid #e42fee' }}>
            <h3>Additional Details</h3>

            {formData.type === "car" && (
              <>
                <div className="form-section">
                  <label className="form-label">Interior Color</label>
                  <input
                    type="text"
                    name="interiorColor"
                    value={formData.interiorColor}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="Enter Interior Color"
                  />
                </div>

                <div className="form-section">
                  <div className="checkbox-container">

                  <div className="checkbox-item">
                      <label className="form-label">All Wheel Drive</label>
                      <input
                        type="checkbox"
                        name="awd"
                        checked={formData.awd}
                        onChange={handleChange}
                        className="form-input"
                      />
                    </div>

                    <div className="checkbox-item">
                      <label className="form-label">Tracked</label>
                      <input
                        type="checkbox"
                        name="tracked"
                        checked={formData.tracked}
                        onChange={handleChange}
                        className="form-input"
                      />
                    </div>

                    <div className="checkbox-item">
                      <label className="form-label">Garage kept</label>
                      <input
                        type="checkbox"
                        name="garageKept"
                        checked={formData.garageKept}
                        onChange={handleChange}
                        className="form-input"
                      />
                    </div>
                  </div>
                </div>

                <div className="form-section">
                  <label className="form-label">Specific line (sportline, package, etc)</label>
                  <input
                    type="text"
                    name="package"
                    value={formData.package}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="Enter packages"
                  />
                </div>

                <div className="form-section">
                  <label className="form-label">Options</label>
                  <input
                    type="text"
                    name="option"
                    value={formData.option}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="Enter options"
                  />
                </div>

              </>
            )}

            {formData.type === "motorcycle" && (
              <>

                <div className="form-section">
                  <label className="form-label">CC</label>
                  <input
                    type="text"
                    name="cc"
                    value={formData.cc}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="Enter CC"
                  />
                </div>

                <div className="form-section">
                  <div className="checkbox-container">
                    <div className="checkbox-item">
                      <label className="form-label">Dropped</label>
                      <input
                        type="checkbox"
                        name="dropped"
                        checked={formData.dropped}
                        onChange={handleChange}
                        className="form-input"
                      />
                    </div>

                    <div className="checkbox-item">
                      <label className="form-label">Tracked</label>
                      <input
                        type="checkbox"
                        name="tracked"
                        checked={formData.tracked}
                        onChange={handleChange}
                        className="form-input"
                      />
                    </div>

                    <div className="checkbox-item">
                      <label className="form-label">Garage kept</label>
                      <input
                        type="checkbox"
                        name="garageKept"
                        checked={formData.garageKept}
                        onChange={handleChange}
                        className="form-input"
                      />
                    </div>
                  </div>
                </div>

              </>
            )}

            <div className="form-section button-container">
              <button type="button" onClick={handlePreviousStep} className="form-button previous-button">
                Previous
              </button>
              <button type="button" onClick={handleNextStep} className="form-button next-button">
                Next
              </button>
            </div>
          </div>
        )}

        {!loading && currentStep === 3 && (
          <div className="form-section frame" style={{ border: '2px solid #e42fee' }}>
            <h3>Other</h3>

            <div className="form-section">
              <label className="form-label">Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                className="form-input"
                placeholder="Enter Description"
              />
            </div>

            <div className="form-section">
              <label className="form-label">Cosmetic Defaults</label>
              <textarea
                name="cosmeticDefaults"
                value={formData.cosmeticDefaults}
                onChange={handleChange}
                className="form-input"
                placeholder="Enter Cosmetic Defaults"
              />
            </div>

            <div className="form-section">
              <label className="form-label">Aftermarket Mods</label>
              <textarea
                name="aftermarketMods"
                value={formData.aftermarketMods}
                onChange={handleChange}
                className="form-input"
                placeholder="Enter Aftermarket Mods"
              />
            </div>

            <div className="form-section">
              <button type="button" onClick={handlePreviousStep} className="form-button previous-button">
                Previous
              </button>
              <button type="button" onClick={handleNextStep} className="form-button next-button">
                Next
              </button>
            </div>
          </div>
        )}

          {!loading && currentStep === 4 && (
          <div className="form-section frame" style={{ border: '2px solid #e42fee' }}>
            <h3>Photos</h3>

            <div className="form-section">
              <label className="form-label">Front Image *</label>
              <input
                type="file"
                name="frontImage"
                onChange={handleChange}
                className="form-input"
                accept="image/*"
                required
              />
            </div>
            <div className="form-section">
              <label className="form-label">Left Image *</label>
              <input
                type="file"
                name="leftImage"
                onChange={handleChange}
                className="form-input"
                accept="image/*"
                required
              />
            </div>
            <div className="form-section">
              <label className="form-label">Right Image *</label>
              <input
                type="file"
                name="rightImage"
                onChange={handleChange}
                className="form-input"
                accept="image/*"
                required
              />
            </div>
            <div className="form-section">
              <label className="form-label">Rear Image *</label>
              <input
                type="file"
                name="rearImage"
                onChange={handleChange}
                className="form-input"
                accept="image/*"
                required
              />
            </div>
            <div className="form-section">
              <label className="form-label">Dashboard *</label>
              <input
                type="file"
                name="dashboardImage"
                onChange={handleChange}
                className="form-input"
                accept="image/*"
                required
              />
            </div>

            {formData.type === "car" ? (
              <>
                <div className="form-section">
                  <label className="form-label">Left Front Wheel Image *</label>
                  <input
                    type="file"
                    name="leftfrontWheelImage"
                    onChange={handleChange}
                    className="form-input"
                    accept="image/*"
                    required
                  />
                </div>
                <div className="form-section">
                  <label className="form-label">Right Front Wheel Image *</label>
                  <input
                    type="file"
                    name="rightfrontWheelImage"
                    onChange={handleChange}
                    className="form-input"
                    accept="image/*"
                    required
                  />
                </div>
                <div className="form-section">
                  <label className="form-label"> Left Rear Wheel Image *</label>
                  <input
                    type="file"
                    name="leftrearWheelImage"
                    onChange={handleChange}
                    className="form-input"
                    accept="image/*"
                    required
                  />
                </div>
                <div className="form-section">
                  <label className="form-label"> Right Rear Wheel Image *</label>
                  <input
                    type="file"
                    name="rightrearWheelImage"
                    onChange={handleChange}
                    className="form-input"
                    accept="image/*"
                    required
                  />
                </div>
                <div className="form-section">
                  <label className="form-label">Engine Bay Image *</label>
                  <input
                    type="file"
                    name="engineBayImage"
                    onChange={handleChange}
                    className="form-input"
                    accept="image/*"
                    required
                  />
                </div>
              </>
            ) : (
              <>
                <div className="form-section">
                  <label className="form-label">Chain Image *</label>
                  <input
                    type="file"
                    name="chainImage"
                    onChange={handleChange}
                    className="form-input"
                    accept="image/*"
                    required
                  />
                </div>
                <div className="form-section">
                  <label className="form-label">Front Wheel Image *</label>
                  <input
                    type="file"
                    name="frontwheelImage"
                    onChange={handleChange}
                    className="form-input"
                    accept="image/*"
                    required
                  />
                </div>
                <div className="form-section">
                  <label className="form-label">Rear Wheel Image *</label>
                  <input
                    type="file"
                    name="rearwheelImage"
                    onChange={handleChange}
                    className="form-input"
                    accept="image/*"
                    required
                  />
                </div>
              </>
            )}

            <div className="form-section">
              <label className="form-label">Vehicle Video</label>
              <input
                type="file"
                name="vehicleVideo"
                onChange={handleChange}
                className="form-input"
                accept="video/*"
              />
            </div>

            <div className="form-section">
              <label className="form-label">Other</label>
              <input
                type="file"
                name="otherImage"
                onChange={handleChange}
                className="form-input"
                accept="image/*"
              />
            </div>

            <div className="form-section button-container">
              <button type="button" onClick={handlePreviousStep} className="form-button previous-button">
                Previous
              </button>
              <button type="submit" className="form-button next-button">
                Submit
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};

export default VehicleForm;
