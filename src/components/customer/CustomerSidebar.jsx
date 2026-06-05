import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuthContext } from "../../context/AuthContext";
import Sidebar from "../common/Sidebar";

const CustomerSidebar = ({ profile }) => {
  const navigate = useNavigate();
  const { logout } = useAuthContext();

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <Sidebar>
      <div className="sidebar-logo">CBRE</div>
      
      {profile && (
        <div className="sidebar-user-card">
          <div className="user-avatar-large">{profile.initials}</div>
          <div className="user-info">
            <div className="user-name">{profile.name}</div>
            <div className="user-role">{profile.role}</div>
          </div>
        </div>
      )}

      <nav className="sidebar-menu">
        <NavLink 
          to="/dashboard" 
          className={({ isActive }) => (isActive ? "menu-item active" : "menu-item")}
        >
          <span className="menu-icon">🏠</span>
          <span className="menu-label">Dashboard</span>
        </NavLink>
        
        <NavLink 
          to="/issue-progress" 
          className={({ isActive }) => (isActive ? "menu-item active" : "menu-item")}
        >
          <span className="menu-icon">⚠️</span>
          <span className="menu-label">Issue Progress</span>
        </NavLink>
        
        <NavLink 
          to="/inspections" 
          className={({ isActive }) => (isActive ? "menu-item active" : "menu-item")}
        >
          <span className="menu-icon">📋</span>
          <span className="menu-label">Inspection Reports</span>
        </NavLink>
        
        <NavLink 
          to="/firedrill" 
          className={({ isActive }) => (isActive ? "menu-item active" : "menu-item")}
        >
          <span className="menu-icon">📅</span>
          <span className="menu-label">Fire Drill Reports</span>
        </NavLink>
        
        <NavLink 
          to="/annual" 
          className={({ isActive }) => (isActive ? "menu-item active" : "menu-item")}
        >
          <span className="menu-icon">📍</span>
          <span className="menu-label">Annual Reports</span>
        </NavLink>
        
        <NavLink 
          to="/feedbacks" 
          className={({ isActive }) => (isActive ? "menu-item active" : "menu-item")}
        >
          <span className="menu-icon">💬</span>
          <span className="menu-label">Comments / Feedback</span>
        </NavLink>
        
        <NavLink 
          to="/building" 
          className={({ isActive }) => (isActive ? "menu-item active" : "menu-item")}
        >
          <span className="menu-icon">🏢</span>
          <span className="menu-label">My Building</span>
        </NavLink>
      </nav>

      <div className="sidebar-footer">
        <button className="sidebar-btn profile-btn">👤 Profile</button>
        <button className="sidebar-btn logout-btn" onClick={handleLogout}>
          🚪 Logout
        </button>
      </div>
    </Sidebar>
  );
};

export default CustomerSidebar;
