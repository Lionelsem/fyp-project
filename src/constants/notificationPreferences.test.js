import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  normalizeNotificationPreferences
} from "./notificationPreferences";

test("uses defaults for notification preferences that have not been saved", () => {
  expect(normalizeNotificationPreferences()).toEqual(
    DEFAULT_NOTIFICATION_PREFERENCES
  );
});

test("preserves saved boolean preferences and rejects invalid values", () => {
  expect(normalizeNotificationPreferences({
    inspectionReminders: false,
    issueUpdates: true,
    reportUpdates: "false"
  })).toEqual({
    ...DEFAULT_NOTIFICATION_PREFERENCES,
    inspectionReminders: false,
    issueUpdates: true,
    reportUpdates: true
  });
});
