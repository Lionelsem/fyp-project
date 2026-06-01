import React from "react";
import { NavLink } from "react-router-dom";
import Sidebar from "../common/Sidebar";

const CustomerSidebar = () => {
  return (
    <Sidebar>
      <div className="sidebar-logo">Company</div>
      <nav className="sidebar-nav">
        <NavLink to="/dashboard" className={({ isActive }) => (isActive ? "sidebar-link active" : "sidebar-link")}>
          Dashboard
        </NavLink>
        <NavLink to="/my-reports" className={({ isActive }) => (isActive ? "sidebar-link active" : "sidebar-link")}>
          My Reports
        </NavLink>
        <NavLink to="/submit-report" className={({ isActive }) => (isActive ? "sidebar-link active" : "sidebar-link")}>
          Submit Report
        </NavLink>
      </nav>
    </Sidebar>
  );
};

export default CustomerSidebar;
