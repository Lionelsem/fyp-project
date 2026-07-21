import { useEffect, useMemo, useState } from "react";
import { ROLES } from "../constants/roles";
import {
  listenToCustomerFeedbackThreads,
  listenToFeedbackThreadReplies,
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

export const useFeedbackNotifications = (user) => {
  const [threads, setThreads] = useState([]);
  const [notificationsByThread, setNotificationsByThread] = useState({});
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

  useEffect(() => {
    const currentUserIds = new Set(JSON.parse(userIdsKey));
    const activeThreadIds = new Set(threads.map((thread) => thread.id));
    setNotificationsByThread((current) => Object.fromEntries(
      Object.entries(current).filter(([threadId]) => activeThreadIds.has(threadId))
    ));

    const unsubscribes = threads.map((thread) => listenToFeedbackThreadReplies(
      thread.id,
      (snapshot) => {
        const unreadNotifications = snapshot.docs.flatMap((docItem) => {
          const message = docItem.data();
          const senderId = String(message.createdBy || "");
          const readBy = new Set((Array.isArray(message.readBy) ? message.readBy : []).map(String));
          const isOwnMessage = currentUserIds.has(senderId);
          const hasBeenRead = Array.from(currentUserIds).some((userId) => readBy.has(userId));
          if (isOwnMessage || hasBeenRead) return [];

          const createdAt = toDate(message.createdAt);
          const senderName = message.senderName || message.sender || (isFsm ? "Customer" : "FSM");
          return [{
            id: `feedback-${thread.id}-${docItem.id}`,
            type: "chat",
            title: `New message from ${senderName}`,
            message: `${thread.title || "Comments & Feedback"}: ${message.message || "New message"}`,
            time: formatNotificationTime(message.createdAt),
            isRead: false,
            dismissible: false,
            threadId: thread.id,
            sortDate: createdAt || new Date(0)
          }];
        });

        setNotificationsByThread((current) => ({
          ...current,
          [thread.id]: unreadNotifications
        }));
      },
      (error) => console.error("Failed to load unread feedback messages:", error)
    ));

    return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
  }, [isFsm, threads, userIdsKey]);

  return useMemo(
    () => Object.values(notificationsByThread)
      .flat()
      .sort((first, second) => second.sortDate.getTime() - first.sortDate.getTime())
      .map(({ sortDate, ...notification }) => notification),
    [notificationsByThread]
  );
};

export default useFeedbackNotifications;
