import * as fs from "./firestoreService";

const mapSnapshot = (snapshot) =>
  snapshot.docs.map((docItem) => ({
    id: docItem.id,
    ...docItem.data()
  }));

export const createIssue = async (data) => {
  const docRef = await fs.addIssue(data);
  return { id: docRef.id, ...data };
};

export const upsertIssue = async (data) => {
  const docRef = await fs.upsertIssue(data);
  return { id: docRef.id, ...data };
};

export const addIssueComment = async (data) => {
  const docRef = await fs.addIssueComment(data);
  return { id: docRef.id, ...data };
};

export const getIssues = async () => {
  const snapshot = await fs.getIssues();
  return mapSnapshot(snapshot);
};

export const getIssue = async (id) => {
  const snapshot = await fs.getIssue(id);
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
};

export const archiveIssue = async (id, data) => {
  await fs.archiveIssue(id, data);
  return { id, archived: true, ...data };
};

export const addClosureVerification = async (data) => {
  const docRef = await fs.addClosureVerification(data);
  return { id: docRef.id, ...data };
};

export const getClosureVerifications = async () => {
  const snapshot = await fs.getClosureVerifications();
  return mapSnapshot(snapshot);
};
