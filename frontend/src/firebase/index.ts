// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: "smtp-a6e98.firebaseapp.com",
  projectId: "smtp-a6e98",
  storageBucket: "smtp-a6e98.firebasestorage.app",
  messagingSenderId: "43579261181",
  appId: "1:43579261181:web:831e1d50a995aa3f2abe94",
  measurementId: "G-457BY5Z7W4"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
