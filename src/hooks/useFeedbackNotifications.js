import { useEffect, useMemo, useState } from "react";
import { ROLES } from "../constants/roles";
import {
  listenToCustomerFeedbackThreads,
  listenToFsmFeedbackThreads
} from "../services/feedbackService";

const toDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value.toDate === "function") return value.toDate();
  if (typeof value.seconds === "number") return new Date(value.seconds * 1000);
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getUserIds = (user) => Array.from(new Set([
  user?.uid,
  user?.authUid,
  user?.profileId,
  user?.id,
  user?.userId,
  user?.fsmId,
  user?.staffId,
  user?.employeeId,
  user?.accountId,
  user?.firestoreId,
  user?.fullName,
  user?.displayName
].filter(Boolean).map((value) => String(value).trim()).filter(Boolean)));

const formatNotificationTime = (value) => {
  const date = toDate(value);
  if (!date) return "Just now";
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  });
};

export const buildFeedbackNotifications = ({ threads = [], userIds = [], isFsm = false }) => {
  const currentUserIds = new Set(userIds.map(String));
  return threads.flatMap((thread) => {
    const senderId = String(thread.lastMessageSenderId || "");
    const readBy = new Set(
      (Array.isArray(thread.lastMessageReadBy) ? thread.lastMessageReadBy : [])
        .map(String)
    );
    const isOwnMessage = currentUserIds.has(senderId);
    const hasBeenRead = userIds.some((userId) => readBy.has(String(userId)));
    if (!senderId || isOwnMessage || hasBeenRead) return [];

    const senderName =
      thread.lastMessageSenderName ||
      (isFsm ? thread.customerName || "Customer" : thread.recipient || "FSM");
    const sortDate = toDate(thread.lastMessageAt);
    return [{
      id: `feedback-${thread.id}-${sortDate?.getTime() || "latest"}`,
      type: "chat",
      title: `New message from ${senderName}`,
      message: `${thread.title || "Comments & Feedback"}: ${thread.lastMessage || "New message"}`,
      time: formatNotificationTime(thread.lastMessageAt),
      isRead: false,
      dismissible: false,
      threadId: thread.id,
      sortDate: sortDate || new Date(0)
    }];
  })
    .sort((first, second) => second.sortDate.getTime() - first.sortDate.getTime())
    .map(({ sortDate, ...notification }) => notification);
};

export const useFeedbackNotifications = (user) => {
  const [threads, setThreads] = useState([]);
  const userIds = useMemo(() => getUserIds(user), [user]);
  const userIdsKey = JSON.stringify(userIds);
  const isFsm = user?.role === ROLES.FSM;

  useEffect(() => {
    const lookupIds = JSON.parse(userIdsKey);
    if (!user?.uid || lookupIds.length === 0) {
      setThreads([]);
      return undefined;
    }

    const handleUpdate = (snapshot) => {
      setThreads(snapshot.docs.map((docItem) => ({ ...docItem.data(), id: docItem.id })));
    };
    const handleError = (error) => {
      console.error("Failed to load feedback notifications:", error);
    };

    return isFsm
      ? listenToFsmFeedbackThreads(lookupIds, handleUpdate, handleError)
      : listenToCustomerFeedbackThreads(user.uid, handleUpdate, handleError);
  }, [isFsm, user?.uid, userIdsKey]);

  return useMemo(
    () => buildFeedbackNotifications({
      threads,
      userIds: JSON.parse(userIdsKey),
      isFsm
    }),
    [isFsm, threads, userIdsKey]
  );
};

export default useFeedbackNotifications;
