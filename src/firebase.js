// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDfYx2gFVHj-YaNmINYHhNsU_J4ju64SjA",
  authDomain: "artistline-v1.firebaseapp.com",
  projectId: "artistline-v1",
  storageBucket: "artistline-v1.firebasestorage.app",
  messagingSenderId: "499093106880",
  appId: "1:499093106880:web:994197f66294d185687d25"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

export default app;