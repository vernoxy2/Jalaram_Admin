// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import {
  getAuth,
  // signInAnonymously,
  // onAuthStateChanged,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCcGW8SAt05QEJPFqfll5aBAh_yaJ7tE5o",
  authDomain: "jalaram-33f56.firebaseapp.com",
  projectId: "jalaram-33f56",
  storageBucket: "jalaram-33f56.appspot.com",
  messagingSenderId: "308176661731",
  appId: "1:308176661731:web:09ea16b99a5764c707a9d6",
  measurementId: "G-HRPDKGM176",
};

const app = initializeApp(firebaseConfig);

// 🔥 initialize auth first
export const auth = getAuth(app);

// 🔥 Firestore
export const db = getFirestore(app);

// 🔥 Anonymous Auto Login
// onAuthStateChanged(auth, (user) => {
//   if (!user) {
//     signInAnonymously(auth)
//       .then(() => console.log("Signed in anonymously"))
//       .catch((err) => console.error("Anonymous login failed:", err));
//   } else {
//     console.log("Already logged in:", user.uid);
//   }
// });
