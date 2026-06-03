import { collection, doc, getDoc, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { db } from "../config/firebase";
import { COLLECTION_NAMES } from "../constants/collectionNames";

export const getUserProfile = async (uid, email) => {
  const userDoc = await getDoc(doc(db, COLLECTION_NAMES.USERS, uid));
  if (userDoc.exists()) {
    return { profileId: userDoc.id, ...userDoc.data() };
  }

  if (!email) {
    return null;
  }

  const usersQuery = query(
    collection(db, COLLECTION_NAMES.USERS),
    where("email", "==", email),
    limit(1)
  );
  const snapshot = await getDocs(usersQuery);

  if (snapshot.empty) {
    return null;
  }

  const profileDoc = snapshot.docs[0];
  return { profileId: profileDoc.id, ...profileDoc.data() };
};

export const getAllUsers = async () => {
  const usersQuery = query(collection(db, COLLECTION_NAMES.USERS), orderBy("fullName", "asc"));
  const snapshot = await getDocs(usersQuery);
  return snapshot.docs.map((docItem) => ({ uid: docItem.id, ...docItem.data() }));
};
