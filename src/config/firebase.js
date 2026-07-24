import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";
import {
  initializeAppCheck,
  ReCaptchaEnterpriseProvider
} from "firebase/app-check";

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
const appCheckSiteKey = process.env.REACT_APP_FIREBASE_APP_CHECK_SITE_KEY;
export const appCheck =
  typeof window !== "undefined" && appCheckSiteKey
    ? initializeAppCheck(app, {
        provider: new ReCaptchaEnterpriseProvider(appCheckSiteKey),
        isTokenAutoRefreshEnabled: true
      })
    : null;
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app, "us-central1");
export { firebaseConfig };
