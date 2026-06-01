import React from 'react';
import './App.css';
import { AuthProvider } from './context/AuthContext';
import Login from './pages/auth/Login';

function App() {
  return (
    <AuthProvider>
      <div className="App">
        <Login />
      </div>
    </AuthProvider>
  );
}

export default App;
