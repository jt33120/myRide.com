import { db } from "../../lib/firebase";
import { collection, getDocs } from "firebase/firestore";

export default async function handler(req, res) {
  if (req.method === "GET") {
    try {
      const documentsRef = collection(db, "documents");
      const snapshot = await getDocs(documentsRef);
      const documents = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      res.status(200).json(documents);
    } catch (error) {
      console.error("Error fetching documents:", error);
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  } else {
    res.status(405).json({ message: "Method Not Allowed" });
  }
}
