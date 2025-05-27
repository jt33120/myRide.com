import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
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
import { StoreIcon } from "lucide-react";

export default function Navbar() {
  const router = useRouter();
  const { currentUser } = useAuth();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const [showMobile, setShowMobile] = useState(true);
  const [lastY, setLastY] = useState(0);

  const mobileRef = useRef(null);

  // tous les items utilisent maintenant Icon pour faciliter la colorisation
  const items = [
    { label: "Home", Icon: HiOutlineHome, path: "/Welcome_page" },
    { label: "Garage", Icon: StoreIcon, path: "/myVehicles_page" },
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
      {/* MOBILE NAVBAR ONLY */}
      {currentUser && router.pathname !== "/Welcome_page" && (
        <nav className="fixed bottom-0 z-50 flex justify-around w-full py-2 bg-gray-900">
          {/* Parcourez `items` et affichez Icon+label */}
          {items
            .filter(
              (item) =>
                // remove Home only when signed in
                !(currentUser && item.label === "Home")
            )
            .map(({ label, Icon, path }) => {
              const active = router.pathname === path;
              return (
                <Link
                  key={label}
                  href={path}
                  className="flex flex-col items-center"
                >
                  <Icon
                    className={`w-6 h-6 ${
                      active ? "text-white" : "text-purple-500"
                    }`}
                  />
                  <span
                    className={`mt-1 text-xs ${
                      active ? "text-white" : "text-purple-500"
                    }`}
                  >
                    {label}
                  </span>
                </Link>
              );
            })}

          {/* Profil / menu déroulant */}
          <div className="relative" ref={mobileRef}>
            <button
              onClick={() => setMobileOpen((o) => !o)}
              className="p-1 rounded-full"
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
                      className="block px-4 py-2 hover:bg-gray-100"
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
                  </>
                ) : (
                  <>
                    <Link
                      href="/login_page"
                      className="block px-4 py-2 hover:bg-gray-100"
                    >
                      Log In
                    </Link>
                    <Link
                      href="/signup_page"
                      className="block px-4 py-2 hover:bg-gray-100"
                    >
                      Sign Up
                    </Link>
                  </>
                )}
                <Link
                  href="/help_page"
                  className="block px-4 py-2 hover:bg-gray-100"
                >
                  Help
                </Link>
              </div>
            )}
          </div>
        </nav>
      )}
    </>
  );
}
