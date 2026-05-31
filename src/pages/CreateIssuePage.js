import React from "react";
import { auth } from "../config/firebase";
import CreateIssueForm from "../components/CreateIssueForm";

const CreateIssuePage = () => {
  const buildingId = "BUILDING_ID_PLACEHOLDER";
  const inspectionId = "INSPECTION_ID_PLACEHOLDER";
  const reportedBy = auth.currentUser?.uid || "ANONYMOUS_USER";

  return (
    <div style={{ padding: 24, minHeight: "100vh", background: "#f1f5f9" }}>
      <div style={{ maxWidth: 1024, margin: "auto", background: "#fff", borderRadius: 20, padding: 24, boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)" }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ color: "#10b981", fontWeight: 700, marginBottom: 8 }}>CBRE Tower One</div>
          <div style={{ color: "#475569" }}>Related: INSP-2026-05-18</div>
        </div>
        <CreateIssueForm
          buildingId={buildingId}
          inspectionId={inspectionId}
          reportedBy={reportedBy}
        />
      </div>
    </div>
  );
};

export default CreateIssuePage;
