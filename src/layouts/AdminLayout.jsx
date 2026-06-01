import React from "react";

const AdminLayout = ({ children }) => {
  return (
    <div>
      <header>Admin Layout Header</header>
      <main>{children}</main>
    </div>
  );
};

export default AdminLayout;
