import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ISSUE_STATUS, PRIORITY, APPROVAL_STATUS } from "../../constants/status";
import { useAuthContext } from "../../context/AuthContext";
import { useFsmDashboardData } from "../../hooks/useFsmDashboardData";
import {
  addClosureVerification,
  deleteIssue,
  upsertIssue
} from "../../services/issueService";
import { uploadFile } from "../../services/storageService";

const emptyIssueForm = {
  issueKey: "",
  issueId: "",
  buildingId: "",
  floorId: "",
  floorName: "",
  location: "",
  equipmentId: "",
  inspectionKey: "",
  inspectionId: "",
  resultKey: "",
  resultId: "",
  categoryCode: "",
  itemCode: "",
  itemLabel: "",
  issueTitle: "",
  issueDescription: "",
  rectification: "",
  priority: PRIORITY.MEDIUM,
  status: ISSUE_STATUS.OPEN,
  issuePhotoUrl: "",
  defectPhotoUrl: "",
  defectPhotoStoragePath: "",
  defectPhotoUploadedAt: null,
  defectPhotoUploadedBy: "",
  fixPhotoUrl: "",
  fixPhotoStoragePath: "",
  fixPhotoUploadedAt: null,
  fixPhotoUploadedBy: "",
  aiRecommendation: "",
  photoFile: null
};

const emptyVerificationForm = {
  afterPhotoFile: null,
  afterPhotoPreview: "",
  verificationComments: ""
};

const issueTicketStatuses = [
  ISSUE_STATUS.OPEN,
  ISSUE_STATUS.IN_PROGRESS,
  ISSUE_STATUS.RESOLVED,
  ISSUE_STATUS.CLOSED
];

const normalizeText = (value) => String(value || "").trim().toLowerCase();

const getFsmLookupIds = (user) => [
  user?.uid,
  user?.authUid,
  user?.profileId,
  user?.id,
  user?.userId,
  user?.fullName,
  user?.displayName,
  user?.fsmId,
  user?.assignedFsmId,
  user?.staffId,
  user?.employeeId,
  user?.accountId,
  user?.firestoreId
];

const getPrimaryFsmId = (user) =>
  getFsmLookupIds(user).map((value) => String(value || "").trim()).find(Boolean) || "";

const getBuildingName = (building) =>
  building?.building_name || building?.buildingName || building?.name || building?.building || "";

const getIssueKey = (issue) => issue?.issueKey || issue?.id || issue?.issueId || "";

const getDefectPhotoUrl = (issue) =>
  issue?.defectPhotoUrl || issue?.issuePhotoUrl || "";

const getFixPhotoUrl = (issue) =>
  issue?.fixPhotoUrl || "";

const toDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value.toDate === "function") {
    const date = value.toDate();
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof value.seconds === "number") return new Date(value.seconds * 1000);

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDateTime = (value) => {
  const date = toDate(value);
  if (!date) return "-";

  return date.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
};

const statusClassName = (status) => {
  const normalized = normalizeText(status);
  if (normalized === normalizeText(ISSUE_STATUS.CLOSED)) return "issue-status issue-status--closed";
  if (normalized === normalizeText(ISSUE_STATUS.RESOLVED)) return "issue-status issue-status--resolved";
  if (normalized === normalizeText(ISSUE_STATUS.IN_PROGRESS)) return "issue-status issue-status--progress";
  if (normalized === normalizeText(ISSUE_STATUS.DRAFT)) return "issue-status issue-status--draft";
  return "issue-status issue-status--open";
};

const priorityClassName = (priority) => {
  const normalized = normalizeText(priority);
  if (normalized === normalizeText(PRIORITY.HIGH)) return "issue-priority issue-priority--high";
  if (normalized === normalizeText(PRIORITY.LOW)) return "issue-priority issue-priority--low";
  return "issue-priority issue-priority--medium";
};

const buildManualIssueKey = () => {
  const randomPart =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `manual-issue-${randomPart}`;
};

const createFormFromIssue = (issue) => ({
  ...emptyIssueForm,
  issueKey: getIssueKey(issue),
  issueId: issue.issueId || getIssueKey(issue),
  buildingId: issue.buildingId || "",
  floorId: issue.floorId || "",
  floorName: issue.floorName || "",
  location: issue.location || "",
  equipmentId: issue.equipmentId || "",
  inspectionKey: issue.inspectionKey || "",
  inspectionId: issue.inspectionId || "",
  resultKey: issue.resultKey || "",
  resultId: issue.resultId || "",
  categoryCode: issue.categoryCode || "",
  itemCode: issue.itemCode || "",
  itemLabel: issue.itemLabel || "",
  issueTitle: issue.issueTitle || "",
  issueDescription: issue.issueDescription || "",
  rectification: issue.rectification || "",
  priority: issue.priority || PRIORITY.MEDIUM,
  status: issue.status || ISSUE_STATUS.OPEN,
  issuePhotoUrl: issue.issuePhotoUrl || issue.defectPhotoUrl || "",
  defectPhotoUrl: getDefectPhotoUrl(issue),
  defectPhotoStoragePath: issue.defectPhotoStoragePath || "",
  defectPhotoUploadedAt: issue.defectPhotoUploadedAt || null,
  defectPhotoUploadedBy: issue.defectPhotoUploadedBy || "",
  fixPhotoUrl: getFixPhotoUrl(issue),
  fixPhotoStoragePath: issue.fixPhotoStoragePath || "",
  fixPhotoUploadedAt: issue.fixPhotoUploadedAt || null,
  fixPhotoUploadedBy: issue.fixPhotoUploadedBy || "",
  aiRecommendation: issue.aiRecommendation || ""
});

const filterIssues = (issues, filters) => {
  const search = normalizeText(filters.search);
  const status = normalizeText(filters.status);
  const priority = normalizeText(filters.priority);

  return issues.filter((issue) => {
    if (status && normalizeText(issue.status) !== status) return false;
    if (priority && normalizeText(issue.priority) !== priority) return false;

    if (!search) return true;

    return [
      issue.id,
      issue.issueId,
      issue.issueTitle,
      issue.issueDescription,
      issue.rectification,
      issue.buildingName,
      issue.floorName,
      issue.location,
      issue.status,
      issue.priority
    ].some((value) => normalizeText(value).includes(search));
  });
};

const sortIssues = (issues, sortKey) => {
  const sorted = [...issues];
  sorted.sort((first, second) => {
    if (sortKey === "priority") {
      const rank = { high: 3, medium: 2, low: 1 };
      return (rank[normalizeText(second.priority)] || 0) - (rank[normalizeText(first.priority)] || 0);
    }

    if (sortKey === "status") {
      return String(first.status || "").localeCompare(String(second.status || ""));
    }

    if (sortKey === "title") {
      return String(first.issueTitle || "").localeCompare(String(second.issueTitle || ""));
    }

    const firstDate = toDate(first.updatedAt || first.createdAt);
    const secondDate = toDate(second.updatedAt || second.createdAt);
    return (secondDate?.getTime() || 0) - (firstDate?.getTime() || 0);
  });
  return sorted;
};

const IssueForm = ({
  buildings,
  form,
  mode,
  saving,
  onChange,
  onCancel,
  onSubmit
}) => (
  <section className="dashboard-card issue-ticket-form-card">
    <div className="card-header-row">
      <h2 className="section-title">{mode === "edit" ? "Edit Issue Ticket" : "Create Issue Ticket"}</h2>
      <button type="button" className="view-all-link" onClick={onCancel}>Close</button>
    </div>
    <form onSubmit={onSubmit} className="issue-ticket-form">
      <div className="issue-ticket-form-grid">
        <label>
          <span>Building</span>
          <select
            value={form.buildingId}
            onChange={(event) => onChange("buildingId", event.target.value)}
            required
          >
            <option value="">Select building</option>
            {buildings.map((building) => (
              <option key={building.id} value={building.id}>
                {getBuildingName(building)}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Floor / Location</span>
          <input
            type="text"
            value={form.floorName}
            onChange={(event) => onChange("floorName", event.target.value)}
            placeholder="e.g. Level 3 fire riser room"
          />
        </label>
        <label>
          <span>Specific Location</span>
          <input
            type="text"
            value={form.location}
            onChange={(event) => onChange("location", event.target.value)}
            placeholder="e.g. North wing corridor"
          />
        </label>
        <label>
          <span>Priority</span>
          <select value={form.priority} onChange={(event) => onChange("priority", event.target.value)}>
            {Object.values(PRIORITY).map((priority) => (
              <option key={priority} value={priority}>{priority}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Status</span>
          <select value={form.status} onChange={(event) => onChange("status", event.target.value)}>
            {issueTicketStatuses.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </label>
      </div>
      <label>
        <span>Issue Title</span>
        <input
          type="text"
          value={form.issueTitle}
          onChange={(event) => onChange("issueTitle", event.target.value)}
          required
        />
      </label>
      <label>
        <span>Description</span>
        <textarea
          rows={3}
          value={form.issueDescription}
          onChange={(event) => onChange("issueDescription", event.target.value)}
          required
        />
      </label>
      <label>
        <span>Proposed Rectification</span>
        <textarea
          rows={3}
          value={form.rectification}
          onChange={(event) => onChange("rectification", event.target.value)}
        />
      </label>
      <div className="issue-ticket-photo-field">
        <label>
          <span>Defect Photo</span>
          <input
            type="file"
            accept="image/*"
            onChange={(event) => onChange("photoFile", event.target.files?.[0] || null)}
          />
        </label>
        {getDefectPhotoUrl(form) && (
          <img className="issue-ticket-photo-preview" src={getDefectPhotoUrl(form)} alt="Defect evidence" />
        )}
      </div>
      <div className="issue-ticket-actions">
        <button type="button" className="secondary-button" onClick={onCancel}>Cancel</button>
        <button type="submit" className="primary-button" disabled={saving}>
          {saving ? "Saving..." : mode === "edit" ? "Update Issue" : "Create Issue"}
        </button>
      </div>
    </form>
  </section>
);

const VerifyClosePanel = ({
  issue,
  form,
  saving,
  onChange,
  onCancel,
  onSubmit
}) => (
  <section className="dashboard-card issue-ticket-form-card">
    <div className="card-header-row">
      <h2 className="section-title">Verify & Resolve Issue</h2>
      <button type="button" className="view-all-link" onClick={onCancel}>Close</button>
    </div>
    <form onSubmit={onSubmit} className="issue-ticket-form">
      <div className="issue-ticket-verify-summary">
        <span>Issue</span>
        <strong>{issue.issueTitle}</strong>
      </div>
      {(getDefectPhotoUrl(issue) || form.afterPhotoPreview || getFixPhotoUrl(issue)) && (
        <div className="issue-ticket-evidence-grid">
          {getDefectPhotoUrl(issue) && (
            <figure>
              <figcaption>Before</figcaption>
              <img className="issue-ticket-detail-photo" src={getDefectPhotoUrl(issue)} alt="Original defect evidence" />
            </figure>
          )}
          {(form.afterPhotoPreview || getFixPhotoUrl(issue)) && (
            <figure>
              <figcaption>After</figcaption>
              <img className="issue-ticket-detail-photo" src={form.afterPhotoPreview || getFixPhotoUrl(issue)} alt="Closure evidence" />
            </figure>
          )}
        </div>
      )}
      <label>
        <span>After Photo</span>
        <input
          type="file"
          accept="image/*"
          onChange={(event) => onChange("afterPhotoFile", event.target.files?.[0] || null)}
          required={!getFixPhotoUrl(issue)}
        />
      </label>
      <label>
        <span>Verification Comments</span>
        <textarea
          rows={3}
          value={form.verificationComments}
          onChange={(event) => onChange("verificationComments", event.target.value)}
          required
        />
      </label>
      <div className="issue-ticket-actions">
        <button type="button" className="secondary-button" onClick={onCancel}>Cancel</button>
        <button type="submit" className="primary-button" disabled={saving}>
          {saving ? "Resolving..." : "Mark Resolved"}
        </button>
      </div>
    </form>
  </section>
);

const IssueDetail = ({ issue, buildingName, onEdit, onDelete, onVerifyClose, onCloseIssue, saving }) => (
  <aside className="dashboard-card issue-ticket-detail">
    <div className="card-header-row">
      <div>
        <p className="overline">Issue Detail</p>
        <h2 className="section-title">{issue.issueTitle || "Untitled issue"}</h2>
      </div>
      <span className={statusClassName(issue.status)}>{issue.status || ISSUE_STATUS.OPEN}</span>
    </div>
    <div className="issue-ticket-detail-grid">
      <div>
        <span>Issue ID</span>
        <strong>{issue.issueId || issue.id}</strong>
      </div>
      <div>
        <span>Building</span>
        <strong>{buildingName || "-"}</strong>
      </div>
      <div>
        <span>Floor / Location</span>
        <strong>{issue.floorName || "-"}</strong>
      </div>
      <div>
        <span>Specific Location</span>
        <strong>{issue.location || "-"}</strong>
      </div>
      <div>
        <span>Priority</span>
        <strong>{issue.priority || PRIORITY.MEDIUM}</strong>
      </div>
      <div>
        <span>Created</span>
        <strong>{formatDateTime(issue.createdAt)}</strong>
      </div>
      <div>
        <span>Source</span>
        <strong>{issue.inspectionId ? "Inspection checklist" : "Manual ticket"}</strong>
      </div>
    </div>
    <div className="issue-ticket-copy-block">
      <span>Description</span>
      <p>{issue.issueDescription || "-"}</p>
    </div>
    <div className="issue-ticket-copy-block">
      <span>Rectification</span>
      <p>{issue.rectification || "-"}</p>
    </div>
    {(getDefectPhotoUrl(issue) || getFixPhotoUrl(issue)) && (
      <div className="issue-ticket-evidence-grid">
        {getDefectPhotoUrl(issue) && (
          <figure>
            <figcaption>Before</figcaption>
            <img className="issue-ticket-detail-photo" src={getDefectPhotoUrl(issue)} alt="Original defect evidence" />
          </figure>
        )}
        {getFixPhotoUrl(issue) && (
          <figure>
            <figcaption>After</figcaption>
            <img className="issue-ticket-detail-photo" src={getFixPhotoUrl(issue)} alt="Closure evidence" />
          </figure>
        )}
      </div>
    )}
    <div className="issue-ticket-actions">
      <button type="button" className="secondary-button" onClick={() => onEdit(issue)}>
        Edit
      </button>
      <button type="button" className="primary-button" onClick={() => onVerifyClose(issue)} disabled={normalizeText(issue.status) === normalizeText(ISSUE_STATUS.CLOSED)}>
        Verify Issue
      </button>
      {normalizeText(issue.status) === normalizeText(ISSUE_STATUS.RESOLVED) && (
        <button type="button" className="primary-button" onClick={() => onCloseIssue(issue)} disabled={saving || !getFixPhotoUrl(issue)}>
          {saving ? "Closing..." : "Close Issue"}
        </button>
      )}
      <button type="button" className="danger-button" onClick={() => onDelete(issue)}>
        Delete
      </button>
    </div>
  </aside>
);

const DeleteModal = ({ issue, saving, onCancel, onConfirm }) => {
  const issueName = issue.issueTitle || issue.issueId || issue.id;

  return (
    <div className="issue-ticket-modal-backdrop" role="presentation">
      <div className="issue-ticket-modal" role="dialog" aria-modal="true" aria-labelledby="delete-issue-title">
        <h2 id="delete-issue-title">Delete Issue Ticket?</h2>
        <p>Delete fire safety issue ticket "{issueName}"?</p>
        <strong>{issue.issueId || issue.id}</strong>
        <div className="issue-ticket-actions">
          <button type="button" className="secondary-button" onClick={onCancel}>Cancel</button>
          <button type="button" className="danger-button" onClick={onConfirm} disabled={saving}>
            {saving ? "Deleting..." : "Delete Issue"}
          </button>
        </div>
      </div>
    </div>
  );
};

const Issues = () => {
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const { loading, error, buildings, issues } = useFsmDashboardData(getFsmLookupIds(user));
  const [filters, setFilters] = useState({
    search: "",
    status: "",
    priority: ""
  });
  const [activeIssueId, setActiveIssueId] = useState("");
  const [activeForm, setActiveForm] = useState(null);
  const [issueForm, setIssueForm] = useState(emptyIssueForm);
  const [verificationForm, setVerificationForm] = useState(emptyVerificationForm);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  const buildingMap = useMemo(
    () => new Map(buildings.map((building) => [building.id, building])),
    [buildings]
  );

  const enrichedIssues = useMemo(
    () =>
      issues.map((issue) => ({
        ...issue,
        buildingName: getBuildingName(buildingMap.get(issue.buildingId))
      })),
    [buildingMap, issues]
  );

  const visibleIssues = useMemo(
    () => sortIssues(filterIssues(enrichedIssues, filters), "updated"),
    [enrichedIssues, filters]
  );

  const activeIssue =
    visibleIssues.find((issue) => issue.id === activeIssueId) ||
    visibleIssues[0] ||
    null;

  const handleFilterChange = (field, value) => {
    setFilters((current) => ({ ...current, [field]: value }));
    setActiveIssueId("");
  };

  const closePanels = ({ keepSuccess = false } = {}) => {
    setActiveForm(null);
    setIssueForm(emptyIssueForm);
    setVerificationForm(emptyVerificationForm);
    setFormError("");
    if (!keepSuccess) setFormSuccess("");
  };

  const openCreateForm = () => {
    const defaultBuilding = buildings[0];
    setIssueForm({
      ...emptyIssueForm,
      issueKey: buildManualIssueKey(),
      buildingId: defaultBuilding?.id || ""
    });
    setActiveForm("create");
    setFormError("");
    setFormSuccess("");
  };

  const openEditForm = (issue) => {
    setIssueForm(createFormFromIssue(issue));
    setActiveForm("edit");
    setFormError("");
    setFormSuccess("");
  };

  const openVerifyClose = (issue) => {
    const issueId = issue.id || getIssueKey(issue);
    navigate(`/fsm/inspections/verify?issueId=${encodeURIComponent(issueId)}`, {
      state: { issue }
    });
  };

  const handleIssueFormChange = (field, value) => {
    setIssueForm((current) => ({ ...current, [field]: value }));
  };

  const handleVerificationChange = (field, value) => {
    if (field === "afterPhotoFile") {
      setVerificationForm((current) => ({
        ...current,
        afterPhotoFile: value,
        afterPhotoPreview: value ? URL.createObjectURL(value) : ""
      }));
      return;
    }

    setVerificationForm((current) => ({ ...current, [field]: value }));
  };

  const handleIssueSubmit = async (event) => {
    event.preventDefault();
    setFormError("");
    setFormSuccess("");

    if (!issueForm.buildingId || !issueForm.issueTitle.trim() || !issueForm.issueDescription.trim()) {
      setFormError("Building, title, and description are required.");
      return;
    }

    try {
      setSaving(true);
      const issueKey = issueForm.issueKey || buildManualIssueKey();
      let issuePhotoUrl = issueForm.issuePhotoUrl;
      let defectPhotoUrl = issueForm.defectPhotoUrl || issuePhotoUrl;
      let defectPhotoStoragePath = issueForm.defectPhotoStoragePath;
      let defectPhotoUploadedAt = issueForm.defectPhotoUploadedAt;
      let defectPhotoUploadedBy = issueForm.defectPhotoUploadedBy;
      if (issueForm.photoFile) {
        const uploaded = await uploadFile(issueForm.photoFile, `issues/${issueKey}`);
        issuePhotoUrl = uploaded.url;
        defectPhotoUrl = uploaded.url;
        defectPhotoStoragePath = uploaded.path;
        defectPhotoUploadedAt = new Date();
        defectPhotoUploadedBy = getPrimaryFsmId(user);
      }

      const payload = {
        ...issueForm,
        issueKey,
        issueId: issueForm.issueId || issueKey,
        reportedBy: getPrimaryFsmId(user),
        issuePhotoUrl,
        defectPhotoUrl,
        defectPhotoStoragePath,
        defectPhotoUploadedAt,
        defectPhotoUploadedBy
      };
      delete payload.photoFile;

      await upsertIssue(payload);
      setActiveIssueId(issueKey);
      closePanels();
    } catch (submitError) {
      setFormError(submitError.message || "Could not save issue ticket.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteIssue = async () => {
    if (!deleteTarget) return;

    try {
      setSaving(true);
      await deleteIssue(deleteTarget.id);
      if (activeIssueId === deleteTarget.id) setActiveIssueId("");
      setDeleteTarget(null);
    } catch (deleteError) {
      setFormError(deleteError.message || "Could not delete issue.");
    } finally {
      setSaving(false);
    }
  };

  const handleVerifyClose = async (event) => {
    event.preventDefault();
    if (!activeIssue || saving) return;
    setFormError("");
    setFormSuccess("");

    if ((!verificationForm.afterPhotoFile && !getFixPhotoUrl(activeIssue)) || !verificationForm.verificationComments.trim()) {
      setFormError("After photo and verification comments are required.");
      return;
    }

    if (!window.confirm("Mark this issue as resolved? Please confirm the defect has been fixed and the uploaded resolution photo is correct.")) {
      return;
    }

    try {
      setSaving(true);
      const issueKey = getIssueKey(activeIssue);
      let fixPhotoUrl = getFixPhotoUrl(activeIssue);
      let fixPhotoStoragePath = activeIssue.fixPhotoStoragePath || "";
      let fixPhotoUploadedAt = activeIssue.fixPhotoUploadedAt || null;
      let fixPhotoUploadedBy = activeIssue.fixPhotoUploadedBy || "";

      if (verificationForm.afterPhotoFile) {
        const uploaded = await uploadFile(verificationForm.afterPhotoFile, `closure-verifications/${issueKey}`);
        fixPhotoUrl = uploaded.url;
        fixPhotoStoragePath = uploaded.path;
        fixPhotoUploadedAt = new Date();
        fixPhotoUploadedBy = getPrimaryFsmId(user);
      }

      await addClosureVerification({
        verificationId: `closure-${issueKey}-${Date.now()}`,
        issueId: issueKey,
        resultId: activeIssue.resultId || "",
        verifiedBy: fixPhotoUploadedBy || getPrimaryFsmId(user),
        beforePhotoUrl: getDefectPhotoUrl(activeIssue),
        afterPhotoUrl: fixPhotoUrl,
        defectPhotoUrl: getDefectPhotoUrl(activeIssue),
        defectPhotoStoragePath: activeIssue.defectPhotoStoragePath || "",
        defectPhotoUploadedAt: activeIssue.defectPhotoUploadedAt || null,
        defectPhotoUploadedBy: activeIssue.defectPhotoUploadedBy || "",
        fixPhotoUrl,
        fixPhotoStoragePath,
        fixPhotoUploadedAt,
        fixPhotoUploadedBy,
        verificationComments: verificationForm.verificationComments,
        approvalStatus: APPROVAL_STATUS.APPROVED
      });

      await upsertIssue({
        ...createFormFromIssue(activeIssue),
        reportedBy: activeIssue.reportedBy || getPrimaryFsmId(user),
        status: ISSUE_STATUS.RESOLVED,
        location: activeIssue.location || "",
        defectPhotoUrl: getDefectPhotoUrl(activeIssue),
        defectPhotoStoragePath: activeIssue.defectPhotoStoragePath || "",
        defectPhotoUploadedAt: activeIssue.defectPhotoUploadedAt || null,
        defectPhotoUploadedBy: activeIssue.defectPhotoUploadedBy || "",
        fixPhotoUrl,
        fixPhotoStoragePath,
        fixPhotoUploadedAt,
        fixPhotoUploadedBy
      });

      closePanels({ keepSuccess: true });
      setFormSuccess("Issue marked as resolved successfully.");
    } catch (verifyError) {
      setFormError(verifyError.message || "Could not verify and resolve issue.");
    } finally {
      setSaving(false);
    }
  };

  const handleCloseReviewedIssue = async (issue) => {
    if (!issue || saving) return;
    setFormError("");
    setFormSuccess("");

    if (!getFixPhotoUrl(issue)) {
      setFormError("Fix/resolution photo is required before closing this issue.");
      return;
    }

    if (!window.confirm("Close this issue? Please confirm the resolved work has been reviewed and accepted.")) {
      return;
    }

    try {
      setSaving(true);
      const issueKey = getIssueKey(issue);
      await upsertIssue({
        ...createFormFromIssue(issue),
        issueKey,
        issueId: issue.issueId || issueKey,
        reportedBy: issue.reportedBy || getPrimaryFsmId(user),
        status: ISSUE_STATUS.CLOSED,
        location: issue.location || "",
        defectPhotoUrl: getDefectPhotoUrl(issue),
        defectPhotoStoragePath: issue.defectPhotoStoragePath || "",
        defectPhotoUploadedAt: issue.defectPhotoUploadedAt || null,
        defectPhotoUploadedBy: issue.defectPhotoUploadedBy || "",
        fixPhotoUrl: getFixPhotoUrl(issue),
        fixPhotoStoragePath: issue.fixPhotoStoragePath || "",
        fixPhotoUploadedAt: issue.fixPhotoUploadedAt || null,
        fixPhotoUploadedBy: issue.fixPhotoUploadedBy || ""
      });

      setActiveIssueId(issueKey);
      closePanels({ keepSuccess: true });
      setFormSuccess("Issue closed successfully.");
    } catch (closeError) {
      setFormError(closeError.message || "Could not close issue.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="dashboard-container issue-ticket-page">
      {error && <div className="error-state">{error}</div>}
      {loading && <div className="loading-state">Loading issue tickets...</div>}
      {formError && <div className="error-state">{formError}</div>}
      {formSuccess && <div className="success-state">{formSuccess}</div>}

      <div className="issue-ticket-header">
        <div>
          <h1>Issue Management</h1>
          <p>Create, manage, verify, and close fire safety issue tickets.</p>
        </div>
        <button type="button" className="primary-button" onClick={openCreateForm}>
          Create Issue
        </button>
      </div>

      <div className="issue-ticket-layout">
        {activeForm === "create" || activeForm === "edit" ? (
          <IssueForm
            buildings={buildings}
            form={issueForm}
            mode={activeForm}
            saving={saving}
            onChange={handleIssueFormChange}
            onCancel={closePanels}
            onSubmit={handleIssueSubmit}
          />
        ) : activeForm === "verify" && activeIssue ? (
          <VerifyClosePanel
            issue={activeIssue}
            form={verificationForm}
            saving={saving}
            onChange={handleVerificationChange}
            onCancel={closePanels}
            onSubmit={handleVerifyClose}
          />
        ) : activeIssue ? (
          <IssueDetail
            issue={activeIssue}
            buildingName={activeIssue.buildingName}
            onEdit={openEditForm}
            onDelete={setDeleteTarget}
            onVerifyClose={openVerifyClose}
            onCloseIssue={handleCloseReviewedIssue}
            saving={saving}
          />
        ) : (
          <aside className="dashboard-card issue-ticket-detail issue-ticket-detail--empty">
            <p className="overline">Issue Detail</p>
            <h2 className="section-title">No issue selected</h2>
            <p className="hint-text">Select an issue from the list or create a new ticket.</p>
          </aside>
        )}

        <section className="dashboard-card issue-ticket-list-card">
          <div className="card-header-row">
            <h2 className="section-title">Fire Safety Issue Tickets</h2>
            <span className="hint-text">{visibleIssues.length} shown</span>
          </div>

          <div className="issue-ticket-toolbar">
            <input
              type="search"
              value={filters.search}
              onChange={(event) => handleFilterChange("search", event.target.value)}
              placeholder="Search issues..."
            />
            <select value={filters.status} onChange={(event) => handleFilterChange("status", event.target.value)}>
              <option value="">All statuses</option>
              {issueTicketStatuses.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
            <select value={filters.priority} onChange={(event) => handleFilterChange("priority", event.target.value)}>
              <option value="">All priorities</option>
              {Object.values(PRIORITY).map((priority) => (
                <option key={priority} value={priority}>{priority}</option>
              ))}
            </select>
          </div>

          <div className="issue-ticket-table-wrapper">
            <table className="dashboard-table issue-ticket-table">
              <thead>
                <tr>
                  <th>Issue ID</th>
                  <th>Finding</th>
                  <th>Building</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {visibleIssues.map((issue) => {
                  const issueDisplayId = issue.issueId || issue.id;
                  const issueUpdatedAt = formatDateTime(issue.updatedAt || issue.createdAt);

                  return (
                    <tr
                      key={issue.id}
                      className={activeIssue?.id === issue.id ? "issue-ticket-row-active" : ""}
                      onClick={() => setActiveIssueId(issue.id)}
                    >
                      <td className="id-cell" title={issueDisplayId}>{issueDisplayId}</td>
                      <td title={issue.issueTitle || ""}>{issue.issueTitle || "-"}</td>
                      <td title={issue.buildingName || ""}>{issue.buildingName || "-"}</td>
                      <td><span className={statusClassName(issue.status)}>{issue.status || ISSUE_STATUS.OPEN}</span></td>
                      <td><span className={priorityClassName(issue.priority)}>{issue.priority || PRIORITY.MEDIUM}</span></td>
                      <td title={issueUpdatedAt}>{issueUpdatedAt}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {visibleIssues.length === 0 && (
              <div className="issue-ticket-empty">
                No issue tickets match the current filters.
              </div>
            )}
          </div>
        </section>
      </div>

      {deleteTarget && (
        <DeleteModal
          issue={deleteTarget}
          saving={saving}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDeleteIssue}
        />
      )}
    </div>
  );
};

export default Issues;
