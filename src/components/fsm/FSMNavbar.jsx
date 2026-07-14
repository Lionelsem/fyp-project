import React, { useMemo } from "react";

const FSMNavbar = ({
  pageTitle = "FSM Dashboard",
  isMenuOpen = false,
  menuButtonRef,
  menuControlsId,
  onMenuToggle
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
    <nav className="admin-navbar">
      <div className="navbar-left">
        <button
          ref={menuButtonRef}
          type="button"
          className="icon-btn portal-menu-button"
          aria-label={isMenuOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={isMenuOpen}
          aria-controls={menuControlsId}
          onClick={onMenuToggle}
          title={isMenuOpen ? "Close menu" : "Open menu"}
        >
          <span aria-hidden="true">☰</span>
        </button>
        <h1 className="navbar-title">{pageTitle}</h1>
      </div>

      <div className="navbar-right">
        <button
          type="button"
          className="icon-btn notification-btn"
          title="Notifications"
          aria-label="Notifications"
        >
          🔔
        </button>
        <div className="date-display" aria-label={`Today's date: ${today}`}>
          <span className="date-display-prefix">Today, </span>{today}
        </div>
      </div>
    </nav>
  );
};

export default FSMNavbar;
