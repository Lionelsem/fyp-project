import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

const getNotificationKey = (notification, index) =>
  String(notification.id || `${notification.title}-${index}`);

const readDismissedIds = (storageKey) => {
  if (!storageKey || typeof window === "undefined") return [];
  try {
    const storedValue = JSON.parse(window.localStorage.getItem(storageKey) || "[]");
    return Array.isArray(storedValue) ? storedValue.map(String) : [];
  } catch {
    return [];
  }
};

const DismissibleNotificationItem = ({ notification, notificationKey, onDismiss }) => {
  const itemRef = useRef(null);
  const gestureRef = useRef(null);
  const removeTimerRef = useRef(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  useEffect(() => () => window.clearTimeout(removeTimerRef.current), []);

  const finishRemoval = useCallback(() => {
    if (isRemoving) return;
    const width = itemRef.current?.offsetWidth || 360;
    setIsDragging(false);
    setIsRemoving(true);
    setSwipeOffset(-width);
    removeTimerRef.current = window.setTimeout(() => onDismiss(notificationKey), 220);
  }, [isRemoving, notificationKey, onDismiss]);

  const handlePointerDown = (event) => {
    if (event.pointerType === "mouse" || isRemoving) return;
    gestureRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      offset: 0
    };
    setIsDragging(true);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handlePointerMove = (event) => {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - gesture.startX;
    const deltaY = event.clientY - gesture.startY;
    if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 8) {
      gestureRef.current = null;
      setSwipeOffset(0);
      setIsDragging(false);
      return;
    }

    const width = itemRef.current?.offsetWidth || 360;
    const nextOffset = Math.max(-width, Math.min(0, deltaX));
    gesture.offset = nextOffset;
    setSwipeOffset(nextOffset);
  };

  const handlePointerEnd = (event) => {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    gestureRef.current = null;

    const width = itemRef.current?.offsetWidth || 360;
    if (Math.abs(gesture.offset) >= Math.min(96, width * 0.3)) {
      finishRemoval();
    } else {
      setSwipeOffset(0);
      setIsDragging(false);
    }
  };

  const itemClasses = [
    "notification-item-shell",
    isDragging ? "notification-item-shell--dragging" : "",
    isRemoving ? "notification-item-shell--removing" : ""
  ].filter(Boolean).join(" ");

  return (
    <li
      ref={itemRef}
      className={itemClasses}
      style={{ "--notification-swipe-offset": `${swipeOffset}px` }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
    >
      <div className="notification-swipe-action" aria-hidden="true">
        <span>Delete</span>
      </div>
      <div
        className={`notification-item${
          notification.isRead ? "" : " notification-item--unread"
        }`}
      >
        <span
          className={`notification-item-dot notification-item-dot--${notification.type || "update"}`}
          aria-hidden="true"
        />
        <div className="notification-item-content">
          <strong>{notification.title}</strong>
          {notification.message && <p>{notification.message}</p>}
          {notification.time && <time>{notification.time}</time>}
        </div>
        <button
          type="button"
          className="notification-item-dismiss"
          aria-label={`Remove notification: ${notification.title}`}
          onClick={finishRemoval}
        >
          <span aria-hidden="true">&times;</span>
        </button>
      </div>
    </li>
  );
};

const NotificationPopover = ({ notifications = [], onDismiss, storageKey }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dismissedIds, setDismissedIds] = useState(() => readDismissedIds(storageKey));
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

  useEffect(() => {
    setDismissedIds(readDismissedIds(storageKey));
  }, [storageKey]);

  const visibleNotifications = useMemo(() => {
    const dismissedSet = new Set(dismissedIds);
    return notifications.filter(
      (notification, index) => !dismissedSet.has(getNotificationKey(notification, index))
    );
  }, [dismissedIds, notifications]);

  const dismissNotification = useCallback((notificationKey) => {
    setDismissedIds((current) => {
      const next = Array.from(new Set([...current, notificationKey]));
      if (storageKey) {
        try {
          window.localStorage.setItem(storageKey, JSON.stringify(next));
        } catch {
          // Dismissal still works for this session when storage is unavailable.
        }
      }
      return next;
    });
    onDismiss?.(notificationKey);
  }, [onDismiss, storageKey]);

  const unreadCount = visibleNotifications.filter((notification) => !notification.isRead).length;

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

          {visibleNotifications.length > 0 ? (
            <ul className="notification-list">
              {visibleNotifications.map((notification, index) => (
                <DismissibleNotificationItem
                  key={getNotificationKey(notification, index)}
                  notification={notification}
                  notificationKey={getNotificationKey(notification, index)}
                  onDismiss={dismissNotification}
                />
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
