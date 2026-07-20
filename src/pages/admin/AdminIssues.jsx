import React, { useEffect, useMemo, useState } from "react";
import { getAllBuildings } from "../../services/buildingService";
import { getAllUsers } from "../../services/userService";
import { getIssues } from "../../services/issueService";
import ResponsiveTableRegion from "../../components/common/ResponsiveTableRegion";

const getStatusStyle = (status) => {
  const normalized = String(status || "").trim().toLowerCase();
  if (["open", "in progress"].includes(normalized)) {
    return { color: "#b45309", backgroundColor: "#fef3c7" };
  }
  if (["resolved", "closed", "completed"].includes(normalized)) {
    return { color: "#047857", backgroundColor: "#ecfdf5" };
  }
  if (["pending", "review"].includes(normalized)) {
    return { color: "#1d4ed8", backgroundColor: "#eff6ff" };
  }
  return { color: "#475569", backgroundColor: "#f1f5f9" };
};

const AdminIssues = () => {
  const [issues, setIssues] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      try {
        const [issueData, buildingData, userData] = await Promise.all([
          getIssues(),
          getAllBuildings(),
          getAllUsers()
        ]);
        if (!active) return;
        setIssues(issueData);
        setBuildings(buildingData);
        setUsers(userData);
      } catch (loadError) {
        console.error("Failed to load issues", loadError);
        if (active) setError(loadError.message || "Could not load issues.");
      } finally {
        if (active) setLoading(false);
      }
    };

    loadData();
    return () => {
      active = false;
    };
  }, []);

  const buildingMap = useMemo(
    () => new Map(buildings.map((building) => [building.id, building.buildingName || building.building_name || "Unnamed building"])),
    [buildings]
  );

  const userMap = useMemo(
    () => new Map(users.map((user) => [user.uid, user.fullName || user.email])),
    [users]
  );

  const filteredIssues = useMemo(() => {
    const query = search.trim().toLowerCase();
    return issues.filter((issue) => {
      const status = String(issue.status || "").toLowerCase();
      const title = String(issue.issueTitle || issue.issueDescription || "").toLowerCase();
      const location = String(issue.location || "").toLowerCase();
      const buildingName = String(buildingMap.get(issue.buildingId) || "").toLowerCase();
      const reportedBy = String(userMap.get(issue.reportedBy) || issue.reportedBy || "").toLowerCase();

      const matchesSearch =
        !query ||
        title.includes(query) ||
        location.includes(query) ||
        buildingName.includes(query) ||
        reportedBy.includes(query) ||
        status.includes(query) ||
        String(issue.issueId || "").toLowerCase().includes(query);

      const matchesStatus = !statusFilter || status === statusFilter.toLowerCase();
      return matchesSearch && matchesStatus;
    });
  }, [issues, search, statusFilter, buildingMap, userMap]);

  const uniqueStatuses = useMemo(() => {
    const statuses = issues.map((issue) => String(issue.status || "").trim()).filter(Boolean);
    return Array.from(new Set(["Open", "In Progress", "Resolved", "Closed", ...statuses]));
  }, [issues]);

  return (
    <div className="dashboard-container admin-page admin-page-stack">
      {loading && <div className="loading-state">Loading issues...</div>}
      {error && <div className="error-state">{error}</div>}

      <div className="dashboard-card admin-page-header-card">
        <div className="card-header-row admin-page-header">
          <div>
            <h2 className="section-title">Issues / Defects</h2>
            <p style={{ color: "#6b7280", marginTop: "4px" }}>
              Review all fire safety issues and track resolution timelines.
            </p>
          </div>
          <div className="status-flow">
            Status Flow: Open → In Progress → Resolved → Closed
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
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </div>
          <div className="issues-actions">
            <select
              className="form-input responsive-control"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="">All statuses</option>
              {uniqueStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="dashboard-card">
        <ResponsiveTableRegion
          label="Issues and defects"
          className="fire-drill-history-table-wrapper responsive-table-region--cards"
        >
          <table className="dashboard-table responsive-card-table">
            <thead>
              <tr>
                <th>BUILDING</th>
                <th>LOCATION</th>
                <th>FINDING</th>
                <th>REPORTED BY</th>
                <th>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: "24px 0" }}>
                    Loading issues...
                  </td>
                </tr>
              ) : filteredIssues.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: "24px 0" }}>
                    No issues found.
                  </td>
                </tr>
              ) : (
                filteredIssues.map((issue) => (
                  <tr key={issue.id}>
                    <td data-label="Building">{buildingMap.get(issue.buildingId) || "Unknown building"}</td>
                    <td data-label="Location">{issue.location || "-"}</td>
                    <td data-label="Finding">{issue.issueTitle || issue.issueDescription || "-"}</td>
                    <td data-label="Reported by">{userMap.get(issue.reportedBy) || "Unknown user"}</td>
                    <td data-label="Status">
                      <span className="status-badge" style={getStatusStyle(issue.status)}>
                        {issue.status || "Unknown"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </ResponsiveTableRegion>
      </div>
    </div>
  );
};

export default AdminIssues;
