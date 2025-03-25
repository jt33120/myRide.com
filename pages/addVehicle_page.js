import { useState, useEffect } from "react";
import { useRouter } from 'next/router';
import { auth, db, storage } from '../lib/firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { doc, setDoc, updateDoc, arrayUnion } from 'firebase/firestore'; // Add updateDoc and arrayUnion

const usStates = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
];

const AddVehiclePage = () => {
  const [vehicleType, setVehicleType] = useState('');
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
  const [, setUploading] = useState(false);
  const router = useRouter();

  const [makes, setMakes] = useState([]);
  const [models, setModels] = useState([]);
  const [years, setYears] = useState([]);
  const [selectedMake, setSelectedMake] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [errors, setErrors] = useState({}); // State to track errors
  const [currentSection, setCurrentSection] = useState(1); // Track current section (1: Textual, 2: Media)

  // Fetch makes based on vehicle type
  useEffect(() => {
    const fetchMakes = async () => {
      if (!vehicleType) {
        setMakes([]);
        return;
      }

      try {
        let response;
        if (vehicleType === 'car') {
          response = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/GetMakesForVehicleType/passenger%20car?format=json`);
        } else if (vehicleType === 'motorcycle') {
          response = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/GetMakesForVehicleType/motorcycle?format=json`);
        }

        const data = await response.json();

        if (data.Results && data.Results.length > 0) {
          setMakes(data.Results.map((make) => make.MakeName));
        } else {
          setMakes([]); // No makes found for the selected vehicle type
        }
      } catch (error) {
        console.error("Error fetching makes:", error);
        setMakes([]); // Handle errors gracefully
      }
    };

    fetchMakes();
  }, [vehicleType]);

  // Fetch years dynamically (e.g., 1980 to current year)
  useEffect(() => {
    const currentYear = new Date().getFullYear();
    const yearRange = Array.from({ length: currentYear - 1980 + 1 }, (_, i) => 1980 + i);
    setYears(yearRange);
  }, []);

  // Fetch models when make and year are selected
  useEffect(() => {
    const fetchModels = async () => {
      if (!selectedMake || !selectedYear) {
        setModels([]);
        return;
      }

      try {
        const response = await fetch(
          `https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMakeYear/make/${selectedMake}/modelyear/${selectedYear}?format=json`
        );
        const data = await response.json();

        if (data.Results && data.Results.length > 0) {
          setModels(data.Results.map((model) => model.Model_Name));
        } else {
          setModels([]); // No models found for the selected make and year
        }
      } catch (error) {
        console.error("Error fetching models:", error);
        setModels([]); // Handle errors gracefully
      }
    };

    fetchModels();
  }, [selectedMake, selectedYear]);

  const handleAddVehicle = async () => {
    setUploading(true);

    // Validate required fields
    const newErrors = {};
    if (!vehicleType) newErrors.vehicleType = "Vehicle type is required.";
    if (!selectedMake) newErrors.selectedMake = "Make is required.";
    if (!selectedModel) newErrors.selectedModel = "Model is required.";
    if (!selectedYear) newErrors.selectedYear = "Year is required.";
    if (!frontImage) newErrors.frontImage = "Front image is required.";
    if (!boughtIn) newErrors.boughtIn = "Bought In is required.";
    if (!boughtAt) newErrors.boughtAt = "Bought At is required.";
    if (!color) newErrors.color = "Color is required.";
    if (!title) newErrors.title = "Title is required.";
    if (!mileage) newErrors.mileage = "Mileage is required.";
    if (!zip) newErrors.zip = "Zip is required.";
    if (!city) newErrors.city = "City is required.";
    if (!state) newErrors.state = "State is required.";

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      setUploading(false);
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      alert("You must be logged in to add a vehicle.");
      setUploading(false);
      return;
    }

    try {
      // Prepare vehicle data
      const vehicleData = {
        vehicleType,
        make: selectedMake,
        model: selectedModel,
        year: Number(selectedYear), // Convert year to a number
        boughtIn: Number(boughtIn), // Convert boughtIn to a number
        boughtAt: Number(boughtAt), // Convert boughtAt to a number
        color: color.toUpperCase(), // Convert color to uppercase
        vin,
        title,
        mileage: Number(mileage), // Convert mileage to a number
        zip,
        state,
        city: city.toUpperCase(), // Convert city to uppercase
        tracked,
        garageKept,
        description,
        cosmeticDefaults,
        aftermarketMods,
        uid: user.uid,
        createdAt: new Date(),
      };

      // Add fields specific to cars
      if (vehicleType === "car") {
        vehicleData.interiorColor = interiorColor;
        vehicleData.awd = awd;
        vehicleData.packageLine = packageLine;
        vehicleData.options = options;
      }

      // Add fields specific to motorcycles
      if (vehicleType === "motorcycle") {
        vehicleData.cc = cc;
        vehicleData.dropped = dropped;
      }

      // Generate a unique vehicle ID
      const timestamp = new Date()
        .toLocaleString("en-US", { timeZone: "UTC", hour12: false })
        .replace(/[/,: ]/g, "-");
      const vehicleId = `${vehicleType.toUpperCase()}-${selectedMake}-${selectedModel}-${selectedYear}-${user.uid}-${timestamp}`;

      // Write vehicle data to Firestore
      console.log("Writing vehicle data to Firestore...");
      await setDoc(doc(db, "listing", vehicleId), vehicleData);

      // Update the user's vehicles array in the /members collection
      console.log("Updating user's vehicles array...");
      const userDocRef = doc(db, "members", user.uid);
      await updateDoc(userDocRef, {
        vehicles: arrayUnion(vehicleId), // Add the new vehicle ID to the array
      });

      // Upload images to Firebase Storage
      console.log("Uploading images...");
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

      // Redirect to the vehicle card page
      console.log("Vehicle added successfully. Redirecting...");
      setUploading(false);
      router.push(`/vehicleCard_page?id=${vehicleId}`);
    } catch (error) {
      console.error("Error adding vehicle:", error);
      alert("An error occurred while adding the vehicle. Please try again.");
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

  // Navigation handlers
  const goToNextSection = () => setCurrentSection(2);
  const goToPreviousSection = () => setCurrentSection(1);

  const handleValidate = async () => {
    setUploading(true);

    // Validate required fields
    const newErrors = {};
    if (!vehicleType) newErrors.vehicleType = "Vehicle type is required.";
    if (!selectedMake) newErrors.selectedMake = "Make is required.";
    if (!selectedModel) newErrors.selectedModel = "Model is required.";
    if (!selectedYear) newErrors.selectedYear = "Year is required.";
    if (!boughtIn) newErrors.boughtIn = "Bought In is required.";
    if (!boughtAt) newErrors.boughtAt = "Bought At is required.";
    if (!color) newErrors.color = "Color is required.";
    if (!title) newErrors.title = "Title is required.";
    if (!mileage) newErrors.mileage = "Mileage is required.";
    if (!zip) newErrors.zip = "ZIP Code is required.";
    if (!city) newErrors.city = "City is required.";
    if (!state) newErrors.state = "State is required.";
    if (!frontImage) newErrors.frontImage = "Front image is required.";

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      setUploading(false);
      return;
    }

    await handleAddVehicle(); // Proceed to add vehicle if no errors
  };

  return (
    <div className="min-h-screen p-6 bg-gray-100 text-black">
      <h1 className="text-3xl font-bold mb-6 text-center">Add Vehicle</h1>
      <div className="form-container">
        {currentSection === 1 && (
          <>
            <div className="form-section">
              <label className="form-label">Vehicle Type *</label>
              <select
                value={vehicleType}
                onChange={(e) => {
                  setVehicleType(e.target.value);
                  setSelectedMake(''); // Reset make when vehicle type changes
                  setSelectedModel(''); // Reset model when vehicle type changes
                  setErrors({ ...errors, vehicleType: null }); // Clear error
                }}
                className={`border p-2 rounded-md w-full mb-2 ${errors.vehicleType ? 'border-red-500' : 'border-gray-300'}`}
                required
              >
                <option value="">Select Vehicle Type</option>
                <option value="car">Car</option>
                <option value="motorcycle">Motorcycle</option>
              </select>
              {errors.vehicleType && <p className="text-red-500 text-sm">{errors.vehicleType}</p>}
            </div>
            <div className="form-section">
              <label className="form-label">Make *</label>
              <select
                value={selectedMake}
                onChange={(e) => {
                  setSelectedMake(e.target.value);
                  setErrors({ ...errors, selectedMake: null }); // Clear error
                }}
                className={`border p-2 rounded-md w-full mb-2 ${errors.selectedMake ? 'border-red-500' : 'border-gray-300'}`}
                required
                disabled={!vehicleType}
              >
                <option value="">Select Make</option>
                {makes.map((make, index) => (
                  <option key={index} value={make}>
                    {make}
                  </option>
                ))}
              </select>
              {errors.selectedMake && <p className="text-red-500 text-sm">{errors.selectedMake}</p>}
            </div>
            <div className="form-section">
              <label className="form-label">Year *</label>
              <select
                value={selectedYear}
                onChange={(e) => {
                  setSelectedYear(e.target.value);
                  setErrors({ ...errors, selectedYear: null }); // Clear error
                }}
                className={`border p-2 rounded-md w-full mb-2 ${errors.selectedYear ? 'border-red-500' : 'border-gray-300'}`}
                required
              >
                <option value="">Select Year</option>
                {years.map((year, index) => (
                  <option key={index} value={year}>
                    {year}
                  </option>
                ))}
              </select>
              {errors.selectedYear && <p className="text-red-500 text-sm">{errors.selectedYear}</p>}
            </div>
            <div className="form-section">
              <label className="form-label">Model *</label>
              <select
                value={selectedModel}
                onChange={(e) => {
                  setSelectedModel(e.target.value);
                  setErrors({ ...errors, selectedModel: null }); // Clear error
                }}
                className={`border p-2 rounded-md w-full mb-2 ${errors.selectedModel ? 'border-red-500' : 'border-gray-300'}`}
                required
                disabled={!selectedMake || !selectedYear}
              >
                <option value="">Select Model</option>
                {models.map((model, index) => (
                  <option key={index} value={model}>
                    {model}
                  </option>
                ))}
              </select>
              {errors.selectedModel && <p className="text-red-500 text-sm">{errors.selectedModel}</p>}
            </div>
            <div className="form-section">
              <label className="form-label">Bought In *</label>
              <input
                type="text"
                value={boughtIn}
                onChange={(e) => {
                  setBoughtIn(e.target.value);
                  setErrors({ ...errors, boughtIn: null });
                }}
                className={`border p-2 rounded-md w-full mb-2 ${errors.boughtIn ? 'border-red-500' : 'border-gray-300'}`}
                required
              />
              {errors.boughtIn && <p className="text-red-500 text-sm">{errors.boughtIn}</p>}
            </div>
            <div className="form-section">
              <label className="form-label">Bought At *</label>
              <input
                type="text"
                value={boughtAt}
                onChange={(e) => {
                  setBoughtAt(e.target.value);
                  setErrors({ ...errors, boughtAt: null });
                }}
                className={`border p-2 rounded-md w-full mb-2 ${errors.boughtAt ? 'border-red-500' : 'border-gray-300'}`}
                required
              />
              {errors.boughtAt && <p className="text-red-500 text-sm">{errors.boughtAt}</p>}
            </div>
            <div className="form-section">
              <label className="form-label">Color *</label>
              <input
                type="text"
                value={color}
                onChange={(e) => {
                  setColor(e.target.value);
                  setErrors({ ...errors, color: null });
                }}
                className={`border p-2 rounded-md w-full mb-2 ${errors.color ? 'border-red-500' : 'border-gray-300'}`}
                required
              />
              {errors.color && <p className="text-red-500 text-sm">{errors.color}</p>}
            </div>
            <div className="form-section">
              <label className="form-label">VIN</label>
              <textarea value={vin} onChange={(e) => setVin(e.target.value)} />
            </div>
            <div className="form-section">
              <label className="form-label">Title *</label>
              <select
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setErrors({ ...errors, title: null });
                }}
                className={`border p-2 rounded-md w-full mb-2 ${errors.title ? 'border-red-500' : 'border-gray-300'}`}
                required
              >
                <option value="">Select Title Status</option>
                <option value="clean">Clean</option>
                <option value="salvage">Salvage</option>
                <option value="rebuilt">Rebuilt</option>
              </select>
              {errors.title && <p className="text-red-500 text-sm">{errors.title}</p>}
            </div>
            <div className="form-section">
              <label className="form-label">Mileage *</label>
              <input
                type="text"
                value={mileage}
                onChange={(e) => {
                  setMileage(e.target.value);
                  setErrors({ ...errors, mileage: null });
                }}
                className={`border p-2 rounded-md w-full mb-2 ${errors.mileage ? 'border-red-500' : 'border-gray-300'}`}
                required
              />
              {errors.mileage && <p className="text-red-500 text-sm">{errors.mileage}</p>}
            </div>
            <div className="form-section">
              <label className="form-label">ZIP Code *</label>
              <input
                type="text"
                value={zip}
                onChange={(e) => {
                  setZip(e.target.value);
                  setErrors({ ...errors, zip: null });
                }}
                className={`border p-2 rounded-md w-full mb-2 ${errors.zip ? 'border-red-500' : 'border-gray-300'}`}
                required
              />
              {errors.zip && <p className="text-red-500 text-sm">{errors.zip}</p>}
            </div>
            <div className="form-section">
              <label className="form-label">State *</label>
              <select
                value={state}
                onChange={(e) => {
                  setState(e.target.value);
                  setErrors({ ...errors, state: null });
                }}
                className={`border p-2 rounded-md w-full mb-2 ${errors.state ? 'border-red-500' : 'border-gray-300'}`}
                required
              >
                <option value="">Select State</option>
                {usStates.map((state, index) => (
                  <option key={index} value={state}>
                    {state}
                  </option>
                ))}
              </select>
              {errors.state && <p className="text-red-500 text-sm">{errors.state}</p>}
            </div>
            <div className="form-section">
              <label className="form-label">City *</label>
              <input
                type="text"
                value={city}
                onChange={(e) => {
                  setCity(e.target.value);
                  setErrors({ ...errors, city: null });
                }}
                className={`border p-2 rounded-md w-full mb-2 ${errors.city ? 'border-red-500' : 'border-gray-300'}`}
                required
              />
              {errors.city && <p className="text-red-500 text-sm">{errors.city}</p>}
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
            <button
              onClick={goToNextSection}
              className="btn flex items-center justify-center mt-4"
            >
              Next
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" className="size-6 ml-2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </button>
          </>
        )}

        {currentSection === 2 && (
          <>
            <div className="form-section">
              <label className="form-label">Front Image *</label>
              <input
                type="file"
                onChange={(e) => {
                  setFrontImage(e.target.files[0]);
                  setErrors({ ...errors, frontImage: null }); // Clear error
                }}
                className={`border p-2 rounded-md w-full mb-2 ${errors.frontImage ? 'border-red-500' : 'border-gray-300'}`}
                required
              />
              {errors.frontImage && <p className="text-red-500 text-sm">{errors.frontImage}</p>}
            </div>
            <div className="form-section">
              <label className="form-label">Left Image</label>
              <input type="file" onChange={(e) => setLeftImage(e.target.files[0])} />
            </div>
            <div className="form-section">
              <label className="form-label">Right Image</label>
              <input type="file" onChange={(e) => setRightImage(e.target.files[0])} />
            </div>
            <div className="form-section">
              <label className="form-label">Rear Image</label>
              <input type="file" onChange={(e) => setRearImage(e.target.files[0])} />
            </div>
            <div className="form-section">
              <label className="form-label">Dashboard Image</label>
              <input type="file" onChange={(e) => setDashboardImage(e.target.files[0])} />
            </div>
            {vehicleType === 'car' && (
              <>
                <div className="form-section">
                  <label className="form-label">Left Front Wheel Image</label>
                  <input type="file" onChange={(e) => setLeftFrontWheelImage(e.target.files[0])} />
                </div>
                <div className="form-section">
                  <label className="form-label">Right Front Wheel Image</label>
                  <input type="file" onChange={(e) => setRightFrontWheelImage(e.target.files[0])} />
                </div>
                <div className="form-section">
                  <label className="form-label">Left Rear Wheel Image</label>
                  <input type="file" onChange={(e) => setLeftRearWheelImage(e.target.files[0])} />
                </div>
                <div className="form-section">
                  <label className="form-label">Right Rear Wheel Image</label>
                  <input type="file" onChange={(e) => setRightRearWheelImage(e.target.files[0])} />
                </div>
                <div className="form-section">
                  <label className="form-label">Engine Bay Image</label>
                  <input type="file" onChange={(e) => setEngineBayImage(e.target.files[0])} />
                </div>
              </>
            )}
            {vehicleType === 'motorcycle' && (
              <>
                <div className="form-section">
                  <label className="form-label">Chain Image</label>
                  <input type="file" onChange={(e) => setChainImage(e.target.files[0])} />
                </div>
                <div className="form-section">
                  <label className="form-label">Front Wheel Image</label>
                  <input type="file" onChange={(e) => setFrontWheelImage(e.target.files[0])} />
                </div>
                <div className="form-section">
                  <label className="form-label">Rear Wheel Image</label>
                  <input type="file" onChange={(e) => setRearWheelImage(e.target.files[0])} />
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
            <div className="flex justify-between mt-4">
              <button
                onClick={goToPreviousSection}
                className="btn flex items-center justify-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" className="size-6 mr-2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
                </svg>
                Previous
              </button>
              <button
                onClick={handleValidate}
                className="btn flex items-center justify-center"
              >
                Validate
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" className="size-6 ml-2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AddVehiclePage;