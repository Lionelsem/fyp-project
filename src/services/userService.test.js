import { doc, updateDoc } from "firebase/firestore";
import { updateNotificationPreferences } from "./userService";
import { DEFAULT_NOTIFICATION_PREFERENCES } from "../constants/notificationPreferences";

jest.mock("firebase/firestore", () => ({
  collection: jest.fn(),
  doc: jest.fn(() => ({ path: "users/profile-1" })),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  limit: jest.fn(),
  orderBy: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn()
}));

jest.mock("firebase/auth", () => ({
  updateEmail: jest.fn()
}));

jest.mock("../config/firebase", () => ({
  auth: { currentUser: { uid: "auth-user-1" } },
  db: { name: "firestore" }
}));

beforeEach(() => {
  jest.clearAllMocks();
  updateDoc.mockResolvedValue();
});

test("saves the complete notification preferences on the user's Firestore profile", async () => {
  await updateNotificationPreferences("profile-1", {
    ...DEFAULT_NOTIFICATION_PREFERENCES,
    issueUpdates: false
  });

  expect(doc).toHaveBeenCalledWith(
    { name: "firestore" },
    "users",
    "profile-1"
  );
  expect(updateDoc).toHaveBeenCalledWith(
    { path: "users/profile-1" },
    expect.objectContaining({
      notificationPreferences: {
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        issueUpdates: false
      },
      updatedAt: expect.any(Date)
    })
  );
});

test("fills in missing preferences before writing", async () => {
  await updateNotificationPreferences("profile-1", { reportUpdates: false });

  expect(updateDoc).toHaveBeenCalledWith(
    { path: "users/profile-1" },
    expect.objectContaining({
      notificationPreferences: {
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        reportUpdates: false
      }
    })
  );
});
