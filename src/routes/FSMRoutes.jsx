import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import FSMLayout from "../layouts/FSMLayout";
import FSMDashboard from "../pages/fsm/FSMDashboard";
import Inspections from "../pages/fsm/Inspections";
import Issues from "../pages/fsm/Issues";
import FireDrill from "../pages/fsm/FireDrill";
import Reports from "../pages/fsm/Reports";
import MyBuilding from "../pages/fsm/MyBuilding";
import ProtectedRoute from "./ProtectedRoute";
import { ROLES } from "../constants/roles";

const FSMRoutes = () => {
  return (
    <ProtectedRoute allowedRoles={[ROLES.FSM]}>
      <FSMLayout>
        <Routes>
          <Route index element={<FSMDashboard />} />
          <Route path="dashboard" element={<FSMDashboard />} />
          <Route path="inspections" element={<Inspections />} />
          <Route path="inspections/verify" element={<Inspections />} />
          <Route path="issues" element={<Issues />} />
          <Route path="fire-drill" element={<FireDrill />} />
          <Route path="reports" element={<Reports />} />
          <Route path="building" element={<MyBuilding />} />
          <Route path="*" element={<Navigate to="dashboard" replace />} />
        </Routes>
      </FSMLayout>
    </ProtectedRoute>
  );
};

export default FSMRoutes;
