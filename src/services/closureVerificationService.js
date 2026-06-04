import * as fs from "./firestoreService";

export const verifyClosure = async (data) => {
  const docRef = await fs.addClosureVerification(data);
  return { id: docRef.id, ...data };
};
