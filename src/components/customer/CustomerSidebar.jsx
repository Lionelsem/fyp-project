import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { logout } from "../../services/authService";

const menuItems = [
  { path: "/dashboard", label: "Dashboard", icon: "📊" },
  { path: "/issue-progress", label: "Issue Progress", icon: "📝" },
  {
    label: "Reports",
    icon: "📊",
    submenu: [
      { path: "/inspection-reports", label: "Inspection", icon: "📋" },
      { path: "/fire-drill-reports", label: "Fire Drills", icon: "🚒" },
      { path: "/annual-reports", label: "Annual", icon: "📈" }
    ]
  },
  { path: "/feedbacks", label: "Comments/Feedbacks", icon: "📝" },
  { path: "/building", label: "My Buildings", icon: "🏢" }
];

const CustomerSidebar = ({
  profile,
  onClose,
  onNavigate = () => {}
}) => {
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState({ Reports: true });

  const displayName = profile?.name || profile?.email || "Customer";
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
      onNavigate();
      navigate("/login");
    } catch (error) {
      console.error("Logout failed:", error);
      setIsLoggingOut(false);
    }
  };

    const handleProfileNavigation = () => {
    onNavigate();
    navigate("/profile");
  };

  return (
    <aside className="admin-sidebar customer-sidebar" aria-label="Customer navigation">
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
            <li key={item.label}>
              {item.submenu ? (
                <>
                  <button
                    type="button"
                    className={`menu-item menu-toggle ${expandedMenus[item.label] ? "active" : ""}`}
                    onClick={() =>
                      setExpandedMenus((prev) => ({
                        ...prev,
                        [item.label]: !prev[item.label]
                      }))
                    }
                    aria-expanded={!!expandedMenus[item.label]}
                  >
                    <span className="menu-icon">{item.icon}</span>
                    <span className="menu-label">{item.label}</span>
                    <span className={`menu-arrow ${expandedMenus[item.label] ? "expanded" : ""}`}>
                      ▼
                    </span>
                  </button>
                  {expandedMenus[item.label] && (
                    <ul className="submenu">
                      {item.submenu.map((subitem) => (
                        <li key={subitem.path}>
                          <NavLink
                            to={subitem.path}
                            className={({ isActive }) =>
                              isActive ? "menu-item active" : "menu-item"
                            }
                            onClick={onNavigate}
                          >
                            <span className="menu-icon">{subitem.icon}</span>
                            <span className="menu-label">{subitem.label}</span>
                          </NavLink>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              ) : (
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
              )}
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

export default CustomerSidebar;
