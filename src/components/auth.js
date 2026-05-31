import React, { useState } from 'react';
import { auth } from '../config/firebase';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

export const Auth = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [userData, setUserData] = useState(null);

    const signIn = async () => {
        try {
            await createUserWithEmailAndPassword(auth, email, password);

            const user = userCredential.user;

      await setDoc(doc(db, "users", user.uid), {
        fullName: "Test User",
        email: user.email,
        phoneNumber: "91234567",
        role: "Admin",
        status: "Active",
        createdAt: new Date()
      });

      const docSnap = await getDoc(doc(db, "users", user.uid));
      if (docSnap.exists()) {
        setUserData(docSnap.data());
      }
        } catch (err) {
            console.error(err);
        }
    };

        const logout = async () => {
        try {
            await signOut(auth);
            setUserData(null);
        } catch (err) {
            console.error(err);
        }
    };


    return (
        <div>
            <input
                placeholder="Email..."
                value={email}
                onChange={(e) => setEmail(e.target.value)}
            />
            <input
                placeholder="Password..."
                value={password}
                type = "password"
                onChange={(e) => setPassword(e.target.value)}
            />
            <button onClick={signIn}>Sign In</button>
            <button onClick={logout}>Logout</button>
            
            {userData && (
        <div>
            <h3>Firestore User Data</h3>
            <p>Full Name: {userData.fullName}</p>
            <p>Email: {userData.email}</p>
            <p>Phone: {userData.phoneNumber}</p>
            <p>Role: {userData.role}</p>
            <p>Status: {userData.status}</p>
        </div>
      )}
        </div>
    );
};