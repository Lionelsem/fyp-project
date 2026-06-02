import { collection, doc, getDoc, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "../config/firebase";
import { COLLECTION_NAMES } from "../constants/collectionNames";

export const getUserProfile = async (uid) => {
  const userDoc = await getDoc(doc(db, COLLECTION_NAMES.USERS, uid));
  if (!userDoc.exists()) {
    return null;
  }
  return userDoc.data();
};

export const getAllUsers = async () => {
  const usersQuery = query(collection(db, COLLECTION_NAMES.USERS), orderBy("fullName", "asc"));
  const snapshot = await getDocs(usersQuery);
  return snapshot.docs.map((docItem) => ({ uid: docItem.id, ...docItem.data() }));
};
