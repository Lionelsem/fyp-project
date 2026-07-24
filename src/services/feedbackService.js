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
  getDoc,
  getDocs,
  arrayUnion,
  writeBatch,
  serverTimestamp
} from "firebase/firestore";
import { db } from "../config/firebase";
import { COLLECTION_NAMES } from "../constants/collectionNames";

const textValue = (value) => String(value || "").trim();

const getUserLookupIds = (user) => new Set([
  user?.uid,
  user?.authUid,
  user?.profileId,
  user?.id,
  user?.userId,
  user?.customerId,
  user?.accountId,
  user?.fullName,
  user?.displayName,
  user?.email
].map(textValue).filter(Boolean));

const getBuildingName = (building) =>
  textValue(
    building?.buildingName ||
    building?.building_name ||
    building?.name ||
    building?.buildingId ||
    building?.id
  );

const isCustomerBuilding = (building, customerIds, assignedBuildingIds) => {
  const customerFields = [
    building?.customerId,
    building?.customer,
    building?.customerName,
    building?.ownerId,
    building?.createdBy
  ].map(textValue).filter(Boolean);

  const buildingIds = [
    building?.id,
    building?.buildingId,
    building?.buildingName,
    building?.building_name,
    building?.name
  ].map(textValue).filter(Boolean);

  return (
    customerFields.some((value) => customerIds.has(value)) ||
    buildingIds.some((value) => assignedBuildingIds.has(value))
  );
};

export const getCustomerFeedbackRecipients = async (user) => {
  if (!user) return [];

  const customerIds = getUserLookupIds(user);
  const assignedBuildingIds = new Set(
    [
      user.assignedBuildingId,
      user.buildingId,
      user.assignedBuilding,
      user.building,
      ...(Array.isArray(user.assignedBuildingIds) ? user.assignedBuildingIds : []),
      ...(Array.isArray(user.buildingIds) ? user.buildingIds : [])
    ].map(textValue).filter(Boolean)
  );

  const buildingsSnapshot = await getDocs(collection(db, COLLECTION_NAMES.BUILDINGS));
  const linkedBuildings = buildingsSnapshot.docs
    .map((docItem) => ({ id: docItem.id, ...docItem.data() }))
    .filter((building) => isCustomerBuilding(building, customerIds, assignedBuildingIds));

  const assignments = linkedBuildings
    .map((building) => ({
      fsmId: textValue(building.assignedFsmId || building.fsmId),
      fallbackName: textValue(
        building.assignedFsmName || building.assignedFsm || "Assigned FSM"
      ),
      buildingId: textValue(building.id || building.buildingId),
      buildingName: getBuildingName(building)
    }))
    .filter((assignment) => assignment.fsmId);

  const profileFsmId = textValue(user.assignedFsmId || user.fsmId);
  if (profileFsmId && !assignments.some(({ fsmId }) => fsmId === profileFsmId)) {
    assignments.push({
      fsmId: profileFsmId,
      fallbackName: textValue(user.assignedFsmName || user.assignedFsm || "Assigned FSM"),
      buildingId: "",
      buildingName: ""
    });
  }

  const fsmProfiles = new Map();
  await Promise.all(
    Array.from(new Set(assignments.map(({ fsmId }) => fsmId))).map(async (fsmId) => {
      try {
        const snapshot = await getDoc(doc(db, COLLECTION_NAMES.USERS, fsmId));
        if (snapshot.exists()) {
          fsmProfiles.set(fsmId, snapshot.data());
        }
      } catch (error) {
        console.warn(`Could not load display details for assigned FSM ${fsmId}.`, error);
      }
    })
  );

  return assignments.map((assignment) => {
    const profile = fsmProfiles.get(assignment.fsmId);
    const fsmName = textValue(
      profile?.fullName ||
      profile?.displayName ||
      profile?.email ||
      assignment.fallbackName
    );

    return {
      ...assignment,
      fsmName,
      key: `${assignment.fsmId}::${assignment.buildingId || "profile"}`
    };
  });
};

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
    readBy: Array.from(new Set([
      ...(Array.isArray(reply.readBy) ? reply.readBy : []),
      reply.createdBy
    ].filter(Boolean))),
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

export const markFeedbackMessagesAsRead = async (threadId, messageDocs, readerId) => {
  if (!threadId || !readerId || !Array.isArray(messageDocs)) return;

  const unreadMessages = messageDocs.filter((docItem) => {
    const data = docItem.data();
    const readBy = Array.isArray(data.readBy) ? data.readBy.map(String) : [];
    return String(data.createdBy || "") !== String(readerId) && !readBy.includes(String(readerId));
  });

  for (let start = 0; start < unreadMessages.length; start += 500) {
    const batch = writeBatch(db);
    unreadMessages.slice(start, start + 500).forEach((docItem) => {
      const messageRef = doc(
        db,
        COLLECTION_NAMES.CUSTOMER_FEEDBACK_THREADS,
        threadId,
        COLLECTION_NAMES.CUSTOMER_FEEDBACK_MESSAGES,
        docItem.id
      );
      batch.update(messageRef, {
        readBy: arrayUnion(readerId),
        lastReadAt: serverTimestamp()
      });
    });
    await batch.commit();
  }
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

export const deleteCustomerFeedbackThread = async (threadId) => {
  if (!threadId) return;

  const messagesCollection = collection(
    db,
    COLLECTION_NAMES.CUSTOMER_FEEDBACK_THREADS,
    threadId,
    COLLECTION_NAMES.CUSTOMER_FEEDBACK_MESSAGES
  );

  const snapshot = await getDocs(messagesCollection);

  // Delete messages in batches of 500
  for (let start = 0; start < snapshot.docs.length; start += 500) {
    const batch = writeBatch(db);
    snapshot.docs.slice(start, start + 500).forEach((docItem) => {
      const messageRef = doc(
        db,
        COLLECTION_NAMES.CUSTOMER_FEEDBACK_THREADS,
        threadId,
        COLLECTION_NAMES.CUSTOMER_FEEDBACK_MESSAGES,
        docItem.id
      );
      batch.delete(messageRef);
    });
    await batch.commit();
  }

  // Delete the thread document itself
  const threadRef = doc(db, COLLECTION_NAMES.CUSTOMER_FEEDBACK_THREADS, threadId);
  await deleteDoc(threadRef);
};
