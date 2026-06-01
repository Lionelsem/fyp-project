import React from "react";
import { useLocation } from "react-router-dom";
import CustomerNavbar from "../components/customer/CustomerNavbar";
import CustomerSidebar from "../components/customer/CustomerSidebar";

const CustomerLayout = ({ children }) => {
  const location = useLocation();
  const section = location.pathname.split("/").filter(Boolean).pop() || "dashboard";
  const pageTitleMap = {
    dashboard: "Dashboard",
    "my-reports": "My Reports",
    "submit-report": "Submit Report"
  };
  const pageTitle = pageTitleMap[section] || "Customer";

  return (
    <div className="app-shell">
      <CustomerNavbar pageTitle={pageTitle} />
      <div className="app-body">
        <CustomerSidebar />
        <main className="main-content">{children}</main>
      </div>
    </div>
  );
};

export default CustomerLayout;
