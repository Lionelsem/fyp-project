import React, { useState } from "react";

const mockIssues = [
  {
    id: "ISS-001",
    building: "Building A",
    finding: "Zone 3 indicator LED blown",
    status: "Open",
    statusColor: "#dc2626",
    statusBg: "#fee2e2",
    priority: "High",
    priorityColor: "#dc2626"
  },
  {
    id: "ISS-002",
    building: "Tech Park B",
    finding: "Extinguisher expired",
    status: "In Progress",
    statusColor: "#ea580c",
    statusBg: "#ffedd5",
    priority: "Critical",
    priorityColor: "#dc2626"
  },
  {
    id: "ISS-003",
    building: "Logistics Hub",
    finding: "Corridor blocked by boxes",
    status: "Resolved",
    statusColor: "#16a34a",
    statusBg: "#dcfce7",
    priority: "Medium",
    priorityColor: "#b45309"
  }
];

const Issues = () => {
  const [issues] = useState(mockIssues);

  return (
    <div className="dashboard-container">
      <div className="dashboard-card">
        <div className="card-header-row">
          <h2 className="section-title">Issues / Defects</h2>
          <button type="button" className="view-all-link" style={{ backgroundColor: "#047857", color: "white", padding: "8px 16px", border: "none", borderRadius: "4px", cursor: "pointer" }}>
            + Report Issue
          </button>
        </div>

        <table className="dashboard-table">
          <thead>
            <tr>
              <th>ISSUE ID</th>
              <th>BUILDING</th>
              <th>FINDING</th>
              <th>STATUS</th>
              <th>PRIORITY</th>
            </tr>
          </thead>
          <tbody>
            {issues.map((issue) => (
              <tr key={issue.id}>
                <td className="id-cell">{issue.id}</td>
                <td>{issue.building}</td>
                <td>{issue.finding}</td>
                <td>
                  <span
                    className="status-badge"
                    style={{
                      backgroundColor: issue.statusBg,
                      color: issue.statusColor,
                      padding: "4px 12px",
                      borderRadius: "4px",
                      fontSize: "12px",
                      fontWeight: "500"
                    }}
                  >
                    {issue.status}
                  </span>
                </td>
                <td>
                  <span style={{ color: issue.priorityColor, fontWeight: "600" }}>
                    {issue.priority}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Issues;
