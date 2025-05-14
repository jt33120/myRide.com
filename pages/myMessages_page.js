// pages/MyMessagesPage.jsx
import React, { useEffect, useState, useRef } from "react";
import { auth, db } from "../lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { useRouter } from "next/router";
import { onAuthStateChanged } from "firebase/auth";
import Image from "next/image";

export default function MyMessagesPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState([]);
  const [user, setUser] = useState(null);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [inputValue, setInputValue] = useState("");
  const scrollRef = useRef(null);

  // 1. Check auth
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.push("/login_page");
      } else {
        setUser(currentUser);
      }
    });
    return () => unsub();
  }, [router]);

  // 2. Load conversations from Firestore
  useEffect(() => {
    if (!user) return;
    async function load() {
      try {
        const convRef = collection(db, "conversations");
        const q = query(
          convRef,
          where("participants", "array-contains", user.uid)
        );
        const snap = await getDocs(q);
        setConversations(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error(err);
      }
    }
    load();
  }, [user]);

  // 3. Open une conversation en mode démo
  const openConversation = (conversation) => {
    setSelectedConversation({
      ...conversation,
      buyerName: user.displayName || "You",
      buyerAvatar: user.photoURL || "https://i.pravatar.cc/150?img=65",
      sellerName: conversation.sellerName || "John",
      sellerAvatar: conversation.picture || "https://i.pravatar.cc/150?img=3",
      messages: [
        {
          sender: conversation.sellerName || "John",
          text: "Hello, how can I help you?",
        },
        {
          sender: user.displayName || "You",
          text: "Hi, I'm interested in the Audi A5 2018. Is it still available?",
        },
        {
          sender: conversation.sellerName || "John",
          text: "Yes, it's still available. Would you like to schedule a test drive?",
        },
        {
          sender: user.displayName || "You",
          text: "That would be great. I'm available this weekend. Does that work for you?",
        },
        {
          sender: conversation.sellerName || "John",
          text: "Yes, Saturday morning works for me. I'll send you the address.",
        },
        {
          sender: user.displayName || "You",
          text: "Perfect, thank you! Looking forward to it.",
        },
      ],
    });
    setInputValue("");
  };

  // 4. Fermer la modal
  const closeConversation = () => setSelectedConversation(null);

  // 5. Scroll auto
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [selectedConversation]);

  // 6. Envoi d’un nouveau message
  const handleSend = () => {
    const text = inputValue.trim();
    if (!text || !selectedConversation) return;
    setSelectedConversation((prev) => ({
      ...prev,
      messages: [...prev.messages, { sender: prev.buyerName, text }],
    }));
    setInputValue("");
  };

  if (!user) {
    return <p className="text-center text-white">Loading...</p>;
  }

  return (
    <div className="container min-h-screen px-4 py-10 mx-auto text-white bg-zinc-900">
      {/* Titre */}
      <div className="mb-6 text-center md:mt-36">
        <h1 className="text-4xl font-bold">My Messages</h1>
        <p className="mt-2 text-gray-400">
          View and manage all your messages in one place.
        </p>
      </div>

      {/* Les cartes de convo */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 justify-items-center">
        {conversations.length === 0 ? (
          <p className="text-gray-400">You don’t have any chats yet.</p>
        ) : (
          conversations
            .slice(0, 1)
            .map(({ id, sellerName, vehicleName, picture }) => (
              <div
                key={id}
                onClick={() =>
                  openConversation({ id, sellerName, vehicleName, picture })
                }
                className="w-full max-w-sm p-6 bg-gray-800 border border-gray-700 shadow-lg cursor-pointer rounded-2xl hover:shadow-xl"
              >
                <div className="flex items-center mb-4">
                  <Image
                    src={picture || "https://i.pravatar.cc/150?img=3"}
                    alt={`${sellerName}'s profile`}
                    width={48}
                    height={48}
                    className="w-12 h-12 border-2 border-white rounded-full"
                  />
                  <div className="ml-4">
                    <h2 className="text-lg font-semibold">{sellerName}</h2>
                    <p className="text-sm text-gray-400">
                      {vehicleName || "Audi A5 2018"}
                    </p>
                  </div>
                </div>
                <p className="mt-4 text-sm text-gray-500">
                  Tap to continue chat →
                </p>
              </div>
            ))
        )}
      </div>

      {/* Modal conversation */}
      {selectedConversation && (
        // overlay catches taps
        <div
          onClick={closeConversation}
          className="inset-0 z-50 flex items-center justify-center max-sm:-mt-52 bg-opacity-80"
        >
          {/* prevent inner clicks from closing */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex flex-col p-6 mx-auto bg-gray-900 shadow-2xl rounded-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray-700">
              <div className="flex items-center">
                <Image
                  src={selectedConversation.sellerAvatar}
                  alt={`${selectedConversation.sellerName}`}
                  width={50}
                  height={50}
                  className="w-12 h-12 border-2 border-purple-500 rounded-full"
                />
                <div className="ml-4">
                  <h2 className="text-lg font-bold text-white">
                    {selectedConversation.sellerName}
                  </h2>
                  <p className="text-sm text-gray-400">
                    Chat about{" "}
                    {selectedConversation.vehicleName || "Audi A5 2018"}
                  </p>
                </div>
              </div>
              <button
                onClick={closeConversation}
                className="text-2xl text-gray-400 hover:text-white"
              >
                ×
              </button>
            </div>

            {/* Messages */}
            <div
              ref={scrollRef}
              className="flex-1 h-64 p-4 overflow-y-auto bg-gray-800 rounded-2xl"
            >
              {selectedConversation.messages.map((msg, idx) => {
                const isUser = msg.sender === selectedConversation.buyerName;
                return (
                  <div
                    key={idx}
                    className={`mb-4 flex items-end ${
                      isUser ? "justify-end" : "justify-start"
                    }`}
                  >
                    {/* avatar vendeur */}
                    {!isUser && (
                      <Image
                        src={selectedConversation.sellerAvatar}
                        alt="seller avatar"
                        width={32}
                        height={32}
                        className="w-8 h-8 mr-2 rounded-full"
                      />
                    )}

                    <div
                      className={`message-bubble max-w-xs px-4 py-2 text-sm ${
                        isUser ? "user" : "other"
                      }`}
                    >
                      <p>{msg.text}</p>
                      <p className="mt-1 text-xs text-right text-gray-900">
                        {new Date().toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>

                    {/* avatar user */}
                    {isUser && (
                      <Image
                        src={selectedConversation.buyerAvatar}
                        alt="your avatar"
                        width={32}
                        height={32}
                        className="w-8 h-8 ml-2 rounded-full"
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Input + bouton Send */}
            <div className="flex items-center mt-4">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Type your message..."
                className="flex-1 px-4 py-2 text-white bg-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleSend}
                className="px-4 py-2 ml-2 text-white bg-blue-500 rounded-xl hover:bg-blue-600"
              >
                Send
              </button>
            </div>

            {/* CSS bulles épurées */}
            <style jsx>{`
              .message-bubble {
                border-radius: 18px;
              }
              .message-bubble.user {
                background-color: #0a84ff;
                color: white;
              }
              .message-bubble.other {
                background-color: #e5e5ea;
                color: #1c1c1e;
              }
            `}</style>
          </div>
        </div>
      )}

      <p className="mt-12 text-center text-gray-500">
        Coming soon: message previews, group chats, and more!
      </p>
    </div>
  );
}
