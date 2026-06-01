import React from "react";
import Navbar from "../common/Navbar";

const CustomerNavbar = ({ pageTitle }) => {
  return (
    <Navbar
      pageTitle={pageTitle || "Customer Portal"}
      showSearch={true}
      showNotifications={true}
      showProfile={true}
    />
  );
};

export default CustomerNavbar;
