import React, { useState, useMemo } from "react";
import { useAuthContext } from "../../context/AuthContext";

const Navbar = ({
  pageTitle = "App",
  showSearch = true,
  showNotifications = true,
  showProfile = true
}) => {
  const { user } = useAuthContext();
  const [searchValue, setSearchValue] = useState("");
  const [notificationCount] = useState(0);

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
    <nav
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "16px 24px",
        borderBottom: "1px solid #e5e7eb",
        backgroundColor: "#fff",
        position: "sticky",
        top: 0,
        zIndex: 10
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <div style={{ fontWeight: "700", fontSize: "20px" }}>{pageTitle}</div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            backgroundColor: "#f3f4f6",
            padding: "8px 12px",
            borderRadius: "999px",
            color: "#374151",
            fontSize: "14px"
          }}
        >
          <span>📅</span>
          <span>{today}</span>
        </div>
      </div>

      {showSearch && (
        <div>
          <input
            type="text"
            placeholder="Search..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            style={{
              padding: "10px 14px",
              border: "1px solid #d1d5db",
              borderRadius: "999px",
              width: "280px",
              maxWidth: "100%"
            }}
          />
        </div>
      )}

      <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
        {showNotifications && (
          <div style={{ position: "relative", cursor: "pointer", fontSize: "20px" }}>
            <span>🔔</span>
            {notificationCount > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: "-6px",
                  right: "-10px",
                  backgroundColor: "#ef4444",
                  color: "white",
                  borderRadius: "50%",
                  width: "20px",
                  height: "20px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "12px"
                }}
              >
                {notificationCount}
              </span>
            )}
          </div>
        )}

        {showProfile && (
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "50%",
                backgroundColor: "#0f172a",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontWeight: "700",
                cursor: "pointer"
              }}
            >
              {user?.displayName ? user.displayName.charAt(0).toUpperCase() : "U"}
            </div>
            <div style={{ fontSize: "14px", color: "#374151" }}>
              {user?.displayName || user?.email || "User"}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
