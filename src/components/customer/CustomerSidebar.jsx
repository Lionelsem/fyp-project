import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { logout } from "../../services/authService";
import Sidebar from "../common/Sidebar";

const CustomerSidebar = () => {
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Logout failed", error);
      setIsLoggingOut(false);
    }
  };

  return (
    <Sidebar>
      <div className="sidebar-logo">Company</div>
      <nav className="sidebar-nav">
        <NavLink to="/dashboard" className={({ isActive }) => (isActive ? "sidebar-link active" : "sidebar-link")}>
          Dashboard
        </NavLink>
        <NavLink to="/my-reports" className={({ isActive }) => (isActive ? "sidebar-link active" : "sidebar-link")}>
          My Reports
        </NavLink>
        <NavLink to="/submit-report" className={({ isActive }) => (isActive ? "sidebar-link active" : "sidebar-link")}>
          Submit Report
        </NavLink>
      </nav>
      <div className="sidebar-footer" style={{ marginTop: "auto" }}>
        <button
          type="button"
          className="sidebar-btn logout-btn"
          onClick={handleLogout}
          disabled={isLoggingOut}
        >
          🚪 {isLoggingOut ? "Logging out..." : "Logout"}
        </button>
      </div>
    </Sidebar>
  );
};

export default CustomerSidebar;
