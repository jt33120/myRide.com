import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { auth, db } from "../../lib/firebase";
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
} from "firebase/firestore";

export default function ConversationPage() {
  const router = useRouter();
  const { conversationId, sellerName: querySellerName } = router.query;
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState("");
  const [sellerName, setSellerName] = useState(querySellerName || "");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) {
      router.push("/login_page"); // Redirige vers la page de connexion si l'utilisateur n'est pas connecté
      return;
    }

    if (conversationId) {
      const messagesQuery = query(
        collection(db, `conversations/${conversationId}/messages`),
        orderBy("createdAt", "asc")
      );
      const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
        setMessages(snapshot.docs.map((doc) => doc.data()));
        setLoading(false);
      });
      return () => unsubscribe();
    }
  }, [conversationId, router]);

  const sendMessage = async () => {
    if (!newMsg.trim()) return;
    if (!auth.currentUser) {
      alert("You must be logged in to send a message.");
      return;
    }
    await addDoc(collection(db, `conversations/${conversationId}/messages`), {
      senderId: auth.currentUser.uid,
      text: newMsg,
      createdAt: new Date(),
    });
    setNewMsg("");
  };

  return (
    <div className="min-h-screen text-white bg-gray-800">
      <div className="max-w-4xl p-6 mx-auto">
        <div className="flex items-center mb-6">
          <h1 className="text-2xl font-bold">{sellerName}</h1>
        </div>
        <div className="p-4 overflow-y-auto bg-gray-700 rounded-lg h-96">
          {loading ? (
            <p>Loading messages...</p>
          ) : (
            messages.map((msg, idx) => (
              <div
                key={idx}
                className={`p-2 my-2 rounded-lg ${
                  msg.senderId === auth.currentUser?.uid
                    ? "bg-blue-600"
                    : "bg-gray-600"
                }`}
              >
                {msg.text}
              </div>
            ))
          )}
        </div>
        <div className="flex mt-4">
          <input
            type="text"
            value={newMsg}
            onChange={(e) => setNewMsg(e.target.value)}
            className="flex-grow p-2 text-white bg-gray-700 rounded-l-lg"
            placeholder="Type your message..."
          />
          <button
            onClick={sendMessage}
            className="p-2 bg-blue-600 rounded-r-lg hover:bg-blue-700"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
