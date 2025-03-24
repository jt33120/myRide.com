import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { auth, db } from '../lib/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';

const MyMessagePage = () => {
  const [conversations, setConversations] = useState([]);
  const router = useRouter();

  const fetchConversations = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const conversationsRef = collection(db, 'conversations');
      const q = query(
        conversationsRef,
        where('participants', 'array-contains', user.uid),
        orderBy('updatedAt', 'desc') // Sort by updatedAt, newest first
      );

      const querySnapshot = await getDocs(q);
      const conversations = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setConversations(conversations); // Update state with sorted conversations
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  const handleConversationClick = (conversationId) => {
    router.push(`/chat_page?conversationId=${conversationId}`);
  };

  if (!auth.currentUser) {
    return <p>Please log in to view your messages.</p>;
  }

  return (
    <div className="min-h-screen p-6 bg-gray-100 text-black">
      <h1 className="text-3xl font-bold mb-6">My Messages</h1>
      {conversations.length === 0 ? (
        <p>No conversations found.</p>
      ) : (
        <ul className="space-y-4">
          {conversations.map((conversation) => (
            <li
              key={conversation.id}
              className="bg-white p-4 rounded-lg shadow-md cursor-pointer hover:shadow-lg"
              onClick={() => handleConversationClick(conversation.id)}
            >
              <h2 className="text-xl font-semibold">{conversation.vehicleName}</h2>
              <p className="text-gray-600">Last updated: {new Date(conversation.updatedAt.seconds * 1000).toLocaleString()}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default MyMessagePage;