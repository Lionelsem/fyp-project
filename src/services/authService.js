import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import { auth, functions } from "../config/firebase";
import { getUserProfile } from "./userService";

export const login = async (email, password) => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  const firebaseUser = userCredential.user;
  const profile = await getUserProfile(firebaseUser.uid);
  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    ...profile
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
