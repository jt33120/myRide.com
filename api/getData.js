import admin from '../firebaseAdmin';
import NodeCache from 'node-cache';

const cache = new NodeCache({ stdTTL: 600 }); // Cache for 10 minutes

export default async function handler(req, res) {
  const cacheKey = 'yourCollectionData';
  const cachedData = cache.get(cacheKey);

  if (cachedData) {
    return res.status(200).json({ data: cachedData });
  }

  const db = admin.firestore();
  const pageSize = 10; // Adjust page size as needed
  const lastVisible = req.query.lastVisible; // Use this to implement pagination

  let query = db.collection('yourCollection').orderBy('timestamp').limit(pageSize);

  if (lastVisible) {
    const lastDoc = await db.collection('yourCollection').doc(lastVisible).get();
    query = query.startAfter(lastDoc);
  }

  const snapshot = await query.get();
  const data = snapshot.docs.map(doc => doc.data());

  cache.set(cacheKey, data);

  res.status(200).json({ data });
}
