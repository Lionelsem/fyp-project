import React, { useMemo, useState } from "react";
import { useAuthContext } from "../../context/AuthContext";

const Navbar = ({
  pageTitle = "App",
  showSearch = true,
  showNotifications = true,
  showProfile = true
}) => {
  const { user } = useAuthContext();
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

  const userInitial = (
    user?.displayName ||
    user?.fullName ||
    user?.email?.split("@")[0] ||
    "U"
  )
    .charAt(0)
    .toUpperCase();

  const userName =
    user?.displayName || user?.fullName || user?.email?.split("@")[0] || "Admin";

  return (
    <nav className="topbar">
      <div className="topbar-left">
        <div className="page-title">{pageTitle}</div>
        <div className="topbar-date">Today, {today}</div>
      </div>

      {showSearch && (
        <div className="topbar-search-wrapper">
          <input
            type="text"
            className="topbar-search"
            placeholder="Search..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
          />
        </div>
      )}

      <div className="topbar-right">
        {showNotifications && (
          <button type="button" className="topbar-icon">
            🔔
          </button>
        )}

        {showProfile && (
          <div className="topbar-profile">
            <div className="profile-badge">{userInitial}</div>
            <div className="profile-name">{userName}</div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;