import { initializeApp, getApps } from "firebase/app";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  // ...your config...
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const storage = getStorage(app);