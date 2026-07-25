import { signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword, getAuth as getAuthFromFirebase } from "firebase/auth";
import { initializeApp, deleteApp } from "firebase/app";
import { auth, firebaseConfig, db, functions } from "../config/firebase";
import { getUserProfile } from "./userService";
import { doc, setDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
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

export const signOutAllDevices = async () => {
  const revokeUserSessions = httpsCallable(functions, "revokeUserSessions");
  await revokeUserSessions();
  await signOut(auth);
};

export const createUserAccount = async ({ firstName, lastName, email, password, role, phoneNumber = "" }) => {
  const displayName = `${firstName} ${lastName}`.trim();
  const secondaryApp = initializeApp(firebaseConfig, `secondary-${Date.now()}`);
  const secondaryAuth = getAuthFromFirebase(secondaryApp);

  try {
    const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    const firebaseUser = userCredential.user;

    await setDoc(doc(db, COLLECTION_NAMES.USERS, firebaseUser.uid), {
      userId: displayName,
      fullName: displayName,
      email,
      role,
      phoneNumber,
      status: "Active",
      createdAt: new Date()
    });

    await signOut(secondaryAuth);

    return {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      fullName: displayName,
      role
    };
  } finally {
    await deleteApp(secondaryApp);
  }
};

export const register = async ({ firstName, lastName, email, password, role, phoneNumber }) => {
  const displayName = `${firstName} ${lastName}`;
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const firebaseUser = userCredential.user;

  await setDoc(doc(db, COLLECTION_NAMES.USERS, firebaseUser.uid), {
    userId: displayName,
    fullName: displayName,
    email,
    role,
    phoneNumber: phoneNumber || "",
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
