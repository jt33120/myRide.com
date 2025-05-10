import React, { useEffect, useState } from "react";
import { auth, db } from "../lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { useRouter } from "next/router";
import { onAuthStateChanged } from "firebase/auth";

export default function MyMessagesPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState([]);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.push("/login_page"); // Redirect to login page if not logged in
      } else {
        setUser(currentUser);
      }
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    async function loadConversations() {
      if (!user) return;
      try {
        const convRef = collection(db, "conversations");
        const q = query(
          convRef,
          where("participants", "array-contains", user.uid)
        );
        const snap = await getDocs(q);
        const list = snap.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));
        setConversations(list);
      } catch (err) {
        console.error(err);
      }
    }
    loadConversations();
  }, [user]);

  const openConversation = (conversationId) => {
    router.push(`/conversation/${conversationId}`);
  };

  if (!user) {
    return <p className="text-center text-white">Loading...</p>; // Show a loading message
  }

  return (
    <div className="container min-h-screen px-4 py-10 mx-auto text-white bg-zinc-900">
      {/* Title Section */}
      <div className="mb-6 text-center md:mt-36">
        <h1 className="text-4xl font-bold text-white">My Messages</h1>
        <p className="mt-2 text-gray-400">
          View and manage all your messages in one place.
        </p>
      </div>

      {/* Messages Section */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 justify-items-center">
        {conversations.length === 0 ? (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((_, idx) => (
              <div
                key={idx}
                className="p-1 transition transform rounded-2xl bg-gradient-to-r from-purple-600 to-pink-500 hover:scale-105"
              >
                <div className="flex flex-col items-center justify-center block h-full p-6 bg-gray-900 rounded-2xl">
                  <h2 className="mb-2 text-lg font-semibold text-gray-400">
                    No Conversations
                  </h2>
                  <p className="mb-4 text-sm text-center text-gray-500">
                    You don’t have any chats yet.
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          conversations.map(({ id, sellerName, vehicleName, picture }, idx) => (
            <div
              key={id}
              className="w-full max-w-sm p-6 text-center transition bg-gray-800 border border-gray-700 rounded-lg shadow-lg hover:shadow-xl"
            >
              <div
                onClick={() => openConversation(id)}
                className="block h-full p-6 bg-gray-900 cursor-pointer rounded-2xl"
              >
                <div className="flex items-center mb-4">
                  {picture ? (
                    <img
                      src={picture}
                      alt={`${sellerName}'s profile`}
                      className="w-12 h-12 border-2 border-white rounded-full"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gray-700 rounded-full" />
                  )}
                  <div className="ml-4">
                    <h2 className="text-lg font-semibold">{sellerName}</h2>
                    <p className="text-sm text-gray-400">
                      {vehicleName || "Unknown Vehicle"}
                    </p>
                  </div>
                </div>
                <p className="mt-4 text-gray-500">Tap to continue chat →</p>
              </div>
            </div>
          ))
        )}
      </div>

      <p className="mt-12 text-center text-gray-500">
        Coming soon: message previews, group chats, and more!
      </p>
    </div>
  );
}
