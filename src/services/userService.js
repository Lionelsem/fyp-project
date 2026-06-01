import { doc, getDoc } from "firebase/firestore";
import { db } from "../config/firebase";
import { COLLECTION_NAMES } from "../constants/collectionNames";

export const getUserProfile = async (uid) => {
  const userDoc = await getDoc(doc(db, COLLECTION_NAMES.USERS, uid));
  if (!userDoc.exists()) {
    return null;
  }
  return userDoc.data();
};
