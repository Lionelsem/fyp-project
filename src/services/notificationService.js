import * as fs from "./firestoreService";

export const sendNotification = async (data) => {
  const docRef = await fs.addNotification(data);
  return { id: docRef.id, ...data };
};
