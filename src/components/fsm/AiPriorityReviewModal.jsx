import React, { useEffect, useState } from "react";
import Modal from "../common/Modal";
import { PRIORITY } from "../../constants/status";

const PRIORITIES = [PRIORITY.LOW, PRIORITY.MEDIUM, PRIORITY.HIGH];

const AiPriorityReviewModal = ({ entries, onCancel, onConfirm }) => {
  const [priorities, setPriorities] = useState({});

  useEffect(() => {
    setPriorities(
      Object.fromEntries(
        entries.map((entry) => [
          entry.key,
          entry.suggestedPriority || entry.currentPriority || PRIORITY.MEDIUM
        ])
      )
    );
  }, [entries]);

  return (
    <Modal
      title={entries.length > 1 ? "Review AI priority suggestions" : "Confirm issue priority"}
      onClose={onCancel}
      closeLabel="Cancel priority confirmation"
      closeOnBackdrop={false}
      className="ai-priority-review-modal"
      bodyClassName="ai-priority-review-modal__body"
    >
      <p className="ai-priority-review-intro">
        AI suggestions are drafts. Review each priority before saving.
      </p>

      <div className="ai-priority-review-list">
        {entries.map((entry) => (
          <section className="ai-priority-review-item" key={entry.key}>
            <div>
              <strong>{entry.itemLabel || "Issue"}</strong>
              {entry.issueDescription && <p>{entry.issueDescription}</p>}
              <small>AI suggestion: {entry.suggestedPriority}</small>
            </div>
            <label>
              <span>Final priority</span>
              <select
                aria-label={`Final priority for ${entry.itemLabel || "issue"}`}
                value={priorities[entry.key] || PRIORITY.MEDIUM}
                onChange={(event) =>
                  setPriorities((current) => ({
                    ...current,
                    [entry.key]: event.target.value
                  }))
                }
              >
                {PRIORITIES.map((priority) => (
                  <option key={priority} value={priority}>{priority}</option>
                ))}
              </select>
            </label>
          </section>
        ))}
      </div>

      <div className="inspection-confirm-notice">
        <span aria-hidden="true">i</span>
        <p>Your selected value is saved as the issue priority and recorded in the AI audit.</p>
      </div>

      <div className="inspection-confirm-actions">
        <button type="button" className="secondary-button" onClick={onCancel}>
          Cancel
        </button>
        <button
          type="button"
          className="primary-button"
          onClick={() => onConfirm(priorities)}
        >
          Confirm priorities
        </button>
      </div>
    </Modal>
  );
};

export default AiPriorityReviewModal;
