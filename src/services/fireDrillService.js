import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
  updateDoc
} from "firebase/firestore";
import { db } from "../config/firebase";
import { COLLECTION_NAMES } from "../constants/collectionNames";
import { REPORT_STATUS } from "../constants/status";

const textValue = (value) => String(value || "").trim();

const buildFireDrillPayload = (data) => ({
  buildingId: textValue(data.buildingId),
  buildingName: textValue(data.buildingName),
  fsmId: textValue(data.fsmId),
  drillDate: textValue(data.drillDate),
  drillTime: textValue(data.drillTime),
  drillEndTime: textValue(data.drillEndTime),
  drillType: textValue(data.drillType),
  scope: textValue(data.scope),
  participants: textValue(data.participants),
  status: textValue(data.status) || "Scheduled",
  performanceStatus: textValue(data.performanceStatus),
  evacuationTime: textValue(data.evacuationTime),
  actualDate: textValue(data.actualDate),
  actualTime: textValue(data.actualTime),
  alarmToEvacuationTime: textValue(data.alarmToEvacuationTime),
  totalEvacuationTime: textValue(data.totalEvacuationTime),
  observations: textValue(data.observations),
  issueFound: textValue(data.issueFound),
  followUpIssues: textValue(data.followUpIssues),
  recommendations: textValue(data.recommendations),
  conductedDate: textValue(data.conductedDate),
  reportStatus: textValue(data.reportStatus) || REPORT_STATUS.DRAFT
});

export const createFireDrill = async (data) => {
  return addDoc(collection(db, COLLECTION_NAMES.FIRE_DRILLS), {
    ...buildFireDrillPayload(data),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
};

export const updateFireDrill = async (id, data) => {
  return updateDoc(doc(db, COLLECTION_NAMES.FIRE_DRILLS, id), {
    ...data,
    updatedAt: serverTimestamp()
  });
};

export const updateScheduledFireDrill = async (id, data) => {
  return updateFireDrill(id, {
    ...buildFireDrillPayload(data),
    status: "Scheduled"
  });
};

export const deleteFireDrill = async (id) => {
  return deleteDoc(doc(db, COLLECTION_NAMES.FIRE_DRILLS, id));
};

export const completeFireDrill = async (id, data) => {
  return updateFireDrill(id, {
    status: "Completed",
    performanceStatus: textValue(data.performanceStatus) || "Completed",
    actualDate: textValue(data.actualDate),
    actualTime: textValue(data.actualTime),
    conductedDate: textValue(data.actualDate),
    alarmToEvacuationTime: textValue(data.alarmToEvacuationTime),
    totalEvacuationTime: textValue(data.totalEvacuationTime),
    evacuationTime: textValue(data.totalEvacuationTime),
    observations: textValue(data.observations),
    issueFound: textValue(data.issueFound),
    followUpIssues: textValue(data.followUpIssues),
    recommendations: textValue(data.recommendations),
    photos: Array.isArray(data.photos) ? data.photos : [],
    photoUrls: Array.isArray(data.photoUrls) ? data.photoUrls : [],
    completedAt: serverTimestamp()
  });
};
