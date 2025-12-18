import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyAM1oA1xH-0vh0Wq1fOecxXcTQwFpVG0vE",
  authDomain: "gastos-8557b.firebaseapp.com",
  projectId: "gastos-8557b",
  storageBucket: "gastos-8557b.firebasestorage.app",
  messagingSenderId: "304415632556",
  appId: "1:304415632556:web:00e17d609e04a423278309"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

export default app;
