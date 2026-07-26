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
  deleteCustomerFeedbackThread,
  getCustomerFeedbackRecipients
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

const createClientMessageId = (userId) =>
  `${userId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const Feedbacks = () => {
  const { user } = useAuthContext();
  const [threads, setThreads] = useState([]);
  const [selectedThreadId, setSelectedThreadId] = useState(null);
  const [selectedThreadReplies, setSelectedThreadReplies] = useState([]);
  const [pendingReplies, setPendingReplies] = useState([]);
  const [replyText, setReplyText] = useState("");
  const [searchText, setSearchText] = useState("");
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);
  const [mobileViewingThread, setMobileViewingThread] = useState(false);
  const [showEditReplyModal, setShowEditReplyModal] = useState(false);
  const [editingReply, setEditingReply] = useState(null);
  const [editedReplyText, setEditedReplyText] = useState("");
  const [recipientOptions, setRecipientOptions] = useState([]);
  const [selectedRecipientKey, setSelectedRecipientKey] = useState("");
  const [isLoadingRecipients, setIsLoadingRecipients] = useState(false);
  const [recipientError, setRecipientError] = useState("");
  const [newThreadSubject, setNewThreadSubject] = useState("");
  const [newThreadBody, setNewThreadBody] = useState("");
  const [isLoadingThreads, setIsLoadingThreads] = useState(true);
  const [isLoadingReplies, setIsLoadingReplies] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isCreatingThread, setIsCreatingThread] = useState(false);
  const [feedbackError, setFeedbackError] = useState("");
  const messagesThreadRef = useRef(null);

  const selectedThread = useMemo(
    () => threads.find((thread) => thread.id === selectedThreadId) || null,
    [threads, selectedThreadId]
  );

  const selectedRecipient = useMemo(
    () => recipientOptions.find((recipient) => recipient.key === selectedRecipientKey) || null,
    [recipientOptions, selectedRecipientKey]
  );

  const filteredThreads = useMemo(() => {
    const search = searchText.trim().toLowerCase();
    if (!search) return threads;
    return threads.filter((thread) => [
      thread.title,
      thread.recipient,
      thread.issueId,
      thread.building,
      thread.lastMessage
    ].some((value) => String(value || "").toLowerCase().includes(search)));
  }, [searchText, threads]);

  const displayedReplies = useMemo(
    () => [...selectedThreadReplies, ...pendingReplies],
    [pendingReplies, selectedThreadReplies]
  );

  useEffect(() => {
    if (!user?.uid) {
      setIsLoadingThreads(false);
      return undefined;
    }

    setIsLoadingThreads(true);
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
        setFeedbackError("");
        setIsLoadingThreads(false);
      },
      (error) => {
        console.error("Failed to load chat threads:", error);
        setFeedbackError(
          error?.code === "failed-precondition"
            ? "Chat needs a Firestore index before conversations can load."
            : "Unable to load conversations. Please try again."
        );
        setIsLoadingThreads(false);
      }
    );

    return unsubscribe;
  }, [user?.uid]);

  useEffect(() => {
    if (!selectedThreadId) {
      setSelectedThreadReplies([]);
      setPendingReplies([]);
      setIsLoadingReplies(false);
      return undefined;
    }

    setSelectedThreadReplies([]);
    setPendingReplies([]);
    setIsLoadingReplies(true);
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
            clientId: data.clientId || "",
            time: formatTimestamp(data.createdAt)
          };
        });
        setSelectedThreadReplies(nextReplies);
        const savedClientIds = new Set(nextReplies.map((reply) => reply.clientId).filter(Boolean));
        setPendingReplies((current) =>
          current.filter((reply) => !savedClientIds.has(reply.clientId))
        );
        markFeedbackMessagesAsRead(selectedThreadId, snapshot.docs, user?.uid).catch((error) => {
          console.error("Failed to mark customer feedback as read:", error);
        });
        setFeedbackError("");
        setIsLoadingReplies(false);
      },
      (error) => {
        console.error("Failed to load chat replies:", error);
        setFeedbackError("Unable to load this conversation. Please try again.");
        setIsLoadingReplies(false);
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
  }, [displayedReplies]);

  const handleSendReply = async () => {
    const message = replyText.trim();
    if (!message || !selectedThreadId || !user?.uid || isSending) return;

    const clientId = createClientMessageId(user.uid);
    const pendingReply = {
      id: `pending-${clientId}`,
      clientId,
      sender: user.fullName || user.email || "You",
      role: "Customer",
      message,
      createdBy: user.uid,
      readBy: [user.uid],
      isOwn: true,
      isPending: true,
      time: "Sending..."
    };

    setReplyText("");
    setPendingReplies((current) => [...current, pendingReply]);
    setIsSending(true);
    try {
      await addFeedbackReply(selectedThreadId, {
        senderName: user.fullName || user.email || "You",
        role: "Customer",
        createdBy: user.uid,
        message,
        clientId
      });
      setFeedbackError("");
    } catch (error) {
      console.error("Failed to send reply:", error);
      setPendingReplies((current) => current.filter((reply) => reply.clientId !== clientId));
      setReplyText((current) => current || message);
      setFeedbackError("Unable to send your message. Please try again.");
    } finally {
      setIsSending(false);
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
    if (!newThreadSubject.trim() || !newThreadBody.trim() || !user?.uid || !selectedRecipient) {
      return;
    }

    setIsCreatingThread(true);
    try {
      const clientId = createClientMessageId(user.uid);
      const threadPayload = {
        customerId: user.uid,
        customerName: user.fullName || user.displayName || user.email || "Customer",
        title: newThreadSubject.trim(),
        recipient: selectedRecipient.fsmName,
        assignedFsmId: selectedRecipient.fsmId,
        issueId: "",
        buildingId: selectedRecipient.buildingId,
        building: selectedRecipient.buildingName,
        participants: [user.uid, selectedRecipient.fsmId],
        createdBy: user.uid
      };
      const initialReply = {
        senderName: user.fullName || user.email || "You",
        role: "Customer",
        createdBy: user.uid,
        message: newThreadBody.trim(),
        clientId
      };
      const threadRef = await createCustomerFeedbackThread(threadPayload, initialReply);

      setShowNewMessageModal(false);
      setRecipientOptions([]);
      setSelectedRecipientKey("");
      setRecipientError("");
      setNewThreadSubject("");
      setNewThreadBody("");
      setThreads((current) => [{
        id: threadRef.id,
        ...threadPayload,
        lastMessage: initialReply.message,
        lastMessageSenderId: initialReply.createdBy,
        lastMessageSenderName: initialReply.senderName,
        lastMessageReadBy: [initialReply.createdBy],
        lastMessageAt: new Date()
      }, ...current.filter((thread) => thread.id !== threadRef.id)]);
      setSelectedThreadId(threadRef.id);
      setFeedbackError("");
    } catch (error) {
      console.error("Failed to create new thread:", error);
      setFeedbackError("Unable to create the conversation. Please try again.");
    } finally {
      setIsCreatingThread(false);
    }
  };

  const handleOpenNewMessage = async () => {
    setShowNewMessageModal(true);
    setRecipientOptions([]);
    setSelectedRecipientKey("");
    setRecipientError("");
    setIsLoadingRecipients(true);

    try {
      const recipients = await getCustomerFeedbackRecipients(user);
      setRecipientOptions(recipients);
      setSelectedRecipientKey(recipients[0]?.key || "");
      if (recipients.length === 0) {
        setRecipientError(
          "No FSM is assigned to your account or building. Ask an administrator to complete the assignment."
        );
      }
    } catch (error) {
      console.error("Failed to load assigned FSM:", error);
      setRecipientError("Unable to load your assigned FSM. Please try again.");
    } finally {
      setIsLoadingRecipients(false);
    }
  };

  return (
    <div className={styles.feedbacksContainer}>
      <header className={styles.header}>
        <div className={styles.headerCopy}>
          <h1>Comments &amp; Feedback</h1>
          <p>Communicate with your assigned FSM or request clarifications on reports.</p>
        </div>
        <div className={styles.headerControls}>
          <button
            type="button"
            className={styles.newMessageButton}
            onClick={handleOpenNewMessage}
          >
            <span aria-hidden="true">+</span> New Message
          </button>
        </div>
      </header>

      {feedbackError && <div className="error-state" role="alert">{feedbackError}</div>}

      <div
        className={`${styles.contentWrapper} ${
          mobileViewingThread ? styles.mobileConversationVisible : styles.mobileListVisible
        }`}
      >
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
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
            />
          </div>

          <div className={styles.messagesList}>
            {isLoadingThreads ? (
              <div className={styles.emptyState}>
                <p>Loading conversations...</p>
              </div>
            ) : filteredThreads.length === 0 ? (
              <div className={styles.emptyState}>
                <p>
                  {threads.length === 0
                    ? "No conversations yet. Start a new message."
                    : "No matching conversations."}
                </p>
              </div>
            ) : (
              filteredThreads.map((thread) => (
                <div
                  key={thread.id}
                  role="button"
                  tabIndex={0}
                  className={`${styles.messageItem} ${
                    selectedThreadId === thread.id ? styles.active : ""
                  }`}
                  onClick={() => {
                    setSelectedThreadId(thread.id);
                    setMobileViewingThread(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedThreadId(thread.id);
                      setMobileViewingThread(true);
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
                <div className={styles.conversationHeaderInfo}>
                  <button
                    type="button"
                    className={styles.mobileBackButton}
                    onClick={() => setMobileViewingThread(false)}
                  >
                    ← Chats
                  </button>
                  <div>
                    <h2>{selectedThread.title}</h2>
                    {selectedThread.building && (
                      <p className={styles.buildingInfo}>{selectedThread.building}</p>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  className={styles.headerDeleteButton}
                  onClick={() => handleDeleteThread(selectedThread.id)}
                  aria-label={`Delete conversation ${selectedThread.title}`}
                >
                  Delete
                </button>
              </div>

              <div className={styles.messagesThread} aria-live="polite" ref={messagesThreadRef}>
                {isLoadingReplies ? (
                  <div className={styles.emptyState}>
                    <p>Loading messages...</p>
                  </div>
                ) : displayedReplies.length === 0 ? (
                  <div className={styles.emptyState}>
                    <p>Write the first reply to start the conversation.</p>
                  </div>
                ) : (
                  displayedReplies.map((reply) => (
                    <div
                      key={reply.id}
                      className={`${styles.message} ${
                        reply.isOwn ? styles.ownMessage : styles.otherMessage
                      } ${reply.isPending ? styles.pendingMessage : ""}`}
                    >
                      <div className={styles.messageContent}>
                        <div className={styles.senderInfo}>
                          <div className={styles.senderIdentity}>
                            <strong>{reply.sender}</strong>
                            <span className={styles.time}>{reply.time}</span>
                          </div>
                          {reply.isOwn && !reply.isPending && (
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
                            {reply.isPending
                              ? "Sending..."
                              : (Array.isArray(reply.readBy) ? reply.readBy : [])
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
                  disabled={!replyText.trim() || isSending}
                >
                  {isSending ? "Sending..." : "Send"}
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
                <select
                  id="new-message-recipient"
                  value={selectedRecipientKey}
                  onChange={(e) => setSelectedRecipientKey(e.target.value)}
                  disabled={isLoadingRecipients || recipientOptions.length === 0}
                >
                  <option value="">
                    {isLoadingRecipients ? "Loading assigned FSM..." : "Select assigned FSM"}
                  </option>
                  {recipientOptions.map((recipient) => (
                    <option key={recipient.key} value={recipient.key}>
                      {recipient.fsmName}
                      {recipient.buildingName ? ` — ${recipient.buildingName}` : ""}
                    </option>
                  ))}
                </select>
                {recipientError && <p role="alert">{recipientError}</p>}
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
                  disabled={
                    !selectedRecipient ||
                    !newThreadSubject.trim() ||
                    !newThreadBody.trim() ||
                    isLoadingRecipients ||
                    isCreatingThread
                  }
                >
                  {isCreatingThread ? "Sending..." : "Send Message"}
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
