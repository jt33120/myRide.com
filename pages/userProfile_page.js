import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

const UserProfilePage = () => {
  const router = useRouter();
  const { uid } = router.query;
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) return;

    const fetchUserData = async () => {
      try {
        const userDocRef = doc(db, 'members', uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          setUserData(userDoc.data());
        } else {
          console.error('User not found');
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [uid]);

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: 'auto', position: 'relative' }}>
      {/* Exit Button */}
      <button 
        onClick={() => router.push('/myFriends_page')}
        style={{
          position: 'absolute',
          top: '15px',
          left: '15px',
          background: 'none',
          border: 'none',
          fontSize: '20px',
          color: '#555',
          cursor: 'pointer'
        }}
        title="Back to Friends"
      >
        ⏎
      </button>

      <h1 style={{ textAlign: 'center', color: '#333' }}>User Profile</h1>

      {loading ? (
        <p>Loading...</p>
      ) : userData ? (
        <div style={{ padding: '20px', background: '#fff', borderRadius: '5px', border: '1px solid #e42fee' }}>
          <p><strong>Name:</strong> {userData.name || 'N/A'}</p>
          <p><strong>Email:</strong> {userData.email || 'N/A'}</p>
          <p><strong>Joined on:</strong> {userData.joinDate || 'N/A'}</p>
          <p><strong>Invited by:</strong> {userData.invitedBy || 'N/A'}</p>
        </div>
      ) : (
        <p>User not found.</p>
      )}
    </div>
  );
};

export default UserProfilePage;
