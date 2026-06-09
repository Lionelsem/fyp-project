import * as fs from "./firestoreService";

// Create an inspection document (parent) and optional results
export const createInspection = async (data) => {
  // data should follow new inspection schema
  const docRef = await fs.createInspection(data);
  return { id: docRef.id, ...data };
};

export const addInspectionResult = async (data) => {
  const docRef = await fs.addInspectionResult(data);
  return { id: docRef.id, ...data };
};

export const upsertInspection = async (data) => {
  const docRef = await fs.upsertInspection(data);
  return { id: docRef.id, ...data };
};

export const upsertInspectionResult = async (data) => {
  const docRef = await fs.upsertInspectionResult(data);
  return { id: docRef.id, ...data };
};

export const getInspectionByAssignmentPeriodStatus = async (params) => {
  const snapshot = await fs.getInspectionByAssignmentPeriodStatus(params);
  const docSnap = snapshot.docs[0];
  return docSnap ? { id: docSnap.id, ...docSnap.data() } : null;
};

export const getInspectionByAssignmentPeriod = async (params) => {
  const snapshot = await fs.getInspectionByAssignmentPeriod(params);
  const docSnap = snapshot.docs[0];
  return docSnap ? { id: docSnap.id, ...docSnap.data() } : null;
};

export const getInspectionResultsByInspectionId = async (inspectionId) => {
  const snapshot = await fs.getInspectionResultsByInspectionId(inspectionId);
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
};

export const getInspectionResultsByInspectionKey = async (inspectionKey) => {
  const snapshot = await fs.getInspectionResultsByInspectionKey(inspectionKey);
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
};
