import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDTN8_lbfa7Z6tH8PS3VBDDw1qh2JPcnIQ",
  authDomain: "fireguardcbre.firebaseapp.com",
  projectId: "fireguardcbre",
  storageBucket: "fireguardcbre.firebasestorage.app",
  messagingSenderId: "1090700840165",
  appId: "1:1090700840165:web:aeb03ac28c5d66fc6c180c",
  measurementId: "G-Z50LLHETTN"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const auth = getAuth(app);