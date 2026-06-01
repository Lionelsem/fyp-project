import React, { useState } from "react";
import { addIssue } from "../services/firestoreService";

const CreateIssueForm = ({ buildingId, inspectionId, reportedBy }) => {
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [rectification, setRectification] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [photoFile, setPhotoFile] = useState(null);
  const [status, setStatus] = useState("Open");
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e) => {
    setPhotoFile(e.target.files[0] || null);
  };

  const handleSubmit = async (submitStatus) => {
    if (!location.trim() || !description.trim() || !rectification.trim()) {
      alert("Please complete all required fields.");
      return;
    }

    const issueData = {
      buildingId,
      inspectionId,
      reportedBy,
      issueTitle: location,
      issueDescription: `${description}\n\nProposed rectification:\n${rectification}`,
      priority,
      status: submitStatus === "draft" ? "Draft" : status,
      defectPhotoUrl: photoFile ? photoFile.name : "",
    };

    try {
      setLoading(true);
      await addIssue(issueData);
      alert("Issue ticket created successfully.");
      setLocation("");
      setDescription("");
      setRectification("");
      setPriority("Medium");
      setPhotoFile(null);
      setStatus("Open");
    } catch (error) {
      console.error(error);
      alert("Error creating issue ticket. Check the console for details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 840, margin: "auto" }}>
      <div style={{ background: "#f7f9fc", padding: 24, borderRadius: 16, marginBottom: 24 }}>
        <h2 style={{ margin: 0 }}>Create Issue Ticket</h2>
        <p style={{ margin: "8px 0 0", color: "#555" }}>
          Link this issue to the active inspection and building.
        </p>
      </div>

      <div style={{ display: "grid", gap: 20 }}>
        <label style={{ display: "block" }}>
          <strong>Location *</strong>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. Level 3, North Wing Fire Riser Room"
            style={{ width: "100%", padding: 12, marginTop: 8, borderRadius: 8, border: "1px solid #ccd0d7" }}
          />
        </label>

        <label style={{ display: "block" }}>
          <strong>Finding / Defect Description *</strong>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the issue in detail..."
            rows={5}
            style={{ width: "100%", padding: 12, marginTop: 8, borderRadius: 8, border: "1px solid #ccd0d7" }}
          />
        </label>

        <label style={{ display: "block" }}>
          <strong>Proposed Rectification *</strong>
          <textarea
            value={rectification}
            onChange={(e) => setRectification(e.target.value)}
            placeholder="Suggest how this should be fixed..."
            rows={4}
            style={{ width: "100%", padding: 12, marginTop: 8, borderRadius: 8, border: "1px solid #ccd0d7" }}
          />
        </label>

        <label style={{ display: "block" }}>
          <strong>Issue Photo Evidence</strong>
          <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: "block", marginTop: 8 }} />
          {photoFile && <div style={{ marginTop: 8, color: "#333" }}>Selected file: {photoFile.name}</div>}
        </label>

        <label style={{ display: "block" }}>
          <strong>Status</strong>
          <input
            value={status}
            readOnly
            style={{ width: "100%", padding: 12, marginTop: 8, borderRadius: 8, border: "1px solid #ccd0d7", background: "#f4f6fa" }}
          />
        </label>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => handleSubmit("draft")}
            disabled={loading}
            style={{ padding: "12px 24px", borderRadius: 8, border: "1px solid #2b6cb0", background: "#fff", color: "#2b6cb0", cursor: "pointer" }}
          >
            Save Draft
          </button>
          <button
            type="button"
            onClick={() => handleSubmit("submit")}
            disabled={loading}
            style={{ padding: "12px 24px", borderRadius: 8, border: "none", background: "#1f8a3f", color: "#fff", cursor: "pointer" }}
          >
            {loading ? "Submitting..." : "Submit Issue"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateIssueForm;
