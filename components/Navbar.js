import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/router";
import { useAuth } from "../hooks/useAuth";
import { ref, getDownloadURL } from "firebase/storage";
import { storage, auth } from "../lib/firebase";
import { signOut } from "firebase/auth"; // Import signOut from Firebase Auth

export default function Navbar({ leftContent }) {
  const router = useRouter();
  const { currentUser } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [profileImage, setProfileImage] = useState("/profile_icon.png"); // Default profile picture for unauthenticated users
  const dropdownRef = useRef(null); // Ref for the dropdown menu
  const [isTopNavbarVisible, setIsTopNavbarVisible] = useState(true); // Track visibility of the top navbar
  const [lastScrollY, setLastScrollY] = useState(0); // Track the last scroll position

  useEffect(() => {
    const fetchProfileImage = async () => {
      if (currentUser) {
        try {
          const profilePicRef = ref(storage, `members/${currentUser.uid}/profilepicture.png`);
          const downloadURL = await getDownloadURL(profilePicRef);
          setProfileImage(downloadURL); // Set the profile picture URL
        } catch (error) {
          console.error("Error fetching profile picture:", error);
        }
      } else {
        setProfileImage("/profile_icon.png"); // Use default profile picture if no user is logged in
      }
    };

    fetchProfileImage();
  }, [currentUser]);

  const handleLogout = async () => {
    try {
      await signOut(auth); // Log out the user
      router.push("/Welcome_page"); // Redirect to the Welcome page
    } catch (error) {
      console.error("Error logging out:", error);
      alert("Failed to log out. Please try again.");
    }
  };

  const handleClickOutside = (event) => {
    if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
      setDropdownOpen(false); // Close the dropdown if clicked outside
    }
  };

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleScroll = () => {
    if (window.scrollY > lastScrollY) {
      setIsTopNavbarVisible(false); // Hide navbar on scroll down
    } else {
      setIsTopNavbarVisible(true); // Show navbar on scroll up
    }
    setLastScrollY(window.scrollY); // Update the last scroll position
  };

  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [lastScrollY]);

  // Hide the navbar on the Welcome page
  if (router.pathname === "/Welcome_page") {
    return null;
  }

  return (
    <div>
      {/* Top Navbar */}
      <div
        className={`navbar-top fixed top-0 left-0 w-full bg-transparent z-50 transition-transform duration-300 ${
          isTopNavbarVisible ? "translate-y-0" : "-translate-y-full"
        }`}
      >
        <div className="flex items-center justify-between w-full px-4 py-2">
          {/* Left Content (e.g., Return Button) */}
          <div>{leftContent}</div>

          {/* Profile Section */}
          <div className="profile-container relative" ref={dropdownRef}>
            <Image
              src={profileImage}
              alt="Profile"
              width={40}
              height={40}
              className="profile-icon cursor-pointer"
              onClick={() => setDropdownOpen((prev) => !prev)}
            />
            {/* Dropdown Menu */}
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-40 bg-white shadow-lg rounded-md border border-gray-200 z-10">
                <button
                  onClick={() => router.push("/help_page")}
                  className="block w-full text-left px-4 py-2 text-gray-600 hover:bg-gray-100"
                >
                  Help
                </button>
                <button
                  onClick={() => router.push("/generateImage_page")}
                  className="block w-full text-left px-4 py-2 text-gray-600 hover:bg-gray-100"
                >
                  Get your AI image
                </button>
                {currentUser ? (
                  <>
                    <button
                      onClick={() => router.push("/userProfile_page")}
                      className="block w-full text-left px-4 py-2 text-gray-600 hover:bg-gray-100"
                    >
                      Profile
                    </button>
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-gray-600 hover:bg-gray-100"
                    >
                      Log Out
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => router.push("/login_page")}
                    className="block w-full text-left px-4 py-2 text-gray-600 hover:bg-gray-100"
                  >
                    Sign In
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Navbar */}
      <div className="navbar-bottom fixed bottom-0 left-0 w-full bg-white shadow-md z-50 flex justify-around py-2">
        <button
          onClick={() => router.push("/myVehicles_page")}
          className="button_simple flex flex-col items-center"
        >
          <Image
            src="/garage.svg"
            alt="Garage"
            width={24}
            height={24}
            className="w-6 h-6"
          />
          <span className="text-xs text-gray-600">Garage</span>
        </button>

        <button
          onClick={() => router.push("/myMessages_page")}
          className="button_simple flex flex-col items-center"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
            className="w-6 h-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 0 1-.825-.242m9.345-8.334a2.126 2.126 0 0 0-.476-.095 48.64 48.64 0 0 0-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0 0 11.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155"
            />
          </svg>
          <span className="text-xs text-gray-600">Discussion</span>
        </button>

        <button
          onClick={() => router.push("/documents_page")}
          className="button_simple flex flex-col items-center"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
            className="w-6 h-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13"
            />
          </svg>
          <span className="text-xs text-gray-600">Documents</span>
        </button>

        <button
          onClick={() => router.push("/marketplace_page")}
          className="button_simple flex flex-col items-center"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
            className="w-6 h-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z"
            />
          </svg>
          <span className="text-xs text-gray-600">Marketplace</span>
        </button>
      </div>
    </div>
  );
}