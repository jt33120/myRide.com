import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { initializeApp, getApps, cert } from "firebase-admin/app"; // Importing getApps and initializeApp

// Parse the JSON credentials from the environment variable
const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_KEY || "{}");

// Initialize Firebase Admin SDK if not already initialized
if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
  });
}

// Export Firebase Admin services
export const adminAuth = getAuth(); // Firebase Authentication
export const adminDb = getFirestore(); // Firestore Database
