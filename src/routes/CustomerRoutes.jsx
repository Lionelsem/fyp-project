import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import CustomerLayout from "../layouts/CustomerLayout";
import CustomerDashboard from "../pages/customer/CustomerDashboard";
import IssueProgress from "../pages/customer/IssueProgress";
import InspectionReports from "../pages/customer/InspectionReports";
import FireDrillReports from "../pages/customer/FireDrillReports";
import AnnualReports from "../pages/customer/AnnualReports";
import MyBuildings from "../pages/customer/MyBuildings";
import Feedbacks from "../pages/customer/Feedbacks";
import Profile from "../pages/customer/Profile";
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
          <Route path="fire-drill-reports" element={<FireDrillReports />} />
          <Route path="annual-reports" element={<AnnualReports />} />
          <Route path="feedbacks" element={<Feedbacks />} />
          <Route path="building" element={<MyBuildings />} />
          <Route path="profile" element={<Profile />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </CustomerLayout>
    </ProtectedRoute>
  );
};

export default CustomerRoutes;
