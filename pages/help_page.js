import React, { useState, useEffect } from "react";
import { auth } from "../lib/firebase";

export default function HelpPage() {
  const [topic, setTopic] = useState("");
  const [message, setMessage] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    const user = auth.currentUser;
    if (user) setUserEmail(user.email);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userEmail) {
      setConfirmation("Error: No user email found!");
      return;
    }
    try {
      const response = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userEmail, topic, message }),
      });
      const data = await response.json();
      if (response.ok) {
        setConfirmation("Message sent, will reply ASAP!");
      } else {
        setConfirmation(`Something went wrong: ${data.message}`);
      }
    } catch (error) {
      console.error("Error:", error);
      setConfirmation("Error sending email. Please try again.");
    }
    setTopic("");
    setMessage("");
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-black to-gray-800">
      {/* Mobile header */}
      <header className="px-4 py-4 bg-black/50">
        <h1 className="mt-5 text-4xl font-bold text-center text-white">
          Need Help ?
        </h1>
      </header>

      <main className="flex-grow px-4 py-6">
        {/* Form container */}
        <div className="w-full p-4 bg-white rounded-lg shadow">
          <p className="mt-2 text-gray-600">
            Have an issue, question, or feedback about MyRide ? <br />
            Send us a message and we&apos;ll get back to you ASAP.
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="topic"
                className="block mb-2 text-sm font-medium text-gray-700"
              >
                Topic
              </label>
              <select
                id="topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full px-4 py-2 mb-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">Select a topic</option>
                <option value="Account Issue">Account Issue</option>
                <option value="Feature Request">Feature Request</option>
                <option value="Bug Report">Bug Report</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="message"
                className="block mb-2 text-sm font-medium text-gray-700"
              >
                Message
              </label>
              <textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Your message here..."
                rows={6}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full py-3 text-lg font-semibold text-white transition bg-purple-600 rounded-lg hover:bg-purple-700"
            >
              Send Message
            </button>
          </form>
          {confirmation && (
            <p className="mt-4 text-center text-green-600">{confirmation}</p>
          )}
        </div>
      </main>

      {/* Mobile footer */}
      <footer className="px-4 py-4 text-sm text-center text-gray-400">
        © {new Date().getFullYear()} MyRide. All rights reserved.
      </footer>
    </div>
  );
}
