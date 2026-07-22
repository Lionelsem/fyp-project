import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAuthContext } from "../../context/AuthContext";
import styles from "./Feedbacks.module.css";
import Modal from "../../components/common/Modal";
import {
  listenToCustomerFeedbackThreads,
  listenToFeedbackThreadReplies,
  addFeedbackReply,
  markFeedbackMessagesAsRead,
  createCustomerFeedbackThread,
  updateFeedbackReply,
  deleteFeedbackReply,
  deleteCustomerFeedbackThread
} from "../../services/feedbackService";

const formatTimestamp = (timestamp) => {
  if (!timestamp) return "";
  const date = typeof timestamp.toDate === "function" ? timestamp.toDate() : timestamp;
  if (!(date instanceof Date)) return String(timestamp);
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  });
};

const Feedbacks = () => {
  const { user } = useAuthContext();
  const [threads, setThreads] = useState([]);
  const [selectedThreadId, setSelectedThreadId] = useState(null);
  const [selectedThreadReplies, setSelectedThreadReplies] = useState([]);
  const [replyText, setReplyText] = useState("");
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);
  const [showEditReplyModal, setShowEditReplyModal] = useState(false);
  const [editingReply, setEditingReply] = useState(null);
  const [editedReplyText, setEditedReplyText] = useState("");
  const [newThreadRecipient, setNewThreadRecipient] = useState("");
  const [newThreadSubject, setNewThreadSubject] = useState("");
  const [newThreadBody, setNewThreadBody] = useState("");
  const messagesThreadRef = useRef(null);

  const selectedThread = useMemo(
    () => threads.find((thread) => thread.id === selectedThreadId) || null,
    [threads, selectedThreadId]
  );

  useEffect(() => {
    if (!user?.uid) return undefined;

    const unsubscribe = listenToCustomerFeedbackThreads(
      user.uid,
      (snapshot) => {
        const nextThreads = snapshot.docs.map((docItem) => {
          const data = docItem.data();
          return {
            id: docItem.id,
            title: data.title || "New conversation",
            recipient: data.recipient || "",
            issueId: data.issueId || "",
            building: data.building || "",
            lastMessageAt: data.lastMessageAt,
            createdAt: data.createdAt,
            ...data
          };
        });

        setThreads(nextThreads);
      },
      (error) => {
        console.error("Failed to load chat threads:", error);
      }
    );

    return unsubscribe;
  }, [user?.uid]);

  useEffect(() => {
    if (!selectedThreadId) {
      setSelectedThreadReplies([]);
      return undefined;
    }

    const unsubscribe = listenToFeedbackThreadReplies(
      selectedThreadId,
      (snapshot) => {
        const nextReplies = snapshot.docs.map((docItem) => {
          const data = docItem.data();
          return {
            id: docItem.id,
            sender: data.senderName || data.sender || "Unknown",
            role: data.role || "Customer",
            message: data.message,
            createdBy: data.createdBy,
            readBy: Array.isArray(data.readBy) ? data.readBy : [],
            isOwn: data.createdBy === user?.uid,
            time: formatTimestamp(data.createdAt)
          };
        });
        setSelectedThreadReplies(nextReplies);
        markFeedbackMessagesAsRead(selectedThreadId, snapshot.docs, user?.uid).catch((error) => {
          console.error("Failed to mark customer feedback as read:", error);
        });
      },
      (error) => {
        console.error("Failed to load chat replies:", error);
      }
    );

    return unsubscribe;
  }, [selectedThreadId, user?.uid]);

  useEffect(() => {
    if (!selectedThreadId && threads.length > 0) {
      setSelectedThreadId(threads[0].id);
    }
  }, [selectedThreadId, threads]);

  const handleDeleteThread = async (threadId) => {
    if (!threadId) return;
    const confirmed = window.confirm("Delete this conversation and all messages?");
    if (!confirmed) return;

    try {
      await deleteCustomerFeedbackThread(threadId);
      if (selectedThreadId === threadId) {
        setSelectedThreadId(null);
      }
    } catch (error) {
      console.error("Failed to delete thread:", error);
      alert("Unable to delete conversation. Please try again.");
    }
  };

  useEffect(() => {
    if (!messagesThreadRef.current) return;
    messagesThreadRef.current.scrollTop = messagesThreadRef.current.scrollHeight;
  }, [selectedThreadReplies]);

  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedThreadId || !user?.uid) return;

    try {
      await addFeedbackReply(selectedThreadId, {
        senderName: user.fullName || user.email || "You",
        role: "Customer",
        createdBy: user.uid,
        message: replyText.trim()
      });
      setReplyText("");
    } catch (error) {
      console.error("Failed to send reply:", error);
      alert("Unable to send message. Please try again.");
    }
  };

  const handleEditReply = (reply) => {
    setEditingReply(reply);
    setEditedReplyText(reply.message);
    setShowEditReplyModal(true);
  };

  const handleSaveEditedReply = async () => {
    if (!selectedThreadId || !editingReply || !editedReplyText.trim()) return;

    try {
      await updateFeedbackReply(selectedThreadId, editingReply.id, {
        message: editedReplyText.trim()
      });
      setShowEditReplyModal(false);
      setEditingReply(null);
      setEditedReplyText("");
    } catch (error) {
      console.error("Failed to save edited reply:", error);
      alert("Unable to update message. Please try again.");
    }
  };

  const handleDeleteReply = async (replyId) => {
    if (!selectedThreadId) return;

    const confirmed = window.confirm("Delete this message?");
    if (!confirmed) return;

    try {
      await deleteFeedbackReply(selectedThreadId, replyId);
    } catch (error) {
      console.error("Failed to delete reply:", error);
      alert("Unable to delete message. Please try again.");
    }
  };

  const handleCreateThread = async (event) => {
    event.preventDefault();
    if (!newThreadSubject.trim() || !newThreadBody.trim() || !user?.uid) return;

    try {
      const assignedFsmId = newThreadRecipient.trim() || user.assignedFsmId || "";
      const threadRef = await createCustomerFeedbackThread({
        customerId: user.uid,
        customerName: user.fullName || user.displayName || user.email || "Customer",
        title: newThreadSubject.trim(),
        recipient: newThreadRecipient.trim() || "Assigned FSM",
        assignedFsmId,
        issueId: "",
        building: "",
        participants: [user.uid, assignedFsmId].filter(Boolean),
        createdBy: user.uid
      });

      await addFeedbackReply(threadRef.id, {
        senderName: user.fullName || user.email || "You",
        role: "Customer",
        createdBy: user.uid,
        message: newThreadBody.trim()
      });

      setShowNewMessageModal(false);
      setNewThreadRecipient("");
      setNewThreadSubject("");
      setNewThreadBody("");
      setSelectedThreadId(threadRef.id);
    } catch (error) {
      console.error("Failed to create new thread:", error);
      alert("Unable to create new conversation. Please try again.");
    }
  };

  return (
    <div className={styles.feedbacksContainer}>
      <header className={styles.header}>
        <div className={styles.headerCopy}>
          <h1>Comments &amp; Feedback</h1>
          <p>Communicate with your assigned FSM or request clarifications on reports.</p>
        </div>
        <button
          type="button"
          className={styles.newMessageButton}
          onClick={() => {
            setNewThreadRecipient("John Smith (FSM)");
            setShowNewMessageModal(true);
          }}
        >
          <span aria-hidden="true">+</span> New Message
        </button>
      </header>

      <div className={styles.contentWrapper}>
        <div className={styles.messagesPanel}>
          <div className={styles.searchBox}>
            <label className={styles.visuallyHidden} htmlFor="feedback-search">
              Search conversations
            </label>
            <input
              id="feedback-search"
              type="search"
              placeholder="Search messages..."
              aria-label="Search messages"
            />
          </div>

          <div className={styles.messagesList}>
              {threads.length === 0 ? (
              <div className={styles.emptyState}>
                <p>No conversations yet. Start a new message.</p>
              </div>
            ) : (
              threads.map((thread) => (
                <div
                  key={thread.id}
                  role="button"
                  tabIndex={0}
                  className={`${styles.messageItem} ${
                    selectedThreadId === thread.id ? styles.active : ""
                  }`}
                  onClick={() => setSelectedThreadId(thread.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedThreadId(thread.id);
                    }
                  }}
                  aria-pressed={selectedThreadId === thread.id}
                >
                  <span className={styles.messageTitle}>{thread.title}</span>
                  {thread.issueId && <span className={styles.issueId}>{thread.issueId}</span>}
                  {thread.building && <span className={styles.building}>{thread.building}</span>}
                  <span className={styles.timestamp}>{formatTimestamp(thread.lastMessageAt || thread.createdAt)}</span>
                  <button
                    type="button"
                    className={styles.deleteThreadButton}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteThread(thread.id);
                    }}
                    aria-label={`Delete conversation ${thread.title}`}
                  >
                    Delete
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className={styles.conversationPanel}>
          {selectedThread ? (
            <>
              <div className={styles.conversationHeader}>
                <h2>{selectedThread.title}</h2>
                <button
                  type="button"
                  className={styles.headerDeleteButton}
                  onClick={() => handleDeleteThread(selectedThread.id)}
                  aria-label={`Delete conversation ${selectedThread.title}`}
                >
                  Delete
                </button>
                {selectedThread.building && (
                  <p className={styles.buildingInfo}>{selectedThread.building}</p>
                )}
              </div>

              <div className={styles.messagesThread} aria-live="polite" ref={messagesThreadRef}>
                {selectedThreadReplies.length === 0 ? (
                  <div className={styles.emptyState}>
                    <p>Write the first reply to start the conversation.</p>
                  </div>
                ) : (
                  selectedThreadReplies.map((reply) => (
                    <div
                      key={reply.id}
                      className={`${styles.message} ${
                        reply.isOwn ? styles.ownMessage : styles.otherMessage
                      }`}
                    >
                      <div className={styles.messageContent}>
                        <div className={styles.senderInfo}>
                          <div className={styles.senderIdentity}>
                            <strong>{reply.sender}</strong>
                            <span className={styles.time}>{reply.time}</span>
                          </div>
                          {reply.isOwn && (
                            <div className={styles.messageActions}>
                              <button
                                type="button"
                                className={styles.messageActionButton}
                                onClick={() => handleEditReply(reply)}
                                aria-label={`Edit message from ${reply.sender}`}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className={styles.messageActionButton}
                                onClick={() => handleDeleteReply(reply.id)}
                                aria-label={`Delete message from ${reply.sender}`}
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
                  ))
                )}
              </div>

              <div className={styles.inputArea}>
                <textarea
                  placeholder="Type your message..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && e.ctrlKey) {
                      e.preventDefault();
                      handleSendReply();
                    }
                  }}
                  aria-label="Reply message"
                />
                <button
                  type="button"
                  className={styles.sendButton}
                  onClick={handleSendReply}
                  disabled={!replyText.trim()}
                >
                  Send
                </button>
              </div>
            </>
          ) : (
            <div className={styles.emptyState}>
              <p>Select a conversation to view the chat.</p>
            </div>
          )}
        </div>
      </div>

      {showNewMessageModal && (
        <Modal
          title="New Message"
          onClose={() => setShowNewMessageModal(false)}
          className={styles.feedbackModal}
          bodyClassName={styles.feedbackModalBody}
        >
          <div className={styles.modalContent}>
            <form onSubmit={handleCreateThread}>
              <div className={styles.formGroup}>
                <label htmlFor="new-message-recipient">Recipient</label>
                <input
                  id="new-message-recipient"
                  type="text"
                  placeholder="Assigned FSM or team name"
                  value={newThreadRecipient}
                  onChange={(e) => setNewThreadRecipient(e.target.value)}
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="new-message-subject">Subject</label>
                <input
                  id="new-message-subject"
                  type="text"
                  placeholder="Enter subject..."
                  value={newThreadSubject}
                  onChange={(e) => setNewThreadSubject(e.target.value)}
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="new-message-body">Message</label>
                <textarea
                  id="new-message-body"
                  placeholder="Enter your message..."
                  value={newThreadBody}
                  onChange={(e) => setNewThreadBody(e.target.value)}
                />
              </div>
              <div className={styles.modalActions}>
                <button
                  type="button"
                  onClick={() => setShowNewMessageModal(false)}
                  className={styles.cancelButton}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={styles.submitButton}
                  disabled={!newThreadSubject.trim() || !newThreadBody.trim()}
                >
                  Send Message
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {showEditReplyModal && editingReply && (
        <Modal
          title="Edit Message"
          onClose={() => {
            setShowEditReplyModal(false);
            setEditingReply(null);
            setEditedReplyText("");
          }}
          className={styles.feedbackModal}
          bodyClassName={styles.feedbackModalBody}
        >
          <div className={styles.modalContent}>
            <div className={styles.formGroup}>
              <label htmlFor="edit-reply-text">Message</label>
              <textarea
                id="edit-reply-text"
                value={editedReplyText}
                onChange={(event) => setEditedReplyText(event.target.value)}
                placeholder="Enter your message..."
              />
            </div>
            <div className={styles.modalActions}>
              <button
                type="button"
                onClick={() => {
                  setShowEditReplyModal(false);
                  setEditingReply(null);
                  setEditedReplyText("");
                }}
                className={styles.cancelButton}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.submitButton}
                onClick={handleSaveEditedReply}
                disabled={!editedReplyText.trim()}
              >
                Save Changes
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Feedbacks;
