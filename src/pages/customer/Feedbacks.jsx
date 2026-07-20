import React, { useState } from "react";
import styles from "./Feedbacks.module.css";
import Modal from "../../components/common/Modal";

const Feedbacks = () => {
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [messages, setMessages] = useState([
    {
      id: 1,
      title: "Regarding Issue DEF-2026-088",
      issueId: "DEF-2026-088",
      building: "Basement 2",
      timestamp: "Sep 13, 2025",
      replies: [
        {
          id: 1,
          sender: "John Smith (FSM)",
          role: "FSM",
          time: "Sep 13, 10:30 AM",
          message:
            "I have informed the logistics contractor about this. They have committed to clearing the pallets by 4PM today.",
          isOwn: false,
        },
        {
          id: 2,
          sender: "You",
          role: "Customer",
          time: "Sep 13, 11:15 AM",
          message:
            "Thanks for the update. Please ensure the vendor completes the clearing as promised. Let me know if there are any delays.",
          isOwn: true,
        },
      ],
    },
    {
      id: 2,
      title: "Clarification on Aug Monthly Report",
      issueId: "ISSUE-001",
      timestamp: "Sep 12, 2025",
      replies: [
        {
          id: 1,
          sender: "Jane Smith (FSM)",
          role: "FSM",
          time: "Sep 12, 2:45 PM",
          message:
            "Hi, I wanted to clarify your question on point 4 in the August report. The so-called pump pressure is within normal...",
          isOwn: false,
        },
      ],
    },
    {
      id: 3,
      title: "Annual Report 2025 Acknowledgement",
      timestamp: "Sep 11, 2025",
      replies: [
        {
          id: 1,
          sender: "System",
          role: "System",
          time: "Sep 11, 3:08 AM",
          message:
            "Your digital acknowledgement for the 2025 Annual Fire Safety Report has been recorded",
          isOwn: false,
        },
      ],
    },
  ]);

  const [replyText, setReplyText] = useState("");
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);
  const [showEditReplyModal, setShowEditReplyModal] = useState(false);
  const [editingReply, setEditingReply] = useState(null);
  const [editedReplyText, setEditedReplyText] = useState("");

  const updateThreadReplies = (threadId, updater) => {
    setMessages((prevMessages) => {
      const nextMessages = prevMessages.map((message) => {
        if (message.id === threadId) {
          const nextReplies = updater(message.replies);
          return { ...message, replies: nextReplies };
        }
        return message;
      });

      const updatedThread = nextMessages.find((message) => message.id === threadId);
      if (selectedMessage?.id === threadId) {
        setSelectedMessage((currentMessage) =>
          currentMessage?.id === threadId
            ? { ...currentMessage, replies: updatedThread?.replies ?? [] }
            : currentMessage
        );
      }

      return nextMessages;
    });
  };

  const handleSendReply = () => {
    if (replyText.trim() && selectedMessage) {
      updateThreadReplies(selectedMessage.id, (replies) => [
        ...replies,
        {
          id: replies.length + 1,
          sender: "You",
          role: "Customer",
          time: new Date().toLocaleString(),
          message: replyText,
          isOwn: true,
        },
      ]);
      setReplyText("");
    }
  };

  const handleEditReply = (reply) => {
    setEditingReply(reply);
    setEditedReplyText(reply.message);
    setShowEditReplyModal(true);
  };

  const handleSaveEditedReply = () => {
    if (!selectedMessage || !editingReply || !editedReplyText.trim()) {
      return;
    }

    updateThreadReplies(selectedMessage.id, (replies) =>
      replies.map((reply) =>
        reply.id === editingReply.id ? { ...reply, message: editedReplyText.trim() } : reply
      )
    );

    setShowEditReplyModal(false);
    setEditingReply(null);
    setEditedReplyText("");
  };

  const handleDeleteReply = (replyId) => {
    if (!selectedMessage) {
      return;
    }

    const confirmed = window.confirm("Delete this message?");
    if (!confirmed) {
      return;
    }

    updateThreadReplies(selectedMessage.id, (replies) =>
      replies.filter((reply) => reply.id !== replyId)
    );
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
          onClick={() => setShowNewMessageModal(true)}
        >
          <span aria-hidden="true">+</span> New Message
        </button>
      </header>

      <div className={styles.contentWrapper}>
        {/* Messages List Panel */}
        <div className={styles.messagesPanel}>
          <div className={styles.searchBox}>
            <label className={styles.visuallyHidden} htmlFor="feedback-search">
              Search messages
            </label>
            <input
              id="feedback-search"
              type="search"
              placeholder="Search messages..."
            />
          </div>

          <div className={styles.messagesList}>
            {messages.map((msg) => (
              <button
                type="button"
                key={msg.id}
                className={`${styles.messageItem} ${
                  selectedMessage?.id === msg.id ? styles.active : ""
                }`}
                onClick={() => setSelectedMessage(msg)}
                aria-pressed={selectedMessage?.id === msg.id}
              >
                <span className={styles.messageTitle}>{msg.title}</span>
                {msg.issueId && <span className={styles.issueId}>{msg.issueId}</span>}
                {msg.building && <span className={styles.building}>{msg.building}</span>}
                <span className={styles.timestamp}>{msg.timestamp}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Conversation Panel */}
        <div className={styles.conversationPanel}>
          {selectedMessage ? (
            <>
              <div className={styles.conversationHeader}>
                <h2>{selectedMessage.title}</h2>
                {selectedMessage.building && (
                  <p className={styles.buildingInfo}>{selectedMessage.building}</p>
                )}
              </div>

              <div className={styles.messagesThread} aria-live="polite">
                {selectedMessage.replies.map((reply) => (
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
                    </div>
                  </div>
                ))}
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
              <p>Select a message to view the conversation</p>
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
            <form>
              <div className={styles.formGroup}>
                <label htmlFor="new-message-recipient">Recipient</label>
                <select id="new-message-recipient">
                  <option>Select FSM...</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="new-message-subject">Subject</label>
                <input
                  id="new-message-subject"
                  type="text"
                  placeholder="Enter subject..."
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="new-message-body">Message</label>
                <textarea
                  id="new-message-body"
                  placeholder="Enter your message..."
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
                <button type="submit" className={styles.submitButton}>
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
