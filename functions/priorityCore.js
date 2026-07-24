const crypto = require("crypto");

const PRIORITIES = ["Low", "Medium", "High"];
const CLOSED_STATUSES = new Set(["resolved", "closed"]);
const SUPPORTED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif"
]);

const cleanText = (value, maxLength = 4000) =>
  String(value || "").trim().slice(0, maxLength);

const normalizePriority = (value) => {
  const match = PRIORITIES.find(
    (priority) => priority.toLowerCase() === cleanText(value, 20).toLowerCase()
  );
  return match || "";
};

const buildPriorityDecision = (suggestedValue, finalValue) => {
  const suggestedPriority = normalizePriority(suggestedValue);
  const finalPriority = normalizePriority(finalValue);
  if (!suggestedPriority || !finalPriority) {
    const error = new Error("Suggested and final priorities must be Low, Medium, or High.");
    error.code = "invalid-priority-decision";
    throw error;
  }
  return {
    suggestedPriority,
    finalPriority,
    accepted: suggestedPriority === finalPriority
  };
};

const isResolvedStatus = (value) =>
  CLOSED_STATUSES.has(cleanText(value, 40).toLowerCase());

const getRoleAccessError = ({ uid, role, requiredRole }) => {
  if (!cleanText(uid, 300)) return "unauthenticated";
  if (role !== requiredRole) return "permission-denied";
  return "";
};

const validatePolicy = (policy = {}) => {
  const definitions = policy.definitions || {};
  const normalized = {
    enabled: policy.enabled !== false,
    definitions: {
      Low: cleanText(definitions.Low, 3000),
      Medium: cleanText(definitions.Medium, 3000),
      High: cleanText(definitions.High, 3000)
    },
    additionalInstructions: cleanText(policy.additionalInstructions, 6000)
  };

  for (const priority of PRIORITIES) {
    if (!normalized.definitions[priority]) {
      const error = new Error(`${priority} priority definition is required.`);
      error.code = "invalid-policy";
      throw error;
    }
  }

  return normalized;
};

const normalizeDraft = (draft = {}) => ({
  issueId: cleanText(draft.issueId, 300),
  inspectionKey: cleanText(draft.inspectionKey, 300),
  buildingId: cleanText(draft.buildingId, 300),
  floorId: cleanText(draft.floorId, 300),
  categoryCode: cleanText(draft.categoryCode, 300),
  categoryName: cleanText(draft.categoryName, 500),
  itemCode: cleanText(draft.itemCode, 300),
  itemLabel: cleanText(draft.itemLabel, 1000),
  condition: cleanText(draft.condition, 100),
  remark: cleanText(draft.remark, 3000),
  issueDescription: cleanText(draft.issueDescription, 6000),
  rectification: cleanText(draft.rectification, 3000),
  status: cleanText(draft.status, 100),
  photoPaths: Array.from(
    new Set(
      (Array.isArray(draft.photoPaths) ? draft.photoPaths : [])
        .map((path) => cleanText(path, 1500))
        .filter(Boolean)
    )
  ).slice(0, 5)
});

const validateDraft = (draft) => {
  const normalized = normalizeDraft(draft);
  if (!normalized.inspectionKey || !normalized.buildingId || !normalized.itemLabel) {
    const error = new Error(
      "inspectionKey, buildingId, and itemLabel are required."
    );
    error.code = "invalid-draft";
    throw error;
  }
  if (!normalized.issueDescription && !normalized.remark) {
    const error = new Error("An issue description or checklist remark is required.");
    error.code = "invalid-draft";
    throw error;
  }
  if (isResolvedStatus(normalized.status)) {
    const error = new Error("Resolved and closed issues are not assessed.");
    error.code = "resolved-issue";
    throw error;
  }
  return normalized;
};

const buildAssessmentInput = ({ draft, building, policyVersion }) => ({
  inspectionKey: draft.inspectionKey,
  buildingId: draft.buildingId,
  floorId: draft.floorId,
  categoryCode: draft.categoryCode,
  categoryName: draft.categoryName,
  itemCode: draft.itemCode,
  itemLabel: draft.itemLabel,
  condition: draft.condition,
  remark: draft.remark,
  issueDescription: draft.issueDescription,
  rectification: draft.rectification,
  photoPaths: draft.photoPaths,
  building: {
    name: cleanText(building.buildingName || building.building_name, 1000),
    address: cleanText(building.address, 1500),
    occupancyType: cleanText(building.occupancyType, 500),
    noOfStoreys: building.noOfStoreys ?? null,
    occupantLoad: cleanText(building.occupantLoad, 500)
  },
  policyVersion
});

const hashAssessmentInput = (input) =>
  crypto.createHash("sha256").update(JSON.stringify(input)).digest("hex");

const parseStructuredPriority = (rawResponse) => {
  let value = rawResponse;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch (_error) {
      const error = new Error("The model did not return valid JSON.");
      error.code = "malformed-model-output";
      throw error;
    }
  }

  const suggestedPriority = normalizePriority(value?.suggestedPriority);
  if (!suggestedPriority) {
    const error = new Error("The model returned an unsupported priority.");
    error.code = "malformed-model-output";
    throw error;
  }
  return suggestedPriority;
};

const parseVertexPriorityResponse = (result) => {
  const responseText =
    result?.text ||
    result?.response?.candidates?.[0]?.content?.parts?.[0]?.text;
  return parseStructuredPriority(responseText);
};

const validatePhotoPath = ({ path, inspectionKey, contentType }) => {
  const requiredPrefix = `inspection-defect-photos/${inspectionKey}/`;
  if (!path.startsWith(requiredPrefix) || path.includes("..")) {
    const error = new Error("A photo path does not belong to this inspection.");
    error.code = "invalid-photo-path";
    throw error;
  }
  if (!SUPPORTED_IMAGE_TYPES.has(String(contentType || "").toLowerCase())) {
    const error = new Error("A photo uses an unsupported image format.");
    error.code = "unsupported-photo";
    throw error;
  }
  return true;
};

const withTimeout = async (promise, timeoutMs) => {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      const error = new Error("The AI priority assessment timed out.");
      error.code = "assessment-timeout";
      reject(error);
    }, timeoutMs);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId);
  }
};

const getProviderStatusCode = (error) => {
  for (const value of [error?.status, error?.code]) {
    const statusCode = Number(value);
    if (Number.isInteger(statusCode)) return statusCode;
  }
  try {
    const parsed = JSON.parse(String(error?.message || ""));
    const statusCode = Number(parsed?.error?.code);
    return Number.isInteger(statusCode) ? statusCode : 0;
  } catch (_error) {
    return 0;
  }
};

const withTransientRetry = async (
  operation,
  { attempts = 2, delayMs = 750 } = {}
) => {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const statusCode = getProviderStatusCode(error);
      const retryable =
        statusCode === 429 || (statusCode >= 500 && statusCode <= 504);
      if (!retryable || attempt === attempts) throw error;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw lastError;
};

module.exports = {
  PRIORITIES,
  SUPPORTED_IMAGE_TYPES,
  buildAssessmentInput,
  buildPriorityDecision,
  cleanText,
  hashAssessmentInput,
  getRoleAccessError,
  isResolvedStatus,
  normalizeDraft,
  normalizePriority,
  parseStructuredPriority,
  parseVertexPriorityResponse,
  validateDraft,
  validatePhotoPath,
  validatePolicy,
  withTransientRetry,
  withTimeout
};
