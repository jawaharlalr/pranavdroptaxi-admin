import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAH6mQtHLu3gqtPrwAi-67S-VwNYWAwE2c",
  authDomain: "pranavdroptaxi-808ff.firebaseapp.com",
  projectId: "pranavdroptaxi-808ff",
  storageBucket: "pranavdroptaxi-808ff.firebasestorage.app",
  messagingSenderId: "473028998497",
  appId: "1:473028998497:web:776e4c40d3b3985ae7c120"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);