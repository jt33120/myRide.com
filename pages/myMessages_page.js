import { useState, useEffect } from 'react';
import { auth, db, storage } from '../lib/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { ref, getDownloadURL } from 'firebase/storage';
import { useRouter } from 'next/router';
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
  const router = useRouter();

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

  if (loading) return <div className="p-4 text-center">Loading messages...</div>;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <button
        onClick={() => router.push('/myDashboard_page')}
        className="return-button mb-4"
        title="Back to Dashboard"
      >
        ⏎
      </button>
      <h2 className="text-2xl font-bold mb-4">My Messages</h2>
      {conversations.length === 0 ? (
        <p className="text-gray-500">No conversations yet.</p>
      ) : (
        <div className="space-y-4">
          {conversations.map((conversation) => (
            <Link key={conversation.id} href={`/chat_page?conversationId=${conversation.id}`} passHref>
              <div className="p-4 border rounded-lg shadow-md cursor-pointer hover:shadow-lg transition">
                <h3 className="text-lg font-semibold">{conversation.vehicleTitle}</h3>
                <div className="flex items-center space-x-2">
                  {conversation.profilePictureUrl && (
                    <Image
                      src={conversation.profilePictureUrl}
                      alt={`${conversation.otherUserName}'s profile picture`}
                      width={32}
                      height={32}
                      className="rounded-full"
                    />
                  )}
                  <p className="text-gray-600">Chat with <b>{conversation.otherUserName}</b></p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
      <div className="mt-8 text-center text-gray-500">
        To come: preview of the last messages, groups, etc!
      </div>
    </div>
  );
};

export default MyMessages;