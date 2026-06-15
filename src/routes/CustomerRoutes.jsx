import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import CustomerLayout from "../layouts/CustomerLayout";
import CustomerDashboard from "../pages/customer/CustomerDashboard";
import MyReports from "../pages/customer/MyReports";
import SubmitReport from "../pages/customer/SubmitReport";
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
          <Route path="issue-progress" element={<MyReports />} />
          <Route path="inspections" element={<MyReports />} />
          <Route path="firedrill" element={<MyReports />} />
          <Route path="annual" element={<MyReports />} />
          <Route path="feedbacks" element={<Feedbacks />} />
          <Route path="building" element={<CustomerDashboard />} />
          <Route path="my-reports" element={<MyReports />} />
          <Route path="submit-report" element={<SubmitReport />} />
          <Route path="profile" element={<Profile />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </CustomerLayout>
    </ProtectedRoute>
  );
};

export default CustomerRoutes;
