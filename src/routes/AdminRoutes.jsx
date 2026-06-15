import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import AdminLayout from "../layouts/AdminLayout";
import AdminDashboard from "../pages/admin/AdminDashboard";
import ManageUsers from "../pages/admin/ManageUsers";
import CreateUser from "../pages/admin/CreateUser";
import ManageBuildings from "../pages/admin/ManageBuildings";
import CreateBuilding from "../pages/admin/CreateBuilding";
import EditBuilding from "../pages/admin/EditBuilding";
import AdminFireDrill from "../pages/admin/AdminFireDrill";
import FsmAssignment from "../pages/admin/FsmAssignment";
import AdminIssues from "../pages/admin/AdminIssues";
import EditUser from "../pages/admin/EditUser";
import Reports from "../pages/admin/Reports";
import Profile from "../pages/Profile";
import ProtectedRoute from "./ProtectedRoute";
import { ROLES } from "../constants/roles";

const AdminRoutes = () => {
  return (
    <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
      <AdminLayout>
        <Routes>
          <Route index element={<AdminDashboard />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="users" element={<ManageUsers />} />
          <Route path="users/create" element={<CreateUser />} />
          <Route path="users/edit/:id" element={<EditUser />} />
          <Route path="buildings" element={<ManageBuildings />} />
          <Route path="buildings/create" element={<CreateBuilding />} />
          <Route path="buildings/edit/:id" element={<EditBuilding />} />
          <Route path="fsm-assignment" element={<FsmAssignment />} />
          <Route path="issues-defects" element={<AdminIssues />} />
          <Route path="fire-drill" element={<AdminFireDrill />} />
          <Route path="reports" element={<Reports />} />
          <Route path="profile" element={<Profile />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AdminLayout>
    </ProtectedRoute>
  );
};

export default AdminRoutes;
