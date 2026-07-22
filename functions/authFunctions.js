const functions = require("firebase-functions");
const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp();
}

const auth = admin.auth();
const db = admin.firestore();

const isAdminUser = async (uid) => {
  const adminUserDoc = await db.collection("users").doc(uid).get();
  if (!adminUserDoc.exists) return false;
  const adminUserData = adminUserDoc.data();
  return adminUserData?.role === "Admin";
};

exports.createUserAccount = functions.region("us-central1").https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Authentication required to create users.");
  }

  const callerUid = context.auth.uid;
  if (!(await isAdminUser(callerUid))) {
    throw new functions.https.HttpsError("permission-denied", "Only administrators can create new user accounts.");
  }

  const { firstName, lastName, email, phoneNumber, role, password } = data;
  if (!firstName || !lastName || !email || !role || !password) {
    throw new functions.https.HttpsError("invalid-argument", "Missing required user details.");
  }

  const displayName = `${firstName} ${lastName}`;

  try {
    const userRecord = await auth.createUser({
      email,
      password,
      displayName,
      phoneNumber: phoneNumber || undefined
    });

    await db.collection("users").doc(userRecord.uid).set({
      userId: displayName,
      fullName: displayName,
      email,
      phoneNumber: phoneNumber || "",
      role,
      status: "Active",
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return { uid: userRecord.uid, userId: displayName };
  } catch (error) {
    console.error("Error creating user account:", error);

    const authErrorMap = {
      "auth/email-already-exists": "already-exists",
      "auth/invalid-email": "invalid-argument",
      "auth/weak-password": "invalid-argument",
      "auth/invalid-phone-number": "invalid-argument",
      "auth/operation-not-allowed": "failed-precondition",
      "auth/user-not-found": "not-found"
    };

    const code = authErrorMap[error.code] || "internal";
    const message = error.message || "Failed to create user account.";
    throw new functions.https.HttpsError(code, message);
  }
});

exports.revokeUserSessions = functions.region("us-central1").https.onCall(async (_data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Authentication required to sign out all devices."
    );
  }

  try {
    await auth.revokeRefreshTokens(context.auth.uid);
    return { success: true };
  } catch (error) {
    console.error("Error revoking user sessions:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Unable to sign out all devices. Please try again."
    );
  }
});
