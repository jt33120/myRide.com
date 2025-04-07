import { useState } from "react";
import { auth, db, storage } from "../lib/firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { useRouter } from "next/router";
import "react-datepicker/dist/react-datepicker.css";
import styles from '../styles/Auth.module.css';
import Link from 'next/link'; // Import Link for navigation

export default function SignUp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [dob, setDob] = useState(null);
  const [image, setImage] = useState(null);
  const [error] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    profileImage: "",
    email: "",
    password: "",
    phoneNumber: "",
  });
  const [formError, setFormError] = useState(""); // State for form-level error message
  const router = useRouter();

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password) => {
    return password.length >= 6;
  };

  const validatePhoneNumber = (phoneNumber) => {
    return /^\d{10}$/.test(phoneNumber);
  };

  const handleSignUp = async () => {
    setLoading(true);
    setErrors({}); // Reset errors

    const emailValid = validateEmail(email);
    const passwordValid = validatePassword(password);
    const phoneValid = validatePhoneNumber(phoneNumber);
    const profilePictureValid = !!image; // Ensure profile picture is uploaded
    const dateOfBirthValid = !!dob && !isNaN(new Date(dob).getTime()); // Ensure date of birth is valid

    // Set error messages for empty or invalid fields
    setErrors({
      firstName: firstName ? "" : "This field is mandatory.",
      lastName: lastName ? "" : "This field is mandatory.",
      dateOfBirth: dateOfBirthValid ? "" : "This field is mandatory.", // Fix validation for date of birth
      profileImage: profilePictureValid ? "" : "Profile picture is mandatory.",
      email: email ? (emailValid ? "" : "Invalid email format.") : "This field is mandatory.",
      password: password ? (passwordValid ? "" : "Password must be at least 6 characters.") : "This field is mandatory.",
      phoneNumber: phoneNumber ? (phoneValid ? "" : "Phone number must be 10 digits.") : "This field is mandatory.",
    });

    // Check if any field is invalid
    if (!firstName || !lastName || !dateOfBirthValid || !profilePictureValid || !emailValid || !passwordValid || !phoneValid) {
      setFormError("Fields are missing or incorrect, please check.");
      setLoading(false);
      return;
    }

    try {
      // Create user in Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Automatically set the inviter field to "frenchy"
      const userData = {
        firstName,
        lastName,
        middleName,
        dob,
        email,
        phoneNumber,
        inviter: "frenchy", // Set inviter to "frenchy"
        rating: 5, // Initialize rating at 5
        vehicles: [], // Initialize an empty vehicles array
        createdAt: new Date(),
      };

      // Upload profile picture to Firebase Storage
      const profilePicRef = ref(storage, `members/${user.uid}/profilepicture.png`);
      const uploadTask = uploadBytesResumable(profilePicRef, image);

      await new Promise((resolve, reject) => {
        uploadTask.on(
          "state_changed",
          null,
          (error) => reject(error),
          async () => {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

            // Save user data to Firestore
            await setDoc(doc(db, "members", user.uid), {
              ...userData,
              profileImage: downloadURL,
            });

            resolve();
          }
        );
      });

      alert("Sign up successful!");
      router.push("/myDashboard_page");
    } catch (error) {
      console.error("Error during sign up:", error);

      // Handle Firebase errors
      switch (error.code) {
        case "auth/email-already-in-use":
          setErrors({ ...errors, email: "This email is already registered. Please use a different email." });
          setFormError("Fields are missing or incorrect, please check.");
          break;
        case "auth/weak-password":
          setErrors({ ...errors, password: "Password is too weak. Please choose a stronger password." });
          setFormError("Fields are missing or incorrect, please check.");
          break;
        default:
          alert("An unexpected error occurred. Please try again.");
          break;
      }
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setErrors((prevErrors) => ({ ...prevErrors, profileImage: "" })); // Clear error when a file is selected
    }
  };

  return (
    <div className={styles.authContainer}>
      <p className="text-center mb-4">
        Already have an account?{' '}
        <Link href="/login_page" className="text-blue-500 hover:underline">
          Sign in!
        </Link>
      </p>
      <h2 className="text-3xl font-bold text-center mb-6">Register</h2>
      {error && <p className="text-red-500">{error}</p>}

      {/* Form Fields */}
      <div className="form-section">
        <label className="form-label">First Name *</label>
        <input
          type="text"
          value={firstName}
          onChange={(e) => {
            setFirstName(e.target.value);
            setErrors({ ...errors, firstName: e.target.value ? "" : "This field is mandatory." });
          }}
          className="border border-gray-300 p-3 rounded-md w-full mb-4"
        />
        {errors.firstName && <p className="text-red-500 text-sm">{errors.firstName}</p>}
      </div>
      <div className="form-section">
        <label className="form-label">Last Name *</label>
        <input
          type="text"
          value={lastName}
          onChange={(e) => {
            setLastName(e.target.value);
            setErrors({ ...errors, lastName: e.target.value ? "" : "This field is mandatory." });
          }}
          className="border border-gray-300 p-3 rounded-md w-full mb-4"
        />
        {errors.lastName && <p className="text-red-500 text-sm">{errors.lastName}</p>}
      </div>
      <div className="form-section">
        <label className="form-label">Middle Name</label>
        <input
          type="text"
          value={middleName}
          onChange={(e) => setMiddleName(e.target.value)}
          className="border border-gray-300 p-3 rounded-md w-full mb-4"
        />
      </div>
      <div className="form-section">
        <label className="form-label">Date of Birth *</label>
        <input
          type="date"
          value={dob ? dob : ""} // Ensure valid date format or empty string
          onChange={(e) => {
            const inputDate = e.target.value;
            const parsedDate = new Date(inputDate);

            if (!isNaN(parsedDate.getTime())) {
              setDob(inputDate); // Set valid date
              setErrors((prevErrors) => ({
                ...prevErrors,
                dateOfBirth: "", // Clear error if date is valid
              }));
            } else {
              setDob(""); // Reset date if invalid
              setErrors((prevErrors) => ({
                ...prevErrors,
                dateOfBirth: "Invalid date format. Please use the date picker.",
              }));
            }
          }}
          className="border border-gray-300 p-3 rounded-md w-full mb-4"
        />
        {errors.dateOfBirth && <p className="text-red-500 text-sm">{errors.dateOfBirth}</p>}
      </div>
      <div className="form-section">
        <label className="form-label">Phone Number *</label>
        <input
          type="text"
          placeholder="Phone Number"
          value={phoneNumber}
          onChange={(e) => {
            setPhoneNumber(e.target.value);
            setErrors({ ...errors, phoneNumber: validatePhoneNumber(e.target.value) ? "" : "Phone number must be 10 digits." });
          }}
          className="border border-gray-300 p-3 rounded-md w-full mb-4"
          required
        />
        {errors.phoneNumber && <p className="text-red-500 text-sm">{errors.phoneNumber}</p>}
      </div>
      <div className="form-section">
        <label className="form-label">Email *</label>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setErrors({ ...errors, email: validateEmail(e.target.value) ? "" : "Invalid email format." });
          }}
          className="border border-gray-300 p-3 rounded-md w-full mb-4"
          required
        />
        {errors.email && <p className="text-red-500 text-sm">{errors.email}</p>}
      </div>
      <div className="form-section">
        <label className="form-label">Password *</label>
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setErrors({ ...errors, password: validatePassword(e.target.value) ? "" : "Password must be at least 6 characters." });
          }}
          className="border border-gray-300 p-3 rounded-md w-full mb-4"
          required
        />
        {errors.password && <p className="text-red-500 text-sm">{errors.password}</p>}
      </div>
      <div className="form-section">
        <label className="form-label">Profile Picture *</label>
        <p className="text-xs text-gray-500"> If you can crop it to square format for the moment...</p>
        <input
          type="file"
          onChange={handleImageChange}
          accept="image/*"
          className="border border-gray-300 p-3 rounded-md w-full mb-4"
          required
        />
        {errors.profileImage && <p className="text-red-500 text-sm">{errors.profileImage}</p>}
      </div>

      {/* Register Button */}
      {formError && <p className="text-red-500 text-sm mb-4">{formError}</p>} {/* Display form-level error */}
      <button
        onClick={handleSignUp}
        disabled={loading}
        className="w-full py-3 rounded-md text-white font-semibold bg-gradient-to-r from-pink-500 to-purple-700 hover:from-pink-600 hover:to-purple-800 transition-all"
      >
        {loading ? "Registering..." : "Register"}
      </button>
  
      <p className="text-sm mt-5 text-center text-gray-500">
        To come: cropping tool, ID verification, and phone confirmation will be required later.
      </p>
    </div>
  );
}