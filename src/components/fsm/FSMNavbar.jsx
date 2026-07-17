import React, { useMemo } from "react";
import NotificationPopover from "../common/NotificationPopover";

const FSMNavbar = ({
  pageTitle = "Fashboard",
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
          <span aria-hidden="true">&#9776;</span>
        </button>
        <h1 className="navbar-title">{pageTitle}</h1>
      </div>

      <div className="navbar-right">
        <NotificationPopover />
        <div className="date-display" aria-label={`Today's date: ${today}`}>
          <span className="date-display-prefix">Today, </span>{today}
        </div>
      </div>
    </nav>
  );
};

export default FSMNavbar;
