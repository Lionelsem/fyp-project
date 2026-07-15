import React, { useState, useMemo } from "react";
import ResponsiveTableRegion from "../../components/common/ResponsiveTableRegion";
import { ISSUE_STATUS } from "../../constants/status";

const mockIssues = [
  {
    id: "DEF-2026-089",
    issueId: "DEF-2026-089",
    location: "Lobby Level 1",
    finding: "Fire Extinguisher Expired",
    proposedRectification: "Replace with new 3kg ABC powder extinguisher",
    status: "Open",
    lastUpdated: "Today"
  },
  {
    id: "DEF-2026-088",
    issueId: "DEF-2026-088",
    location: "Basement 2",
    finding: "Blocked Fire Exit Route",
    proposedRectification: "Clear pallets from fire escape pathway immediately",
    status: "In Progress",
    lastUpdated: "Yesterday"
  },
  {
    id: "DEF-2026-085",
    issueId: "DEF-2026-085",
    location: "Level 4, South Wing",
    finding: "Faulty Fire Alarm Panel Zone 3",
    proposedRectification: "Vendor to troubleshoot loop fault on zone 3",
    status: "Resolved",
    lastUpdated: "2 days ago"
  },
  {
    id: "DEF-2026-080",
    issueId: "DEF-2026-080",
    location: "Roof Deck",
    finding: "Hose Reel Pressure Low",
    proposedRectification: "Repair jockey pump seals",
    status: "Closed",
    lastUpdated: "5 days ago"
  },
  {
    id: "DEF-2026-079",
    issueId: "DEF-2026-079",
    location: "Level 2, North Wing",
    finding: "Emergency Light Faulty",
    proposedRectification: "Replace battery pack",
    status: "Closed",
    lastUpdated: "1 week ago"
  }
];

const getStatusStyle = (status) => {
  const normalized = String(status || "").trim().toLowerCase();
  if (normalized === "open") {
    return { color: "#b91c1c", backgroundColor: "#fee2e2" };
  }
  if (normalized === "in progress") {
    return { color: "#b45309", backgroundColor: "#fef3c7" };
  }
  if (normalized === "resolved") {
    return { color: "#047857", backgroundColor: "#ecfdf5" };
  }
  if (normalized === "closed") {
    return { color: "#4338ca", backgroundColor: "#eef2ff" };
  }
  return { color: "#475569", backgroundColor: "#f1f5f9" };
};

const statusOptions = [
  { label: "All Statuses", value: "" },
  { label: ISSUE_STATUS.OPEN, value: ISSUE_STATUS.OPEN },
  { label: ISSUE_STATUS.IN_PROGRESS, value: ISSUE_STATUS.IN_PROGRESS },
  { label: ISSUE_STATUS.CLOSED, value: ISSUE_STATUS.CLOSED },
  { label: ISSUE_STATUS.RESOLVED, value: ISSUE_STATUS.RESOLVED }
];

const IssueProgress = () => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const [loading] = useState(false);
  const [error] = useState(null);

  // Mock data - in production, this would come from Firestore
  const issues = mockIssues;

  const filteredIssues = useMemo(() => {
    const query = search.trim().toLowerCase();
    return issues.filter((issue) => {
      const status = String(issue.status || "").toLowerCase();
      const issueId = String(issue.issueId || "").toLowerCase();
      const location = String(issue.location || "").toLowerCase();
      const finding = String(issue.finding || "").toLowerCase();

      const matchesSearch =
        !query ||
        issueId.includes(query) ||
        location.includes(query) ||
        finding.includes(query);

      const matchesStatus = !statusFilter || status === statusFilter.toLowerCase();
      return matchesSearch && matchesStatus;
    });
  }, [issues, search, statusFilter]);

  const handleStatusChange = (event) => {
    setStatusFilter(event.target.value);
    setCurrentPage(1);
  };

  const clearStatusFilter = () => {
    setStatusFilter("");
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(filteredIssues.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedIssues = filteredIssues.slice(startIndex, startIndex + itemsPerPage);

  const handlePrevious = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const handleNext = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  return (
    <div className="dashboard-container">
      {loading && (
        <div className="loading-state" style={{ marginBottom: "18px" }}>
          Loading issues...
        </div>
      )}
      {error && (
        <div className="error-state" style={{ marginBottom: "18px" }}>
          {error}
        </div>
      )}

      <div className="dashboard-card" style={{ marginBottom: "24px" }}>
        <div className="card-header-row" style={{ justifyContent: "space-between", marginBottom: "20px" }}>
          <div>
            <h2 className="section-title">Issue Progress</h2>
            <p style={{ color: "#6b7280", marginTop: "4px", fontSize: "14px" }}>
              Track and monitor identified fire safety defects and their rectification status.
            </p>
          </div>
        </div>

        <div className="issues-search-controls">
          <div className="issues-search-field">
            <div className="search-box">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                className="search-input"
                placeholder="Search issues..."
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
          </div>
          <div className="issues-actions">
            <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "12px", color: "#6b7280" }}>
              <span>Filter</span>
              <select
                value={statusFilter}
                onChange={handleStatusChange}
                style={{
                  border: "1px solid #d1d5db",
                  borderRadius: "8px",
                  padding: "9px 12px",
                  minWidth: "150px",
                  backgroundColor: "#ffffff",
                  color: "#374151",
                  fontSize: "13px"
                }}
              >
                {statusOptions.map((option) => (
                  <option key={option.value || "all"} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </div>

      <div className="dashboard-card">
        <ResponsiveTableRegion
          label="Issue progress"
          className="fire-drill-history-table-wrapper"
        >
          <table className="dashboard-table">
            <thead>
              <tr>
                <th>LOCATION</th>
                <th>FINDING</th>
                <th>PROPOSED RECTIFICATION</th>
                <th>STATUS</th>
                <th>LAST UPDATED</th>
                <th>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "24px 0" }}>
                    Loading issues...
                  </td>
                </tr>
              ) : filteredIssues.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "24px 0" }}>
                    No issues found.
                  </td>
                </tr>
              ) : (
                paginatedIssues.map((issue) => (
                  <tr key={issue.id}>
                    <td>{issue.location}</td>
                    <td>{issue.finding}</td>
                    <td>{issue.proposedRectification}</td>
                    <td>
                      <span className="status-badge" style={getStatusStyle(issue.status)}>
                        {issue.status}
                      </span>
                    </td>
                    <td style={{ fontSize: "13px", color: "#6b7280" }}>{issue.lastUpdated}</td>
                    <td>
                      <button
                        type="button"
                        style={{
                          border: "none",
                          background: "none",
                          color: "#6b7280",
                          cursor: "pointer",
                          fontSize: "13px",
                          padding: "4px 8px",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px"
                        }}
                        title="View"
                      >
                        👁️ View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </ResponsiveTableRegion>

        {filteredIssues.length > 0 && (
          <div className="responsive-pagination">
            <span style={{ fontSize: "13px", color: "#6b7280" }}>
              Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredIssues.length)} of {filteredIssues.length} Issues
            </span>
            <div className="pagination-actions">
              <button
                type="button"
                onClick={handlePrevious}
                disabled={currentPage === 1}
                style={{
                  border: "1px solid #d1d5db",
                  background: currentPage === 1 ? "#f3f4f6" : "#ffffff",
                  color: currentPage === 1 ? "#9ca3af" : "#6b7280",
                  padding: "8px 14px",
                  borderRadius: "8px",
                  cursor: currentPage === 1 ? "not-allowed" : "pointer",
                  fontSize: "13px",
                  fontWeight: 600
                }}
              >
                Previous
              </button>
              <button
                type="button"
                onClick={handleNext}
                disabled={currentPage === totalPages}
                style={{
                  border: "1px solid #d1d5db",
                  background: currentPage === totalPages ? "#f3f4f6" : "#ffffff",
                  color: currentPage === totalPages ? "#9ca3af" : "#6b7280",
                  padding: "8px 14px",
                  borderRadius: "8px",
                  cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                  fontSize: "13px",
                  fontWeight: 600
                }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default IssueProgress;
