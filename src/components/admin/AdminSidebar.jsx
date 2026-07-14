import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { logout } from "../../services/authService";

const menuItems = [
  { path: "/dashboard", label: "Dashboard", icon: "📊" },
  { path: "/users", label: "Users", icon: "👥" },
  { path: "/buildings", label: "Buildings", icon: "🏢" },
  { path: "/fsm-assignment", label: "FSM Assignment", icon: "👨‍🔧" },
  { path: "/issues-defects", label: "Issues / Defects", icon: "⚠️" },
  { path: "/fire-drill", label: "Fire Drill", icon: "🚒" },
  { path: "/reports", label: "Reports", icon: "📋" }
];

const AdminSidebar = ({
  profile,
  onClose,
  onNavigate = () => {}
}) => {
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const displayName = profile?.name || "Admin";
  const roleLabel = profile?.role || "Admin";
  const initials =
    profile?.initials ||
    displayName
      .split(" ")
      .map((part) => part.charAt(0))
      .join("")
      .slice(0, 2)
      .toUpperCase();

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
      onNavigate();
      navigate("/login");
    } catch (error) {
      console.error("Logout failed", error);
      setIsLoggingOut(false);
    }
  };

  const handleProfileNavigation = () => {
    onNavigate();
    navigate("/profile");
  };

  return (
    <aside className="admin-sidebar" aria-label="Admin navigation">
      <button
        type="button"
        className="portal-sidebar-close"
        aria-label="Close navigation menu"
        onClick={onClose}
      >
        <span aria-hidden="true">×</span>
      </button>
      <div className="sidebar-logo">
        <span className="logo-text">CBRE</span>
      </div>

      <div className="sidebar-user-card">
        <div className="user-avatar-large">{initials}</div>
        <div className="user-info">
          <div className="user-name">{displayName}</div>
          <div className="user-role">{roleLabel}</div>
        </div>
      </div>

      <nav className="sidebar-menu">
        <ul className="sidebar-list">
          {menuItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  isActive ? "menu-item active" : "menu-item"
                }
                onClick={onNavigate}
              >
                <span className="menu-icon">{item.icon}</span>
                <span className="menu-label">{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="sidebar-footer">
        <button type="button" className="sidebar-btn profile-btn" onClick={handleProfileNavigation}>
          👤 Profile
        </button>
        <button
          type="button"
          className="sidebar-btn logout-btn"
          onClick={handleLogout}
          disabled={isLoggingOut}
        >
          🚪 {isLoggingOut ? "Logging out..." : "Logout"}
        </button>
      </div>
    </aside>
  );
};

export default AdminSidebar;
