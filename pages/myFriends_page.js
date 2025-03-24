import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { auth, db } from '../lib/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';

const MyFriendsPage = () => {
  const [parent, setParent] = useState(null);  // The inviter's UID
  const [parentName, setParentName] = useState(''); // The inviter's firstName
  const [invitedMembers, setInvitedMembers] = useState([]);
  const [invitationCode, setInvitationCode] = useState(''); // Store invitation code
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
          setInvitationCode(userData.invitationcode || ''); // Set the invitation code

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

  const copyToClipboard = () => {
    navigator.clipboard.writeText(invitationCode).then(() => {
      alert('Invitation code copied to clipboard!');
    }).catch((error) => {
      console.error('Error copying invitation code:', error);
    });
  };

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

          {/* Invitation Code */}
          <div style={{ marginBottom: '20px', padding: '10px', background: '#f3f3f3', borderRadius: '5px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <strong>My Invitation Code:</strong>{' '}
              <span style={{ color: '#e42fee' }}>
                {invitationCode || 'No code available'}
              </span>
            </div>
            <button
              onClick={copyToClipboard}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '5px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Copy to clipboard"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
                className="h-6 w-6 text-black-600 hover:text-black-800"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.057 1.123-.08M15.75 18H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08M15.75 18.75v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5A3.375 3.375 0 0 0 6.375 7.5H5.25m11.9-3.664A2.251 2.251 0 0 0 15 2.25h-1.5a2.251 2.251 0 0 0-2.15 1.586m5.8 0c.065.21.1.433.1.664v.75h-6V4.5c0-.231.035-.454.1-.664M6.75 7.5H4.875c-.621 0-1.125.504-1.125 1.125v12c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V16.5a9 9 0 0 0-9-9Z"
                />
              </svg>
            </button>
          </div>

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
