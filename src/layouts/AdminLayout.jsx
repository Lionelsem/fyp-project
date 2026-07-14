import React from "react";
import { useLocation } from "react-router-dom";
import { useAuthContext } from "../context/AuthContext";
import AdminNavbar from "../components/admin/AdminNavbar";
import AdminSidebar from "../components/admin/AdminSidebar";
import PortalShell from "../components/common/PortalShell";

const AdminLayout = ({ children }) => {
  const location = useLocation();
  const { user } = useAuthContext();

  const section = location.pathname.split("/").filter(Boolean).pop() || "dashboard";
  const pageTitleMap = {
    dashboard: "Admin Dashboard",
    users: "Manage Users",
    buildings: "Manage Buildings",
    "fsm-assignment": "FSM Assignment",
    "issues-defects": "Issues / Defects",
    "fire-drill": "Fire Drill",
    reports: "Reports",
    profile: "Profile"
  };
  const pageTitle = pageTitleMap[section] || "Admin Dashboard";

  const displayName =
    user?.fullName || user?.displayName || user?.email?.split("@")[0] || "Admin";
  const initials = displayName
    .split(" ")
    .map((part) => part.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const sidebarProfile = {
    name: displayName,
    role: user?.role ? user.role.replace(/_/g, " ") : "Admin",
    initials
  };

  return (
    <PortalShell
      pageTitle={pageTitle}
      profile={sidebarProfile}
      NavbarComponent={AdminNavbar}
      SidebarComponent={AdminSidebar}
      shellClassName="admin-shell"
      contentClassName="admin-main-content"
    >
      {children}
    </PortalShell>
  );
};

export default AdminLayout;
