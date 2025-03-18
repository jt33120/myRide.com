import { initializeApp, cert } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';
import sharp from 'sharp';
import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';

// Initialize Firebase Admin SDK
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
initializeApp({
  credential: cert(serviceAccount),
  storageBucket: 'your-firebase-storage-bucket'
});

const storage = getStorage().bucket();

export default async function handler(req, res) {
  const { uid, filename } = req.query;

  if (!uid || !filename) {
    return res.status(400).json({ error: 'Missing uid or filename' });
  }

  const cacheDir = path.resolve('.vercel/cache/images');
  await fs.mkdir(cacheDir, { recursive: true });

  const cacheKey = createHash('md5').update(`${uid}-${filename}`).digest('hex');
  const cachePath = path.join(cacheDir, cacheKey);

  try {
    // Check if the image is already cached
    const cachedImage = await fs.readFile(cachePath);
    res.setHeader('Content-Type', 'image/png');
    return res.send(cachedImage);
  } catch (error) {
    console.error('Error reading cached image:', error);
    // Image not cached, proceed to fetch from Firebase Storage
  }

  try {
    const file = storage.file(`members/${uid}/${filename}`);
    const [fileExists] = await file.exists();

    if (!fileExists) {
      return res.status(404).json({ error: 'File not found' });
    }

    const [fileBuffer] = await file.download();

    // Optimize the image using sharp
    const optimizedImage = await sharp(fileBuffer)
      .resize(300, 300) // Resize to 300x300 pixels
      .png({ quality: 80 }) // Convert to PNG with 80% quality
      .toBuffer();

    // Cache the optimized image
    await fs.writeFile(cachePath, optimizedImage);

    res.setHeader('Content-Type', 'image/png');
    res.send(optimizedImage);
  } catch (error) {
    console.error('Error fetching or optimizing image:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
