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
