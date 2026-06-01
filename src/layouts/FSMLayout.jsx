import React from "react";
import { useLocation } from "react-router-dom";
import FSMNavbar from "../components/fsm/FSMNavbar";
import FSMSidebar from "../components/fsm/FSMSidebar";

const FSMLayout = ({ children }) => {
  const location = useLocation();
  const section = location.pathname.split("/").filter(Boolean).pop() || "dashboard";
  const pageTitleMap = {
    dashboard: "Dashboard",
    inspections: "Inspections",
    issues: "Issues"
  };
  const pageTitle = pageTitleMap[section] || "FSM";

  return (
    <div className="app-shell">
      <FSMNavbar pageTitle={pageTitle} />
      <div className="app-body">
        <FSMSidebar />
        <main className="main-content">{children}</main>
      </div>
    </div>
  );
};

export default FSMLayout;
