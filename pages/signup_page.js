import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { auth, db, storage } from "../lib/firebase";
import { createUserWithEmailAndPassword, fetchSignInMethodsForEmail, signInWithPopup, OAuthProvider } from "firebase/auth";
import { doc, setDoc, collection, getDocs } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import Cropper from "react-easy-crop";
import anonymousPng from "../public/anonymous.png"; // Make sure this file exists

export default function SignUp() {
  // ────────────────────────────────────────────────────────────────────────────────
  // State hooks
  // ────────────────────────────────────────────────────────────────────────────────
  const [firstName, setFirstName] = useState("");    // First Name / Prénom
  const [lastName, setLastName] = useState("");      // Last Name / Nom
  const [middleName, setMiddleName] = useState("");  // Middle Name / Deuxième prénom
  const [email, setEmail] = useState("");            // Email address / Adresse e-mail
  const [password, setPassword] = useState("");      // Password / Mot de passe
  const [image, setImage] = useState(null);          // Profile image file / Fichier image
  const [loading, setLoading] = useState(false);     // Loading indicator / Indicateur de chargement
  const [errors, setErrors] = useState({});          // Field errors / Erreurs des champs
  const [formError, setFormError] = useState("");    // Form-level error / Erreur générale du formulaire
  const [step, setStep] = useState(1);                // Current step in the sign-up process
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState("");
  const [authMethod, setAuthMethod] = useState(null); // "email" or "apple"
  const [showPassword, setShowPassword] = useState(false);
  const [cropping, setCropping] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [croppedImage, setCroppedImage] = useState(null);
  const fileInputRef = useRef();

  const router = useRouter();

  // Add state for email check feedback
  const [emailCheckMsg, setEmailCheckMsg] = useState("");

  // ────────────────────────────────────────────────────────────────────────────────
  // Validation helpers
  // ────────────────────────────────────────────────────────────────────────────────
  const validateEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  //const validatePhone = (n) => /^\d{10}$/.test(n);

  // ────────────────────────────────────────────────────────────────────────────────
  // Handle file input change / Gestion du changement de fichier
  // ────────────────────────────────────────────────────────────────────────────────
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setCroppedImage(null);
      setCropping(true);
      setErrors((prev) => ({ ...prev, profileImage: "" })); // clear previous error
    }
  };

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  // Utility to get cropped image as blob
  const getCroppedImg = async (imageSrc, crop) => {
    const createImage = (url) =>
      new Promise((resolve, reject) => {
        const img = new window.Image();
        img.addEventListener("load", () => resolve(img));
        img.addEventListener("error", (err) => reject(err));
        img.setAttribute("crossOrigin", "anonymous");
        img.src = url;
      });

    const image = await createImage(imageSrc);
    const canvas = document.createElement("canvas");
    canvas.width = crop.width;
    canvas.height = crop.height;
    const ctx = canvas.getContext("2d");

    ctx.drawImage(
      image,
      crop.x,
      crop.y,
      crop.width,
      crop.height,
      0,
      0,
      crop.width,
      crop.height
    );

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob);
      }, "image/png");
    });
  };

  const handleCropDone = async () => {
    if (!image || !croppedAreaPixels) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      const croppedBlob = await getCroppedImg(e.target.result, croppedAreaPixels);
      setCroppedImage(URL.createObjectURL(croppedBlob));
      setImage(new File([croppedBlob], image.name, { type: "image/png" }));
      setCropping(false);
    };
    reader.readAsDataURL(image);
  };

  // Password strength checker
  const checkPasswordStrength = (pwd) => {
    if (!pwd) return "";
    if (pwd.length < 8) return "Too short";
    if (!/[A-Z]/.test(pwd)) return "Add an uppercase letter";
    if (!/[a-z]/.test(pwd)) return "Add a lowercase letter";
    if (!/[0-9]/.test(pwd)) return "Add a number";
    if (!/[^A-Za-z0-9]/.test(pwd)) return "Add a special character";
    return "Strong";
  };

  // ────────────────────────────────────────────────────────────────────────────────
  // Step validation (no email verification, just format and uniqueness)
  // ────────────────────────────────────────────────────────────────────────────────
  const validateStep = async () => {
    const newErrors = {};
    if (step === 1) {
      if (!firstName) newErrors.firstName = "Required field";
      if (!lastName) newErrors.lastName = "Required field";
    }
    if (step === 2) {
      if (!email) newErrors.email = "Required field";
      else if (!validateEmail(email)) newErrors.email = "Invalid format";
      if (!password) newErrors.password = "Required field";
      else {
        const strength = checkPasswordStrength(password);
        setPasswordStrength(strength);
        if (strength !== "Strong") newErrors.password = strength;
      }
      // Only check if email is already in use
      if (!newErrors.email) {
        setCheckingEmail(true);
        try {
          const methods = await fetchSignInMethodsForEmail(auth, email);
          if (methods.length > 0) {
            newErrors.email = "Email already in use";
          }
        } catch {
          newErrors.email = "Could not verify email";
        }
        setCheckingEmail(false);
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ────────────────────────────────────────────────────────────────────────────────
  // Handle next step
  // ────────────────────────────────────────────────────────────────────────────────
  const handleNext = async () => {
    const valid = await validateStep();
    if (valid) {
      setStep(step + 1);
      setFormError("");
    } else {
      setFormError("Please fill all required fields.");
    }
  };

  // ────────────────────────────────────────────────────────────────────────────────
  // Handle previous step
  // ────────────────────────────────────────────────────────────────────────────────
  const handleBack = () => {
    setStep(step - 1);
    setFormError("");
  };

  // ────────────────────────────────────────────────────────────────────────────────
  // Main sign-up logic
  // ────────────────────────────────────────────────────────────────────────────────
  const handleSignUp = async () => {
    setLoading(true);
    setErrors({});
    setFormError("");
    try {
      // Create user account
      const { user } = await createUserWithEmailAndPassword(auth, email, password);

      // Send welcome email via backend API
      await fetch("/api/send-welcome-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, firstName }),
      });

      let profileImageUrl = "/profile_icon.png";
      if (image) {
        const storageRef = ref(storage, `members/${user.uid}/profilepicture.png`);
        const uploadTask = uploadBytesResumable(storageRef, image);
        await new Promise((res, rej) =>
          uploadTask.on(
            "state_changed",
            null,
            rej,
            async () => {
              profileImageUrl = await getDownloadURL(uploadTask.snapshot.ref);
              res();
            }
          )
        );
      }
      await setDoc(doc(db, "members", user.uid), {
        firstName,
        lastName,
        middleName,
        email,
        inviter: "frenchy",
        rating: 5,
        vehicles: [],
        profileImage: profileImageUrl,
        createdAt: new Date(),
      });
      router.push("/myVehicles_page");
    } catch (err) {
      setFormError("Unexpected error occurred. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Apple sign in handler
  const handleAppleSignIn = async () => {
    setLoading(true);
    setFormError("");
    try {
      const provider = new OAuthProvider('apple.com');
      // Optionally, you can add scopes: provider.addScope('email');
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      // Check if user profile exists in Firestore
      const userDoc = await doc(db, "members", user.uid);
      // If not, create a minimal profile (you can expand this logic as needed)
      await setDoc(userDoc, {
        firstName: user.displayName ? user.displayName.split(" ")[0] : "",
        lastName: user.displayName ? user.displayName.split(" ").slice(1).join(" ") : "",
        middleName: "",
        dob: "",
        email: user.email,
        inviter: "frenchy",
        rating: 5,
        vehicles: [],
        profileImage: user.photoURL || "/profile_icon.png",
        createdAt: new Date(),
        appleProvider: true,
      }, { merge: true });
      router.push("/myVehicles_page");
    } catch (err) {
      setFormError("Apple sign in failed. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Email field blur handler to check if email is already used (Firestore members collection)
  const handleEmailBlur = async () => {
    setEmailCheckMsg("");
    setErrors((prev) => ({ ...prev, email: undefined }));
    if (!email) return;
    if (!validateEmail(email)) {
      setEmailCheckMsg("Invalid email format.");
      setErrors((prev) => ({ ...prev, email: "Invalid format" }));
      return;
    }
    setCheckingEmail(true);
    try {
      // Query all members and check for email match (case-insensitive)
      const membersSnap = await getDocs(collection(db, "members"));
      let found = false;
      membersSnap.forEach(docSnap => {
        const data = docSnap.data();
        if (data.email && data.email.trim().toLowerCase() === email.trim().toLowerCase()) {
          found = true;
        }
      });
      if (found) {
        setErrors((prev) => ({ ...prev, email: "Email already in use" }));
      } else {
        setEmailCheckMsg("This email is available.");
      }
    } catch {
      setEmailCheckMsg("Could not verify email.");
      setErrors((prev) => ({ ...prev, email: "Could not verify email" }));
    }
    setCheckingEmail(false);
  };

  // ────────────────────────────────────────────────────────────────────────────────
  // JSX return (multi-step)
  // ────────────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-zinc-900">
      <div className="relative flex flex-row w-full max-w-2xl bg-white shadow-lg rounded-2xl">
        {/* Profile Picture Preview (left) - only show in Step 3 */}
        {step === 3 && (
          <div className="flex flex-col items-center justify-center w-1/3 p-4 border-r border-gray-200">
            <div className="relative w-32 h-32 overflow-hidden bg-gray-100 rounded-full shadow-lg">
              <img
                src={
                  croppedImage
                    ? croppedImage
                    : image
                    ? URL.createObjectURL(image)
                    : anonymousPng.src || "/anonymous.png"
                }
                alt="Profile Preview"
                className="object-cover w-full h-full"
              />
              {/* Cropping Modal */}
              {cropping && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
                  <div className="flex flex-col items-center p-6 bg-white shadow-xl rounded-xl">
                    <div className="relative w-72 h-72">
                      <Cropper
                        image={image ? URL.createObjectURL(image) : undefined}
                        crop={crop}
                        zoom={zoom}
                        aspect={1}
                        onCropChange={setCrop}
                        onZoomChange={setZoom}
                        onCropComplete={onCropComplete}
                      />
                    </div>
                    <div className="flex gap-4 mt-4">
                      <button
                        className="px-4 py-2 font-bold text-white bg-purple-600 rounded-lg"
                        onClick={handleCropDone}
                      >
                        Crop
                      </button>
                      <button
                        className="px-4 py-2 font-bold text-gray-700 bg-gray-200 rounded-lg"
                        onClick={() => setCropping(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="mt-4 text-xs text-center text-gray-500">
               Preview
            </div>
          </div>
        )}
        {/* Signup Form (right) */}
        <div className={`flex-1 p-8${step === 3 ? "" : " w-full"}`}>
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

          {/* Step 0: Choose authentication method */}
          {authMethod === null && (
            <div className="flex flex-col gap-6">
              <h2 className="mb-4 text-2xl font-semibold text-center text-black">Sign Up</h2>
              <button
                onClick={() => setAuthMethod("email")}
                className="w-full py-3 font-bold text-white rounded-lg bg-gradient-to-r from-pink-500 to-purple-700 hover:from-pink-600 hover:to-purple-800"
              >
                Continue with Email
              </button>
              <button
                onClick={handleAppleSignIn}
                className="flex items-center justify-center w-full gap-2 py-3 font-bold text-black bg-white border border-gray-300 rounded-lg hover:bg-gray-100"
                disabled={loading}
              >
                <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24" className="text-black">
                  <path d="M16.5 2c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm4.3 6.1c-.1-2.1 1.7-3.1 1.8-3.2-1-1.5-2.6-1.7-3.2-1.7-1.4-.1-2.7.8-3.4.8-.7 0-1.8-.8-3-.8-1.5 0-2.9.9-3.7 2.3-1.6 2.7-.4 6.7 1.1 8.9.7 1 1.5 2.1 2.6 2.1 1 0 1.3-.7 2.6-.7s1.6.7 2.6.7c1.1 0 1.8-1 2.5-2 .8-1.1 1.1-2.2 1.1-2.3 0-.1-2.1-.8-2.1-3.2zm-4.2-6.1c.1-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2z"/>
                </svg>
                Continue with Apple
              </button>
              <p className="mt-4 text-sm text-center text-gray-500">
                Already have an account?{" "}
                <Link href="/login_page" className="font-semibold text-purple-600 hover:underline">
                  Sign In
                </Link>
              </p>
            </div>
          )}

          {/* Email sign up flow */}
          {authMethod === "email" && (
            <div className="grid grid-cols-1 gap-4">
              {step === 1 && (
                <>
                  <div>
                    <label className="block mb-1 text-black">First Name *</label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    {errors.firstName && (
                      <p className="text-sm text-red-500">{errors.firstName}</p>
                    )}
                  </div>
                  <div>
                    <label className="block mb-1 text-black">Last Name *</label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    {errors.lastName && (
                      <p className="text-sm text-red-500">{errors.lastName}</p>
                    )}
                  </div>
                  <div>
                    <label className="block mb-1 text-black">Middle Name</label>
                    <input
                      type="text"
                      value={middleName}
                      onChange={(e) => setMiddleName(e.target.value)}
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <button
                    onClick={handleNext}
                    className="w-full py-2 mt-4 font-bold text-white transition rounded-lg bg-gradient-to-r from-pink-500 to-purple-700 hover:from-pink-600 hover:to-purple-800"
                  >
                    Continue
                  </button>
                </>
              )}

              {/* Step 2: Email & Password */}
              {step === 2 && (
                <>
                  <div>
                    <label className="block mb-1 text-black">Email *</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setEmailCheckMsg("");
                        setErrors((prev) => ({ ...prev, email: undefined }));
                      }}
                      onBlur={handleEmailBlur}
                      autoComplete="email"
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    {emailCheckMsg && (
                      <p className={`text-sm ${emailCheckMsg.includes("available") ? "text-green-600" : "text-red-500"}`}>{emailCheckMsg}</p>
                    )}
                    {errors.email && (
                      <p className="text-sm text-red-500">{errors.email}</p>
                    )}
                    {checkingEmail && (
                      <p className="text-sm text-gray-500">Checking email...</p>
                    )}
                  </div>
                  <div>
                    <label className="block mb-1 text-black">Password *</label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          setPasswordStrength(checkPasswordStrength(e.target.value));
                        }}
                        className="w-full px-4 py-2 pr-12 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute text-gray-500 -translate-y-1/2 right-2 top-1/2 hover:text-gray-700"
                        tabIndex={-1}
                      >
                        {showPassword ? (
                          // Eye-off SVG
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-5 0-9-4-9-7s4-7 9-7c1.657 0 3.216.41 4.563 1.125M15 12a3 3 0 11-6 0 3 3 0 016 0zm6.364 6.364L4.222 4.222" />
                          </svg>
                        ) : (
                          // Eye SVG
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0zm6 0c0 3-4 7-9 7s-9-4-9-7 4-7 9-7 9 4 9 7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="text-sm text-red-500">{errors.password}</p>
                    )}
                    {password && (
                      <p className={`text-sm ${passwordStrength === "Strong" ? "text-green-600" : "text-orange-500"}`}>
                        Password strength: {passwordStrength}
                      </p>
                    )}
                  </div>
                  <div className="flex justify-between mt-4">
                    <button
                      onClick={handleBack}
                      className="px-4 py-2 font-bold text-purple-700 bg-white border border-purple-500 rounded-lg hover:bg-purple-50"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleNext}
                      className="px-4 py-2 font-bold text-white rounded-lg bg-gradient-to-r from-pink-500 to-purple-700 hover:from-pink-600 hover:to-purple-800"
                      disabled={
                        checkingEmail ||
                        !!errors.email ||
                        errors.password ||
                        !email ||
                        !password
                      }
                    >
                      Continue
                    </button>
                  </div>
                </>
              )}

              {/* Step 3: Profile Picture */}
              {step === 3 && (
                <>
                  <div>
                    <label className="block mb-1 text-black">
                      Profile Picture{" "}
                      <span className="text-xs text-gray-500">(jpg, png | max. 2 MB)</span>
                    </label>
                    <input
                      ref={fileInputRef}
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
                  <div className="flex justify-between mt-4">
                    <button
                      onClick={handleBack}
                      className="px-4 py-2 font-bold text-purple-700 bg-white border border-purple-500 rounded-lg hover:bg-purple-50"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleSignUp}
                      disabled={loading}
                      className="px-4 py-2 font-bold text-white rounded-lg bg-gradient-to-r from-pink-500 to-purple-700 hover:from-pink-600 hover:to-purple-800"
                    >
                      {loading ? "Signing up..." : "Sign Up"}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Optionally, you can add Apple sign up logic here in the future */}
        </div>
      </div>
    </div>
  );
}
SignUp.noAuth = true; // <-- Add this line to tell your app/layout/middleware to NOT require auth for this page