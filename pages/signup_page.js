import { useState } from "react";
import { auth, db, storage } from "../lib/firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { collection, query, where, getDocs, doc, setDoc } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { useRouter } from "next/router";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import styles from '../styles/Auth.module.css';
import { Cropper as ReactCropper } from 'react-cropper'; // Import the cropper component with a unique name
import Modal from 'react-modal'; // Import the Modal component

export default function SignUp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [dob, setDob] = useState(null);
  const [zipCode, setZipCode] = useState("");
  const [state, setState] = useState("");
  const [image, setImage] = useState(null);
  const [error, setError] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [cropper, setCropper] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false); // Modal open state
  const router = useRouter();

  const handleRegister = async () => {
    if (!inviteCode) return setError("You need an invite code!");
    if (!image) return setError("You must upload a profile image!");

    const membersQuery = query(collection(db, "members"), where("invitationcode", "==", inviteCode));
    const querySnapshot = await getDocs(membersQuery);

    if (querySnapshot.empty) return setError("Invalid invite code!");

    try {
      if (!email || !email.includes("@")) {
        return setError("Please provide a valid email!");
      }

      if (password.length < 6) {
        return setError("Password should be at least 6 characters!");
      }

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const invitationCode = `MYRIDE-SP-${userCredential.user.uid}`;
      const inviterUID = querySnapshot.docs[0].data().uid;

      // Resize the image to 300x300 using a canvas
      const resizedImage = await resizeImage(image, 300, 300);

      const storageRef = ref(storage, `members/${userCredential.user.uid}/profilepicture.png`);
      const uploadTask = uploadBytesResumable(storageRef, resizedImage);

      uploadTask.on(
        "state_changed",
        () => {},
        (err) => {
          setError(err.message);
        },
        async () => {
          const imageUrl = await getDownloadURL(uploadTask.snapshot.ref);

          await setDoc(doc(db, "members", userCredential.user.uid), {
            email,
            firstName,
            lastName,
            middleName,
            phoneNumber,
            dob,
            zipCode,
            state,
            inviter: inviterUID,
            rating: 5,
            uid: userCredential.user.uid,
            invitationcode: invitationCode,
            profileImage: imageUrl,
          });

          await setDoc(doc(db, "members", querySnapshot.docs[0].id), { used: true }, { merge: true });

          router.push("/myDashboard_page");
        }
      );
    } catch (error) {
      setError(error.message);
    }
  };

  const resizeImage = (file, width, height) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => {
            resolve(blob);
          }, "image/png");
        };
        img.onerror = reject;
        img.src = event.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setPreviewUrl(reader.result);
      reader.readAsDataURL(file);
      setIsModalOpen(true); // Open modal when image is selected
    }
  };

  const handleCrop = () => {
    if (cropper) {
      cropper.getCroppedCanvas().toBlob((blob) => {
        setCroppedImage(blob);
        setIsModalOpen(false); // Close modal after cropping
      });
    }
  };

  return (
    <div className={styles.authContainer}>
      <h2>Register</h2>
      {error && <p className="text-red-500">{error}</p>}

      <input type="text" placeholder="First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
      <input type="text" placeholder="Last Name" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
      <input type="text" placeholder="Middle Name (optional)" value={middleName} onChange={(e) => setMiddleName(e.target.value)} />
      <input type="text" placeholder="Phone Number" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} required />
      <label>Date of Birth</label>
      <DatePicker selected={dob} onChange={(date) => setDob(date)} dateFormat="MM/dd/yy" placeholderText="MM/DD/YY" className="input" required />
      <input type="text" placeholder="Zip Code" value={zipCode} onChange={(e) => setZipCode(e.target.value)} required />
      <label>State</label>
      <select value={state} onChange={(e) => setState(e.target.value)} required>
        <option value="">Select your state</option>
        <option value="AL">Alabama</option>
        <option value="AK">Alaska</option>
        <option value="AZ">Arizona</option>
        <option value="AR">Arkansas</option>
        <option value="CA">California</option>
        <option value="CO">Colorado</option>
        <option value="CT">Connecticut</option>
        <option value="DE">Delaware</option>
        <option value="FL">Florida</option>
        <option value="GA">Georgia</option>
        <option value="HI">Hawaii</option>
        <option value="ID">Idaho</option>
        <option value="IL">Illinois</option>
        <option value="IN">Indiana</option>
        <option value="IA">Iowa</option>
        <option value="KS">Kansas</option>
        <option value="KY">Kentucky</option>
        <option value="LA">Louisiana</option>
        <option value="ME">Maine</option>
        <option value="MD">Maryland</option>
        <option value="MA">Massachusetts</option>
        <option value="MI">Michigan</option>
        <option value="MN">Minnesota</option>
        <option value="MS">Mississippi</option>
        <option value="MO">Missouri</option>
        <option value="MT">Montana</option>
        <option value="NE">Nebraska</option>
        <option value="NV">Nevada</option>
        <option value="NH">New Hampshire</option>
        <option value="NJ">New Jersey</option>
        <option value="NM">New Mexico</option>
        <option value="NY">New York</option>
        <option value="NC">North Carolina</option>
        <option value="ND">North Dakota</option>
        <option value="OH">Ohio</option>
        <option value="OK">Oklahoma</option>
        <option value="OR">Oregon</option>
        <option value="PA">Pennsylvania</option>
        <option value="RI">Rhode Island</option>
        <option value="SC">South Carolina</option>
        <option value="SD">South Dakota</option>
        <option value="TN">Tennessee</option>
        <option value="TX">Texas</option>
        <option value="UT">Utah</option>
        <option value="VT">Vermont</option>
        <option value="VA">Virginia</option>
        <option value="WA">Washington</option>
        <option value="WV">West Virginia</option>
        <option value="WI">Wisconsin</option>
        <option value="WY">Wyoming</option>
      </select>
      <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      <input type="text" placeholder="Invite Code" value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} required />
      <input type="file" onChange={handleImageChange} accept="image/*" required />

      {/* Modal for Image Cropper */}
      <Modal isOpen={isModalOpen} onRequestClose={() => setIsModalOpen(false)} contentLabel="Crop Profile Image">
        <div>
        <ReactCropper
          src={previewUrl}
          style={{ height: 400, width: "100%" }}
          aspectRatio={1}
          guides={false}
          ref={(cropper) => setCropper(cropper)}
          className="cropper"
        />
          <button onClick={handleCrop}>Crop Image</button>
        </div>

        
      </Modal>

      <button onClick={handleRegister}>Register</button>
  
      <p className="text-sm mt-5 text-center text-gray-500">
        ID verification and phone confirmation will be required later. For each sponsored friend, you’ll get $10 offered on the app!
      </p>
    </div>
  );
}
