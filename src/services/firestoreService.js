import { collection, doc, addDoc, setDoc, serverTimestamp } from "firebase/firestore";
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

// Buildings
export const addBuilding = async (data) => {
  return await addDoc(collection(db, COLLECTION_NAMES.BUILDINGS), {
    buildingId: data.buildingId,
    buildingName: data.buildingName,
    address: data.address,
    occupancyType: data.occupancyType,
    noOfStoreys: data.noOfStoreys,
    grossFloorAreaGfa: data.grossFloorAreaGfa,
    occupantLoad: data.occupantLoad,
    assignedFsmId: data.assignedFsmId,
    customerId: data.customerId,
    status: data.status || STATUS.ACTIVE,
    createdAt: serverTimestamp()
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

// Create inspection (parent document)
export const createInspection = async (data) => {
  return await addDoc(collection(db, COLLECTION_NAMES.INSPECTIONS), {
    inspectionId: data.inspectionId,
    buildingId: data.buildingId,
    floorId: data.floorId,
    fsmId: data.fsmId,
    inspectionType: data.inspectionType,
    inspectionMode: data.inspectionMode || "Semi-Automated",
    templateId: data.templateId,
    inspectionDate: data.inspectionDate || serverTimestamp(),
    lastUpdated: serverTimestamp(),
    progressPercent: data.progressPercent || 0,
    generalRemarks: data.generalRemarks || "",
    aiAssistanceUsed: !!data.aiAssistanceUsed,
    aiSummary: data.aiSummary || "",
    status: data.status || STATUS.DRAFT,
    createdAt: serverTimestamp()
  });
};

// Inspection result (per checklist item)
export const addInspectionResult = async (data) => {
  return await addDoc(collection(db, COLLECTION_NAMES.INSPECTION_RESULTS), {
    resultId: data.resultId,
    inspectionId: data.inspectionId,
    buildingId: data.buildingId,
    floorId: data.floorId,
    equipmentId: data.equipmentId || null,
    templateId: data.templateId,
    categoryCode: data.categoryCode,
    categoryName: data.categoryName,
    itemCode: data.itemCode,
    itemLabel: data.itemLabel,
    inspectionPath: data.inspectionPath || "",
    condition: data.condition,
    passFail: data.passFail || (data.condition === "Good" ? "Pass" : "Fail"),
    remark: data.remark || "",
    photoUrl: data.photoUrl || "",
    manualVerificationRequired: !!data.manualVerificationRequired,
    checkedAt: data.checkedAt || serverTimestamp(),
    checkedBy: data.checkedBy || null,
    qrScanned: !!data.qrScanned,
    qrCodeValue: data.qrCodeValue || "",
    historyLoaded: !!data.historyLoaded,
    aiChecklistSuggestion: data.aiChecklistSuggestion || "",
    createdAt: serverTimestamp()
  });
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
    issueId: data.issueId,
    inspectionId: data.inspectionId,
    resultId: data.resultId,
    buildingId: data.buildingId,
    floorId: data.floorId,
    equipmentId: data.equipmentId || null,
    reportedBy: data.reportedBy,
    issueTitle: data.issueTitle,
    issueDescription: data.issueDescription,
    rectification: data.rectification || "",
    priority: data.priority || PRIORITY.MEDIUM,
    status: data.status || ISSUE_STATUS.OPEN,
    issuePhotoUrl: data.issuePhotoUrl || "",
    aiRecommendation: data.aiRecommendation || "",
    createdAt: serverTimestamp()
  });
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
    reportId: data.reportId,
    inspectionId: data.inspectionId,
    buildingId: data.buildingId,
    generatedBy: data.generatedBy,
    generatedDate: data.generatedDate || serverTimestamp(),
    reportType: data.reportType || "Inspection",
    reportFileUrl: data.reportFileUrl || "",
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