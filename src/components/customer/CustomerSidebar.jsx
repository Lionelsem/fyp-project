import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { logout } from "../../services/authService";

const menuItems = [
  { path: "/dashboard", label: "Dashboard", icon: "📊" },
  { path: "/issue-progress", label: "Issue Progress", icon: "📝" },
  { path: "/inspection-reports", label: "Inspection Reports", icon: "📋" },
  { path: "/fire-drill-reports", label: "Fire Drill Reports", icon: "�" },
  { path: "/annual-reports", label: "Annual Reports", icon: "�" },
  { path: "/feedbacks", label: "Comments/Feedbacks", icon: "📝" },
  { path: "/building", label: "My Buildings", icon: "🏢" }
];

const CustomerSidebar = ({ profile }) => {
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const displayName = profile?.name || "Customer";
  const roleLabel = profile?.role || "Customer";
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
      navigate("/login");
    } catch (error) {
      console.error("Logout failed:", error);
      setIsLoggingOut(false);
    }
  };

  return (
    <aside className="admin-sidebar">
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
              >
                <span className="menu-icon">{item.icon}</span>
                <span className="menu-label">{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="sidebar-footer">
        <button type="button" className="sidebar-btn profile-btn" onClick={() => navigate("/profile")}>
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

export default CustomerSidebar;
