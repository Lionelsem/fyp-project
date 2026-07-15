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
import PageLayout from './components/common/PageLayout';

const StandalonePage = ({ children }) => (
  <PageLayout className="page-layout--standalone">{children}</PageLayout>
);

function AppContent() {
  const { user, loading } = useAuthContext();
  const location = useLocation();

  if (loading) {
    return (
      <StandalonePage>
        <div className="centered-page-state" role="status">Loading authentication...</div>
      </StandalonePage>
    );
  }

  if (location.pathname === ROUTES.ADMIN_CONTACT) {
    return <StandalonePage><AdminContact /></StandalonePage>;
  }

  // If not logged in, show login or register based on URL
  if (!user) {
    if (location.pathname === ROUTES.REGISTER) {
      return <StandalonePage><Register /></StandalonePage>;
    }
    return <StandalonePage><Login /></StandalonePage>;
  }

  const roleRoutes = {
    [ROLES.ADMIN]: <AdminRoutes />,
    [ROLES.FSM]: <FSMRoutes />,
    [ROLES.CUSTOMER]: <CustomerRoutes />
  };

  if (!roleRoutes[user.role]) {
    return (
      <StandalonePage>
        <div className="centered-page-state" role="alert">
          Invalid role. Please contact administrator.
        </div>
      </StandalonePage>
    );
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
