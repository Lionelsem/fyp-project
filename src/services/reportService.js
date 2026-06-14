import * as fs from "./firestoreService";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "../config/firebase";
import { COLLECTION_NAMES } from "../constants/collectionNames";

export const createReport = async (data) => {
  const docRef = await fs.addReport(data);
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
