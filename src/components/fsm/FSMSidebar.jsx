import React from "react";
import { NavLink } from "react-router-dom";
import Sidebar from "../common/Sidebar";

const FSMSidebar = () => {
  return (
    <Sidebar>
      <div className="sidebar-logo">Company</div>
      <nav className="sidebar-nav">
        <NavLink to="/dashboard" className={({ isActive }) => (isActive ? "sidebar-link active" : "sidebar-link")}>
          Dashboard
        </NavLink>
        <NavLink to="/inspections" className={({ isActive }) => (isActive ? "sidebar-link active" : "sidebar-link")}>
          Inspections
        </NavLink>
        <NavLink to="/issues" className={({ isActive }) => (isActive ? "sidebar-link active" : "sidebar-link")}>
          Issues
        </NavLink>
      </nav>
    </Sidebar>
  );
};

export default FSMSidebar;
