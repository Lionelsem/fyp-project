import React from "react";
import { useLocation } from "react-router-dom";
import { useAuthContext } from "../context/AuthContext";
import CustomerNavbar from "../components/customer/CustomerNavbar";
import CustomerSidebar from "../components/customer/CustomerSidebar";
import PortalShell from "../components/common/PortalShell";

const CustomerLayout = ({ children }) => {
  const location = useLocation();
  const { user } = useAuthContext();

  const section = location.pathname.split("/").filter(Boolean).pop() || "dashboard";
  const pageTitleMap = {
    dashboard: "Customer Dashboard",
    "issue-progress": "Issue Progress",
    "inspection-reports": "Inspection Reports",
    "fire-drill-reports": "Fire Drill Reports",
    "annual-reports": "Annual Reports",
    feedbacks: "Comments/Feedbacks",
    building: "My Buildings",
    profile: "Profile"
  };
  const pageTitle = pageTitleMap[section] || "Customer Dashboard";

  const displayName =
    user?.fullName || user?.displayName || user?.email?.split("@")[0] || "Customer";
  const initials = displayName
    .split(" ")
    .map((part) => part.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const sidebarProfile = {
    name: displayName,
    role: user?.role ? user.role.replace(/_/g, " ") : "Customer",
    initials
  };

  return (
    <PortalShell
      pageTitle={pageTitle}
      profile={sidebarProfile}
      NavbarComponent={CustomerNavbar}
      SidebarComponent={CustomerSidebar}
      shellClassName="customer-shell"
      contentClassName="customer-main-content"
    >
      {children}
    </PortalShell>
  );
};

export default CustomerLayout;
