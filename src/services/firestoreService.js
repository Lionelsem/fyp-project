import { collection, doc, addDoc, setDoc, getDoc, getDocs, serverTimestamp, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../config/firebase";
import { COLLECTION_NAMES } from "../constants/collectionNames";
import { ROLES } from "../constants/roles";
import {
  STATUS,
  ISSUE_STATUS,
  PRIORITY,
  REPORT_STATUS,
  APPROVAL_STATUS
} from "../constants/status";
export const createUserProfile = async (user, extraData = {}) => {
  await setDoc(doc(db, COLLECTION_NAMES.USERS, user.uid), {
    fullName: extraData.fullName || "Test User",
    email: user.email,
    phoneNumber: extraData.phoneNumber || "",
    role: extraData.role || ROLES.CUSTOMER,
    status: extraData.status || STATUS.ACTIVE,
    createdAt: serverTimestamp()
  });
};

export const getUserById = async (uid) => {
  return await getDoc(doc(db, COLLECTION_NAMES.USERS, uid));
};

export const updateUser = async (uid, data) => {
  return await updateDoc(doc(db, COLLECTION_NAMES.USERS, uid), {
    ...removeUndefinedFields(data),
    updatedAt: serverTimestamp()
  });
};

export const deleteUser = async (uid) => {
  return await deleteDoc(doc(db, COLLECTION_NAMES.USERS, uid));
};

// Buildings
export const addBuilding = async (data) => {
  return await addDoc(collection(db, COLLECTION_NAMES.BUILDINGS), {
    buildingId: data.buildingId,
    buildingName: data.buildingName || data.building_name,
    building_name: data.building_name || data.buildingName,
    address: data.address,
    occupancyType: data.occupancyType || "",
    noOfStoreys: data.noOfStoreys,
    grossFloorAreaGfa: data.grossFloorAreaGfa || "",
    occupantLoad: data.occupantLoad,
    assignedFsmId: data.assignedFsmId,
    customerId: data.customerId || "",
    status: data.status || STATUS.ACTIVE,
    createdAt: serverTimestamp()
  });
};

export const getBuildings = async () => {
  return await getDocs(collection(db, COLLECTION_NAMES.BUILDINGS));
};

export const getBuilding = async (id) => {
  return await getDoc(doc(db, COLLECTION_NAMES.BUILDINGS, id));
};

export const deleteBuilding = async (id) => {
  return await deleteDoc(doc(db, COLLECTION_NAMES.BUILDINGS, id));
};

export const updateBuilding = async (id, data) => {
  return await updateDoc(doc(db, COLLECTION_NAMES.BUILDINGS, id), {
    ...removeUndefinedFields(data),
    updatedAt: serverTimestamp()
  });
};

// Floors
export const addFloor = async (data) => {
  return await addDoc(collection(db, COLLECTION_NAMES.FLOORS), {
    floorId: data.floorId,
    buildingId: data.buildingId,
    floorCode: data.floorCode,
    floorName: data.floorName,
    floorType: data.floorType,
    status: data.status || STATUS.ACTIVE,
    createdAt: serverTimestamp()
  });
};

// Equipment
export const addEquipment = async (data) => {
  return await addDoc(collection(db, COLLECTION_NAMES.EQUIPMENT), {
    equipmentId: data.equipmentId,
    buildingId: data.buildingId,
    floorId: data.floorId,
    equipmentCode: data.equipmentCode,
    equipmentType: data.equipmentType,
    equipmentName: data.equipmentName,
    category: data.category,
    location: data.location,
    qrCodeValue: data.qrCodeValue,
    serialNumber: data.serialNumber,
    manufacturer: data.manufacturer,
    model: data.model,
    installDate: data.installDate || null,
    lastServiceDate: data.lastServiceDate || null,
    nextServiceDueDate: data.nextServiceDueDate || null,
    expiryDate: data.expiryDate || null,
    certificationNumber: data.certificationNumber || "",
    certificationValidUntil: data.certificationValidUntil || null,
    maintenanceVendor: data.maintenanceVendor || "",
    status: data.status || STATUS.ACTIVE,
    isExpired: !!data.isExpired,
    isServiceDue: !!data.isServiceDue,
    isOverdue: !!data.isOverdue,
    certificateValid: data.certificateValid !== undefined ? !!data.certificateValid : true,
    createdAt: serverTimestamp()
  });
};

// Inspection templates (moved from hardcoded checklist)
export const addInspectionTemplate = async (data) => {
  return await addDoc(collection(db, COLLECTION_NAMES.INSPECTION_TEMPLATES), {
    templateId: data.templateId,
    templateName: data.templateName,
    inspectionType: data.inspectionType,
    equipmentType: data.equipmentType,
    categoryCode: data.categoryCode,
    categoryName: data.categoryName,
    itemCode: data.itemCode,
    itemLabel: data.itemLabel,
    requiresPhoto: !!data.requiresPhoto,
    requiresRemark: !!data.requiresRemark,
    autoCreateIssueWhenFaulty: !!data.autoCreateIssueWhenFaulty,
    defaultPriority: data.defaultPriority || PRIORITY.MEDIUM,
    isManualVerification: !!data.isManualVerification,
    createdAt: serverTimestamp()
  });
};

const getInspectionPassFail = (condition) => {
  if (condition === "Good") return "Pass";
  if (condition === "Faulty") return "Fail";
  if (condition === "N.A.") return "N.A.";
  return "";
};

const buildInspectionPayload = (data) => ({
  inspectionKey: data.inspectionKey || "",
  inspectionId: data.inspectionId,
  buildingId: data.buildingId,
  floorId: data.floorId,
  floorName: data.floorName || "",
  fsmId: data.fsmId,
  periodKey: data.periodKey || "",
  inspectionType: data.inspectionType,
  inspectionMode: data.inspectionMode || "Semi-Automated",
  templateId: data.templateId,
  inspectionDate: data.inspectionDate || serverTimestamp(),
  lastUpdated: serverTimestamp(),
  progressPercent: data.progressPercent || 0,
  generalRemarks: data.generalRemarks || "",
  aiAssistanceUsed: !!data.aiAssistanceUsed,
  aiSummary: data.aiSummary || "",
  status: data.status || STATUS.DRAFT
});

const buildInspectionResultPayload = (data) => ({
  resultKey: data.resultKey || "",
  resultId: data.resultId,
  inspectionKey: data.inspectionKey || "",
  inspectionId: data.inspectionId,
  buildingId: data.buildingId,
  floorId: data.floorId,
  floorName: data.floorName || "",
  fsmId: data.fsmId || null,
  periodKey: data.periodKey || "",
  equipmentId: data.equipmentId || null,
  templateId: data.templateId,
  categoryCode: data.categoryCode,
  categoryName: data.categoryName,
  itemCode: data.itemCode,
  itemLabel: data.itemLabel,
  inspectionPath: data.inspectionPath || "",
  condition: data.condition,
  passFail:
    data.passFail !== undefined
      ? data.passFail
      : getInspectionPassFail(data.condition),
  remark: data.remark || "",
  photoUrl: data.photoUrl || "",
  manualVerificationRequired: !!data.manualVerificationRequired,
  checkedAt: data.checkedAt || serverTimestamp(),
  checkedBy: data.checkedBy || null,
  qrScanned: !!data.qrScanned,
  qrCodeValue: data.qrCodeValue || "",
  historyLoaded: !!data.historyLoaded,
  aiChecklistSuggestion: data.aiChecklistSuggestion || ""
});

const buildIssuePayload = (data) => ({
  issueKey: data.issueKey || "",
  issueId: data.issueId,
  inspectionKey: data.inspectionKey || "",
  inspectionId: data.inspectionId,
  resultKey: data.resultKey || "",
  resultId: data.resultId,
  buildingId: data.buildingId,
  floorId: data.floorId,
  floorName: data.floorName || "",
  location: data.location || "",
  equipmentId: data.equipmentId || null,
  reportedBy: data.reportedBy,
  issueTitle: data.issueTitle,
  issueDescription: data.issueDescription,
  rectification: data.rectification || "",
  priority: data.priority || PRIORITY.MEDIUM,
  status: data.status || ISSUE_STATUS.OPEN,
  issuePhotoUrl: data.issuePhotoUrl || "",
  aiRecommendation: data.aiRecommendation || ""
});

const upsertByDocumentId = async (collectionName, documentId, payload) => {
  const docRef = doc(db, collectionName, documentId);
  const existing = await getDoc(docRef);
  await setDoc(
    docRef,
    {
      ...payload,
      updatedAt: serverTimestamp(),
      ...(existing.exists() ? {} : { createdAt: serverTimestamp() })
    },
    { merge: true }
  );
  return docRef;
};

const removeUndefinedFields = (data) =>
  Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined)
  );

// Create inspection (parent document)
export const createInspection = async (data) => {
  return await addDoc(collection(db, COLLECTION_NAMES.INSPECTIONS), {
    ...buildInspectionPayload(data),
    createdAt: serverTimestamp()
  });
};

export const upsertInspection = async (data) => {
  const inspectionKey = data.inspectionKey;
  return await upsertByDocumentId(
    COLLECTION_NAMES.INSPECTIONS,
    inspectionKey,
    buildInspectionPayload({
      ...data,
      inspectionId: data.inspectionId || inspectionKey
    })
  );
};

// Inspection result (per checklist item)
export const addInspectionResult = async (data) => {
  return await addDoc(collection(db, COLLECTION_NAMES.INSPECTION_RESULTS), {
    ...buildInspectionResultPayload(data),
    createdAt: serverTimestamp()
  });
};

export const upsertInspectionResult = async (data) => {
  const resultKey = data.resultKey;
  return await upsertByDocumentId(
    COLLECTION_NAMES.INSPECTION_RESULTS,
    resultKey,
    buildInspectionResultPayload({
      ...data,
      resultId: data.resultId || resultKey
    })
  );
};

// Equipment history
export const addEquipmentHistory = async (data) => {
  return await addDoc(collection(db, COLLECTION_NAMES.EQUIPMENT_HISTORY), {
    historyId: data.historyId,
    equipmentId: data.equipmentId,
    inspectionId: data.inspectionId,
    resultId: data.resultId,
    inspectionDate: data.inspectionDate || serverTimestamp(),
    previousCondition: data.previousCondition,
    previousRemark: data.previousRemark || "",
    previousPhotoUrl: data.previousPhotoUrl || "",
    createdAt: serverTimestamp()
  });
};

// Issues (linked to inspection results)
export const addIssue = async (data) => {
  return await addDoc(collection(db, COLLECTION_NAMES.ISSUES), {
    ...buildIssuePayload(data),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
};

export const upsertIssue = async (data) => {
  const issueKey = data.issueKey;
  return await upsertByDocumentId(
    COLLECTION_NAMES.ISSUES,
    issueKey,
    buildIssuePayload({
      ...data,
      issueId: data.issueId || issueKey
    })
  );
};

export const getIssues = async () => {
  return await getDocs(collection(db, COLLECTION_NAMES.ISSUES));
};

export const getIssue = async (id) => {
  return await getDoc(doc(db, COLLECTION_NAMES.ISSUES, id));
};

export const getIssueById = async (id) => {
  return await getIssue(id);
};

export const updateIssue = async (id, data) => {
  return await updateDoc(doc(db, COLLECTION_NAMES.ISSUES, id), {
    ...removeUndefinedFields(data),
    updatedAt: serverTimestamp()
  });
};

export const deleteIssue = async (id) => {
  return await deleteDoc(doc(db, COLLECTION_NAMES.ISSUES, id));
};

export const addIssueComment = async (data) => {
  return await addDoc(collection(db, COLLECTION_NAMES.ISSUE_COMMENTS), {
    commentId: data.commentId,
    issueId: data.issueId,
    userId: data.userId,
    commentText: data.commentText,
    createdAt: serverTimestamp()
  });
};

export const addClosureVerification = async (data) => {
  return await addDoc(collection(db, COLLECTION_NAMES.CLOSURE_VERIFICATIONS), {
    verificationId: data.verificationId,
    issueId: data.issueId,
    resultId: data.resultId,
    verifiedBy: data.verifiedBy,
    beforePhotoUrl: data.beforePhotoUrl || "",
    afterPhotoUrl: data.afterPhotoUrl || "",
    verificationComments: data.verificationComments || "",
    approvalStatus: data.approvalStatus || APPROVAL_STATUS.PENDING,
    verifiedAt: serverTimestamp(),
    createdAt: serverTimestamp()
  });
};

export const getClosureVerifications = async () => {
  return await getDocs(collection(db, COLLECTION_NAMES.CLOSURE_VERIFICATIONS));
};

export const addNotification = async (data) => {
  return await addDoc(collection(db, COLLECTION_NAMES.NOTIFICATIONS), {
    notificationId: data.notificationId,
    userId: data.userId,
    title: data.title,
    message: data.message,
    type: data.type || "Inspection Alert",
    isRead: !!data.isRead,
    relatedEntityType: data.relatedEntityType || null,
    relatedEntityId: data.relatedEntityId || null,
    createdAt: serverTimestamp()
  });
};

export const addReport = async (data) => {
  return await addDoc(collection(db, COLLECTION_NAMES.REPORTS), {
    reportId: data.reportId ?? null,
    inspectionId: data.inspectionId ?? null,
    buildingId: data.buildingId ?? null,
    generatedBy: data.generatedBy ?? null,
    generatedDate: data.generatedDate || serverTimestamp(),
    reportType: data.reportType || "Inspection",
    reportFileUrl: data.reportFileUrl || "",
    reportTitle: data.reportTitle || "",
    period: data.period || "",
    priority: data.priority || "Normal",
    aiSummaryIncluded: !!data.aiSummaryIncluded,
    status: data.status || REPORT_STATUS.DRAFT,
    createdAt: serverTimestamp()
  });
};

export const addAiAuditLog = async (data) => {
  return await addDoc(collection(db, COLLECTION_NAMES.AI_AUDIT_LOGS), {
    logId: data.logId,
    inspectionId: data.inspectionId,
    resultId: data.resultId,
    featureType: data.featureType,
    inputType: data.inputType,
    promptSummary: data.promptSummary,
    aiOutput: data.aiOutput,
    finalDecisionByHuman: data.finalDecisionByHuman || null,
    createdAt: serverTimestamp()
  });
};
