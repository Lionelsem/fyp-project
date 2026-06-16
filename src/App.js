import React from 'react';
import './App.css';
import { AuthProvider } from './context/AuthContext';
import { useAuthContext } from './context/AuthContext';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import AdminContact from './pages/auth/AdminContact';
import { ROUTES } from './constants/routes';
import { useLocation } from 'react-router-dom';
import AdminRoutes from './routes/AdminRoutes';
import CustomerRoutes from './routes/CustomerRoutes';
import FSMRoutes from './routes/FSMRoutes';
import { ROLES } from './constants/roles';

function AppContent() {
  const { user, loading } = useAuthContext();
  const location = useLocation();

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '20px' }}>Loading authentication...</div>;
  }

  if (location.pathname === ROUTES.ADMIN_CONTACT) {
    return <AdminContact />;
  }

  // If not logged in, show login or register based on URL
  if (!user) {
    if (location.pathname === ROUTES.REGISTER) {
      return <Register />;
    }
    return <Login />;
  }

  const roleRoutes = {
    [ROLES.ADMIN]: <AdminRoutes />,
    [ROLES.FSM]: <FSMRoutes />,
    [ROLES.CUSTOMER]: <CustomerRoutes />
  };

  if (!roleRoutes[user.role]) {
    return <div style={{ textAlign: 'center', padding: '20px' }}>Invalid role. Please contact administrator.</div>;
  }

  return roleRoutes[user.role];
}

function App() {
  return (
    <AuthProvider>
      <div className="App">
        <AppContent />
      </div>
    </AuthProvider>
  );
}

export default App;
