import React from "react";
import { useLocation } from "react-router-dom";
import AdminNavbar from "../components/admin/AdminNavbar";
import AdminSidebar from "../components/admin/AdminSidebar";

const AdminLayout = ({ children }) => {
  const location = useLocation();
  const section = location.pathname.split("/").filter(Boolean).pop() || "dashboard";
  const pageTitleMap = {
    dashboard: "Dashboard",
    users: "Manage Users",
    buildings: "Manage Buildings",
    reports: "Reports"
  };
  const pageTitle = pageTitleMap[section] || "Admin";

  return (
    <div className="app-shell">
      <AdminNavbar pageTitle={pageTitle} />
      <div className="app-body">
        <AdminSidebar />
        <main className="main-content">{children}</main>
      </div>
    </div>
  );
};

export default AdminLayout;
