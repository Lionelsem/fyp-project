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

  const handleSendReply = () => {
    if (replyText.trim() && selectedMessage) {
      const updatedMessages = messages.map((msg) => {
        if (msg.id === selectedMessage.id) {
          return {
            ...msg,
            replies: [
              ...msg.replies,
              {
                id: msg.replies.length + 1,
                sender: "You",
                role: "Customer",
                time: new Date().toLocaleString(),
                message: replyText,
                isOwn: true,
              },
            ],
          };
        }
        return msg;
      });
      setMessages(updatedMessages);
      setSelectedMessage({
        ...selectedMessage,
        replies: updatedMessages.find((m) => m.id === selectedMessage.id).replies,
      });
      setReplyText("");
    }
  };

  return (
    <div className={styles.feedbacksContainer}>
      <div className={styles.header}>
        <h1>Comments & Feedback</h1>
        <p>Communicate with your assigned FSM or request clarifications on reports.</p>
      </div>

      <div className={styles.contentWrapper}>
        {/* Messages List Panel */}
        <div className={styles.messagesPanel}>
          <div className={styles.searchBox}>
            <input type="text" placeholder="Search messages..." />
          </div>

          <div className={styles.messagesList}>
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`${styles.messageItem} ${
                  selectedMessage?.id === msg.id ? styles.active : ""
                }`}
                onClick={() => setSelectedMessage(msg)}
              >
                <h4>{msg.title}</h4>
                {msg.issueId && <span className={styles.issueId}>{msg.issueId}</span>}
                {msg.building && <span className={styles.building}>{msg.building}</span>}
                <p className={styles.timestamp}>{msg.timestamp}</p>
              </div>
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

              <div className={styles.messagesThread}>
                {selectedMessage.replies.map((reply) => (
                  <div
                    key={reply.id}
                    className={`${styles.message} ${
                      reply.isOwn ? styles.ownMessage : styles.otherMessage
                    }`}
                  >
                    <div className={styles.messageContent}>
                      <div className={styles.senderInfo}>
                        <strong>{reply.sender}</strong>
                        <span className={styles.time}>{reply.time}</span>
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
                  onKeyPress={(e) => {
                    if (e.key === "Enter" && e.ctrlKey) {
                      handleSendReply();
                    }
                  }}
                />
                <button
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

      <button
        className={styles.newMessageButton}
        onClick={() => setShowNewMessageModal(true)}
      >
        ➕ New Message
      </button>

      {showNewMessageModal && (
        <Modal onClose={() => setShowNewMessageModal(false)}>
          <div className={styles.modalContent}>
            <h2>New Message</h2>
            <form>
              <div className={styles.formGroup}>
                <label>Recipient</label>
                <select>
                  <option>Select FSM...</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>Subject</label>
                <input type="text" placeholder="Enter subject..." />
              </div>
              <div className={styles.formGroup}>
                <label>Message</label>
                <textarea placeholder="Enter your message..."></textarea>
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
    </div>
  );
};

export default Feedbacks;
