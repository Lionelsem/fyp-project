import React from "react";
import { useLocation } from "react-router-dom";
import { useAuthContext } from "../context/AuthContext";
import FSMNavbar from "../components/fsm/FSMNavbar";
import FSMSidebar from "../components/fsm/FSMSidebar";
import PortalShell from "../components/common/PortalShell";

const FSMLayout = ({ children }) => {
  const location = useLocation();
  const { user } = useAuthContext();

  const section = location.pathname.split("/").filter(Boolean).pop() || "dashboard";
  const pageTitleMap = {
    dashboard: "FSM Dashboard",
    inspections: "Inspections",
    verify: "Verify Inspection",
    issues: "Issues / Defects",
    "fire-drill": "Fire Drill",
    reports: "Reports",
    building: "My Building",
    feedbacks: "Comments/Feedbacks",
    profile: "Profile"
  };
  const pageTitle = pageTitleMap[section] || "Dashboard";

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
    <PortalShell
      pageTitle={pageTitle}
      profile={sidebarProfile}
      NavbarComponent={FSMNavbar}
      SidebarComponent={FSMSidebar}
      shellClassName="fsm-shell"
      contentClassName="fsm-main-content"
    >
      {children}
    </PortalShell>
  );
};

export default FSMLayout;
