import React from "react";
import { useLocation } from "react-router-dom";
import { useAuthContext } from "../context/AuthContext";
import FSMNavbar from "../components/fsm/FSMNavbar";
import FSMSidebar from "../components/fsm/FSMSidebar";

const FSMLayout = ({ children }) => {
  const location = useLocation();
  const { user } = useAuthContext();

  const section = location.pathname.split("/").filter(Boolean).pop() || "dashboard";
  const pageTitleMap = {
    dashboard: "Dashboard",
    inspections: "Inspections",
    verify: "Verify Inspection",
    issues: "Issues / Defects",
    "fire-drill": "Fire Drill",
    reports: "Reports",
    building: "My Building",
    profile: "Profile"
  };
  const pageTitle = pageTitleMap[section] || "FSM Dashboard";

  const displayName =
    user?.fullName || user?.displayName || user?.email?.split("@")[0] || "FSM";
  const initials = displayName
    .split(" ")
    .map((part) => part.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const sidebarProfile = {
    name: displayName,
    role: user?.role ? user.role.replace(/_/g, " ") : "Fire Safety Manager",
    initials
  };

  return (
    <div className="app-shell fsm-shell">
      <div className="app-body">
        <FSMSidebar profile={sidebarProfile} />
        <div className="app-main">
          <FSMNavbar pageTitle={pageTitle} />
          <main className="main-content fsm-main-content">{children}</main>
        </div>
      </div>
    </div>
  );
};

export default FSMLayout;
