import * as fs from "./firestoreService";

const mapSnapshot = (snapshot) =>
  snapshot.docs.map((docItem) => ({
    ...docItem.data(),
    id: docItem.id
  }));

export const createIssue = async (data) => {
  const docRef = await fs.addIssue(data);
  return { ...data, id: docRef.id };
};

export const upsertIssue = async (data) => {
  const docRef = await fs.upsertIssue(data);
  // eslint-disable-next-line no-console
  console.log("Saved issue doc", {
    docId: docRef.id,
    issueKey: data.issueKey,
    issueId: data.issueId,
    defectPhotoUrl: data.defectPhotoUrl || "",
    fixPhotoUrl: data.fixPhotoUrl || ""
  });
  return { ...data, id: docRef.id };
};

export const addIssueComment = async (data) => {
  const docRef = await fs.addIssueComment(data);
  return { ...data, id: docRef.id };
};

export const getIssues = async () => {
  const snapshot = await fs.getIssues();
  return mapSnapshot(snapshot);
};

export const getIssue = async (id) => {
  const snapshot = await fs.getIssue(id);
  if (!snapshot.exists()) return null;
  const issue = { ...snapshot.data(), id: snapshot.id };
  // eslint-disable-next-line no-console
  console.log("Loaded issue doc", {
    requestedId: id,
    docId: issue.id,
    issueKey: issue.issueKey,
    issueId: issue.issueId,
    defectPhotoUrl: issue.defectPhotoUrl || issue.issuePhotoUrl || "",
    fixPhotoUrl: issue.fixPhotoUrl || ""
  });
  return issue;
};

export const getIssueById = async (id) => {
  const snapshot = await fs.getIssueById(id);
  if (!snapshot.exists()) return null;
  const issue = { ...snapshot.data(), id: snapshot.id };
  // eslint-disable-next-line no-console
  console.log("Loaded issue doc by id", {
    requestedId: id,
    docId: issue.id,
    issueKey: issue.issueKey,
    issueId: issue.issueId,
    defectPhotoUrl: issue.defectPhotoUrl || issue.issuePhotoUrl || "",
    fixPhotoUrl: issue.fixPhotoUrl || ""
  });
  return issue;
};

export const updateIssue = async (id, data) => {
  await fs.updateIssue(id, data);
  return { ...data, id };
};

export const deleteIssue = async (id) => {
  await fs.deleteIssue(id);
  return { id };
};

export const addClosureVerification = async (data) => {
  const docRef = await fs.addClosureVerification(data);
  return { ...data, id: docRef.id };
};

export const getClosureVerifications = async () => {
  const snapshot = await fs.getClosureVerifications();
  return mapSnapshot(snapshot);
};
