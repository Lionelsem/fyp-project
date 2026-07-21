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
      { path: "/fsm/inspections", label: "My Inspections", end: true },
      { path: "/fsm/inspections/verify", label: "Verify Closure" }
    ]
  },
  {
    path: "/fsm/building",
    label: "My Building",
    icon: "🏢",
    submenu: [
      { path: "/fsm/building", label: "Building Overview", end: true },
      { path: "/fsm/fire-drill", label: "Fire Drill" }
    ]
  },
  { path: "/fsm/feedbacks", label: "Comments/Feedbacks", icon: "\uD83D\uDCDD" }
];

const FSMSidebar = ({
  profile,
  onClose,
  onNavigate = () => {}
}) => {
  const navigate = useNavigate();
  const location = useLocation();
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
      onNavigate();
      navigate("/login");
    } catch (error) {
      console.error("Logout failed", error);
      setIsLoggingOut(false);
    }
  };

  const toggleSubmenu = (path) => {
    setExpandedMenu((currentPath) => (currentPath === path ? null : path));
  };

  const handleProfileNavigation = () => {
    onNavigate();
    navigate("/fsm/profile");
  };

  useEffect(() => {
    if (
      location.pathname.startsWith("/fsm/inspections") ||
      location.pathname.startsWith("/fsm/issues")
    ) {
      setExpandedMenu("/fsm/inspections");
    } else if (
      location.pathname.startsWith("/fsm/building") ||
      location.pathname.startsWith("/fsm/fire-drill")
    ) {
      setExpandedMenu("/fsm/building");
    }
  }, [location.pathname]);

  return (
    <aside className="admin-sidebar" aria-label="Fire Safety Manager navigation">
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
          {menuItems.map((item) => {
            const isExpanded = expandedMenu === item.path;
            const isParentActive =
              location.pathname === item.path ||
              location.pathname.startsWith(`${item.path}/`) ||
              (item.path === "/fsm/inspections" &&
                location.pathname.startsWith("/fsm/issues")) ||
              item.submenu?.some(
                (subitem) =>
                  location.pathname === subitem.path ||
                  location.pathname.startsWith(`${subitem.path}/`)
              );
            const submenuId = `fsm-submenu-${item.path.replace(/[^a-z0-9]+/gi, "-")}`;

            return (
              <li key={item.path}>
                {item.submenu ? (
                  <>
                    <button
                      type="button"
                      className={`menu-item submenu-toggle${isParentActive ? " active" : ""}`}
                      onClick={() => toggleSubmenu(item.path)}
                      aria-expanded={isExpanded}
                      aria-controls={submenuId}
                    >
                      <span className="submenu-toggle-content">
                        <span className="menu-icon">{item.icon}</span>
                        <span className="menu-label">{item.label}</span>
                      </span>
                      <span
                        className={`submenu-chevron${isExpanded ? " submenu-chevron--expanded" : ""}`}
                        aria-hidden="true"
                      >
                        ▼
                      </span>
                    </button>
                    {isExpanded && (
                      <ul id={submenuId} className="submenu">
                        {item.submenu.map((subitem) => (
                          <li key={subitem.path}>
                            <NavLink
                              to={subitem.path}
                              end={subitem.end}
                              className={({ isActive }) =>
                                isActive
                                  ? "menu-item submenu-item active"
                                  : "menu-item submenu-item"
                              }
                              onClick={onNavigate}
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
                    onClick={onNavigate}
                  >
                    <span className="menu-icon">{item.icon}</span>
                    <span className="menu-label">{item.label}</span>
                  </NavLink>
                )}
              </li>
            );
          })}
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

export default FSMSidebar;
