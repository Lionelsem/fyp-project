import { signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword } from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import { auth, functions, db } from "../config/firebase";
import { getUserProfile } from "./userService";
import { doc, setDoc } from "firebase/firestore";
import { COLLECTION_NAMES } from "../constants/collectionNames";

export const login = async (email, password) => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  const firebaseUser = userCredential.user;
  const profile = await getUserProfile(firebaseUser.uid, firebaseUser.email);
  return {
    ...profile,
    uid: firebaseUser.uid,
    authUid: firebaseUser.uid,
    email: firebaseUser.email,
  };
};

export const logout = async () => {
  await signOut(auth);
};

export const createUserAccount = async (data) => {
  const createUser = httpsCallable(functions, "createUserAccount");
  const result = await createUser(data);
  return result.data;
};

export const register = async ({ firstName, lastName, email, password, role }) => {
  const displayName = `${firstName} ${lastName}`;
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const firebaseUser = userCredential.user;

  await setDoc(doc(db, COLLECTION_NAMES.USERS, firebaseUser.uid), {
    fullName: displayName,
    email,
    role,
    status: "Active",
    createdAt: new Date()
  });

  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    fullName: displayName,
    role
  };
};
