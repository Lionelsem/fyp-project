import React from 'react';
import './App.css';
import { AuthProvider } from './context/AuthContext';
import { useAuthContext } from './context/AuthContext';
import Login from './pages/auth/Login';
import AdminRoutes from './routes/AdminRoutes';
import CustomerRoutes from './routes/CustomerRoutes';
import FSMRoutes from './routes/FSMRoutes';
import { ROLES } from './constants/roles';

function AppContent() {
  const { user, loading } = useAuthContext();

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '20px' }}>Loading authentication...</div>;
  }

  // If not logged in, show login
  if (!user) {
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
