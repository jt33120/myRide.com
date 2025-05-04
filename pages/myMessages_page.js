import React, { useEffect, useState } from "react";
import { auth, db, storage } from "../lib/firebase";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { ref, getDownloadURL } from "firebase/storage";
import Link from "next/link";
import Image from "next/image";
import Navbar from "../components/Navbar";
import { motion } from "framer-motion";
import { ChatBubbleLeftRightIcon } from "@heroicons/react/24/solid";

export default function MyMessages() {
  // State hooks
  const [conversations, setConversations] = useState([]);
  const user = auth.currentUser;

  useEffect(() => {
    async function loadConversations() {
      if (!user) return;
      try {
        const convRef = collection(db, "conversations");
        const q = query(convRef, where("participants", "array-contains", user.uid));
        const snap = await getDocs(q);
        const list = await Promise.all(
          snap.docs.map(async (docSnap) => {
            const data = docSnap.data();
            const otherId = data.participants.find((id) => id !== user.uid);
            let name = "Unknown User";
            let picture = "";
            if (otherId) {
              const uSnap = await getDoc(doc(db, "members", otherId));
              if (uSnap.exists()) {
                name = uSnap.data().firstName || name;
                try {
                  picture = await getDownloadURL(
                    ref(storage, `members/${otherId}/profilepicture.png`)
                  );
                } catch {}
              }
            }
            return {
              id: docSnap.id,
              name,
              vehicle: data.vehicleName || "Unknown Vehicle",
              picture,
            };
          })
        );
        setConversations(list);
      } catch (err) {
        console.error(err);
      }
    }
    loadConversations();
  }, [user]);

  return (
    <div className="min-h-screen text-white bg-gradient-to-b from-black to-gray-800">
      <Navbar />

      <div className="max-w-4xl px-6 py-16 mx-auto">
        <h1 className="pt-4 pb-2 mb-4 text-4xl font-extrabold text-center text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-500">
          My Messages
        </h1>
        <p className="mb-12 text-center text-gray-300">
          All your conversations, in one place.
        </p>

        {conversations.length === 0 ? (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((_, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1, type: "spring", stiffness: 120 }}
              >
                <div className="p-1 transition transform rounded-2xl bg-gradient-to-r from-purple-600 to-pink-500 hover:scale-105">
                  <div className="flex flex-col items-center justify-center block h-full p-6 bg-gray-900 rounded-2xl">
                    <ChatBubbleLeftRightIcon className="w-12 h-12 mb-4 text-gray-500" />
                    <h2 className="mb-2 text-lg font-semibold text-gray-400">No Conversations</h2>
                    <p className="mb-4 text-sm text-center text-gray-500">
                      You don’t have any chats yet.
                    </p>
                    <Link
                      href="/marketplace_page"
                      className="inline-flex items-center px-4 py-2 text-white transition bg-pink-600 rounded-lg hover:bg-pink-700"
                    >
                      Start a Chat
                    </Link>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {conversations.map(({ id, name, vehicle, picture }, idx) => (
              <motion.div
                key={id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1, type: "spring", stiffness: 120 }}
              >
                <div className="p-1 transition transform rounded-2xl bg-gradient-to-r from-purple-600 to-pink-500 hover:scale-105">
                  <Link
                    href={`/chat_page?conversationId=${id}`}
                    className="block h-full p-6 bg-gray-900 rounded-2xl"
                  >
                    <div className="flex items-center mb-4">
                      {picture ? (
                        <Image
                          src={picture}
                          alt={`${name}'s profile`}
                          width={48}
                          height={48}
                          className="border-2 border-white rounded-full"
                        />
                      ) : (
                        <ChatBubbleLeftRightIcon className="w-12 h-12 text-gray-500" />
                      )}
                      <div className="ml-4">
                        <h2 className="text-lg font-semibold">{name}</h2>
                        <p className="text-sm text-gray-400">{vehicle}</p>
                      </div>
                    </div>
                    <p className="mt-4 text-gray-500">Tap to continue chat →</p>
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        <p className="mt-12 text-center text-gray-500">
          Coming soon: message previews, group chats, and more!
        </p>
      </div>
    </div>
  );
}
