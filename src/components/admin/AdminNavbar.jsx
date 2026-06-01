import React, { useMemo, useState } from "react";

const AdminNavbar = ({ pageTitle = "Admin Dashboard" }) => {
  const [searchValue, setSearchValue] = useState("");

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
    <nav className="admin-navbar">
      <div className="navbar-left">
        <h1 className="navbar-title">{pageTitle}</h1>
      </div>

      <div className="navbar-center">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="search-input"
            placeholder="Search..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
          />
        </div>
      </div>

      <div className="navbar-right">
        <button
          type="button"
          className="icon-btn notification-btn"
          title="Notifications"
        >
          🔔
        </button>
        <div className="date-display">Today, {today}</div>
      </div>
    </nav>
  );
};

export default AdminNavbar;