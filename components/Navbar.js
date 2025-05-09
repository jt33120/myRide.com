import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/router";
import { useAuth } from "../hooks/useAuth";
import { ref, getDownloadURL } from "firebase/storage";
import { storage, auth } from "../lib/firebase";
import { signOut } from "firebase/auth";
import {
  HiOutlineHome,
  HiOutlineChatBubbleLeftRight,
  HiOutlineDocumentText,
  HiOutlineBanknotes,
  HiOutlineUserCircle,
  HiOutlineTruck,
} from "react-icons/hi2";
import { IoLogOutOutline } from "react-icons/io5";
import Link from "next/link";

export default function Navbar({ leftContent }) {
  const router = useRouter();
  const { currentUser } = useAuth();

  const [desktopOpen, setDesktopOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const [showMobile, setShowMobile] = useState(true); // Par défaut visible
  const [lastY, setLastY] = useState(0);

  const desktopRef = useRef(null);
  const mobileRef = useRef(null);

  const items = [
    { label: "Home", Icon: HiOutlineHome, path: "/Welcome_page" },
    { label: "Garage", Icon: HiOutlineTruck, path: "/myVehicles_page" },
    {
      label: "Chat",
      Icon: HiOutlineChatBubbleLeftRight,
      path: "/myMessages_page",
    },
    { label: "Docs", Icon: HiOutlineDocumentText, path: "/documents_page" },
    { label: "Market", Icon: HiOutlineBanknotes, path: "/marketplace_page" },
  ];

  // Hide mobile nav on scroll
  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      if (currentY > lastY && currentY > 50) {
        setShowMobile(false); // Masque la Navbar en défilant vers le bas
      } else {
        setShowMobile(true); // Affiche la Navbar en défilant vers le haut
      }
      setLastY(currentY);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastY]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (desktopRef.current && !desktopRef.current.contains(e.target)) {
        setDesktopOpen(false);
      }
      if (mobileRef.current && !mobileRef.current.contains(e.target)) {
        setMobileOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Fetch profile image
  useEffect(() => {
    if (!currentUser) {
      setProfileImage(null);
      return;
    }
    (async () => {
      try {
        const url = await getDownloadURL(
          ref(storage, `members/${currentUser.uid}/profilepicture.png`)
        );
        setProfileImage(url);
      } catch {
        setProfileImage(null);
      }
    })();
  }, [currentUser]);

  const logout = async () => {
    await signOut(auth);
    router.push("/Welcome_page");
  };

  return (
    <>
      {/* Desktop Navbar */}
      <nav className="hidden md:fixed md:top-3 md:left-1/2 md:-translate-x-1/2 md:z-50 md:flex md:items-center md:justify-center md:w-[90%] md:max-w-5xl md:px-10 md:py-4 md:text-gray-900 md:bg-white/80 md:backdrop-blur md:border md:border-gray-200 md:rounded-xl md:shadow-lg md:transition-all md:m-0">
        <div className="flex items-center space-x-8" ref={desktopRef}>
          {items.map(({ label, Icon, path }) => (
            <button
              key={label}
              onClick={() => router.push(path)}
              className={`flex flex-col items-center px-3 py-1 rounded-lg transition-colors hover:bg-gray-100 hover:text-pink-500 focus:outline-none ${
                router.pathname === path ? "text-pink-600 font-semibold" : ""
              }`}
            >
              <Icon className="w-6 h-6" />
              <span className="mt-1 text-xs">{label}</span>
            </button>
          ))}

          {/* Add Help */}
          <Link
            href="/help_page"
            className={`flex flex-col items-center px-3 py-1 rounded-lg transition-colors hover:bg-gray-100 hover:text-pink-500 focus:outline-none ${
              router.pathname === "/help_page"
                ? "text-pink-600 font-semibold"
                : ""
            }`}
          >
            <HiOutlineDocumentText className="w-6 h-6" />
            <span className="mt-1 text-xs">Help</span>
          </Link>

          {/* Add Profile */}
          <button
            onClick={() => router.push("/userProfile_page")}
            className={`flex flex-col items-center px-3 py-1 rounded-lg transition-colors hover:bg-gray-100 hover:text-pink-500 focus:outline-none ${
              router.pathname === "/userProfile_page"
                ? "text-pink-600 font-semibold"
                : ""
            }`}
          >
            {profileImage ? (
              <Image
                src={profileImage}
                alt="profile"
                width={24}
                height={24}
                className="rounded-full"
              />
            ) : (
              <HiOutlineUserCircle className="w-6 h-6" />
            )}
            <span className="mt-1 text-xs">Profile</span>
          </button>

          {/* Add Logout */}
          {currentUser && (
            <button
              onClick={logout}
              className="flex flex-col items-center px-3 py-1 transition-colors rounded-lg hover:bg-gray-100 hover:text-pink-500 focus:outline-none"
            >
              <IoLogOutOutline className="w-6 h-6" />
              <span className="mt-1 text-xs">Logout</span>
            </button>
          )}
        </div>
      </nav>

      {/* Mobile Navbar */}
      <nav
        className={`md:hidden fixed bottom-0 w-full bg-white text-gray-900 flex justify-around py-2 transition-transform duration-300 ${
          showMobile ? "translate-y-0" : "translate-y-full"
        } z-50`}
      >
        {items.map(({ label, Icon, path }) => (
          <button
            key={label}
            onClick={() => router.push(path)}
            className="flex flex-col items-center hover:text-pink-500 focus:outline-none"
          >
            <Icon className="w-6 h-6" />
            <span className="mt-1 text-xs">{label}</span>
          </button>
        ))}

        {/* Mobile Dropdown */}
        <div className="relative" ref={mobileRef}>
          <button
            onClick={() => setMobileOpen((open) => !open)}
            className="p-1 rounded-full hover:text-pink-500 focus:outline-none"
          >
            {profileImage ? (
              <Image
                src={profileImage}
                alt="profile"
                width={32}
                height={32}
                className="rounded-full"
              />
            ) : (
              <HiOutlineUserCircle className="w-7 h-7" />
            )}
          </button>
          {mobileOpen && (
            <div className="absolute w-40 text-gray-900 bg-white rounded shadow-lg right-4 bottom-12">
              {currentUser ? (
                <>
                  <button
                    onClick={() => {
                      setMobileOpen(false);
                      router.push("/userProfile_page");
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-gray-100"
                  >
                    Profile
                  </button>
                  <button
                    onClick={() => {
                      setMobileOpen(false);
                      logout();
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-gray-100"
                  >
                    Logout
                  </button>
                  <button
                    onClick={() => {
                      setMobileOpen(false);
                      router.push("/help_page");
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-gray-100"
                  >
                    Help
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setMobileOpen(false);
                      router.push("/login_page");
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-gray-100"
                  >
                    Log In
                  </button>
                  <button
                    onClick={() => {
                      setMobileOpen(false);
                      router.push("/help_page");
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-gray-100"
                  >
                    Help
                  </button>
                  <button
                    onClick={() => {
                      setMobileOpen(false);
                      router.push("/signup_page");
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-gray-100"
                  >
                    Sign Up
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </nav>
    </>
  );
}
