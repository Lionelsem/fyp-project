import * as fs from "./firestoreService";
import { arrayUnion, collection, getDocs, orderBy, query, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../config/firebase";
import { COLLECTION_NAMES } from "../constants/collectionNames";

export const createReport = async (data) => {
  const docRef = await fs.addReport(data);
  return { id: docRef.id, ...data };
};

export const updateReport = async (id, data) => {
  return await updateDoc(doc(db, COLLECTION_NAMES.REPORTS, id), {
    ...data,
    updatedAt: serverTimestamp()
  });
};

export const addReportCustomerFeedback = async (id, feedback, customer = {}) => {
  const message = String(feedback || "").trim();
  if (!message) throw new Error("Feedback cannot be empty.");

  const entry = {
    message,
    submittedAt: new Date(),
    customerId: customer.uid || customer.authUid || "",
    customerName: customer.fullName || customer.name || customer.email || "Customer"
  };

  return updateDoc(doc(db, COLLECTION_NAMES.REPORTS, id), {
    customerComments: message,
    customerFeedbackStatus: "Submitted",
    customerFeedbackUpdatedAt: entry.submittedAt,
    customerFeedbackHistory: arrayUnion(entry),
    updatedAt: serverTimestamp()
  });
};

export const upsertReport = async (documentId, data) => {
  const docRef = await fs.upsertReport(documentId, data);
  return { id: docRef.id, ...data };
};

export const getAllReports = async () => {
  const snapshot = await getDocs(
    query(collection(db, COLLECTION_NAMES.REPORTS), orderBy("createdAt", "desc"))
  );
  return snapshot.docs.map((docItem) => ({ id: docItem.id, ...docItem.data() }));
};

export const getAllInspections = async () => {
  const snapshot = await getDocs(collection(db, COLLECTION_NAMES.INSPECTIONS));
  return snapshot.docs.map((docItem) => ({ id: docItem.id, ...docItem.data() }));
};

export const getAllInspectionResults = async () => {
  const snapshot = await getDocs(collection(db, COLLECTION_NAMES.INSPECTION_RESULTS));
  return snapshot.docs.map((docItem) => ({ id: docItem.id, ...docItem.data() }));
};
