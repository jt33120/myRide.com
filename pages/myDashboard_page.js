import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { auth, db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import PrivateRoute from '../components/PrivateRoute';

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

          // Fetch the profile picture from Vercel function
          const profilePictureUrl = `/api/image?uid=${user.uid}&filename=profilepicture.png`;
          setProfilePicture(profilePictureUrl);
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
    <PrivateRoute>
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <div style={{ marginBottom: '10px', textAlign: 'center' }}>
          {/* Display profile picture */}
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
    </PrivateRoute>
  );
};

export default Dashboard;
