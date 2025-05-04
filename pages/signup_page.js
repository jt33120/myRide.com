import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { auth, db, storage } from "../lib/firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";

export default function SignUp() {
  // ────────────────────────────────────────────────────────────────────────────────
  // State hooks
  // ────────────────────────────────────────────────────────────────────────────────
  const [email, setEmail] = useState("");            // Email address / Adresse e-mail
  const [password, setPassword] = useState("");      // Password / Mot de passe
  const [firstName, setFirstName] = useState("");    // First Name / Prénom
  const [lastName, setLastName] = useState("");      // Last Name / Nom
  const [middleName, setMiddleName] = useState("");  // Middle Name / Deuxième prénom
  const [phoneNumber, setPhoneNumber] = useState(""); // Phone number / Téléphone
  const [dob, setDob] = useState("");                // Date of Birth / Date de naissance
  const [image, setImage] = useState(null);          // Profile image file / Fichier image
  const [loading, setLoading] = useState(false);     // Loading indicator / Indicateur de chargement
  const [errors, setErrors] = useState({});          // Field errors / Erreurs des champs
  const [formError, setFormError] = useState("");    // Form-level error / Erreur générale du formulaire

  const router = useRouter();

  // ────────────────────────────────────────────────────────────────────────────────
  // Validation helpers
  // ────────────────────────────────────────────────────────────────────────────────
  const validateEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  const validatePassword = (p) => p.length >= 6;
  const validatePhone = (n) => /^\d{10}$/.test(n);

  // ────────────────────────────────────────────────────────────────────────────────
  // Handle file input change / Gestion du changement de fichier
  // ────────────────────────────────────────────────────────────────────────────────
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setErrors((prev) => ({ ...prev, profileImage: "" })); // clear previous error
    }
  };

  // ────────────────────────────────────────────────────────────────────────────────
  // Main sign-up logic / Logique principale d'inscription
  // ────────────────────────────────────────────────────────────────────────────────
  const handleSignUp = async () => {
    setLoading(true);
    setErrors({});
    setFormError("");

    // Validate fields / Validation des champs
    const newErrors = {};
    if (!firstName) newErrors.firstName = "Required field";            // Champ obligatoire
    if (!lastName) newErrors.lastName = "Required field";              // Champ obligatoire
    if (!dob) newErrors.dob = "Required field";                        // Champ obligatoire
    if (!image) newErrors.profileImage = "Required field";             // Champ obligatoire
    if (!email) newErrors.email = "Required field";                    // Champ obligatoire
    else if (!validateEmail(email)) newErrors.email = "Invalid format"; // Format invalide
    if (!password) newErrors.password = "Required field";              // Champ obligatoire
    else if (!validatePassword(password)) newErrors.password = "At least 6 characters";
    if (!phoneNumber) newErrors.phoneNumber = "Required field";        // Champ obligatoire
    else if (!validatePhone(phoneNumber)) newErrors.phoneNumber = "10 digits required";

    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      setFormError("Some fields are incorrect 🙁"); // Certains champs sont incorrects
      setLoading(false);
      return;
    }

    try {
      // Create user account / Création du compte
      const { user } = await createUserWithEmailAndPassword(auth, email, password);

      // Upload profile image / Téléchargement de l'image
      const storageRef = ref(storage, `members/${user.uid}/profilepicture.png`);
      const uploadTask = uploadBytesResumable(storageRef, image);

      await new Promise((res, rej) =>
        uploadTask.on(
          "state_changed",
          null,
          rej,
          async () => {
            const url = await getDownloadURL(uploadTask.snapshot.ref);
            // Save user document in Firestore / Enregistrement Firestore
            await setDoc(doc(db, "members", user.uid), {
              firstName,
              lastName,
              middleName,
              dob,
              email,
              phoneNumber,
              inviter: "frenchy",
              rating: 5,
              vehicles: [],
              profileImage: url,
              createdAt: new Date(),
            });
            res();
          }
        )
      );

      // Redirect to vehicles page / Redirection vers la page des véhicules
      router.push("/myVehicles_page");
    } catch (err) {
      console.error(err);
      // Handle Firebase errors / Gestion des erreurs Firebase
      if (err.code === "auth/email-already-in-use") {
        setErrors({ email: "Email already in use" });       // Email déjà utilisé
        setFormError("Please check your information.");     // Vérifiez vos informations
      } else if (err.code === "auth/weak-password") {
        setErrors({ password: "Weak password" });            // Mot de passe trop faible
        setFormError("Please check your information.");     // Vérifiez vos informations
      } else {
        alert("Unexpected error occurred. Please try again."); // Erreur inattendue
      }
    } finally {
      setLoading(false);
    }
  };

  // ────────────────────────────────────────────────────────────────────────────────
  // JSX return
  // ────────────────────────────────────────────────────────────────────────────────
    return (
      <div className="flex items-center justify-center min-h-screen p-4 bg-gray-100">
        <div className="relative w-full max-w-md p-8 bg-white shadow-lg rounded-2xl md:max-w-lg lg:max-w-xl">
          {/* Avatar */}
          <div className="absolute transform -translate-x-1/2 -top-12 left-1/2">
            <div className="p-1 bg-white rounded-full shadow-md">
              <div className="flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-pink-400 to-purple-500">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-10 h-10 text-gray-100"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4
                       -4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4
                       v2h16v-2c0-2.66-5.33-4-8-4z"
                  />
                </svg>
              </div>
            </div>
          </div>
    
          <h2 className="mt-6 mb-6 text-2xl font-semibold text-center text-black">
            Create an Account
          </h2>
    
          {formError && (
            <p className="mb-4 text-center text-red-500">{formError}</p>
          )}
    
          {/* === Responsive grid === */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* First / Last Name */}
            <div>
              <input
                type="text"
                placeholder="First Name *"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              {errors.firstName && (
                <p className="text-sm text-red-500">{errors.firstName}</p>
              )}
            </div>
            <div>
              <input
                type="text"
                placeholder="Last Name *"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              {errors.lastName && (
                <p className="text-sm text-red-500">{errors.lastName}</p>
              )}
            </div>
    
            {/* Middle Name (span 2 on desktop) */}
            <div className="md:col-span-2">
              <input
                type="text"
                placeholder="Middle Name"
                value={middleName}
                onChange={(e) => setMiddleName(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
    
            {/* Date of Birth full width */}
            <div className="md:col-span-2">
              <input
                type="date"
                placeholder="Date of Birth *"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              {errors.dob && (
                <p className="text-sm text-red-500">{errors.dob}</p>
              )}
            </div>
    
            {/* Phone / Email side by side */}
            <div>
              <input
                type="text"
                placeholder="Phone Number *"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              {errors.phoneNumber && (
                <p className="text-sm text-red-500">{errors.phoneNumber}</p>
              )}
            </div>
            <div>
              <input
                type="email"
                placeholder="Email *"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email}</p>
              )}
            </div>
    
            {/* Password full width */}
            <div className="md:col-span-2">
              <input
                type="password"
                placeholder="Password *"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              {errors.password && (
                <p className="text-sm text-red-500">{errors.password}</p>
              )}
            </div>
    
            {/* Profile Picture full width */}
            <div className="md:col-span-2">
              <label className="block mb-1 text-black">
                Profile Picture *{" "}
                <span className="text-xs text-gray-500">(jpg, png | max. 2 MB)</span>
              </label>
              <input
                type="file"
                accept="image/png, image/jpeg"
                onChange={handleImageChange}
                className="w-full px-4 py-2 border border-purple-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              {errors.profileImage && (
                <p className="mt-1 text-sm text-red-500">
                  {errors.profileImage}
                </p>
              )}
            </div>
          </div>
    
          {/* Submit button */}
          <button
            onClick={handleSignUp}
            disabled={loading}
            className="w-full py-2 mt-6 font-bold text-white transition rounded-lg bg-gradient-to-r from-pink-500 to-purple-700 hover:from-pink-600 hover:to-purple-800"
          >
            {loading ? "Signing up..." : "Sign Up"}
          </button>
    
          <p className="mt-4 text-sm text-center text-gray-500">
            Already have an account?{" "}
            <Link href="/login_page" className="font-semibold text-purple-600 hover:underline">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    )}