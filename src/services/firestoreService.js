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

export const createUserProfile = async (user, extraData = {}) => {
  await setDoc(doc(db, "users", user.uid), {
    fullName: extraData.fullName || "Test User",
    email: user.email,
    phoneNumber: extraData.phoneNumber || "",
    role: extraData.role || "Customer",
    status: extraData.status || "Active",
    createdAt: serverTimestamp()
  });
};

export const addBuilding = async (data) => {
  return await addDoc(collection(db, "buildings"), {
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
  return await addDoc(collection(db, "inspections"), {
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
  return await addDoc(collection(db, "inspectionItems"), {
    inspectionId: data.inspectionId,
    itemName: data.itemName,
    conditionSystem: data.conditionSystem,
    remarks: data.remarks || "",
    photoUrl: data.photoUrl || "",
    createdAt: serverTimestamp()
  });
};

export const addIssue = async (data) => {
  return await addDoc(collection(db, "issues"), {
    buildingId: data.buildingId,
    inspectionId: data.inspectionId,
    reportedBy: data.reportedBy,
    issueTitle: data.issueTitle,
    issueDescription: data.issueDescription,
    defectPhotoUrl: data.defectPhotoUrl || "",
    status: data.status || "Open",
    priority: data.priority || "Medium",
    createdAt: serverTimestamp()
  });
};

export const addIssueComment = async (data) => {
  return await addDoc(collection(db, "issueComments"), {
    issueId: data.issueId,
    userId: data.userId,
    commentText: data.commentText,
    createdAt: serverTimestamp()
  });
};

export const addFireDrill = async (data) => {
  return await addDoc(collection(db, "fireDrills"), {
    buildingId: data.buildingId,
    fsmId: data.fsmId,
    drillDate: data.drillDate,
    drillTime: data.drillTime,
    performanceStatus: data.performanceStatus,
    observations: data.observations || "",
    issueFound: data.issueFound || "",
    recommendations: data.recommendations || "",
    reportStatus: data.reportStatus || "Draft",
    createdAt: serverTimestamp()
  });
};

export const addReport = async (data) => {
  return await addDoc(collection(db, "reports"), {
    reportType: data.reportType,
    buildingId: data.buildingId,
    generatedBy: data.generatedBy,
    reportFileUrl: data.reportFileUrl || "",
    generatedDate: serverTimestamp(),
    status: data.status || "Draft"
  });
};

export const addClosureVerification = async (data) => {
  return await addDoc(collection(db, "closureVerifications"), {
    issueId: data.issueId,
    verifiedBy: data.verifiedBy,
    beforePhotoUrl: data.beforePhotoUrl || "",
    afterPhotoUrl: data.afterPhotoUrl || "",
    verificationComments: data.verificationComments || "",
    approvalStatus: data.approvalStatus || "Pending",
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