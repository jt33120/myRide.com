import { useState, useEffect } from "react";
import { useRouter } from 'next/router';
import { db, storage } from '../lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, listAll, getDownloadURL, deleteObject, uploadBytesResumable } from 'firebase/storage';

const ModifyVehiclePage = () => {
  const router = useRouter();
  const { id } = router.query;

  // State to manage the current step (1: Fields, 2: Images)
  const [step, setStep] = useState(1);

  // State to manage vehicle type (car or motorcycle)
  const [vehicleType, setVehicleType] = useState('');

  // State to manage common fields for all vehicles
  const [commonFields, setCommonFields] = useState({
    make: '',
    model: '',
    year: '',
    boughtIn: '',
    boughtAt: '',
    color: '',
    vin: '',
    title: '',
    mileage: '',
    zip: '',
    state: '',
    city: '',
    tracked: false,
    garageKept: false,
    description: '',
    cosmeticDefaults: '',
    aftermarketMods: '',
  });

  // State to manage fields specific to cars
  const [carFields, setCarFields] = useState({
    interiorColor: '',
    awd: false,
    package: '',
    options: '',
  });

  // State to manage fields specific to motorcycles
  const [motorcycleFields, setMotorcycleFields] = useState({
    cc: '',
    dropped: false,
  });

  // State to manage vehicle images
  const [images, setImages] = useState({});

  // State to manage loading and uploading status
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // Fetch vehicle data and images when the page loads or the `id` changes
  useEffect(() => {
    if (!id) return;

    const fetchVehicleData = async () => {
      try {
        // Fetch vehicle data from Firestore
        const docRef = doc(db, "listing", id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setVehicleType(data.vehicleType || '');
          setCommonFields({
            make: data.make || '',
            model: data.model || '',
            year: data.year || '',
            boughtIn: data.boughtIn || '',
            boughtAt: data.boughtAt || '',
            color: data.color || '',
            vin: data.vin || '',
            title: data.title || '',
            mileage: data.mileage || '',
            zip: data.zip || '',
            state: data.state || '',
            city: data.city || '',
            tracked: data.tracked || false,
            garageKept: data.garageKept || false,
            description: data.description || '',
            cosmeticDefaults: data.cosmeticDefaults || '',
            aftermarketMods: data.aftermarketMods || '',
          });

          // Set specific fields based on vehicle type
          if (data.vehicleType === 'car') {
            setCarFields({
              interiorColor: data.interiorColor || '',
              awd: data.awd || false,
              package: data.package || '',
              options: data.options || '',
            });
          } else if (data.vehicleType === 'motorcycle') {
            setMotorcycleFields({
              cc: data.cc || '',
              dropped: data.dropped || false,
            });
          }
        }

        // Fetch images from Firebase Storage
        const photosRef = ref(storage, `listing/${id}/photos`);
        const photosList = await listAll(photosRef);
        const imageUrls = {};

        console.log("File names retrieved from Firebase Storage:");
        for (const item of photosList.items) {
          console.log(item.name); // Log each file name to the console
          const url = await getDownloadURL(item); // Get the download URL
          imageUrls[item.name] = { name: item.name, url }; // Store the file name and URL
        }

        setImages(imageUrls);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching vehicle data or images:", error);
        setLoading(false);
      }
    };

    fetchVehicleData();
  }, [id]);

  // Handle updating vehicle details and images
  const handleUpdateVehicle = async () => {
    if (!id) return;

    setUploading(true);

    try {
      // Prepare updated data for Firestore
      const updatedData = {
        vehicleType,
        ...commonFields,
        year: Number(commonFields.year),
        boughtIn: Number(commonFields.boughtIn),
        mileage: Number(commonFields.mileage),
        updatedAt: new Date(),
      };

      // Add specific fields based on vehicle type
      if (vehicleType === 'car') {
        Object.assign(updatedData, carFields);
      } else if (vehicleType === 'motorcycle') {
        Object.assign(updatedData, motorcycleFields);
      }

      // Write updated data to Firestore
      await updateDoc(doc(db, "listing", id), updatedData);

      // Upload images to Firebase Storage
      const uploadFile = async (file, path) => {
        const storageRef = ref(storage, path);
        const uploadTask = uploadBytesResumable(storageRef, file);

        return new Promise((resolve, reject) => {
          uploadTask.on(
            'state_changed',
            null,
            (error) => reject(error),
            async () => {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              resolve(downloadURL);
            }
          );
        });
      };

      const uploadPromises = Object.entries(images).map(async ([key, fileData]) => {
        if (fileData && fileData.file instanceof File) {
          const filePath = `listing/${id}/photos/${key}`;
          await uploadFile(fileData.file, filePath);
        }
      });

      await Promise.all(uploadPromises);

      alert("Vehicle details and images updated successfully!");
      router.push(`/vehicleCard_page?id=${id}`);
    } catch (error) {
      console.error("Error updating vehicle:", error);
      alert("Failed to update vehicle.");
    } finally {
      setUploading(false);
    }
  };

  // Handle deleting an image from Firebase Storage
  const handleDeleteImage = async (key) => {
    try {
      const imageRef = ref(storage, `listing/${id}/photos/${key}`);
      await deleteObject(imageRef);
      setImages((prev) => {
        const updatedImages = { ...prev };
        delete updatedImages[key];
        return updatedImages;
      });
      alert(`${key} deleted successfully.`);
    } catch (error) {
      console.error(`Error deleting ${key}:`, error);
      alert(`Failed to delete ${key}.`);
    }
  };

  // Render the form for modifying vehicle fields
  const renderFieldsStep = () => (
    <div>
      <h1 className="text-3xl font-bold mb-6 text-center">Modify Vehicle Details</h1>
      <div className="form-container">
        {/* Common Fields */}
        {/* Render input fields for common vehicle details */}
        <div className="form-section">
          <label className="form-label">Make</label>
          <input
            type="text"
            value={commonFields.make}
            onChange={(e) => setCommonFields({ ...commonFields, make: e.target.value })}
            className="border border-gray-300 p-2 rounded-md w-full mb-2"
          />
        </div>
        <div className="form-section">
          <label className="form-label">Model</label>
          <input
            type="text"
            value={commonFields.model}
            onChange={(e) =>
              setCommonFields({ ...commonFields, model: e.target.value })
            }
            className="border border-gray-300 p-2 rounded-md w-full mb-2"
          />
        </div>
        <div className="form-section">
          <label className="form-label">Year</label>
          <input
            type="number"
            value={commonFields.year}
            onChange={(e) =>
              setCommonFields({ ...commonFields, year: e.target.value })
            }
            className="border border-gray-300 p-2 rounded-md w-full mb-2"
          />
        </div>
        <div className="form-section">
          <label className="form-label">Mileage</label>
          <input
            type="number"
            value={commonFields.mileage}
            onChange={(e) =>
              setCommonFields({ ...commonFields, mileage: e.target.value })
            }
            className="border border-gray-300 p-2 rounded-md w-full mb-2"
          />
        </div>
        <div className="form-section">
          <label className="form-label">VIN</label>
          <input
            type="text"
            value={commonFields.vin}
            onChange={(e) =>
              setCommonFields({ ...commonFields, vin: e.target.value })
            }
            className="border border-gray-300 p-2 rounded-md w-full mb-2"
          />
        </div>
        <div className="form-section">
          <label className="form-label">Bought In</label>
          <input
            type="number"
            value={commonFields.boughtIn}
            onChange={(e) =>
              setCommonFields({ ...commonFields, boughtIn: e.target.value })
            }
            className="border border-gray-300 p-2 rounded-md w-full mb-2"
          />
        </div>
        <div className="form-section">
          <label className="form-label">Bought At</label>
          <input
            type="text"
            value={commonFields.boughtAt}
            onChange={(e) =>
              setCommonFields({ ...commonFields, boughtAt: e.target.value })
            }
            className="border border-gray-300 p-2 rounded-md w-full mb-2"
          />
        </div>
        <div className="form-section">
          <label className="form-label">Color</label>
          <input
            type="text"
            value={commonFields.color}
            onChange={(e) =>
              setCommonFields({ ...commonFields, color: e.target.value })
            }
            className="border border-gray-300 p-2 rounded-md w-full mb-2"
          />
        </div>
        <div className="form-section">
          <label className="form-label">Title</label>
          <input
            type="text"
            value={commonFields.title}
            onChange={(e) =>
              setCommonFields({ ...commonFields, title: e.target.value })
            }
            className="border border-gray-300 p-2 rounded-md w-full mb-2"
          />
        </div>
        <div className="form-section">
          <label className="form-label">ZIP</label>
          <input
            type="text"
            value={commonFields.zip}
            onChange={(e) =>
              setCommonFields({ ...commonFields, zip: e.target.value })
            }
            className="border border-gray-300 p-2 rounded-md w-full mb-2"
          />
        </div>
        <div className="form-section">
          <label className="form-label">State</label>
          <input
            type="text"
            value={commonFields.state}
            onChange={(e) =>
              setCommonFields({ ...commonFields, state: e.target.value })
            }
            className="border border-gray-300 p-2 rounded-md w-full mb-2"
          />
        </div>
        <div className="form-section">
          <label className="form-label">City</label>
          <input
            type="text"
            value={commonFields.city}
            onChange={(e) =>
              setCommonFields({ ...commonFields, city: e.target.value })
            }
            className="border border-gray-300 p-2 rounded-md w-full mb-2"
          />
        </div>
        <div className="form-section">
          <label className="form-label">Tracked</label>
          <input
            type="checkbox"
            checked={commonFields.tracked}
            onChange={(e) =>
              setCommonFields({ ...commonFields, tracked: e.target.checked })
            }
          />
        </div>
        <div className="form-section">
          <label className="form-label">Garage Kept</label>
          <input
            type="checkbox"
            checked={commonFields.garageKept}
            onChange={(e) =>
              setCommonFields({ ...commonFields, garageKept: e.target.checked })
            }
          />
        </div>
        <div className="form-section">
          <label className="form-label">Description</label>
          <textarea
            value={commonFields.description}
            onChange={(e) =>
              setCommonFields({ ...commonFields, description: e.target.value })
            }
            className="border border-gray-300 p-2 rounded-md w-full mb-2"
          />
        </div>
        <div className="form-section">
          <label className="form-label">Cosmetic Defaults</label>
          <textarea
            value={commonFields.cosmeticDefaults}
            onChange={(e) =>
              setCommonFields({
                ...commonFields,
                cosmeticDefaults: e.target.value,
              })
            }
            className="border border-gray-300 p-2 rounded-md w-full mb-2"
          />
        </div>
        <div className="form-section">
          <label className="form-label">Aftermarket Mods</label>
          <textarea
            value={commonFields.aftermarketMods}
            onChange={(e) =>
              setCommonFields({
                ...commonFields,
                aftermarketMods: e.target.value,
              })
            }
            className="border border-gray-300 p-2 rounded-md w-full mb-2"
          />
        </div>

        {/* Conditional Fields for Cars */}
        {vehicleType === 'car' && (
          <>
            <div className="form-section">
              <label className="form-label">Interior Color</label>
              <input
                type="text"
                value={carFields.interiorColor}
                onChange={(e) =>
                  setCarFields({ ...carFields, interiorColor: e.target.value })
                }
                className="border border-gray-300 p-2 rounded-md w-full mb-2"
              />
            </div>
            <div className="form-section">
              <label className="form-label">AWD</label>
              <input
                type="checkbox"
                checked={carFields.awd}
                onChange={(e) =>
                  setCarFields({ ...carFields, awd: e.target.checked })
                }
              />
            </div>
            <div className="form-section">
              <label className="form-label">Package / Line</label>
              <input
                type="text"
                value={carFields.package}
                onChange={(e) =>
                  setCarFields({ ...carFields, package: e.target.value })
                }
                className="border border-gray-300 p-2 rounded-md w-full mb-2"
              />
            </div>
            <div className="form-section">
              <label className="form-label">Options</label>
              <input
                type="text"
                value={carFields.options}
                onChange={(e) =>
                  setCarFields({ ...carFields, options: e.target.value })
                }
                className="border border-gray-300 p-2 rounded-md w-full mb-2"
              />
            </div>
          </>
        )}

        {/* Conditional Fields for Motorcycles */}
        {vehicleType === 'motorcycle' && (
          <>
            <div className="form-section">
              <label className="form-label">CC</label>
              <input
                type="text"
                value={motorcycleFields.cc}
                onChange={(e) =>
                  setMotorcycleFields({ ...motorcycleFields, cc: e.target.value })
                }
                className="border border-gray-300 p-2 rounded-md w-full mb-2"
              />
            </div>
            <div className="form-section">
              <label className="form-label">Dropped</label>
              <input
                type="checkbox"
                checked={motorcycleFields.dropped}
                onChange={(e) =>
                  setMotorcycleFields({
                    ...motorcycleFields,
                    dropped: e.target.checked,
                  })
                }
              />
            </div>
          </>
        )}

        <button
          onClick={() => setStep(2)} // Move to the next step (Images)
          className="flex items-center justify-center bg-gray-200 text-black px-6 py-2 rounded-full hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
          title="Next Step"
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
              d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
            />
          </svg>
          Next
        </button>
      </div>
    </div>
  );

  // Render the form for modifying vehicle images
  const renderImagesStep = () => (
    <div>
      <h1 className="text-3xl font-bold mb-6 text-center">Modify Vehicle Images</h1>
      <div className="form-container">

        {[
          'frontImage',
          'leftImage',
          'rightImage',
          'rearImage',
          'dashboardImage',
          ...(vehicleType === 'car'
            ? [
                'leftFrontWheelImage',
                'rightFrontWheelImage',
                'leftRearWheelImage',
                'rightRearWheelImage',
                'engineBayImage',
              ]
            : []),
          ...(vehicleType === 'motorcycle'
            ? ['chainImage', 'frontWheelImage', 'rearWheelImage']
            : []),
          'vehicleVideo',
          'otherImage', // Ensure these are the last fields
        ].map((key) => (
          <div className="form-section" key={key}>
            <label className="form-label">{key.replace(/([A-Z])/g, ' $1')}</label>
            {Object.keys(images).some((imageKey) => imageKey.replace('.png', '') === key) ? (
              <div className="flex items-center mb-2">
                <a
                  href={images[`${key}.png`]?.url} // Use the URL from the images object
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 underline mr-2"
                >
                  {`${key}.png`}
                </a>
                <button
                  onClick={() => handleDeleteImage(`${key}.png`)} // Pass the key with .png extension
                  className="text-red-500 font-bold"
                >
                  ✕
                </button>
              </div>
            ) : (
              <p className="text-gray-500 mb-2">No image yet</p>
            )}
            <input
              type="file"
              onChange={(e) =>
                setImages((prev) => ({
                  ...prev,
                  [key]: { file: e.target.files[0], name: e.target.files[0]?.name },
                }))
              }
            />
          </div>
        ))}
        <button
          onClick={() => setStep(1)} // Move back to the previous step (Fields)
          className="flex items-center justify-center bg-gray-200 text-black px-6 py-2 rounded-full hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
          title="Previous Step"
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
              d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18"
            />
          </svg>
          Previous
        </button>
        <button
          onClick={handleUpdateVehicle} // Save the updated vehicle details and images
          className="flex items-center justify-center bg-black text-white px-6 py-2 rounded-full hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2"
          title="Save Changes"
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
              d="m4.5 12.75 6 6 9-13.5"
            />
          </svg>
          Save
        </button>
      </div>
    </div>
  );

  // Show a loading message while data is being fetched
  if (loading) {
    return <div>Loading...</div>;
  }

  // Render the appropriate step (Fields or Images)
  return (
    <div className="min-h-screen p-6 bg-gray-100 text-black relative">
      {/* Return Button */}
      <button
        onClick={() => router.push(`/vehicleCard_page?id=${id}`)}
        className="return-button"
        title="Back to Vehicle Card"
      >
        ⏎
      </button>
      {step === 1 ? renderFieldsStep() : renderImagesStep()}
    </div>
  );
};

export default ModifyVehiclePage;