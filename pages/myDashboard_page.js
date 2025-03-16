import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { auth, db, storage } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { ref, getDownloadURL } from 'firebase/storage'; // For fetching the image URL from Firebase Storage

const Dashboard = () => {
  const [firstName, setFirstName] = useState('');
  const [profilePicture, setProfilePicture] = useState('/anonymous.png'); // Default image
  const router = useRouter();

  // Fetch user's first name and profile picture from Firestore and Firebase Storage
  useEffect(() => {
    const fetchUserData = async () => {
      const user = auth.currentUser;
      if (user) {
        const userDocRef = doc(db, 'members', user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          setFirstName(userDoc.data().firstName); // Set the first name from Firestore

          // Check if profile picture URL exists in Firestore
          const userProfilePicture = userDoc.data().profileImage;
          if (userProfilePicture) {
            setProfilePicture(userProfilePicture); // Set the profile picture from Firestore
          } else {
            // Fetch the profile picture from Firebase Storage if not found in Firestore
            const storageRef = ref(storage, `members/${user.uid}/profilepicture.png`);
            try {
              const url = await getDownloadURL(storageRef); // Fetch the URL of the profile picture
              setProfilePicture(url); // Set the profile picture from Firebase Storage
            } catch (error) {
              console.log('Error fetching profile picture:', error);
            }
          }
        } else {
          console.log("No such document!");
        }
      }
    };

    fetchUserData();
  }, []);

  const handleNavigation = (page) => {
    router.push(`/${page}`);
  };

  return (
    <div style={{ textAlign: 'center', padding: '50px' }}>
      <div style={{ marginBottom: '10px', textAlign: 'center' }}>
        {/* Display profile picture */}
        <Image 
          src={profilePicture} 
          alt="Profile Picture" 
          width={100} 
          height={100} 
          style={{ borderRadius: '50%' }} // Make the image round
        />
        <h1 style={{ color: 'black' }}>
          {firstName ? `${firstName}'s Dashboard` : "Loading..."}
        </h1>
      </div>

      {/* Main Rubrics - Buttons in a Vertical Layout */}
      <div style={{ marginTop: '30px' }}>
        {/* My Vehicles Button */}
        <div style={{ marginBottom: '20px' }}>
          <button 
            onClick={() => handleNavigation('myVehicles_page')} 
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'transparent',
              border: '2px solid #e42fee',
              borderRadius: 20,
              color: 'black', // Text color stays black
              fontSize: '16px',
              padding: '15px 30px',
              cursor: 'pointer',
              width: '250px',
              height: '60px',
              transition: 'all 0.3s ease',
              margin: '0 auto'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#e42fee'}
            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
          >
            <Image src="/myvehicles.png" alt="My Vehicles" width={30} height={30} style={{ marginRight: '10px' }} />
            My Vehicles
          </button>
        </div>

        {/* My Messages */}
        <div style={{ marginBottom: '20px' }}>
          <button 
            onClick={() => handleNavigation('myMessages_page')} 
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'transparent',
              border: '2px solid #e42fee',
              color: 'black', // Text color stays black
              fontSize: '16px',
              padding: '15px 30px',
              cursor: 'pointer',
              width: '250px',
              height: '60px',
              borderRadius: 20,
              transition: 'all 0.3s ease',
              margin: '0 auto'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#e42fee'}
            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
          >
            <Image src="/Messages.png" alt="My Messages" width={30} height={30} style={{ marginRight: '10px' }} />
            My Messages
          </button>
        </div>

        {/* My Friends Button */}
        <div style={{ marginBottom: '20px' }}>
          <button 
            onClick={() => handleNavigation('myFriends_page')} 
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'transparent',
              border: '2px solid #e42fee',
              color: 'black', // Text color stays black
              fontSize: '16px',
              padding: '15px 30px',
              cursor: 'pointer',
              width: '250px',
              height: '60px',
              borderRadius: 20,
              transition: 'all 0.3s ease',
              margin: '0 auto'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#e42fee'}
            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
          >
            <Image src="/friends.jpg" alt="My Friends" width={30} height={30} style={{ marginRight: '10px' }} />
            My Friends
          </button>
        </div>

        {/* Need Help Button */}
        <div style={{ marginBottom: '20px' }}>
          <button 
            onClick={() => handleNavigation('help_page')} 
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'transparent',
              border: '2px solid #e42fee',
              color: 'black', // Text color stays black
              fontSize: '16px',
              padding: '15px 30px',
              cursor: 'pointer',
              width: '250px',
              borderRadius: 20,
              height: '60px',
              transition: 'all 0.3s ease',
              margin: '0 auto'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#e42fee'}
            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
          >
            <Image src="/help.png" alt="Need Help?" width={30} height={30} style={{ marginRight: '10px' }} />
            Need Help?
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
