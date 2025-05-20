import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/router";
import Link from "next/link";
import { useAuth } from "../hooks/useAuth";
import { ref, getDownloadURL } from "firebase/storage";
import { storage, auth } from "../lib/firebase";
import { signOut } from "firebase/auth";
import {
  HiOutlineHome,
  HiOutlineChatBubbleLeftRight,
  HiOutlineDocumentText,
  HiOutlineUserCircle,
} from "react-icons/hi2";
import { HiOutlineQuestionMarkCircle } from "react-icons/hi2";
import { IoLogOutOutline } from "react-icons/io5";
import { Car,StoreIcon } from "lucide-react";

export default function Navbar() {
  const router = useRouter();
  const { currentUser } = useAuth();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const [showMobile, setShowMobile] = useState(true);
  const [lastY, setLastY] = useState(0);

  const mobileRef = useRef(null);

  const items = [
    { label: "Home", Icon: HiOutlineHome, path: "/Welcome_page" },
    { label: "Garage", Icon: Car, path: "/myVehicles_page" },
    {
      label: "Chat",
      Icon: HiOutlineChatBubbleLeftRight,
      path: "/myMessages_page",
    },
    { label: "Docs", Icon: HiOutlineDocumentText, path: "/documents_page" },
    { label: "Market", Icon: StoreIcon, path: "/marketplace_page" },
  ];

  // Hide mobile nav on scroll
  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      setShowMobile(currentY <= lastY || currentY < 50);
      setLastY(currentY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastY]);

  // Close dropdowns on outside click or route change
  useEffect(() => {
    const handler = (e) => {
      if (mobileRef.current && !mobileRef.current.contains(e.target)) {
        setMobileOpen(false);
      }
    };
    const closeOnRoute = () => setMobileOpen(false);

    document.addEventListener("mousedown", handler);
    router.events.on("routeChangeStart", closeOnRoute);

    return () => {
      document.removeEventListener("mousedown", handler);
      router.events.off("routeChangeStart", closeOnRoute);
    };
  }, [router.events]);

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
        <div className="flex items-center space-x-8">
          {items.map(({ label, Icon, path }) => (
            <Link
              key={label}
              href={path}
              className={`
              flex flex-col items-center px-3 py-1 rounded-lg transition-colors
              hover:bg-gray-100 hover:text-pink-500 focus:outline-none
              ${router.pathname === path ? "text-pink-600 font-semibold" : ""}
            `}
            >
              <Icon className="w-6 h-6" />
              <span className="mt-1 text-xs">{label}</span>
            </Link>
          ))}

          {/* Help */}
          <Link
            href="/help_page"
            className={`
              flex flex-col items-center px-3 py-1 rounded-lg transition-colors
              hover:bg-gray-100 hover:text-pink-500 focus:outline-none
              ${
                router.pathname === "/help_page"
                  ? "text-pink-600 font-semibold"
                  : ""
              }
            `}
          >
            <HiOutlineQuestionMarkCircle className="w-6 h-6" />
            <span className="mt-1 text-xs">Help</span>
          </Link>

          {/* Profile */}
          <Link
            href="/userProfile_page"
            className={`
              flex flex-col items-center px-3 py-1 rounded-lg transition-colors
              hover:bg-gray-100 hover:text-pink-500 focus:outline-none
              ${
                router.pathname === "/userProfile_page"
                  ? "text-pink-600 font-semibold"
                  : ""
              }
            `}
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
          </Link>

          {/* Logout */}
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
        className={`
          md:hidden fixed bottom-0 w-full bg-white text-gray-900 flex justify-around py-2
          transition-transform duration-300
          ${showMobile ? "translate-y-0" : "translate-y-full"} z-50
        `}
      >
        {items.map(({ label, Icon, path }) => (
          <Link
            key={label}
            href={path}
            className="flex flex-col items-center hover:text-pink-500 focus:outline-none"
          >
            <Icon className="w-6 h-6" />
            <span className="mt-1 text-xs">{label}</span>
          </Link>
        ))}

        {/* Mobile Dropdown */}
        <div className="relative" ref={mobileRef}>
          <button
            onClick={() => setMobileOpen((o) => !o)}
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
                  <Link
                    href="/userProfile_page"
                    className="block w-full px-4 py-2 text-left hover:bg-gray-100"
                    onClick={() => setMobileOpen(false)}
                  >
                    Profile
                  </Link>
                  <button
                    onClick={() => {
                      setMobileOpen(false);
                      logout();
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-gray-100"
                  >
                    Logout
                  </button>
                  <Link
                    href="/help_page"
                    className="block w-full px-4 py-2 text-left hover:bg-gray-100"
                    onClick={() => setMobileOpen(false)}
                  >
                    Help
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/login_page"
                    className="block w-full px-4 py-2 text-left hover:bg-gray-100"
                    onClick={() => setMobileOpen(false)}
                  >
                    Log In
                  </Link>
                  <Link
                    href="/signup_page"
                    className="block w-full px-4 py-2 text-left hover:bg-gray-100"
                    onClick={() => setMobileOpen(false)}
                  >
                    Sign Up
                  </Link>
                  <Link
                    href="/help_page"
                    className="block w-full px-4 py-2 text-left hover:bg-gray-100"
                    onClick={() => setMobileOpen(false)}
                  >
                    Help
                  </Link>
                </>
              )}
            </div>
          )}
        </div>
      </nav>
    </>
  );
}
