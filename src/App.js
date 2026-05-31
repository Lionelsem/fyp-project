import React from 'react';
import './App.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Auth from './components/auth';
import CreateIssuePage from './pages/CreateIssuePage';
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
    <Router>
      <Routes>
        <Route path="/" element={<Auth />} />
        <Route path="/issues/create" element={<CreateIssuePage />} />
      </Routes>
    </Router>
  );
}

export default App;