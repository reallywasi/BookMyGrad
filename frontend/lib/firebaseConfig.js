import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyD1fJg2Wh4l8HZvOqffvXykp2XBJRIs3y0",
  authDomain: "fb-app-6d2ad.firebaseapp.com",
  projectId: "fb-app-6d2ad",
  storageBucket: "fb-app-6d2ad.firebasestorage.app",
  messagingSenderId: "1024812609990",
  appId: "1:1024812609990:web:d34820f018c1efde7c82c7"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
