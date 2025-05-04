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

export default function Navbar({ leftContent }) {
  const router = useRouter();
  const { currentUser } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const dropdownRef = useRef(null);
  const [showMobileNavbar, setShowMobileNavbar] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  // Scroll hide/show for mobile
  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      setShowMobileNavbar(currentY < lastScrollY || currentY < 10);
      setLastScrollY(currentY);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  // Fetch profile image
  useEffect(() => {
    async function fetchProfileImage() {
      if (!currentUser) return;
      try {
        const picRef = ref(storage, `members/${currentUser.uid}/profilepicture.png`);
        const url = await getDownloadURL(picRef);
        setProfileImage(url);
      } catch (e) {
        console.error("Error fetching profile picture:", e);
      }
    }
    fetchProfileImage();
  }, [currentUser]);

  // Logout
  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/Welcome_page");
    } catch {
      alert("Failed to log out.");
    }
  };

  // Click outside dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <>
      {/* Desktop Navbar */}
      <div className="fixed top-0 left-0 z-50 items-center justify-between hidden w-full px-4 py-2 bg-white shadow md:flex">
        <div>{leftContent}</div>
        <div className="flex items-center gap-6">
          {/* Home always goes to Welcome_page */}
          <NavIcon label="Home" Icon={HiOutlineHome} onClick={() => router.push("/Welcome_page")} />
          <NavIcon label="Garage" Icon={HiOutlineTruck} onClick={() => router.push("/myVehicles_page")} />
          <NavIcon label="Discussion" Icon={HiOutlineChatBubbleLeftRight} onClick={() => router.push("/myMessages_page")} />
          <NavIcon label="Documents" Icon={HiOutlineDocumentText} onClick={() => router.push("/documents_page")} />
          <NavIcon label="Marketplace" Icon={HiOutlineBanknotes} onClick={() => router.push("/marketplace_page")} />

          <div className="relative" ref={dropdownRef}>
            {profileImage ? (
              <Image
                src={profileImage}
                alt="Profile"
                width={36}
                height={36}
                className="border rounded-full cursor-pointer"
                onClick={() => setDropdownOpen((o) => !o)}
              />
            ) : (
              <HiOutlineUserCircle className="text-gray-500 cursor-pointer w-9 h-9" onClick={() => setDropdownOpen((o) => !o)} />
            )}
            {dropdownOpen && (
              <div className="absolute right-0 w-40 mt-2 bg-white border rounded shadow">
                <DropdownItem label="Help" onClick={() => router.push("/help_page")} />
                <DropdownItem label="Generate Image" onClick={() => router.push("/generateImage_page")} />
                {currentUser ? (
                  <>
                    <DropdownItem label="Profile" onClick={() => router.push("/userProfile_page")} />
                    <DropdownItem label="Log Out" onClick={handleLogout} />
                  </>
                ) : (
                  <DropdownItem label="Sign In" onClick={() => router.push("/login_page")} />
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navbar */}
      <div className={`fixed bottom-0 left-0 z-50 flex w-full justify-around py-2 bg-white border-t md:hidden transition-transform duration-300 ${
        showMobileNavbar ? "translate-y-0" : "translate-y-full"
      }`}>
        <NavIcon label="Home" Icon={HiOutlineHome} onClick={() => router.push("/Welcome_page")} />
        <NavIcon label="Garage" Icon={HiOutlineTruck} onClick={() => router.push("/myVehicles_page")} />
        <NavIcon label="Discussion" Icon={HiOutlineChatBubbleLeftRight} onClick={() => router.push("/myMessages_page")} />
        <NavIcon label="Documents" Icon={HiOutlineDocumentText} onClick={() => router.push("/documents_page")} />
        <NavIcon label="Marketplace" Icon={HiOutlineBanknotes} onClick={() => router.push("/marketplace_page")} />
      </div>
    </>
  );
}

function NavIcon({ label, Icon, onClick }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center text-gray-600 hover:text-black">
      <Icon className="w-6 h-6" />
      <span className="mt-1 text-xs">{label}</span>
    </button>
  );
}

function DropdownItem({ label, onClick }) {
  return (
    <button onClick={onClick} className="block w-full px-4 py-2 text-left hover:bg-gray-100">
      {label}
    </button>
  );
}
