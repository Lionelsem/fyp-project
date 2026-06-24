import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import CustomerLayout from "../layouts/CustomerLayout";
import CustomerDashboard from "../pages/customer/CustomerDashboard";
import IssueProgress from "../pages/customer/IssueProgress";
import InspectionReports from "../pages/customer/InspectionReports";
import MyBuildings from "../pages/customer/MyBuildings";
import Feedbacks from "../pages/customer/Feedbacks";
import Profile from "../pages/Profile";
import ProtectedRoute from "./ProtectedRoute";
import { ROLES } from "../constants/roles";

const CustomerRoutes = () => {
  return (
    <ProtectedRoute allowedRoles={[ROLES.CUSTOMER]}>
      <CustomerLayout>
        <Routes>
          <Route index element={<CustomerDashboard />} />
          <Route path="dashboard" element={<CustomerDashboard />} />
          <Route path="issue-progress" element={<IssueProgress />} />
          <Route path="inspection-reports" element={<InspectionReports />} />
          <Route path="my-buildings" element={<MyBuildings />} />
          <Route path="feedbacks" element={<Feedbacks />} />
          <Route path="building" element={<MyBuildings />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </CustomerLayout>
    </ProtectedRoute>
  );
};

export default CustomerRoutes;
