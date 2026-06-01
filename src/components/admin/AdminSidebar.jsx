import React from "react";
import { NavLink } from "react-router-dom";
import Sidebar from "../common/Sidebar";

const AdminSidebar = () => {
  return (
    <Sidebar>
      <div className="sidebar-logo">Company</div>
      <nav className="sidebar-nav">
        <NavLink to="/dashboard" className={({ isActive }) => (isActive ? "sidebar-link active" : "sidebar-link")}>
          Dashboard
        </NavLink>
        <NavLink to="/users" className={({ isActive }) => (isActive ? "sidebar-link active" : "sidebar-link")}>
          Manage Users
        </NavLink>
        <NavLink to="/buildings" className={({ isActive }) => (isActive ? "sidebar-link active" : "sidebar-link")}>
          Manage Buildings
        </NavLink>
        <NavLink to="/reports" className={({ isActive }) => (isActive ? "sidebar-link active" : "sidebar-link")}>
          Reports
        </NavLink>
      </nav>
    </Sidebar>
  );
};

export default AdminSidebar;
