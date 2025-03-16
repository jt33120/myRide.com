import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { auth, db } from '../lib/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';

const MyFriendsPage = () => {
  const [parent, setParent] = useState(null);  // The inviter's UID
  const [parentName, setParentName] = useState(''); // The inviter's firstName
  const [invitedMembers, setInvitedMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchFriendsData = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        // 1️⃣ Get the current user's document
        const userDocRef = doc(db, 'members', user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const userData = userDoc.data();
          const inviterUid = userData.inviter; // Getting the inviter's UID

          setParent(inviterUid || null);

          // 2️⃣ Query the members collection to find users invited by this user
          const invitesQuery = query(
            collection(db, 'members'),
            where('inviter', '==', user.uid)
          );
          const invitesSnapshot = await getDocs(invitesQuery);

          // 3️⃣ Store invited members as an array of objects
          const invitedList = invitesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          }));
          setInvitedMembers(invitedList);
        }
      } catch (error) {
        console.error('Error fetching friends data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFriendsData();
  }, []);

  // Fetch firstName of a user from their UID
  const fetchUserName = async (uid) => {
    const userDocRef = doc(db, 'members', uid);
    const userDoc = await getDoc(userDocRef);
    if (userDoc.exists()) {
      return userDoc.data().firstName;  // Return the firstName of the user
    }
    return uid;  // If no firstName, fallback to UID
  };

  // Fetch parent's name after the parent UID is set
  useEffect(() => {
    const getParentName = async () => {
      if (parent) {
        const name = await fetchUserName(parent);
        setParentName(name);  // Set the inviter's name
      }
    };

    getParentName();
  }, [parent]);  // Only run when parent UID changes

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: 'auto', position: 'relative' }}>
      {/* Exit Button */}
      <button 
        onClick={() => router.push('/myDashboard_page')}
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
        title="Back to Dashboard"
      >
        ⏎
      </button>

      <h1 style={{ textAlign: 'center', color: '#333' }}>My Friends</h1>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          {/* Display Parent */}
          {parent && (
            <div style={{ marginBottom: '20px', padding: '10px', background: '#f3f3f3', borderRadius: '5px' }}>
              <strong>Invited by:</strong>{' '}
              <span
                style={{ color: '#e42fee', cursor: 'pointer' }}
                onClick={() => router.push(`/userProfile_page?uid=${parent}`)}
              >
                {parentName || 'Loading...'} {/* Display the parent's firstName */}
              </span>
            </div>
          )}

          {/* List of People the User Invited */}
          <h3 style={{ color: '#666' }}>People I Invited:</h3>
          {invitedMembers.length > 0 ? (
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {invitedMembers.map((member) => (
                <li key={member.id} style={{ marginBottom: '10px' }}>
                  <span
                    style={{ color: '#e42fee', cursor: 'pointer' }}
                    onClick={() => router.push(`/userProfile_page?uid=${member.id}`)}
                  >
                    {member.firstName || 'No name'} {/* Display firstName instead of UID */}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p>No invited friends yet.</p>
          )}
        </>
      )}
    </div>
  );
};

export default MyFriendsPage;
