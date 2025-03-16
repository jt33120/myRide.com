// pages/api/testAdmin.js
import { adminAuth, adminDb } from "../../lib/admin";

export default async function handler(req, res) {
  try {
    // Sample Firebase Admin authentication test
    const users = await adminAuth.listUsers();
    console.log("All users:", users);

    // Sample Firestore test - Reading data
    const docRef = adminDb.collection("testCollection").doc("testDoc");
    const doc = await docRef.get();
    console.log("Document data:", doc.data());

    res.status(200).json({
      message: "Firebase Admin setup is working!",
      users: users.users.length, // Example: show number of users
      docData: doc.exists ? doc.data() : null,
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ message: "Error with Firebase Admin", error: error.message });
  }
}
