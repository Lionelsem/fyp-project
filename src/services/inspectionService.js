import * as fs from "./firestoreService";

// Create an inspection document (parent) and optional results
export const createInspection = async (data) => {
  // data should follow new inspection schema
  const docRef = await fs.createInspection(data);
  return { ...data, id: docRef.id };
};

export const addInspectionResult = async (data) => {
  const docRef = await fs.addInspectionResult(data);
  return { ...data, id: docRef.id };
};

export const upsertInspection = async (data) => {
  const docRef = await fs.upsertInspection(data);
  return { ...data, id: docRef.id };
};

export const upsertInspectionResult = async (data) => {
  const docRef = await fs.upsertInspectionResult(data);
  return { ...data, id: docRef.id };
};

export const getInspectionByAssignmentPeriodStatus = async (params) => {
  const snapshot = await fs.getInspectionByAssignmentPeriodStatus(params);
  const docSnap = snapshot.docs[0];
  return docSnap ? { ...docSnap.data(), id: docSnap.id } : null;
};

export const getInspectionByAssignmentPeriod = async (params) => {
  const snapshot = await fs.getInspectionByAssignmentPeriod(params);
  const docSnap = snapshot.docs[0];
  return docSnap ? { ...docSnap.data(), id: docSnap.id } : null;
};

export const getInspectionResultsByInspectionId = async (inspectionId) => {
  const snapshot = await fs.getInspectionResultsByInspectionId(inspectionId);
  return snapshot.docs.map((docSnap) => ({ ...docSnap.data(), id: docSnap.id }));
};

export const getInspectionResultsByInspectionKey = async (inspectionKey) => {
  const snapshot = await fs.getInspectionResultsByInspectionKey(inspectionKey);
  return snapshot.docs.map((docSnap) => ({ ...docSnap.data(), id: docSnap.id }));
};
