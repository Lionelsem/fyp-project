import React from 'react';
import './App.css';
import { Auth } from './components/auth';
import {db} from'./config/firebase';
import {getDocs, collection} from 'firebase/firestore';
import { useState, useEffect } from 'react';

function App() {
  const [user,setUser] = useState([]);

  const userCollectionRef = collection(db, "users");

  useEffect(() => {
    const getUser = async () => {
      try {
        const data = await getDocs(userCollectionRef);
        setUser(data.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      } catch (err) {
        console.error(err);
      }
    };
    getUser();
  }, []);

  return (
    <div className="App">
      <Auth />
    </div>
  );
}

export default App;
