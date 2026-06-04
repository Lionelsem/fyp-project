import * as fs from "./firestoreService";

export const createReport = async (data) => {
  const docRef = await fs.addReport(data);
  return { id: docRef.id, ...data };
};
