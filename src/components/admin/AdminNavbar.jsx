import React from "react";
import Navbar from "../common/Navbar";

const AdminNavbar = ({ pageTitle }) => {
  return (
    <Navbar
      pageTitle={pageTitle || "Admin Portal"}
      showSearch={true}
      showNotifications={true}
      showProfile={true}
    />
  );
};

export default AdminNavbar;
