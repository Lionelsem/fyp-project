import React from "react";
import { useLocation } from "react-router-dom";
import { useAuthContext } from "../context/AuthContext";
import CustomerNavbar from "../components/customer/CustomerNavbar";
import CustomerSidebar from "../components/customer/CustomerSidebar";

const CustomerLayout = ({ children }) => {
  const location = useLocation();
  const { user } = useAuthContext();

  const section = location.pathname.split("/").filter(Boolean).pop() || "dashboard";
  const pageTitleMap = {
    dashboard: "Customer Dashboard",
    issue: "Issue Progress",
    inspections: "Inspection Reports",
    firedrill: "Fire Drill Reports",
    annual: "Annual Report",
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
    <div className="app-shell">
      <div className="app-body">
        <CustomerSidebar profile={sidebarProfile} />
        <div className="app-main">
          <CustomerNavbar pageTitle={pageTitle} />
          <main className="main-content">{children}</main>
        </div>
      </div>
    </div>
  );
};

export default CustomerLayout;
