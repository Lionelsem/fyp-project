import React, { useEffect, useId, useRef, useState } from "react";

const NotificationPopover = ({ notifications = [] }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const closeButtonRef = useRef(null);
  const panelId = `notification-popover-${useId().replace(/:/g, "")}`;

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    closeButtonRef.current?.focus();

    const handlePointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const unreadCount = notifications.filter((notification) => !notification.isRead).length;

  return (
    <div className="notification-popover" ref={containerRef}>
      <button
        type="button"
        className="icon-btn notification-btn"
        title="Notifications"
        aria-label={
          unreadCount > 0
            ? `Notifications, ${unreadCount} unread`
            : "Notifications"
        }
        aria-expanded={isOpen}
        aria-controls={panelId}
        aria-haspopup="dialog"
        onClick={() => setIsOpen((open) => !open)}
      >
        <svg
          className="notification-bell-icon"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="notification-count" aria-hidden="true">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <section
          id={panelId}
          className="notification-panel"
          role="dialog"
          aria-modal="false"
          aria-labelledby={`${panelId}-title`}
        >
          <div className="notification-panel-header">
            <div>
              <p className="notification-panel-eyebrow">Updates</p>
              <h2 id={`${panelId}-title`}>Notifications</h2>
            </div>
            <button
              ref={closeButtonRef}
              type="button"
              className="notification-close-button"
              aria-label="Close notifications"
              onClick={() => setIsOpen(false)}
            >
              <span aria-hidden="true">&times;</span>
            </button>
          </div>

          {notifications.length > 0 ? (
            <ul className="notification-list">
              {notifications.map((notification, index) => (
                <li
                  className={`notification-item${
                    notification.isRead ? "" : " notification-item--unread"
                  }`}
                  key={notification.id || `${notification.title}-${index}`}
                >
                  <span className="notification-item-dot" aria-hidden="true" />
                  <div>
                    <strong>{notification.title}</strong>
                    {notification.message && <p>{notification.message}</p>}
                    {notification.time && <time>{notification.time}</time>}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="notification-empty-state">
              <span className="notification-empty-icon" aria-hidden="true">
                &#10003;
              </span>
              <strong>You&apos;re all caught up</strong>
              <p>New alerts and updates will appear here.</p>
            </div>
          )}
        </section>
      )}
    </div>
  );
};

export default NotificationPopover;
