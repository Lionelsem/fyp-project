import React, { useMemo } from "react";

const Navbar = ({
  pageTitle = "App"
}) => {
  const today = useMemo(
    () =>
      new Date().toLocaleDateString(undefined, {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric"
      }),
    []
  );

  return (
    <nav className="topbar">
      <div className="topbar-left">
        <div className="page-title">{pageTitle}</div>
        <div className="topbar-date">Today, {today}</div>
      </div>
    </nav>
  );
};

export default Navbar;