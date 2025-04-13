import { useState, useEffect } from 'react';
import { auth, db, storage } from '../lib/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { ref, getDownloadURL } from 'firebase/storage';
import Link from 'next/link';
import Image from 'next/image';

const fetchConversations = async (user) => {
  const conversationRef = collection(db, 'conversations');
  const q = query(conversationRef, where('participants', 'array-contains', user.uid));
  const querySnapshot = await getDocs(q);

  const convList = await Promise.all(
    querySnapshot.docs.map(async (docSnap) => {
      const conversation = docSnap.data();
      const otherUserId = conversation.participants.find((id) => id !== user.uid);
      let otherUserName = 'Unknown User';
      let vehicleTitle = 'Unknown Vehicle';
      let profilePictureUrl = '';

      // Fetch the other participant's name and profile picture
      if (otherUserId) {
        const userRef = doc(db, 'members', otherUserId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          otherUserName = userSnap.data().firstName || 'Unknown User';
          const profilePictureRef = ref(storage, `members/${otherUserId}/profilepicture.png`);
          try {
            profilePictureUrl = await getDownloadURL(profilePictureRef);
          } catch (error) {
            console.error("Error fetching profile picture:", error);
          }
        }
      }

      // Fetch vehicle title if available
      if (conversation.vehicleName) {
        vehicleTitle = conversation.vehicleName;
      }

      return {
        id: docSnap.id,
        otherUserName,
        vehicleTitle,
        profilePictureUrl,
      };
    })
  );

  return convList;
};

const MyMessages = () => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const user = auth.currentUser;

  useEffect(() => {
    const fetchConversationsAsync = async () => {
      if (!user) return;

      try {
        const convList = await fetchConversations(user);
        setConversations(convList);
        setLoading(false);
      } catch (error) {
        console.error(error);
      }
    };

    fetchConversationsAsync();
  }, [user]);

  if (loading) return <div className="text-center text-gray-500">Loading messages...</div>;

  return (
    <div className="min-h-screen p-5 bg-gray-100 text-black">
      <h2 className="page-heading">My Messages</h2>
      {conversations.length === 0 ? (
        <p className="text-gray-500">No conversations yet.</p>
      ) : (
        <div className="space-between-boxes">
          {conversations.map((conversation) => (
            <Link key={conversation.id} href={`/chat_page?conversationId=${conversation.id}`} passHref>
              <div className="card cursor-pointer hover:shadow-lg transition">
                <div className="card-content">
                  <h3 className="card-title">{conversation.vehicleTitle}</h3>
                  <div className="flex items-center space-x-2 mt-2">
                    {conversation.profilePictureUrl && (
                      <Image
                        src={conversation.profilePictureUrl}
                        alt={`${conversation.otherUserName}'s profile picture`}
                        width={32}
                        height={32}
                        className="rounded-full"
                      />
                    )}
                    <p className="card-description">
                      Chat with <b>{conversation.otherUserName}</b>
                    </p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
      <div className="text-center text-gray-500 mt-8">
        To come: preview of the last messages, groups, etc!
      </div>
    </div>
  );
};

export default MyMessages;