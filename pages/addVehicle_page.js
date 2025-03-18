import { useState } from 'react'; // Removed useEffect import
import { useRouter } from 'next/router';
import { auth, db, storage } from '../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

const AddVehiclePage = () => {
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [mileage, setMileage] = useState('');
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const router = useRouter();

  const handleFileChange = (e) => {
    setImages(e.target.files);
  };

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
        make,
        model,
        year,
        mileage,
        uid: user.uid,
        createdAt: new Date(),
      };

      const docRef = await addDoc(collection(db, 'listing'), vehicleData);
      const vehicleId = docRef.id;

      const uploadPromises = Array.from(images).map(async (file, index) => {
        const fileName = `${vehicleId}-${index}`;
        const storageRef = ref(storage, `listing/${vehicleId}/photos/${fileName}`);
        const uploadTask = uploadBytesResumable(storageRef, file);

        return new Promise((resolve, reject) => {
          uploadTask.on(
            'state_changed',
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              console.log(`Image ${index + 1} upload is ${progress}% done`);
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
      });

      const imageUrls = await Promise.all(uploadPromises);
      await addDoc(collection(db, `listing/${vehicleId}/photos`), { urls: imageUrls });

      setUploading(false);
      router.push(`/vehicleCard_page?id=${vehicleId}`);
    } catch (error) {
      console.error("Error adding vehicle:", error);
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen p-6 bg-gray-100 text-black">
      <h1 className="text-3xl font-bold mb-6 text-center">Add Vehicle</h1>
      <div className="form-container">
        <div className="form-section">
          <label className="form-label">Make</label>
          <input
            type="text"
            value={make}
            onChange={(e) => setMake(e.target.value)}
            className="form-input"
          />
        </div>
        <div className="form-section">
          <label className="form-label">Model</label>
          <input
            type="text"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="form-input"
          />
        </div>
        <div className="form-section">
          <label className="form-label">Year</label>
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="form-input"
          />
        </div>
        <div className="form-section">
          <label className="form-label">Mileage</label>
          <input
            type="number"
            value={mileage}
            onChange={(e) => setMileage(e.target.value)}
            className="form-input"
          />
        </div>
        <div className="form-section">
          <label className="form-label">Images</label>
          <input
            type="file"
            multiple
            onChange={handleFileChange}
            className="form-input"
          />
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