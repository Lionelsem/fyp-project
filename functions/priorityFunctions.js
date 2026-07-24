const admin = require("firebase-admin");
const { GoogleGenAI, Type } = require("@google/genai");
const { defineBoolean, defineString } = require("firebase-functions/params");
const { HttpsError, onCall } = require("firebase-functions/v2/https");
const {
  PRIORITIES,
  buildAssessmentInput,
  buildPriorityDecision,
  cleanText,
  getRoleAccessError,
  hashAssessmentInput,
  isResolvedStatus,
  normalizePriority,
  parseVertexPriorityResponse,
  validateDraft,
  validatePhotoPath,
  validatePolicy,
  withTransientRetry,
  withTimeout
} = require("./priorityCore");

if (!admin.apps.length) {
  admin.initializeApp();
}

const REGION = "us-central1";
const POLICY_COLLECTION = "aiPriorityPolicies";
const POLICY_DOCUMENT = "active";
const AUDIT_COLLECTION = "aiAuditLogs";
const ISSUES_COLLECTION = "issues";
const ASSESSMENT_TIMEOUT_MS = 20000;

const AI_PRIORITY_MODEL = defineString("AI_PRIORITY_MODEL", {
  default: "gemini-2.5-flash",
  description: "Vertex AI Gemini model used for FSM issue priority assessment."
});
const AI_PRIORITY_LOCATION = defineString("AI_PRIORITY_LOCATION", {
  default: REGION,
  description: "Vertex AI region used for issue priority assessment."
});
const AI_PRIORITY_ENFORCE_APP_CHECK = defineBoolean(
  "AI_PRIORITY_ENFORCE_APP_CHECK",
  {
    default: false,
    description:
      "Enforce Firebase App Check for AI priority callables after client rollout."
  }
);

const shouldEnforceAppCheck = () =>
  String(process.env.AI_PRIORITY_ENFORCE_APP_CHECK || "").toLowerCase() ===
  "true";

const callableOptions = {
  region: REGION,
  timeoutSeconds: 30,
  memory: "512MiB",
  enforceAppCheck: shouldEnforceAppCheck()
};

const db = admin.firestore();
const fieldValue = admin.firestore.FieldValue;

const getCallerProfile = async (request, allowedRole) => {
  const initialAccessError = getRoleAccessError({
    uid: request.auth?.uid,
    role: allowedRole,
    requiredRole: allowedRole
  });
  if (initialAccessError === "unauthenticated") {
    throw new HttpsError("unauthenticated", "Authentication is required.");
  }
  const profileSnapshot = await db.collection("users").doc(request.auth.uid).get();
  const profile = profileSnapshot.exists ? profileSnapshot.data() : null;
  if (getRoleAccessError({
    uid: request.auth.uid,
    role: profile?.role,
    requiredRole: allowedRole
  })) {
    throw new HttpsError(
      "permission-denied",
      `Only ${allowedRole} users can use this function.`
    );
  }
  return { uid: request.auth.uid, profile };
};

const mapCoreError = (error, fallbackMessage) => {
  const codeMap = {
    "invalid-draft": "invalid-argument",
    "resolved-issue": "failed-precondition",
    "invalid-policy": "failed-precondition",
    "invalid-photo-path": "invalid-argument",
    "unsupported-photo": "invalid-argument",
    "assessment-timeout": "deadline-exceeded",
    "malformed-model-output": "data-loss"
  };
  return new HttpsError(
    codeMap[error?.code] || "internal",
    error?.message || fallbackMessage
  );
};

const getPolicySnapshot = async () =>
  db.collection(POLICY_COLLECTION).doc(POLICY_DOCUMENT).get();

const recordRejectedAssessment = async ({ uid, draft, error }) => {
  try {
    const auditRef = db.collection(AUDIT_COLLECTION).doc();
    await auditRef.set({
      logId: auditRef.id,
      assessmentId: auditRef.id,
      featureType: "issue_priority",
      inspectionId: draft.inspectionKey,
      issueId: draft.issueId || "",
      requestedBy: uid,
      model: AI_PRIORITY_MODEL.value(),
      photoUsed: draft.photoPaths.length > 0,
      photoCount: draft.photoPaths.length,
      status: "error",
      errorCode: cleanText(error?.code || "failed-precondition", 100),
      errorMessage: cleanText(error?.message || "Assessment rejected.", 500),
      createdAt: fieldValue.serverTimestamp(),
      updatedAt: fieldValue.serverTimestamp()
    });
  } catch (auditError) {
    console.error("Could not record rejected AI priority assessment", {
      code: auditError?.code,
      message: auditError?.message
    });
  }
};

const loadActivePolicy = async () => {
  const snapshot = await getPolicySnapshot();
  if (!snapshot.exists) {
    throw new HttpsError(
      "failed-precondition",
      "The AI priority policy has not been configured."
    );
  }
  const data = snapshot.data();
  let normalized;
  try {
    normalized = validatePolicy(data);
  } catch (error) {
    throw mapCoreError(error, "The AI priority policy is invalid.");
  }
  if (!normalized.enabled) {
    throw new HttpsError(
      "failed-precondition",
      "AI priority assessment is disabled."
    );
  }
  return {
    ...normalized,
    version: Number(data.version) || 1
  };
};

const findIssue = async (issueId) => {
  if (!issueId) return null;
  const direct = await db.collection(ISSUES_COLLECTION).doc(issueId).get();
  if (direct.exists) return { id: direct.id, ...direct.data() };

  for (const field of ["issueKey", "issueId"]) {
    const snapshot = await db
      .collection(ISSUES_COLLECTION)
      .where(field, "==", issueId)
      .limit(1)
      .get();
    if (!snapshot.empty) {
      return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
    }
  }
  return null;
};

const loadTrustedContext = async (draft, callerUid) => {
  const inspectionSnapshot = await db
    .collection("inspections")
    .doc(draft.inspectionKey)
    .get();
  if (!inspectionSnapshot.exists) {
    throw new HttpsError("not-found", "The related inspection was not found.");
  }
  const inspection = inspectionSnapshot.data();
  if (
    String(inspection.buildingId || "") !== draft.buildingId ||
    String(inspection.fsmId || "") !== callerUid
  ) {
    throw new HttpsError(
      "permission-denied",
      "The inspection does not belong to the authenticated FSM and building."
    );
  }

  const buildingSnapshot = await db
    .collection("buildings")
    .doc(draft.buildingId)
    .get();
  if (!buildingSnapshot.exists) {
    throw new HttpsError("not-found", "The related building was not found.");
  }
  return {
    inspection,
    building: buildingSnapshot.data()
  };
};

const validateAndBuildImageParts = async (draft) => {
  const bucket = admin.storage().bucket();
  const parts = [];
  for (const path of draft.photoPaths) {
    const file = bucket.file(path);
    const [exists] = await file.exists();
    if (!exists) {
      throw new HttpsError("not-found", "A referenced defect photo was not found.");
    }
    const [metadata] = await file.getMetadata();
    try {
      validatePhotoPath({
        path,
        inspectionKey: draft.inspectionKey,
        contentType: metadata.contentType
      });
    } catch (error) {
      throw mapCoreError(error, "A defect photo could not be validated.");
    }
    parts.push({
      fileData: {
        fileUri: `gs://${bucket.name}/${path}`,
        mimeType: metadata.contentType
      }
    });
  }
  return parts;
};

const buildPrompt = ({ input, policy }) => [
  "Classify this unresolved fire-safety issue using only the supplied policy.",
  "Return one JSON object matching the response schema. Do not include reasoning.",
  "",
  "Risk policy:",
  `Low: ${policy.definitions.Low}`,
  `Medium: ${policy.definitions.Medium}`,
  `High: ${policy.definitions.High}`,
  policy.additionalInstructions
    ? `Additional organization instructions: ${policy.additionalInstructions}`
    : "",
  "",
  `Trusted building context: ${JSON.stringify(input.building)}`,
  `Checklist and issue details: ${JSON.stringify({
    floorId: input.floorId,
    categoryCode: input.categoryCode,
    categoryName: input.categoryName,
    itemCode: input.itemCode,
    itemLabel: input.itemLabel,
    condition: input.condition,
    remark: input.remark,
    issueDescription: input.issueDescription,
    rectification: input.rectification
  })}`
].filter(Boolean).join("\n");

const generatePriority = async ({ input, policy, imageParts }) => {
  const project =
    admin.app().options.projectId ||
    process.env.GCLOUD_PROJECT ||
    process.env.GOOGLE_CLOUD_PROJECT;
  if (!project) {
    throw new Error("Google Cloud project ID is unavailable.");
  }
  const modelName = AI_PRIORITY_MODEL.value();
  const genAI = new GoogleGenAI({
    vertexai: true,
    project,
    location: AI_PRIORITY_LOCATION.value()
  });
  const request = {
      model: modelName,
      contents: [{
        role: "user",
        parts: [{ text: buildPrompt({ input, policy }) }, ...imageParts]
      }],
      config: {
        temperature: 0,
        maxOutputTokens: 256,
        thinkingConfig: {
          thinkingBudget: 0
        },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suggestedPriority: {
              type: Type.STRING,
              format: "enum",
              enum: PRIORITIES
            }
          },
          required: ["suggestedPriority"]
        }
      }
    };
  const result = await withTimeout(
    withTransientRetry(() => genAI.models.generateContent(request)),
    ASSESSMENT_TIMEOUT_MS
  );
  return parseVertexPriorityResponse(result);
};

exports.assessIssuePriority = onCall(callableOptions, async (request) => {
  const { uid } = await getCallerProfile(request, "FSM");
  let draft;
  try {
    draft = validateDraft(request.data?.draft || request.data);
  } catch (error) {
    throw mapCoreError(error, "The issue draft is invalid.");
  }

  let policy;
  let building;
  try {
    policy = await loadActivePolicy();
    ({ building } = await loadTrustedContext(draft, uid));
  } catch (error) {
    await recordRejectedAssessment({ uid, draft, error });
    throw error;
  }
  const input = buildAssessmentInput({
    draft,
    building,
    policyVersion: policy.version
  });
  const inputHash = hashAssessmentInput(input);
  const existingIssue = await findIssue(draft.issueId);

  if (
    existingIssue &&
    existingIssue.aiPriorityInputHash === inputHash &&
    normalizePriority(existingIssue.aiSuggestedPriority) &&
    existingIssue.aiPriorityAssessmentId
  ) {
    return {
      assessmentId: existingIssue.aiPriorityAssessmentId,
      suggestedPriority: normalizePriority(existingIssue.aiSuggestedPriority),
      reused: true
    };
  }

  const assessmentRef = db.collection(AUDIT_COLLECTION).doc();
  const auditBase = {
    logId: assessmentRef.id,
    assessmentId: assessmentRef.id,
    featureType: "issue_priority",
    inspectionId: draft.inspectionKey,
    issueId: draft.issueId || "",
    requestedBy: uid,
    model: AI_PRIORITY_MODEL.value(),
    policyVersion: policy.version,
    photoUsed: draft.photoPaths.length > 0,
    photoCount: draft.photoPaths.length,
    inputHash,
    status: "pending",
    createdAt: fieldValue.serverTimestamp(),
    updatedAt: fieldValue.serverTimestamp()
  };
  await assessmentRef.set(auditBase);

  try {
    const imageParts = await validateAndBuildImageParts(draft);
    const suggestedPriority = await generatePriority({
      input,
      policy,
      imageParts
    });
    await assessmentRef.update({
      suggestedPriority,
      aiOutput: { suggestedPriority },
      status: "assessed",
      assessedAt: fieldValue.serverTimestamp(),
      updatedAt: fieldValue.serverTimestamp()
    });
    return {
      assessmentId: assessmentRef.id,
      suggestedPriority
    };
  } catch (error) {
    console.error("AI priority assessment failed", {
      assessmentId: assessmentRef.id,
      code: error?.code,
      message: error?.message
    });
    await assessmentRef.update({
      status: "error",
      errorCode: cleanText(error?.code || "internal", 100),
      errorMessage: cleanText(error?.message || "Assessment failed.", 500),
      updatedAt: fieldValue.serverTimestamp()
    });
    if (error instanceof HttpsError) throw error;
    throw mapCoreError(error, "The AI priority assessment failed.");
  }
});

exports.recordIssuePriorityDecision = onCall(callableOptions, async (request) => {
  const { uid } = await getCallerProfile(request, "FSM");
  const assessmentId = cleanText(request.data?.assessmentId, 300);
  const issueId = cleanText(request.data?.issueId, 300);
  const finalPriority = normalizePriority(request.data?.finalPriority);
  if (!assessmentId || !issueId || !finalPriority) {
    throw new HttpsError(
      "invalid-argument",
      "assessmentId, issueId, and a valid finalPriority are required."
    );
  }

  const assessmentRef = db.collection(AUDIT_COLLECTION).doc(assessmentId);
  const issue = await findIssue(issueId);
  if (!issue) {
    throw new HttpsError("not-found", "The saved issue was not found.");
  }
  const issueRef = db.collection(ISSUES_COLLECTION).doc(issue.id);

  await db.runTransaction(async (transaction) => {
    const assessmentSnapshot = await transaction.get(assessmentRef);
    if (!assessmentSnapshot.exists) {
      throw new HttpsError("not-found", "The priority assessment was not found.");
    }
    const assessment = assessmentSnapshot.data();
    if (
      assessment.featureType !== "issue_priority" ||
      assessment.requestedBy !== uid ||
      assessment.status === "error" ||
      String(issue.inspectionKey || issue.inspectionId || "") !==
        String(assessment.inspectionId || "")
    ) {
      throw new HttpsError(
        "permission-denied",
        "This assessment cannot be recorded by the current FSM."
      );
    }
    const suggestedPriority = normalizePriority(assessment.suggestedPriority);
    if (!suggestedPriority) {
      throw new HttpsError(
        "failed-precondition",
        "The assessment has no valid suggested priority."
      );
    }
    const decision = buildPriorityDecision(suggestedPriority, finalPriority);
    transaction.update(assessmentRef, {
      issueId: issue.id,
      finalDecisionByHuman: decision.finalPriority,
      finalPriority: decision.finalPriority,
      accepted: decision.accepted,
      status: "decided",
      decidedAt: fieldValue.serverTimestamp(),
      updatedAt: fieldValue.serverTimestamp()
    });
    transaction.update(issueRef, {
      priority: decision.finalPriority,
      aiSuggestedPriority: decision.suggestedPriority,
      aiPriorityAssessmentId: assessmentId,
      aiPriorityAccepted: decision.accepted,
      aiPriorityAssessedAt:
        assessment.assessedAt || fieldValue.serverTimestamp(),
      aiPolicyVersion: assessment.policyVersion,
      aiPriorityInputHash: assessment.inputHash,
      updatedAt: fieldValue.serverTimestamp()
    });
  });

  return { success: true };
});

exports.getIssuePriorityPolicy = onCall(callableOptions, async (request) => {
  await getCallerProfile(request, "FSM");
  const snapshot = await getPolicySnapshot();
  if (!snapshot.exists) {
    return {
      enabled: false,
      definitions: { Low: "", Medium: "", High: "" },
      additionalInstructions: "",
      version: 0
    };
  }
  const data = snapshot.data();
  return {
    enabled: data.enabled !== false,
    definitions: {
      Low: cleanText(data.definitions?.Low, 3000),
      Medium: cleanText(data.definitions?.Medium, 3000),
      High: cleanText(data.definitions?.High, 3000)
    },
    additionalInstructions: cleanText(data.additionalInstructions, 6000),
    version: Number(data.version) || 1,
    updatedAt: data.updatedAt?.toDate?.()?.toISOString?.() || null,
    updatedBy: data.updatedBy || ""
  };
});

exports.updateIssuePriorityPolicy = onCall(callableOptions, async (request) => {
  const { uid } = await getCallerProfile(request, "FSM");
  let policy;
  try {
    policy = validatePolicy(request.data?.policy || request.data);
  } catch (error) {
    throw mapCoreError(error, "The AI priority policy is invalid.");
  }
  const policyRef = db.collection(POLICY_COLLECTION).doc(POLICY_DOCUMENT);
  let version;
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(policyRef);
    version = (Number(snapshot.data()?.version) || 0) + 1;
    transaction.set(
      policyRef,
      {
        ...policy,
        version,
        updatedBy: uid,
        updatedAt: fieldValue.serverTimestamp(),
        ...(snapshot.exists ? {} : { createdAt: fieldValue.serverTimestamp() })
      },
      { merge: true }
    );
  });
  return { success: true, version };
});

exports._test = {
  buildPrompt,
  generatePriority,
  isResolvedStatus
};
