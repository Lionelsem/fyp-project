import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ISSUE_STATUS, PRIORITY, APPROVAL_STATUS } from "../../constants/status";
import { useAuthContext } from "../../context/AuthContext";
import { useFsmDashboardData } from "../../hooks/useFsmDashboardData";
import {
  addClosureVerification,
  deleteIssue,
  upsertIssue
} from "../../services/issueService";
import { getInspectionDefectPhotoFolder, uploadFile } from "../../services/storageService";

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
  verificationComments: "",
  aiRecommendation: "",
  photoFiles: [],
  photoPreviews: []
};

const emptyVerificationForm = {
  defectPhotoFiles: [],
  defectPhotoPreviews: [],
  afterPhotoFiles: [],
  afterPhotoPreviews: [],
  issueDescription: "",
  rectification: "",
  verificationComments: ""
};

const issueTicketStatuses = [
  ISSUE_STATUS.OPEN,
  ISSUE_STATUS.IN_PROGRESS,
  ISSUE_STATUS.RESOLVED,
  ISSUE_STATUS.CLOSED
];

const verifyClosureStatuses = [
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

const getIssueDefectPhotoFolder = (issue, issueKey) =>
  getInspectionDefectPhotoFolder({
    inspectionKey: issue?.inspectionKey || issue?.inspectionId || issueKey,
    categoryId: issue?.categoryCode || "manual",
    itemId: issue?.itemCode || issue?.resultKey || issueKey
  });

const getBuildingName = (building) =>
  building?.building_name || building?.buildingName || building?.name || building?.building || "";

const getIssueKey = (issue) => issue?.issueKey || issue?.id || issue?.issueId || "";

const PHOTO_LIMIT = 3;

const uniqueValues = (values) =>
  Array.from(new Set((values || []).filter(Boolean)));

const getDefectPhotoUrls = (issue) =>
  uniqueValues([
    ...(Array.isArray(issue?.defectPhotoUrls) ? issue.defectPhotoUrls : []),
    issue?.defectPhotoUrl,
    issue?.issuePhotoUrl
  ]).slice(0, PHOTO_LIMIT);

const getFixPhotoUrls = (issue) =>
  uniqueValues([
    ...(Array.isArray(issue?.fixPhotoUrls) ? issue.fixPhotoUrls : []),
    issue?.fixPhotoUrl,
    issue?.afterPhotoUrl
  ]).slice(0, PHOTO_LIMIT);

const getDefectPhotoUrl = (issue) =>
  getDefectPhotoUrls(issue)[0] || "";

const getFixPhotoUrl = (issue) =>
  getFixPhotoUrls(issue)[0] || "";

const createAuditEntry = ({ status, note, updatedBy, eventType }) => ({
  status,
  note: note || "",
  updatedBy: updatedBy || "",
  updatedAt: new Date(),
  eventType: eventType || "status_update"
});

const appendHistory = (issue, entries) => [
  ...(Array.isArray(issue?.history) ? issue.history : []),
  ...entries.filter(Boolean)
];

const EvidencePhotoBox = ({ label, urls, alt, onRemove, removableFrom = PHOTO_LIMIT }) => (
  <div className="issue-ticket-photo-group">
    <span>{label}</span>
    <div className="issue-ticket-photo-grid">
      {Array.from({ length: PHOTO_LIMIT }).map((_, index) => {
        const src = urls[index];
        return src ? (
          <figure key={`${label}-${src}-${index}`}>
            <img className="issue-ticket-detail-photo" src={src} alt={`${alt} ${index + 1}`} />
            {onRemove && index >= removableFrom && (
              <button
                type="button"
                className="photo-remove-btn issue-remove-btn"
                onClick={() => onRemove(index - removableFrom)}
                aria-label={`Remove selected ${alt} ${index + 1}`}
              >
                &times;
              </button>
            )}
          </figure>
        ) : (
          <div key={`${label}-empty-${index}`} className="issue-ticket-detail-photo issue-ticket-detail-photo--empty" aria-label={`${alt} slot ${index + 1}`} />
        );
      })}
    </div>
  </div>
);

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

const IssueHistoryTimeline = ({ issue }) => {
  const createdEntry = issue.createdAt
    ? {
        status: ISSUE_STATUS.OPEN,
        note: issue.issueDescription || "Issue created",
        updatedBy: issue.reportedBy || "",
        updatedAt: issue.createdAt,
        eventType: "issue_created"
      }
    : null;
  const entries = [createdEntry, ...(Array.isArray(issue.history) ? issue.history : [])].filter(Boolean);
  const sortedEntries = [...entries].sort((first, second) => {
    const firstTime = toDate(first.updatedAt)?.getTime() || 0;
    const secondTime = toDate(second.updatedAt)?.getTime() || 0;
    return secondTime - firstTime;
  });

  return (
    <div className="issue-history-panel">
      <div className="card-header-row">
        <h3 className="section-title">Status History</h3>
        <span className="hint-text">{sortedEntries.length} entries</span>
      </div>
      {sortedEntries.length > 0 ? (
        <ol className="issue-history-timeline">
          {sortedEntries.map((entry, index) => (
            <li key={`${entry.eventType || "event"}-${index}`}>
              <span className={statusClassName(entry.status)}>{entry.status || "Update"}</span>
              <div>
                <strong>{String(entry.eventType || "status update").replace(/_/g, " ")}</strong>
                <p>{entry.updatedBy || "-"} · {formatDateTime(entry.updatedAt)}</p>
                {entry.note ? <small>{entry.note}</small> : null}
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="hint-text">No status history recorded yet.</p>
      )}
    </div>
  );
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
  defectPhotoUrls: getDefectPhotoUrls(issue),
  defectPhotoStoragePath: issue.defectPhotoStoragePath || "",
  defectPhotoUploadedAt: issue.defectPhotoUploadedAt || null,
  defectPhotoUploadedBy: issue.defectPhotoUploadedBy || "",
  fixPhotoUrl: getFixPhotoUrl(issue),
  fixPhotoUrls: getFixPhotoUrls(issue),
  fixPhotoStoragePath: issue.fixPhotoStoragePath || "",
  fixPhotoUploadedAt: issue.fixPhotoUploadedAt || null,
  fixPhotoUploadedBy: issue.fixPhotoUploadedBy || "",
  verificationComments: issue.verificationComments || "",
  history: Array.isArray(issue.history) ? issue.history : [],
  aiRecommendation: issue.aiRecommendation || "",
  photoFiles: [],
  photoPreviews: []
});

const createVerificationFormFromIssue = (issue) => ({
  ...emptyVerificationForm,
  issueDescription: issue?.issueDescription || "",
  rectification: issue?.rectification || "",
  verificationComments: issue?.verificationComments || ""
});

const filterIssues = (issues, filters) => {
  const search = normalizeText(filters.search);
  const status = normalizeText(filters.status);
  const priority = normalizeText(filters.priority);
  const month = String(filters.month || "");

  return issues.filter((issue) => {
    if (status && normalizeText(issue.status) !== status) return false;
    if (priority && normalizeText(issue.priority) !== priority) return false;
    if (month) {
      const issueDate = toDate(issue.reportedAt || issue.createdAt);
      const issueMonth = issue.periodKey || (issueDate
        ? `${issueDate.getFullYear()}-${String(issueDate.getMonth() + 1).padStart(2, "0")}`
        : "");
      if (issueMonth !== month) return false;
    }

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
          <span>Defect Photos (max 3)</span>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(event) => onChange("photoFiles", Array.from(event.target.files || []))}
            disabled={getDefectPhotoUrls(form).length + (form.photoPreviews || []).length >= PHOTO_LIMIT}
          />
        </label>
        <EvidencePhotoBox
          label="Defect evidence"
          urls={[...getDefectPhotoUrls(form), ...(form.photoPreviews || [])].slice(0, PHOTO_LIMIT)}
          alt="Defect evidence"
        />
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
  mode = "resolve",
  onChange,
  onCancel,
  onSubmit
}) => (
  <section className="dashboard-card issue-ticket-form-card">
    <div className="card-header-row">
      <h2 className="section-title">{mode === "close" ? "Review Resolved Issue" : "Verify & Resolve Issue"}</h2>
      <button type="button" className="view-all-link" onClick={onCancel}>Close</button>
    </div>
    <form onSubmit={onSubmit} className="issue-ticket-form">
      <div className="issue-ticket-verify-summary">
        <span>Issue</span>
        <strong>{issue.issueTitle}</strong>
      </div>
      <div className="issue-ticket-detail-grid">
        <div>
          <span>Status</span>
          <strong>{issue.status || ISSUE_STATUS.OPEN}</strong>
        </div>
        <div>
          <span>Priority</span>
          <strong>{issue.priority || PRIORITY.MEDIUM}</strong>
        </div>
        <div>
          <span>Floor / Location</span>
          <strong>{issue.floorName || "-"}</strong>
        </div>
        <div>
          <span>Updated</span>
          <strong>{formatDateTime(issue.updatedAt || issue.createdAt)}</strong>
        </div>
      </div>
      <div className="issue-evidence-sections">
        <EvidencePhotoBox
          label="Fault Photos (Before)"
          urls={getDefectPhotoUrls(issue).slice(0, PHOTO_LIMIT)}
          alt="Original defect evidence"
        />
        <EvidencePhotoBox
          label="After-Repair Photos"
          urls={[...getFixPhotoUrls(issue), ...(form.afterPhotoPreviews || [])].slice(0, PHOTO_LIMIT)}
          alt="Closure evidence"
          removableFrom={getFixPhotoUrls(issue).length}
          onRemove={(index) => onChange("removeAfterPhotoFile", index)}
        />
      </div>
      <label>
        <span>After Photos (max 3)</span>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={(event) => onChange("afterPhotoFiles", Array.from(event.target.files || []))}
          required={getFixPhotoUrls(issue).length === 0}
          disabled={getFixPhotoUrls(issue).length + (form.afterPhotoPreviews || []).length >= PHOTO_LIMIT}
        />
      </label>
      <label>
        <span>Defect Details</span>
        <textarea
          rows={3}
          value={form.issueDescription}
          onChange={(event) => onChange("issueDescription", event.target.value)}
          required
        />
      </label>
      <label>
        <span>Resolution Details</span>
        <textarea
          rows={3}
          value={form.rectification}
          onChange={(event) => onChange("rectification", event.target.value)}
          required
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
      <IssueHistoryTimeline issue={issue} />
      <div className="issue-ticket-actions">
        <button type="button" className="secondary-button" onClick={onCancel}>Cancel</button>
        <button type="submit" className="primary-button" disabled={saving}>
          {saving ? (mode === "close" ? "Closing..." : "Resolving...") : (mode === "close" ? "Close Issue" : "Mark Resolved")}
        </button>
      </div>
    </form>
  </section>
);

const IssueDetail = ({ issue, buildingName, onEdit, onDelete, onVerifyClose, onViewChecklist }) => (
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
    <div className="issue-ticket-copy-block">
      <span>Verification Comments</span>
      <p>{issue.verificationComments || "-"}</p>
    </div>
    <div className="issue-evidence-sections">
      <EvidencePhotoBox
        label="Fault Photos (Before)"
        urls={getDefectPhotoUrls(issue)}
        alt="Original defect evidence"
      />
      <EvidencePhotoBox
        label="After-Repair Photos"
        urls={getFixPhotoUrls(issue)}
        alt="Closure evidence"
      />
    </div>
    <IssueHistoryTimeline issue={issue} />
    <div className="issue-ticket-actions">
      <button
        type="button"
        className="secondary-button issue-icon-action"
        onClick={() => onViewChecklist(issue)}
        aria-label="View Checklist"
        title="View Checklist"
      >
        <span aria-hidden="true">{"\uD83D\uDC41"}</span>
      </button>
      <button
        type="button"
        className="secondary-button"
        onClick={() => onEdit(issue)}
        disabled={normalizeText(issue.status) === normalizeText(ISSUE_STATUS.CLOSED)}
        title={normalizeText(issue.status) === normalizeText(ISSUE_STATUS.CLOSED) ? "Closed issues cannot be edited" : "Edit issue"}
      >
        Edit
      </button>
      <button type="button" className="primary-button" onClick={() => onVerifyClose(issue)} disabled={normalizeText(issue.status) === normalizeText(ISSUE_STATUS.CLOSED)}>
        {normalizeText(issue.status) === normalizeText(ISSUE_STATUS.RESOLVED) ? "Verify Closure" : "Verify Issue"}
      </button>
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
        <strong>{issue.floorName || issue.location || issue.issueTitle || "-"}</strong>
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

const Issues = ({ verifyClosureMode = false }) => {
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { loading, error, buildings, issues } = useFsmDashboardData(getFsmLookupIds(user));
  const [filters, setFilters] = useState({
    search: "",
    status: "",
    priority: "",
    month: ""
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
    () => {
      const sourceIssues = verifyClosureMode
        ? enrichedIssues.filter((issue) =>
            verifyClosureStatuses.some((status) => normalizeText(issue.status) === normalizeText(status))
          )
        : enrichedIssues;

      return sortIssues(filterIssues(sourceIssues, filters), "updated");
    },
    [enrichedIssues, filters, verifyClosureMode]
  );

  const issueIdFromQuery = searchParams.get("issueId") || "";
  const activeIssue =
    visibleIssues.find((issue) => getIssueKey(issue) === issueIdFromQuery || issue.issueId === issueIdFromQuery) ||
    visibleIssues.find((issue) => issue.id === activeIssueId) ||
    visibleIssues[0] ||
    null;

  useEffect(() => {
    if (!verifyClosureMode || !activeIssue) return;
    setVerificationForm(createVerificationFormFromIssue(activeIssue));
    setActiveForm("review");
  }, [activeIssue, verifyClosureMode]);

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

  const openChecklistItem = (issue) => {
    const issueId = issue.id || getIssueKey(issue);
    navigate(`/fsm/inspections?issueId=${encodeURIComponent(issueId)}`, {
      state: { issue }
    });
  };

  const handleIssueFormChange = (field, value) => {
    if (field === "photoFiles") {
      setIssueForm((current) => {
        const remaining = PHOTO_LIMIT - getDefectPhotoUrls(current).length - (current.photoFiles || []).length;
        const selected = value.slice(0, Math.max(remaining, 0));
        return {
          ...current,
          photoFiles: [...(current.photoFiles || []), ...selected],
          photoPreviews: [
            ...(current.photoPreviews || []),
            ...selected.map((file) => URL.createObjectURL(file))
          ]
        };
      });
      return;
    }

    setIssueForm((current) => ({ ...current, [field]: value }));
  };

  const handleVerificationChange = (field, value) => {
    if (field === "removeAfterPhotoFile") {
      setVerificationForm((current) => ({
        ...current,
        afterPhotoFiles: (current.afterPhotoFiles || []).filter((_, index) => index !== value),
        afterPhotoPreviews: (current.afterPhotoPreviews || []).filter((_, index) => index !== value)
      }));
      return;
    }

    if (field === "defectPhotoFiles") {
      setVerificationForm((current) => ({
        ...current,
        defectPhotoFiles: [
          ...(current.defectPhotoFiles || []),
          ...value.slice(0, Math.max(PHOTO_LIMIT - getDefectPhotoUrls(activeIssue).length - (current.defectPhotoFiles || []).length, 0))
        ],
        defectPhotoPreviews: [
          ...(current.defectPhotoPreviews || []),
          ...value
            .slice(0, Math.max(PHOTO_LIMIT - getDefectPhotoUrls(activeIssue).length - (current.defectPhotoFiles || []).length, 0))
            .map((file) => URL.createObjectURL(file))
        ]
      }));
      return;
    }

    if (field === "afterPhotoFiles") {
      setVerificationForm((current) => ({
        ...current,
        afterPhotoFiles: [
          ...(current.afterPhotoFiles || []),
          ...value.slice(0, Math.max(PHOTO_LIMIT - getFixPhotoUrls(activeIssue).length - (current.afterPhotoFiles || []).length, 0))
        ],
        afterPhotoPreviews: [
          ...(current.afterPhotoPreviews || []),
          ...value
            .slice(0, Math.max(PHOTO_LIMIT - getFixPhotoUrls(activeIssue).length - (current.afterPhotoFiles || []).length, 0))
            .map((file) => URL.createObjectURL(file))
        ]
      }));
      return;
    }

    setVerificationForm((current) => ({ ...current, [field]: value }));
  };

  const uploadIssuePhotos = async (files, folder) => {
    const uploadedPhotos = [];
    for (const file of files || []) {
      const uploaded = await uploadFile(file, folder);
      if (uploaded?.url) uploadedPhotos.push(uploaded);
    }
    return uploadedPhotos;
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
      let defectPhotoUrls = getDefectPhotoUrls(issueForm);
      const uploadedDefectPhotos = await uploadIssuePhotos(
        issueForm.photoFiles,
        getIssueDefectPhotoFolder(issueForm, issueKey)
      );
      if (uploadedDefectPhotos.length) {
        defectPhotoUrls = uniqueValues([...defectPhotoUrls, ...uploadedDefectPhotos.map((photo) => photo.url)]).slice(0, PHOTO_LIMIT);
        issuePhotoUrl = defectPhotoUrls[0] || "";
        defectPhotoUrl = defectPhotoUrls[0] || "";
        defectPhotoStoragePath = uploadedDefectPhotos[uploadedDefectPhotos.length - 1].path;
        defectPhotoUploadedAt = new Date();
        defectPhotoUploadedBy = getPrimaryFsmId(user);
      }

      const historyEntries = [];
      if (activeForm === "create") {
        historyEntries.push(createAuditEntry({
          status: issueForm.status || ISSUE_STATUS.OPEN,
          note: issueForm.issueDescription || "Issue created",
          updatedBy: getPrimaryFsmId(user),
          eventType: "issue_created"
        }));
      }
      if (activeForm === "edit" && activeIssue && normalizeText(activeIssue.status) !== normalizeText(issueForm.status)) {
        historyEntries.push(createAuditEntry({
          status: issueForm.status || ISSUE_STATUS.OPEN,
          note: issueForm.rectification || issueForm.issueDescription || "",
          updatedBy: getPrimaryFsmId(user),
          eventType: "status_update"
        }));
      }
      if (uploadedDefectPhotos.length) {
        historyEntries.push(createAuditEntry({
          status: issueForm.status || ISSUE_STATUS.OPEN,
          note: `${uploadedDefectPhotos.length} defect photo(s) uploaded`,
          updatedBy: getPrimaryFsmId(user),
          eventType: "photos_uploaded"
        }));
      }

      const payload = {
        ...issueForm,
        issueKey,
        issueId: issueForm.issueId || issueKey,
        reportedBy: getPrimaryFsmId(user),
        issuePhotoUrl,
        defectPhotoUrl,
        defectPhotoUrls,
        defectPhotoStoragePath,
        defectPhotoUploadedAt,
        defectPhotoUploadedBy,
        ...(historyEntries.length ? { history: appendHistory(issueForm, historyEntries) } : {})
      };
      delete payload.photoFiles;
      delete payload.photoPreviews;

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

    if (((verificationForm.afterPhotoFiles || []).length === 0 && getFixPhotoUrls(activeIssue).length === 0) || !verificationForm.verificationComments.trim()) {
      setFormError("After photo and verification comments are required.");
      return;
    }

    if (!window.confirm("Mark this issue as resolved? Please confirm the defect has been fixed and the uploaded resolution photo is correct.")) {
      return;
    }

    try {
      setSaving(true);
      const issueKey = getIssueKey(activeIssue);
      let issuePhotoUrl = activeIssue.issuePhotoUrl || getDefectPhotoUrl(activeIssue);
      let defectPhotoUrl = getDefectPhotoUrl(activeIssue);
      let defectPhotoStoragePath = activeIssue.defectPhotoStoragePath || "";
      let defectPhotoUploadedAt = activeIssue.defectPhotoUploadedAt || null;
      let defectPhotoUploadedBy = activeIssue.defectPhotoUploadedBy || "";
      let fixPhotoUrl = getFixPhotoUrl(activeIssue);
      let fixPhotoStoragePath = activeIssue.fixPhotoStoragePath || "";
      let fixPhotoUploadedAt = activeIssue.fixPhotoUploadedAt || null;
      let fixPhotoUploadedBy = activeIssue.fixPhotoUploadedBy || "";
      let defectPhotoUrls = getDefectPhotoUrls(activeIssue);
      let fixPhotoUrls = getFixPhotoUrls(activeIssue);

      const uploadedDefectPhotos = await uploadIssuePhotos(
        verificationForm.defectPhotoFiles,
        getIssueDefectPhotoFolder(activeIssue, issueKey)
      );
      if (uploadedDefectPhotos.length) {
        defectPhotoUrls = uniqueValues([...defectPhotoUrls, ...uploadedDefectPhotos.map((photo) => photo.url)]).slice(0, PHOTO_LIMIT);
        issuePhotoUrl = defectPhotoUrls[0] || "";
        defectPhotoUrl = defectPhotoUrls[0] || "";
        defectPhotoStoragePath = uploadedDefectPhotos[uploadedDefectPhotos.length - 1].path;
        defectPhotoUploadedAt = new Date();
        defectPhotoUploadedBy = getPrimaryFsmId(user);
      }

      const uploadedFixPhotos = await uploadIssuePhotos(verificationForm.afterPhotoFiles, `closure-verifications/${issueKey}`);
      if (uploadedFixPhotos.length) {
        fixPhotoUrls = uniqueValues([...fixPhotoUrls, ...uploadedFixPhotos.map((photo) => photo.url)]).slice(0, PHOTO_LIMIT);
        fixPhotoUrl = fixPhotoUrls[0] || "";
        fixPhotoStoragePath = uploadedFixPhotos[uploadedFixPhotos.length - 1].path;
        fixPhotoUploadedAt = new Date();
        fixPhotoUploadedBy = getPrimaryFsmId(user);
      }

      await addClosureVerification({
        verificationId: `closure-${issueKey}-${Date.now()}`,
        issueId: issueKey,
        resultId: activeIssue.resultId || "",
        verifiedBy: fixPhotoUploadedBy || getPrimaryFsmId(user),
        beforePhotoUrl: defectPhotoUrl,
        afterPhotoUrl: fixPhotoUrl,
        defectPhotoUrl,
        defectPhotoUrls,
        defectPhotoStoragePath,
        defectPhotoUploadedAt,
        defectPhotoUploadedBy,
        fixPhotoUrl,
        fixPhotoUrls,
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
        issuePhotoUrl,
        defectPhotoUrl,
        defectPhotoUrls,
        defectPhotoStoragePath,
        defectPhotoUploadedAt,
        defectPhotoUploadedBy,
        fixPhotoUrl,
        fixPhotoUrls,
        fixPhotoStoragePath,
        fixPhotoUploadedAt,
        fixPhotoUploadedBy,
        verificationComments: verificationForm.verificationComments,
        history: appendHistory(activeIssue, [
          uploadedDefectPhotos.length || uploadedFixPhotos.length
            ? createAuditEntry({
                status: ISSUE_STATUS.RESOLVED,
                note: `${uploadedDefectPhotos.length + uploadedFixPhotos.length} photo(s) uploaded`,
                updatedBy: getPrimaryFsmId(user),
                eventType: "photos_uploaded"
              })
            : null,
          createAuditEntry({
            status: ISSUE_STATUS.RESOLVED,
            note: verificationForm.verificationComments,
            updatedBy: getPrimaryFsmId(user),
            eventType: "status_update"
          })
        ])
      });

      closePanels({ keepSuccess: true });
      setFormSuccess("Issue marked as resolved successfully.");
    } catch (verifyError) {
      setFormError(verifyError.message || "Could not verify and resolve issue.");
    } finally {
      setSaving(false);
    }
  };

  const handleCloseReviewedIssue = async (event) => {
    event.preventDefault();
    if (!activeIssue || saving) return;
    setFormError("");
    setFormSuccess("");

    if (normalizeText(activeIssue.status) !== normalizeText(ISSUE_STATUS.RESOLVED)) {
      setFormError("Only resolved issues can be closed from Verify Closure.");
      return;
    }

    if (
      !activeIssue.issueTitle?.trim() ||
      !verificationForm.issueDescription.trim() ||
      !verificationForm.rectification.trim() ||
      getDefectPhotoUrls(activeIssue).length === 0 ||
      ((verificationForm.afterPhotoFiles || []).length === 0 && getFixPhotoUrls(activeIssue).length === 0) ||
      !verificationForm.verificationComments.trim()
    ) {
      setFormError("Issue details, existing before photo, after photo, resolution details, and verification comments are required before closing.");
      return;
    }

    if (!window.confirm("Close this issue? Please confirm the resolved work has been reviewed and accepted.")) {
      return;
    }

    try {
      setSaving(true);
      const issueKey = getIssueKey(activeIssue);
      let issuePhotoUrl = activeIssue.issuePhotoUrl || getDefectPhotoUrl(activeIssue);
      let defectPhotoUrl = getDefectPhotoUrl(activeIssue);
      let defectPhotoStoragePath = activeIssue.defectPhotoStoragePath || "";
      let defectPhotoUploadedAt = activeIssue.defectPhotoUploadedAt || null;
      let defectPhotoUploadedBy = activeIssue.defectPhotoUploadedBy || "";
      let fixPhotoUrl = getFixPhotoUrl(activeIssue);
      let fixPhotoStoragePath = activeIssue.fixPhotoStoragePath || "";
      let fixPhotoUploadedAt = activeIssue.fixPhotoUploadedAt || null;
      let fixPhotoUploadedBy = activeIssue.fixPhotoUploadedBy || "";
      let defectPhotoUrls = getDefectPhotoUrls(activeIssue);
      let fixPhotoUrls = getFixPhotoUrls(activeIssue);

      const uploadedDefectPhotos = await uploadIssuePhotos(
        verificationForm.defectPhotoFiles,
        getIssueDefectPhotoFolder(activeIssue, issueKey)
      );
      if (uploadedDefectPhotos.length) {
        defectPhotoUrls = uniqueValues([...defectPhotoUrls, ...uploadedDefectPhotos.map((photo) => photo.url)]).slice(0, PHOTO_LIMIT);
        issuePhotoUrl = defectPhotoUrls[0] || "";
        defectPhotoUrl = defectPhotoUrls[0] || "";
        defectPhotoStoragePath = uploadedDefectPhotos[uploadedDefectPhotos.length - 1].path;
        defectPhotoUploadedAt = new Date();
        defectPhotoUploadedBy = getPrimaryFsmId(user);
      }

      const uploadedFixPhotos = await uploadIssuePhotos(verificationForm.afterPhotoFiles, `closure-verifications/${issueKey}`);
      if (uploadedFixPhotos.length) {
        fixPhotoUrls = uniqueValues([...fixPhotoUrls, ...uploadedFixPhotos.map((photo) => photo.url)]).slice(0, PHOTO_LIMIT);
        fixPhotoUrl = fixPhotoUrls[0] || "";
        fixPhotoStoragePath = uploadedFixPhotos[uploadedFixPhotos.length - 1].path;
        fixPhotoUploadedAt = new Date();
        fixPhotoUploadedBy = getPrimaryFsmId(user);
      }

      await addClosureVerification({
        verificationId: `closure-${issueKey}-${Date.now()}`,
        issueId: issueKey,
        resultId: activeIssue.resultId || "",
        verifiedBy: getPrimaryFsmId(user),
        beforePhotoUrl: defectPhotoUrl,
        afterPhotoUrl: fixPhotoUrl,
        defectPhotoUrl,
        defectPhotoUrls,
        defectPhotoStoragePath,
        defectPhotoUploadedAt,
        defectPhotoUploadedBy,
        fixPhotoUrl,
        fixPhotoUrls,
        fixPhotoStoragePath,
        fixPhotoUploadedAt,
        fixPhotoUploadedBy,
        verificationComments: verificationForm.verificationComments,
        approvalStatus: APPROVAL_STATUS.APPROVED
      });

      await upsertIssue({
        ...createFormFromIssue(activeIssue),
        issueKey,
        issueId: activeIssue.issueId || issueKey,
        reportedBy: activeIssue.reportedBy || getPrimaryFsmId(user),
        status: ISSUE_STATUS.CLOSED,
        location: activeIssue.location || "",
        issueDescription: verificationForm.issueDescription,
        rectification: verificationForm.rectification,
        issuePhotoUrl,
        defectPhotoUrl,
        defectPhotoUrls,
        defectPhotoStoragePath,
        defectPhotoUploadedAt,
        defectPhotoUploadedBy,
        fixPhotoUrl,
        fixPhotoUrls,
        fixPhotoStoragePath,
        fixPhotoUploadedAt,
        fixPhotoUploadedBy,
        verificationComments: verificationForm.verificationComments,
        history: appendHistory(activeIssue, [
          uploadedDefectPhotos.length || uploadedFixPhotos.length
            ? createAuditEntry({
                status: ISSUE_STATUS.CLOSED,
                note: `${uploadedDefectPhotos.length + uploadedFixPhotos.length} photo(s) uploaded`,
                updatedBy: getPrimaryFsmId(user),
                eventType: "photos_uploaded"
              })
            : null,
          createAuditEntry({
            status: ISSUE_STATUS.CLOSED,
            note: verificationForm.verificationComments,
            updatedBy: getPrimaryFsmId(user),
            eventType: "status_update"
          })
        ])
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
          <h1>{verifyClosureMode ? "Verify Closure" : "Issue Management"}</h1>
          <p>
            {verifyClosureMode
              ? "Review resolved issue tickets before final closure."
              : "Create, manage, verify, and close fire safety issue tickets."}
          </p>
        </div>
        {!verifyClosureMode && (
          <button type="button" className="primary-button" onClick={openCreateForm}>
            Create Issue
          </button>
        )}
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
        ) : verifyClosureMode && activeIssue && normalizeText(activeIssue.status) !== normalizeText(ISSUE_STATUS.CLOSED) ? (
          <VerifyClosePanel
            issue={activeIssue}
            form={verificationForm}
            saving={saving}
            mode="close"
            onChange={handleVerificationChange}
            onCancel={closePanels}
            onSubmit={handleCloseReviewedIssue}
          />
        ) : verifyClosureMode && activeIssue ? (
          <IssueDetail
            issue={activeIssue}
            buildingName={activeIssue.buildingName}
            onEdit={openEditForm}
            onDelete={setDeleteTarget}
            onVerifyClose={openVerifyClose}
            onViewChecklist={openChecklistItem}
            saving={saving}
          />
        ) : activeIssue ? (
          <IssueDetail
            issue={activeIssue}
            buildingName={activeIssue.buildingName}
            onEdit={openEditForm}
            onDelete={setDeleteTarget}
            onVerifyClose={openVerifyClose}
            onViewChecklist={openChecklistItem}
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
            <h2 className="section-title">{verifyClosureMode ? "Resolved Tickets Ready for Review" : "Fire Safety Issue Tickets"}</h2>
            <span className="hint-text">{visibleIssues.length} shown</span>
          </div>

          <div className="issue-ticket-toolbar issue-ticket-toolbar--four">
            <input
              type="search"
              value={filters.search}
              onChange={(event) => handleFilterChange("search", event.target.value)}
              placeholder="Search issues..."
            />
            <select value={filters.status} onChange={(event) => handleFilterChange("status", event.target.value)}>
              <option value="">All statuses</option>
              {(verifyClosureMode ? verifyClosureStatuses : issueTicketStatuses).map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
            <select value={filters.priority} onChange={(event) => handleFilterChange("priority", event.target.value)}>
              <option value="">All priorities</option>
              {Object.values(PRIORITY).map((priority) => (
                <option key={priority} value={priority}>{priority}</option>
              ))}
            </select>
            <input
              type="month"
              value={filters.month}
              onChange={(event) => handleFilterChange("month", event.target.value)}
              aria-label="Reporting month"
              title="Reporting month"
            />
          </div>

          <div className="issue-ticket-table-wrapper">
            <table className="dashboard-table issue-ticket-table">
              <thead>
                <tr>
                  <th>Level / Location</th>
                  <th>Finding</th>
                  <th>Building</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {visibleIssues.map((issue) => {
                  const locationLabel = issue.floorName || issue.location || "-";
                  const issueUpdatedAt = formatDateTime(issue.updatedAt || issue.createdAt);

                  return (
                    <tr
                      key={issue.id}
                      className={activeIssue?.id === issue.id ? "issue-ticket-row-active" : ""}
                      onClick={() => setActiveIssueId(issue.id)}
                    >
                      <td title={locationLabel}>{locationLabel}</td>
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
