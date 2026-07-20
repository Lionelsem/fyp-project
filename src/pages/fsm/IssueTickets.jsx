import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ISSUE_STATUS, PRIORITY } from "../../constants/status";
import { useAuthContext } from "../../context/AuthContext";
import { useFsmDashboardData } from "../../hooks/useFsmDashboardData";
import { deleteIssue } from "../../services/issueService";
import { buildIssuePeriodSnapshot, getMonthBounds, parseReportDate } from "../../utils/issueReporting";
import ResponsiveTableRegion from "../../components/common/ResponsiveTableRegion";

const getFsmLookupIds = (user) => [
  user?.uid,
  user?.authUid,
  user?.profileId,
  user?.id,
  user?.userId,
  user?.fsmId,
  user?.assignedFsmId,
  user?.staffId,
  user?.employeeId,
  user?.accountId,
  user?.firestoreId
].filter(Boolean);

const normalizeText = (value) => String(value || "").trim().toLowerCase();
const getIssueKey = (issue) => issue.issueKey || issue.id || issue.issueId;

const formatDate = (value) => {
  const date = parseReportDate(value);
  return date
    ? date.toLocaleDateString("en-SG", { day: "2-digit", month: "short", year: "numeric" })
    : "-";
};

const statusClassName = (status) => {
  const normalized = normalizeText(status);
  if (normalized === normalizeText(ISSUE_STATUS.CLOSED)) return "issue-status issue-status--closed";
  if (normalized === normalizeText(ISSUE_STATUS.RESOLVED)) return "issue-status issue-status--resolved";
  if (normalized === normalizeText(ISSUE_STATUS.IN_PROGRESS)) return "issue-status issue-status--progress";
  return "issue-status issue-status--open";
};

const priorityClassName = (priority) => {
  const normalized = normalizeText(priority);
  if (normalized === normalizeText(PRIORITY.HIGH)) return "issue-priority issue-priority--high";
  if (normalized === normalizeText(PRIORITY.LOW)) return "issue-priority issue-priority--low";
  return "issue-priority issue-priority--medium";
};

const IssueTickets = () => {
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const { loading, error, issues } = useFsmDashboardData(getFsmLookupIds(user));
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [monthFilter, setMonthFilter] = useState("");
  const [deletingIssueKey, setDeletingIssueKey] = useState("");
  const [actionError, setActionError] = useState("");

  const issueRecords = useMemo(() => {
    if (!monthFilter) {
      return issues.map((issue) => ({ issue, statusAtEnd: issue.status || ISSUE_STATUS.OPEN }));
    }

    const [year, month] = monthFilter.split("-").map(Number);
    const bounds = getMonthBounds(month, year);
    return buildIssuePeriodSnapshot(issues, bounds.start, bounds.end).relevant;
  }, [issues, monthFilter]);

  const visibleIssues = useMemo(() => {
    const query = normalizeText(search);
    return issueRecords
      .filter(({ issue, statusAtEnd }) => {
        if (statusFilter && normalizeText(statusAtEnd) !== normalizeText(statusFilter)) return false;
        if (priorityFilter && normalizeText(issue.priority) !== normalizeText(priorityFilter)) return false;
        if (!query) return true;
        return [
          issue.issueId,
          issue.issueTitle,
          issue.issueDescription,
          issue.itemLabel,
          issue.floorName,
          issue.location,
          issue.priority,
          statusAtEnd
        ].some((value) => normalizeText(value).includes(query));
      })
      .sort((first, second) => {
        const firstDate = parseReportDate(first.issue.updatedAt || first.issue.reportedAt || first.issue.createdAt);
        const secondDate = parseReportDate(second.issue.updatedAt || second.issue.reportedAt || second.issue.createdAt);
        return (secondDate?.getTime() || 0) - (firstDate?.getTime() || 0);
      });
  }, [issueRecords, priorityFilter, search, statusFilter]);

  const summary = useMemo(() => {
    const inProgress = issueRecords.filter(({ statusAtEnd }) =>
      normalizeText(statusAtEnd) === normalizeText(ISSUE_STATUS.IN_PROGRESS)
    );
    return {
      total: issueRecords.length,
      pending: inProgress.length,
      completed: issueRecords.filter(({ statusAtEnd }) => normalizeText(statusAtEnd) === normalizeText(ISSUE_STATUS.CLOSED)).length,
      urgent: issueRecords.filter(({ issue, statusAtEnd }) =>
        normalizeText(issue.priority) === normalizeText(PRIORITY.HIGH) &&
        normalizeText(statusAtEnd) !== normalizeText(ISSUE_STATUS.CLOSED)
      ).length
    };
  }, [issueRecords]);

  const openChecklistIssue = (issue, mode = "view") => {
    const issueKey = getIssueKey(issue);
    navigate(`/fsm/inspections?issueId=${encodeURIComponent(issueKey)}&mode=${mode}`, { state: { issue } });
  };

  const handleDeleteIssue = async (issue) => {
    const issueKey = getIssueKey(issue);
    if (!issueKey || !window.confirm(`Delete "${issue.issueTitle || "this issue"}"? The linked inspection checklist will be retained.`)) return;

    try {
      setActionError("");
      setDeletingIssueKey(issueKey);
      await deleteIssue(issue.id || issueKey);
    } catch (deleteError) {
      setActionError(deleteError.message || "Could not delete issue ticket.");
    } finally {
      setDeletingIssueKey("");
    }
  };

  const cards = [
    { label: "Inspection Issue Tickets", value: summary.total, note: "Live from Firestore", tone: "total", icon: "\uD83D\uDCCB", iconBg: "#ecfdf5", iconColor: "#047857" },
    { label: "Pending", value: summary.pending, note: `${summary.pending} in progress`, tone: "pending", icon: "\u23F3", iconBg: "#fef3c7", iconColor: "#b45309" },
    { label: "Completed", value: summary.completed, note: "Closed after verification", tone: "completed", icon: "\u2705", iconBg: "#dbeafe", iconColor: "#0284c7" },
    { label: "Urgent Issues", value: summary.urgent, note: "High priority, not closed", tone: "urgent", icon: "\uD83D\uDEA8", iconBg: "#fee2e2", iconColor: "#dc2626" }
  ];

  return (
    <main className="dashboard-container issue-overview-page">
      <nav className="page-breadcrumb" aria-label="Breadcrumb">
        <button type="button" onClick={() => navigate("/fsm/inspections")}>Inspections</button>
        <span aria-hidden="true">/</span>
        <span aria-current="page">Issue Tickets</span>
      </nav>
      <div className="page-header">
        <div>
          <h1>Issue Tickets</h1>
          <p className="page-subtitle">Review inspection-linked issues and open the checklist to update them.</p>
        </div>
      </div>

      <section className="issue-overview-stats" aria-label="Issue ticket summary">
        {cards.map((card) => (
          <article key={card.label} className={`dashboard-card issue-overview-stat issue-overview-stat--${card.tone}`}>
            <div className="issue-overview-stat-heading">
              <span className="card-icon issue-overview-stat-icon" style={{ backgroundColor: card.iconBg, color: card.iconColor }} aria-hidden="true">{card.icon}</span>
              <span>{card.label}</span>
            </div>
            <strong>{card.value}</strong>
            <small>{card.note}</small>
          </article>
        ))}
      </section>

      <section className="dashboard-card issue-overview-table-card">
        <div className="card-header-row">
          <div>
            <p className="overline">Inspection Issues</p>
            <h2 className="section-title">Issue status and checklist linkage</h2>
          </div>
          <span className="hint-text">{visibleIssues.length} shown</span>
        </div>

        <div className="issue-ticket-toolbar issue-overview-toolbar">
          <label className="issue-overview-filter">
            <span>Search</span>
            <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search issues..." />
          </label>
          <label className="issue-overview-filter">
            <span>Status</span>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="">All statuses</option>
              {Object.values(ISSUE_STATUS).filter((status) => status !== ISSUE_STATUS.DRAFT).map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </label>
          <label className="issue-overview-filter">
            <span>Priority</span>
            <select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)}>
              <option value="">All priorities</option>
              {Object.values(PRIORITY).map((priority) => (
                <option key={priority} value={priority}>{priority}</option>
              ))}
            </select>
          </label>
          <label className="issue-overview-filter">
            <span>Reporting month</span>
            <input type="month" value={monthFilter} onChange={(event) => setMonthFilter(event.target.value)} />
          </label>
        </div>

        {error && <div className="error-state">{error}</div>}
        {actionError && <div className="error-state">{actionError}</div>}
        {loading ? (
          <div className="loading-state">Loading issue tickets...</div>
        ) : (
          <ResponsiveTableRegion
            label="Issue ticket overview"
            className="issue-ticket-table-wrapper responsive-table-region--cards"
          >
            <table className="dashboard-table responsive-card-table issue-overview-table">
              <thead>
                <tr>
                  <th>Issue</th>
                  <th>Checklist Item</th>
                  <th>Location</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Updated</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {visibleIssues.map(({ issue, statusAtEnd }) => (
                  <tr key={getIssueKey(issue)}>
                    <td data-label="Issue">
                      <strong>{issue.issueTitle || issue.issueDescription || "Untitled issue"}</strong>
                    </td>
                    <td data-label="Checklist Item">{issue.itemLabel || issue.itemCode || "-"}</td>
                    <td data-label="Location">{issue.floorName || issue.location || "-"}</td>
                    <td data-label="Priority"><span className={priorityClassName(issue.priority)}>{issue.priority || PRIORITY.MEDIUM}</span></td>
                    <td data-label="Status"><span className={statusClassName(statusAtEnd)}>{statusAtEnd}</span></td>
                    <td data-label="Updated">{formatDate(issue.updatedAt || issue.reportedAt || issue.createdAt)}</td>
                    <td data-label="Action">
                      <div className="issue-overview-actions">
                        <button
                          type="button"
                          className="issue-overview-action issue-overview-action--view"
                          onClick={() => openChecklistIssue(issue, "view")}
                          aria-label={`View checklist for ${issue.issueTitle || "issue"}`}
                          title="View checklist"
                        >
                          <span aria-hidden="true">{"\uD83D\uDC41"}</span>
                        </button>
                        <button
                          type="button"
                          className="issue-overview-action issue-overview-action--edit"
                          onClick={() => openChecklistIssue(issue, "edit")}
                          disabled={normalizeText(statusAtEnd) === normalizeText(ISSUE_STATUS.CLOSED)}
                          aria-label={`Edit ${issue.issueTitle || "issue"} in checklist`}
                          title={normalizeText(statusAtEnd) === normalizeText(ISSUE_STATUS.CLOSED) ? "Closed issues cannot be edited" : "Edit in checklist"}
                        >
                          <span aria-hidden="true">{"\u270E"}</span>
                        </button>
                        <button
                          type="button"
                          className="issue-overview-action issue-overview-action--delete"
                          onClick={() => handleDeleteIssue(issue)}
                          disabled={deletingIssueKey === getIssueKey(issue)}
                          aria-label={`Delete ${issue.issueTitle || "issue"}`}
                          title="Delete issue"
                        >
                          <span aria-hidden="true">{"\uD83D\uDDD1"}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {visibleIssues.length === 0 && <div className="issue-ticket-empty">No issue tickets match the selected filters.</div>}
          </ResponsiveTableRegion>
        )}
      </section>
    </main>
  );
};

export default IssueTickets;
