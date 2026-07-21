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

  await updateDoc(doc(db, COLLECTION_NAMES.CUSTOMER_FEEDBACK_THREADS, threadId), {
    lastMessageAt: serverTimestamp()
  });

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
