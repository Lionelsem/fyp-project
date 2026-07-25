import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  updateDoc,
  writeBatch
} from "firebase/firestore";
import { db } from "../config/firebase";
import { COLLECTION_NAMES } from "../constants/collectionNames";
import { REPORT_STATUS } from "../constants/status";

const textValue = (value) => String(value ?? "").trim();

const firstTextValue = (...values) =>
  values.map(textValue).find(Boolean) || "";

const toDate = (value) => {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate();
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

  const dateOnlyMatch = textValue(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnlyMatch) {
    return new Date(
      Number(dateOnlyMatch[1]),
      Number(dateOnlyMatch[2]) - 1,
      Number(dateOnlyMatch[3])
    );
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const isSubmittedFireDrill = (drill = {}) => {
  const statuses = [
    drill.status,
    drill.performanceStatus,
    drill.reportStatus
  ].map((value) => textValue(value).toLowerCase());

  return (
    statuses.some((status) =>
      ["completed", "conducted", "done", "submitted", "approved"].includes(status)
    ) ||
    Boolean(drill.completedAt || drill.actualDate || drill.conductedDate)
  );
};

export const buildFireDrillAuditRecord = (id, data = {}) => {
  const reportDate = toDate(
    data.actualDate || data.conductedDate || data.completedAt || data.drillDate
  );
  const storedDateLabel = firstTextValue(
    data.actualDate,
    data.conductedDate,
    data.drillDate
  );
  const buildingName = textValue(data.buildingName) || "Building";
  const reportDateLabel =
    storedDateLabel ||
    (reportDate
      ? [
          reportDate.getFullYear(),
          String(reportDate.getMonth() + 1).padStart(2, "0"),
          String(reportDate.getDate()).padStart(2, "0")
        ].join("-")
      : "Date unavailable");
  const reportMonth = reportDate ? reportDate.getMonth() + 1 : null;
  const reportYear = reportDate ? reportDate.getFullYear() : null;

  return {
    id: `fire-drill-${id}`,
    reportId: `FDR-${id}`,
    reportType: "FireDrill",
    fireDrillId: id,
    buildingId: textValue(data.buildingId),
    buildingName,
    generatedBy: textValue(data.fsmId || data.generatedBy),
    generatedDate:
      data.actualDate ||
      data.conductedDate ||
      data.completedAt ||
      data.drillDate ||
      "",
    reportTitle: `Fire Drill Audit - ${buildingName} - ${reportDateLabel}`,
    period: reportDate
      ? reportDate.toLocaleString("en", { month: "long", year: "numeric" })
      : "",
    reportMonth,
    reportYear,
    drillDate: textValue(data.drillDate),
    actualDate: textValue(data.actualDate || data.conductedDate),
    actualTime: textValue(data.actualTime),
    drillType: textValue(data.drillType || data.evacuationType),
    scheduledParticipants: textValue(data.scheduledParticipants),
    actualParticipants: firstTextValue(
      data.actualParticipants,
      data.participantsAttended,
      data.attendanceCount,
      data.participants
    ),
    alarmToEvacuationTime: textValue(data.alarmToEvacuationTime),
    totalEvacuationTime: textValue(data.totalEvacuationTime || data.evacuationTime),
    observations: textValue(data.observations),
    followUpIssues: textValue(data.followUpIssues || data.issueFound),
    photoUrls: Array.isArray(data.photoUrls) ? data.photoUrls : [],
    priority: "Normal",
    status: REPORT_STATUS.SUBMITTED,
    reportStatus: REPORT_STATUS.SUBMITTED
  };
};

const buildFireDrillPayload = (data) => ({
  buildingId: textValue(data.buildingId),
  buildingName: textValue(data.buildingName),
  fsmId: textValue(data.fsmId),
  drillDate: textValue(data.drillDate),
  drillTime: textValue(data.drillTime),
  drillEndTime: textValue(data.drillEndTime),
  evacuationType: textValue(data.evacuationType),
  customEvacuationType: textValue(data.customEvacuationType),
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
  ,
  // Customer comments / feedback
  customerComments: textValue(data.customerComments)
});

export const createFireDrill = async (data) => {
  return addDoc(collection(db, COLLECTION_NAMES.FIRE_DRILLS), {
    ...buildFireDrillPayload(data),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
};

export const getAllFireDrills = async () => {
  const snapshot = await getDocs(collection(db, COLLECTION_NAMES.FIRE_DRILLS));
  return snapshot.docs.map((docItem) => ({ id: docItem.id, ...docItem.data() }));
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
  const actualParticipants = firstTextValue(
    data.actualParticipants,
    data.participantsAttended,
    data.attendanceCount,
    data.participants
  );
  const scheduledParticipants = firstTextValue(
    data.scheduledParticipants,
    data.plannedParticipants
  );

  const completedDrill = {
    status: "Completed",
    performanceStatus: textValue(data.performanceStatus) || "Completed",
    reportStatus: REPORT_STATUS.SUBMITTED,
    actualDate: textValue(data.actualDate),
    actualTime: textValue(data.actualTime),
    conductedDate: textValue(data.actualDate),
    participants: actualParticipants || textValue(data.participants),
    actualParticipants,
    participantsAttended: actualParticipants,
    attendanceCount: actualParticipants ? Number(actualParticipants) : null,
    scheduledParticipants,
    plannedParticipants: scheduledParticipants,
    alarmToEvacuationTime: textValue(data.alarmToEvacuationTime),
    totalEvacuationTime: textValue(data.totalEvacuationTime),
    evacuationTime: textValue(data.totalEvacuationTime),
    observations: textValue(data.observations),
    issueFound: textValue(data.issueFound),
    followUpIssues: textValue(data.followUpIssues),
    recommendations: textValue(data.recommendations),
    photos: Array.isArray(data.photos) ? data.photos : [],
    photoUrls: Array.isArray(data.photoUrls) ? data.photoUrls : [],
    submittedAt: serverTimestamp(),
    completedAt: serverTimestamp()
  };
  const auditRecord = buildFireDrillAuditRecord(id, {
    ...data,
    ...completedDrill
  });
  const timestamp = serverTimestamp();
  const batch = writeBatch(db);

  batch.update(doc(db, COLLECTION_NAMES.FIRE_DRILLS, id), {
    ...completedDrill,
    updatedAt: timestamp
  });
  batch.set(
    doc(db, COLLECTION_NAMES.REPORTS, auditRecord.id),
    {
      ...auditRecord,
      createdAt: timestamp,
      updatedAt: timestamp
    },
    { merge: true }
  );

  await batch.commit();
  return { id, ...completedDrill, auditRecord };
};
