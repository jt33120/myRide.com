import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router'; // Import router for navigation
import { auth } from '../lib/firebase';

const HelpPage = () => {
  const [topic, setTopic] = useState('');
  const [message, setMessage] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const router = useRouter(); // Initialize router

  useEffect(() => {
    const fetchUserEmail = async () => {
      const user = auth.currentUser;
      if (user) {
        console.log("User is logged in:", user.email);
        setUserEmail(user.email);
      } else {
        console.warn("No user logged in!");
      }
    };

    fetchUserEmail();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!userEmail) {
      setConfirmation("Error: No user email found!");
      return;
    }

    console.log("Sending request to /api/send-email with:", { userEmail, topic, message });

    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail, topic, message }),
      });

      const data = await response.json();
      console.log("Server response:", data);

      if (response.ok) {
        setConfirmation("Message sent, will reply ASAP!");
      } else {
        setConfirmation("Something went wrong: " + data.message);
      }
    } catch (error) {
      console.error("Error sending request:", error);
      setConfirmation("Error sending email. Please try again.");
    }

    setTopic('');
    setMessage('');
  };

  return (
    <div style={{ textAlign: 'center', padding: '50px', backgroundColor: '#f9f9f9', position: 'relative' }}>
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

      <h1 style={{ fontSize: '36px', color: '#333', marginBottom: '30px' }}>Need Help?</h1>
      <p style={{ fontSize: '18px', color: '#666', marginBottom: '40px' }}>
        Do you have any issue, question, or remark about MyRide? Send me an email, and I will make sure to answer you ASAP!
      </p>

      <form onSubmit={handleSubmit} style={{ maxWidth: '600px', margin: '0 auto', backgroundColor: 'white', padding: '30px', borderRadius: '8px', border: '2px solid #e42fee' }}>
        <div style={{ marginBottom: '20px' }}>
          <label htmlFor="topic" style={{ display: 'block', fontSize: '16px', fontWeight: 'bold', color: '#333', marginBottom: '8px' }}>Topic:</label>
          <input 
            type="text" 
            id="topic" 
            value={topic} 
            onChange={(e) => setTopic(e.target.value)} 
            placeholder="Enter the topic" 
            style={{
              padding: '12px', 
              width: '100%', 
              border: '1px solid #ccc', 
              borderRadius: '6px', 
              fontSize: '16px', 
              boxSizing: 'border-box'
            }} 
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label htmlFor="message" style={{ display: 'block', fontSize: '16px', fontWeight: 'bold', color: '#333', marginBottom: '8px' }}>Message:</label>
          <textarea 
            id="message" 
            value={message} 
            onChange={(e) => setMessage(e.target.value)} 
            placeholder="Your message here..." 
            rows="6" 
            style={{
              padding: '12px', 
              width: '100%', 
              border: '1px solid #ccc', 
              borderRadius: '6px', 
              fontSize: '16px', 
              boxSizing: 'border-box'
            }}
          />
        </div>

        <button 
          type="submit" 
          style={{
            padding: '14px 28px', 
            backgroundColor: '#e42fee', 
            color: 'white', 
            fontSize: '18px', 
            border: 'none', 
            borderRadius: '6px', 
            cursor: 'pointer', 
            width: '100%', 
            transition: 'background-color 0.3s ease'
          }}
          onMouseEnter={(e) => e.target.style.backgroundColor = '#d631f7'}
          onMouseLeave={(e) => e.target.style.backgroundColor = '#e42fee'}
        >
          Send
        </button>
      </form>

      {confirmation && (
        <div style={{ marginTop: '30px', color: 'black', fontWeight: 'bold', fontSize: '18px' }}>
          {confirmation}
        </div>
      )}
    </div>
  );
};

export default HelpPage;
