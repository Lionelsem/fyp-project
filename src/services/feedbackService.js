import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  arrayUnion,
  serverTimestamp
} from "firebase/firestore";
import { db } from "../config/firebase";
import { COLLECTION_NAMES } from "../constants/collectionNames";

export const listenToCustomerFeedbackThreads = (customerId, onUpdate, onError) => {
  const threadsQuery = query(
    collection(db, COLLECTION_NAMES.CUSTOMER_FEEDBACK_THREADS),
    where("customerId", "==", customerId),
    orderBy("lastMessageAt", "desc")
  );

  return onSnapshot(threadsQuery, onUpdate, onError);
};

export const listenToFsmFeedbackThreads = (fsmIds, onUpdate, onError) => {
  const normalizedIds = Array.from(
    new Set(
      (Array.isArray(fsmIds) ? fsmIds : [fsmIds])
        .filter((value) => value !== undefined && value !== null)
        .map((value) => String(value).trim())
        .filter(Boolean)
    )
  ).slice(0, 10);

  if (normalizedIds.length === 0) {
    onUpdate({ docs: [] });
    return () => {};
  }

  const snapshotsByField = new Map();
  const buildFilter = (fieldName) => normalizedIds.length === 1
    ? where(fieldName, "==", normalizedIds[0])
    : where(fieldName, "in", normalizedIds);

  const unsubscribes = ["assignedFsmId", "recipient"].map((fieldName) => {
    const threadsQuery = query(
      collection(db, COLLECTION_NAMES.CUSTOMER_FEEDBACK_THREADS),
      buildFilter(fieldName)
    );

    return onSnapshot(
      threadsQuery,
      (snapshot) => {
        snapshotsByField.set(fieldName, snapshot.docs);
        const mergedDocs = new Map();
        snapshotsByField.forEach((docs) => {
          docs.forEach((docItem) => mergedDocs.set(docItem.id, docItem));
        });
        onUpdate({ docs: Array.from(mergedDocs.values()) });
      },
      onError
    );
  });

  return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
};

export const listenToFeedbackThreadReplies = (threadId, onUpdate, onError) => {
  const repliesCollection = collection(
    db,
    COLLECTION_NAMES.CUSTOMER_FEEDBACK_THREADS,
    threadId,
    COLLECTION_NAMES.CUSTOMER_FEEDBACK_MESSAGES
  );

  const repliesQuery = query(repliesCollection, orderBy("createdAt", "asc"));
  return onSnapshot(repliesQuery, onUpdate, onError);
};

export const createCustomerFeedbackThread = async (payload) => {
  const threadRef = await addDoc(collection(db, COLLECTION_NAMES.CUSTOMER_FEEDBACK_THREADS), {
    ...payload,
    createdAt: serverTimestamp(),
    lastMessageAt: serverTimestamp()
  });
  return threadRef;
};

export const addFeedbackReply = async (threadId, reply) => {
  const messagesCollection = collection(
    db,
    COLLECTION_NAMES.CUSTOMER_FEEDBACK_THREADS,
    threadId,
    COLLECTION_NAMES.CUSTOMER_FEEDBACK_MESSAGES
  );

  const replyDoc = await addDoc(messagesCollection, {
    ...reply,
    createdAt: serverTimestamp()
  });

  const threadUpdate = { lastMessageAt: serverTimestamp() };
  if (reply.createdBy) {
    threadUpdate.participants = arrayUnion(reply.createdBy);
  }

  await updateDoc(
    doc(db, COLLECTION_NAMES.CUSTOMER_FEEDBACK_THREADS, threadId),
    threadUpdate
  );

  return replyDoc;
};

export const updateFeedbackReply = async (threadId, replyId, data) => {
  const replyDoc = doc(
    db,
    COLLECTION_NAMES.CUSTOMER_FEEDBACK_THREADS,
    threadId,
    COLLECTION_NAMES.CUSTOMER_FEEDBACK_MESSAGES,
    replyId
  );
  await updateDoc(replyDoc, {
    ...data,
    updatedAt: serverTimestamp()
  });
};

export const deleteFeedbackReply = async (threadId, replyId) => {
  const replyDoc = doc(
    db,
    COLLECTION_NAMES.CUSTOMER_FEEDBACK_THREADS,
    threadId,
    COLLECTION_NAMES.CUSTOMER_FEEDBACK_MESSAGES,
    replyId
  );
  await deleteDoc(replyDoc);
};
