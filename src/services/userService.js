import { doc, getDoc } from "firebase/firestore";
import { db } from "../config/firebase";

export const getUserProfile = async (uid) => {
  const userDoc = await getDoc(doc(db, "users", uid));
  if (!userDoc.exists()) {
    return null;
  }
  return userDoc.data();
};
