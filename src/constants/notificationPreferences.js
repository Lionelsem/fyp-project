export const DEFAULT_NOTIFICATION_PREFERENCES = Object.freeze({
  emailNotifications: true,
  inspectionReminders: true,
  issueUpdates: true,
  reportUpdates: true,
  systemAnnouncements: false
});

export const NOTIFICATION_PREFERENCE_KEYS = Object.keys(
  DEFAULT_NOTIFICATION_PREFERENCES
);

export const normalizeNotificationPreferences = (preferences) =>
  NOTIFICATION_PREFERENCE_KEYS.reduce(
    (normalized, key) => ({
      ...normalized,
      [key]: typeof preferences?.[key] === "boolean"
        ? preferences[key]
        : DEFAULT_NOTIFICATION_PREFERENCES[key]
    }),
    {}
  );
