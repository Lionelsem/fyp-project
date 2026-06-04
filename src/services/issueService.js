import * as fs from "./firestoreService";

export const createIssue = async (data) => {
  const docRef = await fs.addIssue(data);
  return { id: docRef.id, ...data };
};

export const addIssueComment = async (data) => {
  const docRef = await fs.addIssueComment(data);
  return { id: docRef.id, ...data };
};
