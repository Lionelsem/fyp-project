import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  where
} from "firebase/firestore";
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

export const addBuilding = async (data) => {
  return await addDoc(collection(db, COLLECTION_NAMES.BUILDINGS), {
    buildingName: data.buildingName,
    address: data.address,
    occupancyType: data.occupancyType,
    noOfStoreys: data.noOfStoreys,
    grossFloorAreaGfa: data.grossFloorAreaGfa,
    occupantLoad: data.occupantLoad,
    customerId: data.customerId,
    assignedFsmId: data.assignedFsmId,
    createdAt: serverTimestamp()
  });
};

export const addInspection = async (data) => {
  return await addDoc(collection(db, COLLECTION_NAMES.INSPECTIONS), {
    buildingId: data.buildingId,
    fsmId: data.fsmId,
    inspectionDate: data.inspectionDate,
    checklistStatus: data.checklistStatus,
    overallStatus: data.overallStatus,
    remarks: data.remarks || "",
    createdAt: serverTimestamp()
  });
};

export const addInspectionItem = async (data) => {
  return await addDoc(collection(db, COLLECTION_NAMES.INSPECTION_ITEMS), {
    inspectionId: data.inspectionId,
    itemName: data.itemName,
    conditionSystem: data.conditionSystem,
    remarks: data.remarks || "",
    photoUrl: data.photoUrl || "",
    createdAt: serverTimestamp()
  });
};

export const addIssue = async (data) => {
  return await addDoc(collection(db, COLLECTION_NAMES.ISSUES), {
    buildingId: data.buildingId,
    inspectionId: data.inspectionId,
    reportedBy: data.reportedBy,
    issueTitle: data.issueTitle,
    issueDescription: data.issueDescription,
    defectPhotoUrl: data.defectPhotoUrl || "",
    status: data.status || ISSUE_STATUS.OPEN,
    priority: data.priority || PRIORITY.MEDIUM,
    createdAt: serverTimestamp()
  });
};

export const addIssueComment = async (data) => {
  return await addDoc(collection(db, COLLECTION_NAMES.ISSUE_COMMENTS), {
    issueId: data.issueId,
    userId: data.userId,
    commentText: data.commentText,
    createdAt: serverTimestamp()
  });
};

export const addFireDrill = async (data) => {
  return await addDoc(collection(db, COLLECTION_NAMES.FIRE_DRILLS), {
    buildingId: data.buildingId,
    fsmId: data.fsmId,
    drillDate: data.drillDate,
    drillTime: data.drillTime,
    performanceStatus: data.performanceStatus,
    observations: data.observations || "",
    issueFound: data.issueFound || "",
    recommendations: data.recommendations || "",
    reportStatus: data.reportStatus || REPORT_STATUS.DRAFT,
    createdAt: serverTimestamp()
  });
};

export const addReport = async (data) => {
  return await addDoc(collection(db, COLLECTION_NAMES.REPORTS), {
    reportType: data.reportType,
    buildingId: data.buildingId,
    generatedBy: data.generatedBy,
    reportFileUrl: data.reportFileUrl || "",
    generatedDate: serverTimestamp(),
    status: data.status || REPORT_STATUS.DRAFT
  });
};

export const addClosureVerification = async (data) => {
  return await addDoc(collection(db, COLLECTION_NAMES.CLOSURE_VERIFICATIONS), {
    issueId: data.issueId,
    verifiedBy: data.verifiedBy,
    beforePhotoUrl: data.beforePhotoUrl || "",
    afterPhotoUrl: data.afterPhotoUrl || "",
    verificationComments: data.verificationComments || "",
    approvalStatus: data.approvalStatus || APPROVAL_STATUS.PENDING,
    verifiedAt: serverTimestamp()
  });
};

export const addNotification = async (data) => {
  return await addDoc(collection(db, "notifications"), {
    userId: data.userId,
    title: data.title,
    message: data.message,
    type: data.type || "General",
    isRead: false,
    createdAt: serverTimestamp()
  });
};