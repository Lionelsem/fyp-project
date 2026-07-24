import React, { useEffect, useState } from "react";
import {
  getIssuePriorityPolicy,
  updateIssuePriorityPolicy
} from "../../services/aiPriorityService";

const EMPTY_POLICY = {
  enabled: false,
  definitions: { Low: "", Medium: "", High: "" },
  additionalInstructions: "",
  version: 0
};

const AiPrioritySettings = () => {
  const [policy, setPolicy] = useState(EMPTY_POLICY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    let active = true;
    getIssuePriorityPolicy()
      .then((loadedPolicy) => {
        if (active) setPolicy({ ...EMPTY_POLICY, ...loadedPolicy });
      })
      .catch((error) => {
        if (active) {
          setMessage({
            type: "error",
            text: error.message || "Could not load the AI priority policy."
          });
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const setDefinition = (priority, value) => {
    setPolicy((current) => ({
      ...current,
      definitions: { ...current.definitions, [priority]: value }
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage(null);
    setSaving(true);
    try {
      const result = await updateIssuePriorityPolicy({
        enabled: policy.enabled,
        definitions: policy.definitions,
        additionalInstructions: policy.additionalInstructions
      });
      setPolicy((current) => ({ ...current, version: result.version }));
      setMessage({
        type: "success",
        text: `AI priority policy version ${result.version} saved.`
      });
    } catch (error) {
      setMessage({
        type: "error",
        text: error.message || "Could not save the AI priority policy."
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading-state">Loading AI priority settings...</div>
      </div>
    );
  }

  return (
    <div className="dashboard-container ai-priority-settings-page">
      <div className="dashboard-card admin-record-card">
        <div className="card-header-row admin-record-header">
          <div>
            <p className="overline">FSM issue assistance</p>
            <h2 className="section-title">AI Priority Settings</h2>
            <p className="page-subtitle">
              Define the FSM rubric used to suggest Low, Medium, or High.
              You can still choose a different priority before saving an issue.
            </p>
          </div>
          <span className="status-badge">Policy v{policy.version}</span>
        </div>

        <form className="admin-record-form ai-priority-policy-form" onSubmit={handleSubmit}>
          <label className="ai-priority-enable-field">
            <input
              type="checkbox"
              checked={policy.enabled}
              onChange={(event) =>
                setPolicy((current) => ({ ...current, enabled: event.target.checked }))
              }
            />
            <span>
              <strong>Enable AI priority suggestions</strong>
              <small>FSM users can still save manually if assessment is unavailable.</small>
            </span>
          </label>

          {["Low", "Medium", "High"].map((priority) => (
            <label className="form-field" key={priority}>
              <span className="form-label">{priority} priority definition *</span>
              <textarea
                className="form-input"
                rows={4}
                required
                value={policy.definitions?.[priority] || ""}
                onChange={(event) => setDefinition(priority, event.target.value)}
                placeholder={`Describe when an issue should be classified as ${priority}.`}
              />
            </label>
          ))}

          <label className="form-field">
            <span className="form-label">Additional organization instructions</span>
            <textarea
              className="form-input"
              rows={5}
              value={policy.additionalInstructions || ""}
              onChange={(event) =>
                setPolicy((current) => ({
                  ...current,
                  additionalInstructions: event.target.value
                }))
              }
              placeholder="Add escalation rules, local standards, or other context."
            />
          </label>

          {message && (
            <div
              className="admin-form-message"
              role={message.type === "error" ? "alert" : "status"}
              style={{ color: message.type === "error" ? "#b91c1c" : "#047857" }}
            >
              {message.text}
            </div>
          )}

          <button type="submit" className="primary-btn" disabled={saving}>
            {saving ? "Saving policy..." : "Save AI priority policy"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AiPrioritySettings;
