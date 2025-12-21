// firebase-init.js  (save next to app.js and dashboard.js)
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyA2-ZSnxGhMSbpxR9lWipQ-JX4s8Fz3j8Q",
  authDomain: "librarymanagement-80741.firebaseapp.com",
  projectId: "librarymanagement-80741",
  storageBucket: "librarymanagement-80741.firebasestorage.app",
  messagingSenderId: "7076696675",
  appId: "1:7076696675:web:ff0f1965ca544627ab1e56"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

console.log('Firebase initialized');
