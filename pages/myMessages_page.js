import React, { useEffect, useState } from "react";
import { auth, db } from "../lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { useRouter } from "next/router";

export default function MyMessages() {
  const router = useRouter();
  const [conversations, setConversations] = useState([]);
  const user = auth.currentUser;

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

  return (
    <div className="min-h-screen text-white bg-gradient-to-b from-black to-gray-800">
      <div className="max-w-4xl px-6 py-16 pt-24 mx-auto">
        <h1 className="pt-4 pb-2 mb-4 text-4xl font-extrabold text-center text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-500">
          My Messages
        </h1>
        <p className="mb-12 text-center text-gray-300">
          All your conversations, in one place.
        </p>

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
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {conversations.map(
              ({ id, sellerName, vehicleName, picture }, idx) => (
                <div
                  key={id}
                  className="p-1 transition transform rounded-2xl bg-gradient-to-r from-purple-600 to-pink-500 hover:scale-105"
                >
                  <div
                    onClick={() => openConversation(id)}
                    className="block h-full p-6 bg-gray-900 rounded-2xl cursor-pointer"
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
              )
            )}
          </div>
        )}

        <p className="mt-12 text-center text-gray-500">
          Coming soon: message previews, group chats, and more!
        </p>
      </div>
    </div>
  );
}
