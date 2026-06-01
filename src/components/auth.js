import React, { useState } from "react";
import {
  signInWithEmailAndPassword,
  signOut
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../config/firebase";
import { COLLECTION_NAMES } from "../constants/collectionNames";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [userData, setUserData] = useState(null);

  const handleLogin = async () => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const docSnap = await getDoc(doc(db, COLLECTION_NAMES.USERS, user.uid));
      if (docSnap.exists()) {
        setUserData(docSnap.data());
      }

      alert("Login successful");
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUserData(null);
      alert("Logged out");
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  };

  return (
    <div style={{ maxWidth: "400px", margin: "auto" }}>
      <h2>Login</h2>

      <input
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <br />

      <input
        placeholder="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <br />

      <button onClick={handleLogin}>Login</button>
      <button onClick={handleLogout}>Logout</button>

    </div>
  );
};

export default Auth;