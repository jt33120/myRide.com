import { useState, useEffect, useContext } from "react";
import { auth, db, storage } from "../lib/firebase";
import { doc, getDoc, updateDoc, getDocs, query, collection, where } from "firebase/firestore";
import { ref, getDownloadURL, uploadBytesResumable } from "firebase/storage";
import { UserContext } from '../context/UserContext';

const UserProfilePage = () => {
  const { setUserProfile } = useContext(UserContext); // Access global state updater
  const [userData, setUserData] = useState(null);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [profilePicture, setProfilePicture] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [imageUploading, setImageUploading] = useState(false); // State for image upload status
  const [uploadedImageName, setUploadedImageName] = useState(""); // State for uploaded image name
  const user = auth.currentUser;

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;

      try {
        const userDoc = await getDoc(doc(db, "members", user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUserData(data);
          setFormData(data);

          // Fetch profile picture
          const profilePicRef = ref(storage, `members/${user.uid}/profilepicture.png`);
          try {
            const url = await getDownloadURL(profilePicRef);
            setProfilePicture(url);
          } catch (error) {
            console.error("Error fetching profile picture:", error);
          }
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    fetchUserData();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;

    setUploading(true);

    try {
      // Check if the invitation code is unique
      if (formData.invitationcode && formData.invitationcode !== userData.invitationcode) {
        const querySnapshot = await getDocs(
          query(collection(db, "members"), where("invitationcode", "==", formData.invitationcode))
        );
        if (!querySnapshot.empty) {
          alert("This invitation code is already in use. Please choose a different one.");
          setUploading(false);
          return;
        }
      }

      // Update profile data in Firestore
      await updateDoc(doc(db, "members", user.uid), {
        firstName: formData.firstName,
        middleName: formData.middleName,
        lastName: formData.lastName,
        phoneNumber: formData.phoneNumber,
        invitationcode: formData.invitationcode, // Update invitation code
      });

      // Replace profile picture in Firebase Storage if changed
      if (formData.profileImage instanceof File) {
        let fileToUpload = formData.profileImage;

        // Convert image to PNG if necessary
        if (fileToUpload.type !== "image/png") {
          try {
            const canvas = document.createElement("canvas");
            const img = document.createElement("img");
            img.src = URL.createObjectURL(fileToUpload);

            await new Promise((resolve) => {
              img.onload = () => {
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0);
                canvas.toBlob(
                  (blob) => {
                    fileToUpload = new File(
                      [blob],
                      fileToUpload.name.replace(/\.[^/.]+$/, ".png"),
                      { type: "image/png" }
                    );
                    resolve();
                  },
                  "image/png"
                );
              };
            });
          } catch (error) {
            console.error("Error converting image to PNG:", error);
          }
        }

        const profilePicRef = ref(storage, `members/${user.uid}/profilepicture.png`);
        const uploadTask = uploadBytesResumable(profilePicRef, fileToUpload);

        await new Promise((resolve, reject) => {
          uploadTask.on(
            "state_changed",
            null,
            (error) => reject(error),
            async () => {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              setProfilePicture(downloadURL); // Update local state
              setUserProfile((prev) => ({ ...prev, profileImage: downloadURL })); // Update global state for Navbar
              resolve();
            }
          );
        });
      }

      // Update other profile data in global state
      setUserProfile((prev) => ({
        ...prev,
        firstName: formData.firstName,
        middleName: formData.middleName,
        lastName: formData.lastName,
        phoneNumber: formData.phoneNumber,
        invitationcode: formData.invitationcode,
      }));

      setUserData(formData);
      setEditing(false);
      alert("Profile updated successfully!");
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Failed to update profile. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleImageUpload = async (file) => {
    setImageUploading(true);
    setUploadedImageName(file.name); // Display the name of the uploaded file

    let fileToUpload = file;

    // Convert image to PNG if necessary
    if (file.type !== "image/png") {
      try {
        const canvas = document.createElement("canvas");
        const img = document.createElement("img");
        img.src = URL.createObjectURL(file);

        await new Promise((resolve) => {
          img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0);
            canvas.toBlob(
              (blob) => {
                fileToUpload = new File(
                  [blob],
                  file.name.replace(/\.[^/.]+$/, ".png"),
                  { type: "image/png" }
                );
                resolve();
              },
              "image/png"
            );
          };
        });
      } catch (error) {
        console.error("Error converting image to PNG:", error);
      }
    }

    setFormData({ ...formData, profileImage: fileToUpload });
    setImageUploading(false);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      alert("Copied to clipboard!");
    }).catch((error) => {
      console.error("Error copying to clipboard:", error);
    });
  };

  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <svg
          key={i}
          xmlns="http://www.w3.org/2000/svg"
          fill={i <= rating ? "currentColor" : "none"}
          viewBox="0 0 24 24"
          strokeWidth="1.5"
          stroke="currentColor"
          className="h-6 w-6 text-yellow-500"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 17.27l5.18 3.73-1.64-5.81L20 9.24l-5.91-.51L12 3 9.91 8.73 4 9.24l4.46 3.95-1.64 5.81L12 17.27z"
          />
        </svg>
      );
    }
    return stars;
  };

  if (!user) {
    return <p>Please log in to view your profile.</p>;
  }

  return (
    <div className="min-h-screen p-6 bg-gray-100 text-black">
      <h1 className="text-3xl font-bold mb-6">My Profile</h1>
      {userData ? (
        <div className="profile-container">
          {editing ? (
            <div>
              <div className="form-section flex">
                <div className="flex items-center">
                  <label className="form-label mr-2">Profile Picture</label>
                  {profilePicture && (
                    <img
                      src={profilePicture}
                      alt="Profile"
                      className="w-24 h-24 rounded-full object-cover mr-4"
                    />
                  )}
                  <button
                    onClick={() => document.getElementById('profileImageInput').click()}
                    className="flex items-center p-0 border-none bg-transparent cursor-pointer"
                    title="Upload Profile Picture"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="1.5"
                      stroke="currentColor"
                      className="h-4 w-4"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
                      />
                    </svg>
                  </button>
                  <input
                    id="profileImageInput"
                    type="file"
                    onChange={(e) => handleImageUpload(e.target.files[0])}
                    className="hidden"
                  />
                </div>
                {imageUploading && <div className="loader ml-4"></div>} {/* Loading spinner */}
                {uploadedImageName && !imageUploading && (
                  <p className="ml-4 text-sm text-gray-600">Uploaded: {uploadedImageName}</p>
                )} {/* Display uploaded image name */}
              </div>
              <div className="form-section">
                <label className="form-label">First Name</label>
                <input
                  type="text"
                  value={formData.firstName || ""}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="border border-gray-300 p-2 rounded-md w-full mb-2"
                />
              </div>
              <div className="form-section">
                <label className="form-label">Middle Name</label>
                <input
                  type="text"
                  value={formData.middleName || ""}
                  onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
                  className="border border-gray-300 p-2 rounded-md w-full mb-2"
                />
              </div>
              <div className="form-section">
                <label className="form-label">Last Name</label>
                <input
                  type="text"
                  value={formData.lastName || ""}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="border border-gray-300 p-2 rounded-md w-full mb-2"
                />
              </div>
              <div className="form-section">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  value={user.email}
                  disabled
                  className="border border-gray-300 p-2 rounded-md w-full mb-2 bg-gray-200"
                />
              </div>
              <div className="form-section">
                <label className="form-label">Phone Number</label>
                <input
                  type="text"
                  value={formData.phoneNumber || ""}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  className="border border-gray-300 p-2 rounded-md w-full mb-2"
                />
              </div>
              <div className="form-section">
                <label className="form-label">Invitation Code</label>
                <div className="flex items-center">
                  <input
                    type="text"
                    value={formData.invitationcode || ""}
                    onChange={(e) => setFormData({ ...formData, invitationcode: e.target.value })}
                    className="border border-gray-300 p-2 rounded-md w-full mb-2"
                  />
                  <button
                    onClick={() => copyToClipboard(formData.invitationcode || "")}
                    className="ml-2 p-2 bg-gray-200 rounded-md"
                    title="Copy Invitation Code"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="1.5"
                      stroke="currentColor"
                      className="h-6 w-6"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.057 1.123-.08M15.75 18H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08M15.75 18.75v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5A3.375 3.375 0 0 0 6.375 7.5H5.25m11.9-3.664A2.251 2.251 0 0 0 15 2.25h-1.5a2.251 2.251 0 0 0-2.15 1.586m5.8 0c.065.21.1.433.1.664v.75h-6V4.5c0-.231.035-.454.1-.664M6.75 7.5H4.875c-.621 0-1.125.504-1.125 1.125v12c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V16.5a9 9 0 0 0-9-9Z"
                      />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="flex space-x-4 mt-4">
                <button onClick={handleSave} className="btn flex items-center" disabled={uploading}>
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
                  {uploading ? "Saving..." : "Save"}
                </button>
                <button onClick={() => setEditing(false)} className="btn btn-secondary flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>

                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center mb-4">
                {profilePicture && (
                  <img
                    src={profilePicture}
                    alt="Profile"
                    className="w-24 h-24 rounded-full object-cover mr-4"
                  />
                )}
                <div>
                  <p><strong>First Name:</strong> {userData.firstName || "N/A"}</p>
                  <p><strong>Middle Name:</strong> {userData.middleName || "N/A"}</p>
                  <p><strong>Last Name:</strong> {userData.lastName || "N/A"}</p>
                  <p><strong>Email:</strong> {user.email}</p>
                  <p><strong>Phone Number:</strong> {userData.phoneNumber || "N/A"}</p>
                  <p className="flex items-center">
                    <strong>Rating:</strong> {renderStars(userData.rating || 0)}
                  </p>
                  <div className="flex items-center mb-4">
                    <p>
                      <strong>Invitation Code:</strong> {userData.invitationcode || "N/A"}
                    </p>
                    <button
                      onClick={() => copyToClipboard(userData.invitationcode || "")}
                      className="ml-2 p-2 bg-gray-200 rounded-md"
                      title="Copy Invitation Code"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="1.5"
                        stroke="currentColor"
                        className="h-6 w-6"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.057 1.123-.08M15.75 18H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08M15.75 18.75v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5A3.375 3.375 0 0 0 6.375 7.5H5.25m11.9-3.664A2.251 2.251 0 0 0 15 2.25h-1.5a2.251 2.251 0 0 0-2.15 1.586m5.8 0c.065.21.1.433.1.664v.75h-6V4.5c0-.231.035-.454.1-.664M6.75 7.5H4.875c-.621 0-1.125.504-1.125 1.125v12c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V16.5a9 9 0 0 0-9-9Z"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
              <button onClick={() => setEditing(true)} className="btn flex items-center">
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
                    d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
                  />
                </svg>
                Edit Profile
              </button>
            </div>
          )}
        </div>
      ) : (
        <p>Loading...</p>
      )}
    </div>
  );
};

export default UserProfilePage;
