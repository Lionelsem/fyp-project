import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAuthContext } from "../../context/AuthContext";
import Modal from "../../components/common/Modal";
import styles from "../customer/Feedbacks.module.css";
import {
  addFeedbackReply,
  deleteFeedbackReply,
  listenToFeedbackThreadReplies,
  listenToFsmFeedbackThreads,
  markFeedbackMessagesAsRead,
  updateFeedbackReply
} from "../../services/feedbackService";

const toDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value.toDate === "function") return value.toDate();
  if (typeof value.seconds === "number") return new Date(value.seconds * 1000);
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatTimestamp = (value) => {
  const date = toDate(value);
  if (!date) return "";
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  });
};

const getFsmLookupIds = (user) => Array.from(new Set([
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

const Feedbacks = () => {
  const { user } = useAuthContext();
  const [threads, setThreads] = useState([]);
  const [selectedThreadId, setSelectedThreadId] = useState(null);
  const [replies, setReplies] = useState([]);
  const [replyText, setReplyText] = useState("");
  const [searchText, setSearchText] = useState("");
  const [mobileViewingThread, setMobileViewingThread] = useState(false);
  const [editingReply, setEditingReply] = useState(null);
  const [editedReplyText, setEditedReplyText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const messagesThreadRef = useRef(null);
  const fsmIds = useMemo(() => getFsmLookupIds(user), [user]);
  const fsmIdsKey = JSON.stringify(fsmIds);

  const filteredThreads = useMemo(() => {
    const search = searchText.trim().toLowerCase();
    if (!search) return threads;
    return threads.filter((thread) => [
      thread.title,
      thread.customerName,
      thread.building,
      thread.issueId
    ].some((value) => String(value || "").toLowerCase().includes(search)));
  }, [searchText, threads]);

  const selectedThread = useMemo(
    () => threads.find((thread) => thread.id === selectedThreadId) || null,
    [selectedThreadId, threads]
  );

  useEffect(() => {
    const lookupIds = JSON.parse(fsmIdsKey);
    if (lookupIds.length === 0) {
      setThreads([]);
      setIsLoading(false);
      return undefined;
    }

    setIsLoading(true);
    return listenToFsmFeedbackThreads(
      lookupIds,
      (snapshot) => {
        const nextThreads = snapshot.docs
          .map((docItem) => ({ ...docItem.data(), id: docItem.id }))
          .sort((first, second) => {
            const firstTime = toDate(first.lastMessageAt || first.createdAt)?.getTime() || 0;
            const secondTime = toDate(second.lastMessageAt || second.createdAt)?.getTime() || 0;
            return secondTime - firstTime;
          });
        setThreads(nextThreads);
        setError("");
        setIsLoading(false);
      },
      (listenError) => {
        console.error("Failed to load FSM feedback threads:", listenError);
        setError("Unable to load customer conversations.");
        setIsLoading(false);
      }
    );
  }, [fsmIdsKey]);

  useEffect(() => {
    if (threads.length === 0) {
      setSelectedThreadId(null);
      return;
    }
    if (!threads.some((thread) => thread.id === selectedThreadId)) {
      setSelectedThreadId(threads[0].id);
    }
  }, [selectedThreadId, threads]);

  useEffect(() => {
    if (!selectedThreadId) {
      setReplies([]);
      return undefined;
    }

    const replyAuthorIds = JSON.parse(fsmIdsKey);
    setReplies([]);
    return listenToFeedbackThreadReplies(
      selectedThreadId,
      (snapshot) => {
        setReplies(snapshot.docs.map((docItem) => {
          const data = docItem.data();
          return {
            ...data,
            id: docItem.id,
            isOwn: replyAuthorIds.includes(String(data.createdBy || ""))
          };
        }));
        markFeedbackMessagesAsRead(selectedThreadId, snapshot.docs, user?.uid).catch((error) => {
          console.error("Failed to mark FSM feedback as read:", error);
        });
        setError("");
      },
      (listenError) => {
        console.error("Failed to load feedback replies:", listenError);
        setError("Unable to load this conversation.");
      }
    );
  }, [fsmIdsKey, selectedThreadId, user?.uid]);

  useEffect(() => {
    if (!messagesThreadRef.current) return;
    messagesThreadRef.current.scrollTop = messagesThreadRef.current.scrollHeight;
  }, [replies]);

  const handleSendReply = async () => {
    const message = replyText.trim();
    if (!message || !selectedThreadId || !user?.uid || isSending) return;

    setIsSending(true);
    try {
      await addFeedbackReply(selectedThreadId, {
        senderName: user.fullName || user.displayName || user.email || "FSM",
        role: "FSM",
        createdBy: user.uid,
        message
      });
      setReplyText("");
      setError("");
    } catch (sendError) {
      console.error("Failed to send FSM feedback reply:", sendError);
      setError("Your reply could not be sent. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  const closeEditReply = () => {
    setEditingReply(null);
    setEditedReplyText("");
  };

  const handleEditReply = (reply) => {
    setEditingReply(reply);
    setEditedReplyText(reply.message || "");
  };

  const handleSaveEditedReply = async () => {
    const message = editedReplyText.trim();
    if (!selectedThreadId || !editingReply?.id || !message || isSending) return;

    setIsSending(true);
    try {
      await updateFeedbackReply(selectedThreadId, editingReply.id, { message });
      closeEditReply();
      setError("");
    } catch (editError) {
      console.error("Failed to update FSM feedback reply:", editError);
      setError("Your message could not be updated. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteReply = async (replyId) => {
    if (!selectedThreadId || !replyId || !window.confirm("Delete this message?")) return;

    try {
      await deleteFeedbackReply(selectedThreadId, replyId);
      setError("");
    } catch (deleteError) {
      console.error("Failed to delete FSM feedback reply:", deleteError);
      setError("Your message could not be deleted. Please try again.");
    }
  };

  return (
    <div className={styles.feedbacksContainer}>
      <header className={styles.header}>
        <div className={styles.headerCopy}>
          <h1>Comments &amp; Feedback</h1>
          <p>Read and reply to live messages from your assigned customers.</p>
        </div>
      </header>

      {error && <div className="error-state" role="alert">{error}</div>}

      <div
        className={`${styles.contentWrapper} ${
          mobileViewingThread ? styles.mobileConversationVisible : styles.mobileListVisible
        }`}
      >
        <div className={styles.messagesPanel}>
          <div className={styles.searchBox}>
            <label className={styles.visuallyHidden} htmlFor="fsm-feedback-search">
              Search customer conversations
            </label>
            <input
              id="fsm-feedback-search"
              type="search"
              placeholder="Search messages..."
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
            />
          </div>

          <div className={styles.messagesList}>
            {isLoading ? (
              <div className={styles.emptyState}><p>Loading conversations...</p></div>
            ) : filteredThreads.length === 0 ? (
              <div className={styles.emptyState}>
                <p>{threads.length === 0 ? "No customer feedback yet." : "No matching conversations."}</p>
              </div>
            ) : filteredThreads.map((thread) => (
              <button
                type="button"
                key={thread.id}
                className={`${styles.messageItem} ${selectedThreadId === thread.id ? styles.active : ""}`}
                onClick={() => {
                  setSelectedThreadId(thread.id);
                  setMobileViewingThread(true);
                }}
                aria-pressed={selectedThreadId === thread.id}
              >
                <span className={styles.messageTitle}>{thread.title || "Customer feedback"}</span>
                {thread.customerName && <span className={styles.issueId}>{thread.customerName}</span>}
                {thread.building && <span className={styles.building}>{thread.building}</span>}
                <span className={styles.timestamp}>{formatTimestamp(thread.lastMessageAt || thread.createdAt)}</span>
              </button>
            ))}
          </div>
        </div>

        <div className={styles.conversationPanel}>
          {selectedThread ? (
            <>
              <div className={styles.conversationHeader}>
                <div className={styles.conversationHeaderInfo}>
                  <button
                    type="button"
                    className={styles.mobileBackButton}
                    onClick={() => setMobileViewingThread(false)}
                  >
                    ← Chats
                  </button>
                  <div>
                    <h2>{selectedThread.title || "Customer feedback"}</h2>
                    <p className={styles.buildingInfo}>
                      {[selectedThread.customerName, selectedThread.building].filter(Boolean).join(" · ") || "Customer conversation"}
                    </p>
                  </div>
                </div>
              </div>

              <div className={styles.messagesThread} aria-live="polite" ref={messagesThreadRef}>
                {replies.length === 0 ? (
                  <div className={styles.emptyState}><p>No messages in this conversation.</p></div>
                ) : replies.map((reply) => (
                  <div
                    key={reply.id}
                    className={`${styles.message} ${reply.isOwn ? styles.ownMessage : styles.otherMessage}`}
                  >
                    <div className={styles.messageContent}>
                      <div className={styles.senderInfo}>
                        <div className={styles.senderIdentity}>
                          <strong>{reply.senderName || reply.sender || "Customer"}</strong>
                          <span className={styles.time}>{formatTimestamp(reply.createdAt)}</span>
                        </div>
                        {reply.isOwn && (
                          <div className={styles.messageActions}>
                            <button
                              type="button"
                              className={styles.messageActionButton}
                              onClick={() => handleEditReply(reply)}
                              aria-label="Edit your message"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className={styles.messageActionButton}
                              onClick={() => handleDeleteReply(reply.id)}
                              aria-label="Delete your message"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                      <p className={styles.messageText}>{reply.message}</p>
                      {reply.isOwn && (
                        <span className={styles.readStatus}>
                          {(Array.isArray(reply.readBy) ? reply.readBy : [])
                            .some((readerId) => String(readerId) !== String(reply.createdBy || ""))
                            ? "Read"
                            : "Unread"}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className={styles.inputArea}>
                <textarea
                  placeholder="Reply to customer..."
                  value={replyText}
                  onChange={(event) => setReplyText(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
                      event.preventDefault();
                      handleSendReply();
                    }
                  }}
                  aria-label="Reply to customer"
                />
                <button
                  type="button"
                  className={styles.sendButton}
                  onClick={handleSendReply}
                  disabled={!replyText.trim() || isSending}
                >
                  {isSending ? "Sending..." : "Send"}
                </button>
              </div>
            </>
          ) : (
            <div className={styles.emptyState}>
              <p>Select a customer conversation to read and reply.</p>
            </div>
          )}
        </div>
      </div>

      {editingReply && (
        <Modal
          title="Edit Message"
          onClose={closeEditReply}
          className={styles.feedbackModal}
          bodyClassName={styles.feedbackModalBody}
        >
          <div className={styles.modalContent}>
            <div className={styles.formGroup}>
              <label htmlFor="fsm-edit-reply-text">Message</label>
              <textarea
                id="fsm-edit-reply-text"
                value={editedReplyText}
                onChange={(event) => setEditedReplyText(event.target.value)}
                placeholder="Enter your message..."
              />
            </div>
            <div className={styles.modalActions}>
              <button type="button" className={styles.cancelButton} onClick={closeEditReply}>
                Cancel
              </button>
              <button
                type="button"
                className={styles.submitButton}
                onClick={handleSaveEditedReply}
                disabled={!editedReplyText.trim() || isSending}
              >
                {isSending ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Feedbacks;
