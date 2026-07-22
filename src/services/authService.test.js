import { signOut } from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import { signOutAllDevices } from "./authService";

const mockRevokeUserSessions = jest.fn();

jest.mock("firebase/auth", () => ({
  signInWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  getAuth: jest.fn()
}));

jest.mock("firebase/app", () => ({
  initializeApp: jest.fn(),
  deleteApp: jest.fn()
}));

jest.mock("firebase/firestore", () => ({
  doc: jest.fn(),
  setDoc: jest.fn()
}));

jest.mock("firebase/functions", () => ({
  httpsCallable: jest.fn()
}));

jest.mock("../config/firebase", () => ({
  auth: { name: "primary-auth" },
  db: { name: "firestore" },
  firebaseConfig: {},
  functions: { name: "cloud-functions" }
}));

jest.mock("./userService", () => ({
  getUserProfile: jest.fn()
}));

describe("signOutAllDevices", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRevokeUserSessions.mockResolvedValue({ data: { success: true } });
    httpsCallable.mockReturnValue(mockRevokeUserSessions);
    signOut.mockResolvedValue();
  });

  test("revokes server sessions before signing out the current browser", async () => {
    await signOutAllDevices();

    expect(httpsCallable).toHaveBeenCalledWith(
      { name: "cloud-functions" },
      "revokeUserSessions"
    );
    expect(mockRevokeUserSessions).toHaveBeenCalledTimes(1);
    expect(signOut).toHaveBeenCalledWith({ name: "primary-auth" });
    expect(mockRevokeUserSessions.mock.invocationCallOrder[0]).toBeLessThan(
      signOut.mock.invocationCallOrder[0]
    );
  });

  test("keeps the current browser signed in if server revocation fails", async () => {
    mockRevokeUserSessions.mockRejectedValue(new Error("revocation failed"));

    await expect(signOutAllDevices()).rejects.toThrow("revocation failed");
    expect(signOut).not.toHaveBeenCalled();
  });
});
