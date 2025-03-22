import { useState, useEffect } from "react";
import { useRouter } from 'next/router';
import { db, storage } from '../lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, deleteObject, getDownloadURL } from 'firebase/storage';

const ModifyVehiclePage = () => {
  const router = useRouter();
  const { id } = router.query;

  const [step, setStep] = useState(1); // Step 1: Fields, Step 2: Images
  const [vehicleType, setVehicleType] = useState('');
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
  const [carFields, setCarFields] = useState({
    interiorColor: '',
    awd: false,
    packageLine: '',
    options: '',
  });
  const [motorcycleFields, setMotorcycleFields] = useState({
    cc: '',
    dropped: false,
  });
  const [images, setImages] = useState({
    frontImage: null,
    leftImage: null,
    rightImage: null,
    rearImage: null,
    dashboardImage: null,
    vehicleVideo: null,
    otherImages: [],
    leftFrontWheelImage: null,
    rightFrontWheelImage: null,
    leftRearWheelImage: null,
    rightRearWheelImage: null,
    engineBayImage: null,
    chainImage: null,
    frontWheelImage: null,
    rearWheelImage: null,
  });
  const [imagePreviews, setImagePreviews] = useState({});
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!id) return;

    const fetchVehicleData = async () => {
      try {
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

          if (data.vehicleType === 'car') {
            setCarFields({
              interiorColor: data.interiorColor || '',
              awd: data.awd || false,
              packageLine: data.packageLine || '',
              options: data.options || '',
            });
          } else if (data.vehicleType === 'motorcycle') {
            setMotorcycleFields({
              cc: data.cc || '',
              dropped: data.dropped || false,
            });
          }

          setImages({
            frontImage: data.frontImage || null,
            leftImage: data.leftImage || null,
            rightImage: data.rightImage || null,
            rearImage: data.rearImage || null,
            dashboardImage: data.dashboardImage || null,
            vehicleVideo: data.vehicleVideo || null,
            otherImages: data.otherImages || [],
            leftFrontWheelImage: data.leftFrontWheelImage || null,
            rightFrontWheelImage: data.rightFrontWheelImage || null,
            leftRearWheelImage: data.leftRearWheelImage || null,
            rightRearWheelImage: data.rightRearWheelImage || null,
            engineBayImage: data.engineBayImage || null,
            chainImage: data.chainImage || null,
            frontWheelImage: data.frontWheelImage || null,
            rearWheelImage: data.rearWheelImage || null,
          });

          setImagePreviews({
            frontImage: data.frontImage || '',
            leftImage: data.leftImage || '',
            rightImage: data.rightImage || '',
            rearImage: data.rearImage || '',
            dashboardImage: data.dashboardImage || '',
            vehicleVideo: data.vehicleVideo || '',
            otherImages: Array.isArray(data.otherImages) ? data.otherImages : [],
            leftFrontWheelImage: data.leftFrontWheelImage || '',
            rightFrontWheelImage: data.rightFrontWheelImage || '',
            leftRearWheelImage: data.leftRearWheelImage || '',
            rightRearWheelImage: data.rightRearWheelImage || '',
            engineBayImage: data.engineBayImage || '',
            chainImage: data.chainImage || '',
            frontWheelImage: data.frontWheelImage || '',
            rearWheelImage: data.rearWheelImage || '',
          });
        }
        setLoading(false);
      } catch (error) {
        console.error("Error fetching vehicle:", error);
        setLoading(false);
      }
    };

    fetchVehicleData();
  }, [id]);

  const handleUpdateVehicle = async () => {
    if (!id) return;

    setUploading(true);

    try {
      const updatedData = {
        vehicleType,
        ...commonFields,
        year: Number(commonFields.year),
        boughtIn: Number(commonFields.boughtIn),
        mileage: Number(commonFields.mileage),
        updatedAt: new Date(),
      };

      if (vehicleType === 'car') {
        Object.assign(updatedData, carFields);
      } else if (vehicleType === 'motorcycle') {
        Object.assign(updatedData, motorcycleFields);
      }

      const updatedImages = {};

      // Upload images
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

      for (const [key, file] of Object.entries(images)) {
        if (file && typeof file !== 'string') {
          updatedImages[key] = await uploadFile(file, `listing/${id}/photos/${key}`);
        }
      }

      await updateDoc(doc(db, "listing", id), { ...updatedData, ...updatedImages });
      alert("Vehicle details and images updated successfully!");
      router.push(`/vehicleCard_page?id=${id}`);
    } catch (error) {
      console.error("Error updating vehicle:", error);
      alert("Failed to update vehicle.");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteImage = async (key, index = null) => {
    try {
      if (key === 'otherImages' && index !== null) {
        const imageRef = ref(storage, `listing/${id}/photos/otherImages/${index}`);
        await deleteObject(imageRef);
        setImagePreviews((prev) => ({
          ...prev,
          otherImages: prev.otherImages.filter((_, i) => i !== index),
        }));
        setImages((prev) => ({
          ...prev,
          otherImages: prev.otherImages.filter((_, i) => i !== index),
        }));
      } else {
        const imageRef = ref(storage, `listing/${id}/photos/${key}`);
        await deleteObject(imageRef);
        setImagePreviews((prev) => ({ ...prev, [key]: null }));
        setImages((prev) => ({ ...prev, [key]: null }));
      }
      alert(`${key} deleted successfully.`);
    } catch (error) {
      console.error(`Error deleting ${key}:`, error);
      alert(`Failed to delete ${key}.`);
    }
  };

  const renderFieldsStep = () => (
    <div>
      <h1 className="text-3xl font-bold mb-6 text-center">Modify Vehicle Details</h1>
      <div className="form-container">
        {/* Common Fields */}
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
              <label className="form-label">Package Line</label>
              <input
                type="text"
                value={carFields.packageLine}
                onChange={(e) =>
                  setCarFields({ ...carFields, packageLine: e.target.value })
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
          onClick={() => setStep(2)}
          className="btn"
        >
          Next
        </button>
      </div>
    </div>
  );

  const renderImagesStep = () => (
    <div>
      <h1 className="text-3xl font-bold mb-6 text-center">Modify Vehicle Images</h1>
      <div className="form-container">
        {Object.keys(images).map((key) => (
          <div className="form-section" key={key}>
            <label className="form-label">{key.replace(/([A-Z])/g, ' $1')}</label>
            {key === 'otherImages' ? (
              imagePreviews.otherImages.map((url, index) => (
                <div key={index} className="flex items-center mb-2">
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 underline mr-2"
                  >
                    Other Image {index + 1}
                  </a>
                  <button
                    onClick={() => handleDeleteImage(key, index)}
                    className="text-red-500 font-bold"
                  >
                    ✕
                  </button>
                </div>
              ))
            ) : (
              imagePreviews[key] && (
                <div className="flex items-center mb-2">
                  <a
                    href={imagePreviews[key]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 underline mr-2"
                  >
                    {key}.png
                  </a>
                  <button
                    onClick={() => handleDeleteImage(key)}
                    className="text-red-500 font-bold"
                  >
                    ✕
                  </button>
                </div>
              )
            )}
            <input
              type="file"
              onChange={(e) =>
                key === 'otherImages'
                  ? setImages((prev) => ({
                      ...prev,
                      otherImages: [...prev.otherImages, ...Array.from(e.target.files)],
                    }))
                  : setImages({ ...images, [key]: e.target.files[0] })
              }
              multiple={key === 'otherImages'}
            />
          </div>
        ))}
        <button
          onClick={() => setStep(1)}
          className="btn"
        >
          Previous
        </button>
        <button
          onClick={handleUpdateVehicle}
          className="btn"
          disabled={uploading}
        >
          {uploading ? 'Uploading...' : 'Save'}
        </button>
      </div>
    </div>
  );

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen p-6 bg-gray-100 text-black">
      {step === 1 ? renderFieldsStep() : renderImagesStep()}
    </div>
  );
};

export default ModifyVehiclePage;
