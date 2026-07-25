import React from "react";
import { useAuthContext } from "../context/AuthContext";
import Login from "../pages/auth/Login";

const CenteredMessage = ({ title, message }) => (
  <section className="centered-page-state" role={title ? "alert" : "status"}>
    {title && <h2>{title}</h2>}
    {message && <p>{message}</p>}
  </section>
);

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, loading } = useAuthContext();

  if (loading) {
    return <CenteredMessage message="Loading..." />;
  }

  if (!user) {
    return <Login />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <CenteredMessage title="Access Denied" message="You don't have permission to access this page." />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
