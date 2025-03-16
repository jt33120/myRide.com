import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { auth, db, storage } from '../lib/firebase';
import { collection, doc, getDoc, query, orderBy, onSnapshot, setDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

const fetchConversation = async (conversationId, user) => {
  const convoRef = doc(db, 'conversations', conversationId);
  const convoSnap = await getDoc(convoRef);

  if (convoSnap.exists()) {
    const convoData = convoSnap.data();
    const otherUserId = convoData.participants.find((id) => id !== user.uid);
    let otherUser = null;
    let vehicleTitle = '';

    // Get the other participant's info
    if (otherUserId) {
      const userRef = doc(db, 'members', otherUserId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        otherUser = userSnap.data();
      }
    }

    // Get the vehicle title if applicable
    if (convoData.vehicleId) {
      const vehicleRef = doc(db, 'listing', convoData.vehicleId);
      const vehicleSnap = await getDoc(vehicleRef);
      if (vehicleSnap.exists()) {
        const vehicle = vehicleSnap.data();
        vehicleTitle = `${vehicle.Make} ${vehicle.Model} (${vehicle.Year})`;
      }
    }

    return { convoData, otherUser, vehicleTitle };
  }

  return null;
};

const fetchMessages = async (conversationId) => {
  const messagesRef = collection(db, 'conversations', conversationId, 'messages');
  const q = query(messagesRef, orderBy('__name__', 'asc'));

  const querySnapshot = await getDocs(q);
  const messages = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  return messages;
};

const ChatPage = () => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [conversation, setConversation] = useState(null);
  const [otherUser, setOtherUser] = useState(null);
  const [vehicleTitle, setVehicleTitle] = useState('');
  const [uploading, setUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const router = useRouter();
  const { conversationId } = router.query;
  const user = auth.currentUser;
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const fetchConversationAsync = async () => {
      if (!conversationId || !user) return;

      try {
        const convoData = await fetchConversation(conversationId, user);
        if (convoData) {
          setConversation(convoData.convoData);
          setOtherUser(convoData.otherUser);
          setVehicleTitle(convoData.vehicleTitle);
        }
      } catch (error) {
        console.error(error);
      }
    };

    fetchConversationAsync();
  }, [conversationId, user]);

  useEffect(() => {
    const fetchMessagesAsync = async () => {
      if (!conversationId) return;

      try {
        const msgs = await fetchMessages(conversationId);
        setMessages(msgs);
      } catch (error) {
        console.error(error);
      }
    };

    fetchMessagesAsync();
  }, [conversationId]);

  useEffect(() => {
    const messagesRef = collection(db, 'conversations', conversationId, 'messages');
    const q = query(messagesRef, orderBy('__name__', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);
      scrollToBottom();
    });

    return () => unsubscribe();
  }, [conversationId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async () => {
    if (newMessage.trim() === '') return;

    const messageId = new Date().toISOString();
    const messageRef = doc(db, 'conversations', conversationId, 'messages', messageId);
    await setDoc(messageRef, {
      sender: user.uid,
      content: newMessage,
      type: 'text',
      seenBy: [],
    });

    setNewMessage('');
    scrollToBottom();
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const messageId = new Date().toISOString();
    const storageRef = ref(storage, `conversations/${conversationId}/messages/${messageId}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        // Handle progress
      },
      (error) => {
        console.error('File upload error:', error);
        setUploading(false);
      },
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        const messageRef = doc(db, 'conversations', conversationId, 'messages', messageId);
        await setDoc(messageRef, {
          sender: user.uid,
          content: downloadURL,
          type: file.type.startsWith('image/') ? 'image' : 'video',
          seenBy: [],
        });
        setUploading(false);
        scrollToBottom();
      }
    );
  };

  const handleImageClick = (url) => {
    setSelectedImage(url);
  };

  const closeModal = () => {
    setSelectedImage(null);
  };

  if (!conversation) return <div className="p-4 text-center">Loading chat...</div>;

  return (
    <div className="max-w-2xl mx-auto p-4">
      <button
        onClick={() => router.push('/myMessages_page')}
        className="return-button mb-4"
        title="Back to Messages"
      >
        ⏎
      </button>
      <h2 className="text-2xl font-bold mb-2">Chat with {otherUser?.firstName || 'User'}</h2>
      <p className="text-gray-500 mb-4">About: {vehicleTitle || 'General Inquiry'}</p>

      {/* Messages */}
      <div className="border p-4 h-96 overflow-y-auto rounded-md bg-gray-100">
        {messages.map((msg) => (
          <div key={msg.id} className={`mb-2 p-2 rounded-md ${msg.sender === user.uid ? 'bg-blue-500 text-white self-end' : 'bg-white text-gray-900'}`}>
            {msg.type === 'image' ? (
              <img
                src={msg.content}
                alt="Shared content"
                className="max-w-xs h-auto rounded-md cursor-pointer"
                onClick={() => handleImageClick(msg.content)}
              />
            ) : msg.type === 'video' ? (
              <video controls className="max-w-full h-auto rounded-md">
                <source src={msg.content} type={msg.contentType} />
                Your browser does not support the video tag.
              </video>
            ) : (
              <p>{msg.content}</p>
            )}
          </div>
        ))}
        <div ref={messagesEndRef}></div>
      </div>

      {/* Input Field */}
      <div className="mt-4 flex items-center">
        <input
          type="text"
          className="flex-1 p-2 border rounded-md"
          placeholder="Type your message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
        />
        <button onClick={sendMessage} className="ml-2 bg-blue-500 text-white p-2 rounded-md">Send</button>
        <input type="file" onChange={handleFileUpload} className="ml-2" />
      </div>
      {uploading && <p className="text-sm text-gray-500">Uploading...</p>}

      {/* Image Modal */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="relative">
            <img src={selectedImage} alt="Selected content" className="max-w-full max-h-full rounded-md" />
            <button onClick={closeModal} className="absolute top-5 left-5 bg-white text-white p-2 rounded-full">✕</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatPage;