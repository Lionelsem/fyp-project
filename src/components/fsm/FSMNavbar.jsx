import React from "react";
import Navbar from "../common/Navbar";

const FSMNavbar = ({ pageTitle }) => {
  return (
    <Navbar
      pageTitle={pageTitle || "FSM Dashboard"}
      showSearch={true}
      showNotifications={true}
      showProfile={true}
    />
  );
};

export default FSMNavbar;
