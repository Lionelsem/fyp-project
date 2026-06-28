import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import FSMLayout from "../layouts/FSMLayout";
import FSMDashboard from "../pages/fsm/FSMDashboard";
import Inspections from "../pages/fsm/Inspections";
import Issues from "../pages/fsm/Issues";
import IssueTickets from "../pages/fsm/IssueTickets";
import FireDrill from "../pages/fsm/FireDrill";
import MyBuilding from "../pages/fsm/MyBuilding";
import Profile from "../pages/Profile";
import ProtectedRoute from "./ProtectedRoute";
import { ROLES } from "../constants/roles";

const FSMRoutes = () => {
  return (
    <ProtectedRoute allowedRoles={[ROLES.FSM]}>
      <FSMLayout>
        <Routes>
          <Route path="/fsm" element={<Navigate to="/fsm/dashboard" replace />} />
          <Route path="/fsm/dashboard" element={<FSMDashboard />} />
          <Route path="/fsm/inspections" element={<Inspections />} />
          <Route path="/fsm/inspections/verify" element={<Issues verifyClosureMode />} />
          <Route path="/fsm/issues" element={<IssueTickets />} />
          <Route path="/fsm/fire-drill" element={<FireDrill />} />
          <Route path="/fsm/reports" element={<Navigate to="/fsm/building" replace />} />
          <Route path="/fsm/building" element={<MyBuilding />} />
          <Route path="/fsm/profile" element={<Profile />} />
          <Route path="*" element={<Navigate to="/fsm/dashboard" replace />} />
        </Routes>
      </FSMLayout>
    </ProtectedRoute>
  );
};

export default FSMRoutes;
