import React, { useState, useEffect } from 'react';
import { auth, db, storage } from '../lib/firebase'; // Import storage for Firebase Storage
import { doc, getDoc } from "firebase/firestore";
import { useRouter } from 'next/router';
import Image from 'next/image';
import Link from 'next/link';
import { ref, getDownloadURL } from 'firebase/storage'; // For fetching the image URL from Firebase Storage

const NavBar = () => {
  const [user, setUser] = useState(null);
  const [firstName, setFirstName] = useState(""); // Store first name
  const [profilePicture, setProfilePicture] = useState('/profile_icon.png'); // Default profile icon
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        // Fetch user's first name from Firestore
        const userRef = doc(db, "members", currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setFirstName(userSnap.data().firstName || "User");

          // Check if profile picture URL exists in Firestore
          const userProfilePicture = userSnap.data().profileImage;
          if (userProfilePicture) {
            setProfilePicture(userProfilePicture); // Set the profile picture from Firestore
          } else {
            // Fetch the profile picture from Firebase Storage if not found in Firestore
            const storageRef = ref(storage, `members/${currentUser.uid}/profilepicture.png`);
            try {
              const url = await getDownloadURL(storageRef); // Fetch the URL of the profile picture
              setProfilePicture(url); // Set the profile picture from Firebase Storage
              console.log('Profile picture URL:', url); // Log the profile picture URL
            } catch (error) {
              console.log('Error fetching profile picture:', error);
            }
          }
        } else {
          console.log("No such document!");
        }
      } else {
        setFirstName(""); // Reset if logged out
        setProfilePicture('/profile_icon.png'); // Reset profile icon if logged out
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.profile-container')) {
        setMenuOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    try {
      await auth.signOut();
      setMenuOpen(false);
      router.push('/');
    } catch (error) {
      alert(error.message);
    }
  };

  const handleSignIn = () => {
    router.push('/login_page');
  };

  const handleLogoClick = () => {
    router.push('/myDashboard_page');
  };

  return (
    <header className="navbar">
      <div className="logo" onClick={handleLogoClick} style={{ cursor: 'pointer' }}>
        <Image src="/logo.png" alt="Marketplace Logo" width={75} height={50} priority />
        <a
          href="https://buymeacoffee.com/frenchybikj"
          target="_blank"
          rel="noopener noreferrer"
          className="donation-link"
        >
          Support Beta Version
        </a>
      </div>

      <nav className="nav-menu">
        <ul>
          <li><Link href="/marketplace_page">Marketplace</Link></li>
          <li><Link href="/documents_page">Documents</Link></li> {/* Added Documents link */}
        </ul>
      </nav>

      <div className="profile-container">
        <Image
          src={profilePicture}
          alt="Profile"
          width={40}
          height={40}
          className="profile-icon"
          onClick={() => setMenuOpen(!menuOpen)}
          style={{ borderRadius: '50%' }} // Make the image round
        />

        {menuOpen && (
          <div className="dropdown-menu">
            {user ? (
              <>
                <p className="text-sm font-semibold welcome-text">Welcome, {firstName}!</p>

                <Link href="/myDashboard_page">My Dashboard</Link>
                <button onClick={handleSignOut}>Log Out</button>
              </>
            ) : (
              <button onClick={handleSignIn}>Sign In</button>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

export default NavBar;