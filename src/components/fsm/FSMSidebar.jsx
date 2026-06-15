import React, { useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { logout } from "../../services/authService";

const menuItems = [
  { path: "/fsm/dashboard", label: "Dashboard", icon: "📊" },
  {
    path: "/fsm/inspections",
    label: "Inspection",
    icon: "📋",
    submenu: [
      { path: "/fsm/inspections", label: "My Inspections" },
      { path: "/fsm/inspections/verify", label: "Verify Closure" }
    ]
  },
  {
    path: "/fsm/building",
    label: "My Building",
    icon: "🏢",
    submenu: [
      { path: "/fsm/fire-drill", label: "Fire Drill" }
    ]
  }
];

const FSMSidebar = ({ profile }) => {
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [expandedMenu, setExpandedMenu] = useState(null);

  const displayName = profile?.name || "Fire Safety Manager";
  const roleLabel = profile?.role || "FSM";
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
      console.error("Logout failed", error);
      setIsLoggingOut(false);
    }
  };

  const toggleSubmenu = (path) => {
    setExpandedMenu(expandedMenu === path ? null : path);
  };

  const location = useLocation();

  const handleParentClick = (path) => {
    toggleSubmenu(path);
    navigate(path);
  };

  useEffect(() => {
    if (location.pathname.startsWith("/fsm/inspections")) {
      setExpandedMenu("/fsm/inspections");
    }
  }, [location.pathname]);

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
              {item.submenu ? (
                <>
                  <button
                    type="button"
                    className="menu-item submenu-toggle"
                    onClick={() => handleParentClick(item.path)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "12px 16px",
                      color: "inherit",
                      font: "inherit"
                    }}
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <span className="menu-icon">{item.icon}</span>
                      <span className="menu-label">{item.label}</span>
                    </span>
                    <span style={{ transform: expandedMenu === item.path ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", fontSize: "12px" }}>
                      ▼
                    </span>
                  </button>
                  {expandedMenu === item.path && (
                    <ul className="submenu">
                      {item.submenu.map((subitem) => (
                        <li key={subitem.path}>
                          <NavLink
                            to={subitem.path}
                            className={({ isActive }) =>
                              isActive ? "menu-item submenu-item active" : "menu-item submenu-item"
                            }
                          >
                            {subitem.label}
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
        <button type="button" className="sidebar-btn profile-btn" onClick={() => navigate("/fsm/profile")}>
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

export default FSMSidebar;
