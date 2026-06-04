import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import AdminLayout from "../layouts/AdminLayout";
import AdminDashboard from "../pages/admin/AdminDashboard";
import ManageUsers from "../pages/admin/ManageUsers";
import CreateUser from "../pages/admin/CreateUser";
import ManageBuildings from "../pages/admin/ManageBuildings";
import CreateBuilding from "../pages/admin/CreateBuilding";
import Reports from "../pages/admin/Reports";
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
          <Route path="buildings" element={<ManageBuildings />} />
          <Route path="buildings/create" element={<CreateBuilding />} />
          <Route path="reports" element={<Reports />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AdminLayout>
    </ProtectedRoute>
  );
};

export default AdminRoutes;
