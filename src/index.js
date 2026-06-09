import React from 'react';
import ReactDom from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';

// Ensure the app opens at /login by default when navigating to root
if (window.location.pathname === '/') {
  window.history.replaceState({}, '', '/login');
}

const root = ReactDom.createRoot(document.getElementById('root'));
root.render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);