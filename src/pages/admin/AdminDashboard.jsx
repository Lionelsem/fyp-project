import React from "react";
import { Link } from "react-router-dom";

const summaryCards = [
  {
    label: "Total Buildings",
    value: 182,
    icon: "🏢",
    iconBg: "#ecfdf5",
    iconColor: "#047857"
  },
  {
    label: "Total FSM Users",
    value: 45,
    icon: "👥",
    iconBg: "#eff6ff",
    iconColor: "#1d4ed8"
  },
  {
    label: "Assigned Buildings",
    value: 168,
    icon: "📍",
    iconBg: "#eef2ff",
    iconColor: "#4338ca"
  },
  {
    label: "Outstanding Issues",
    value: 28,
    icon: "⚠️",
    iconBg: "#fffbeb",
    iconColor: "#b45309"
  },
  {
    label: "Resolved Issues",
    value: 114,
    icon: "✅",
    iconBg: "#ecfdf5",
    iconColor: "#047857"
  },
  {
    label: "Closed Issues",
    value: 452,
    icon: "🔒",
    iconBg: "#eef2ff",
    iconColor: "#4338ca"
  },
  {
    label: "Completed Fire Drills",
    value: 156,
    icon: "🚒",
    iconBg: "#fce7f3",
    iconColor: "#be185d"
  },
  {
    label: "Pending Reports",
    value: 8,
    icon: "📄",
    iconBg: "#ffedd5",
    iconColor: "#c2410c"
  }
];

const recentIssues = [
  {
    id: "ISS-042",
    building: "Building A",
    finding: "Zone 3 indicator LED blown",
    status: "Open",
    statusColor: "#dc2626"
  },
  {
    id: "ISS-041",
    building: "Tech Park B",
    finding: "Extinguisher expired",
    status: "In Progress",
    statusColor: "#ea580c"
  },
  {
    id: "ISS-040",
    building: "Logistics Hub",
    finding: "Corridor blocked by boxes",
    status: "Resolved",
    statusColor: "#16a34a"
  }
];

const fireDrills = [
  {
    date: "May 15, 2026",
    building: "Building A",
    evacuationTime: "4m 12s",
    result: "Pass",
    resultBg: "#dcfce7",
    resultColor: "#166534"
  },
  {
    date: "May 10, 2026",
    building: "Tech Park B",
    evacuationTime: "6m 45s",
    result: "Review",
    resultBg: "#fef3c7",
    resultColor: "#b45309"
  }
];

const submittedReports = [
  {
    type: "Monthly FSM Report",
    building: "Building A",
    date: "May 1, 2026"
  },
  {
    type: "Annual Certificate",
    building: "Logistics Hub",
    date: "Apr 28, 2026"
  }
];

const reportingShortcuts = [
  {
    title: "Generate Monthly Report",
    description: "Summary of all building stats",
    icon: "📊"
  },
  {
    title: "Generate Annual Report",
    description: "Full compliance certification",
    icon: "📄"
  }
];

const AdminDashboard = () => {
  return (
    <div className="dashboard-container">
      <div className="summary-grid">
        {summaryCards.map((card) => (
          <div key={card.label} className="summary-card">
            <div className="card-top">
              <div
                className="card-icon"
                style={{ backgroundColor: card.iconBg, color: card.iconColor }}
              >
                {card.icon}
              </div>
              <div className="card-label">{card.label}</div>
            </div>
            <div className="card-value">{card.value}</div>
          </div>
        ))}
      </div>

      <div className="dashboard-grid">
        <div className="content-left">
          <div className="dashboard-card">
            <div className="card-header-row">
              <h2 className="section-title">Recent Issues</h2>
              <Link to="/issues-defects" className="view-all-link">
                View All
              </Link>
            </div>
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>ISSUE ID</th>
                  <th>BUILDING</th>
                  <th>FINDING</th>
                  <th>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {recentIssues.map((issue) => (
                  <tr key={issue.id}>
                    <td className="id-cell">{issue.id}</td>
                    <td>{issue.building}</td>
                    <td>{issue.finding}</td>
                    <td>
                      <span
                        className="status-badge"
                        style={{ color: issue.statusColor }}
                      >
                        {issue.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="dashboard-card">
            <div className="card-header-row">
              <h2 className="section-title">Recent Fire Drill Records</h2>
              <Link to="/fire-drill" className="view-all-link">
                View All
              </Link>
            </div>
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>DATE</th>
                  <th>BUILDING</th>
                  <th>EVACUATION TIME</th>
                  <th>RESULT</th>
                </tr>
              </thead>
              <tbody>
                {fireDrills.map((drill, index) => (
                  <tr key={index}>
                    <td>{drill.date}</td>
                    <td>{drill.building}</td>
                    <td>{drill.evacuationTime}</td>
                    <td>
                      <span
                        className="result-badge"
                        style={{
                          backgroundColor: drill.resultBg,
                          color: drill.resultColor
                        }}
                      >
                        {drill.result}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="dashboard-card">
            <div className="card-header-row">
              <h2 className="section-title">Recent Submitted Reports</h2>
              <Link to="/reports" className="view-all-link">
                View All
              </Link>
            </div>
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>REPORT TYPE</th>
                  <th>BUILDING</th>
                  <th>DATE</th>
                </tr>
              </thead>
              <tbody>
                {submittedReports.map((report, index) => (
                  <tr key={index}>
                    <td>{report.type}</td>
                    <td>{report.building}</td>
                    <td>{report.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="content-right">
          <div className="dashboard-card">
            <div className="card-header-row">
              <h2 className="section-title">Compliance Status</h2>
            </div>
            <div className="compliance-chart">
              <svg width="180" height="180" viewBox="0 0 180 180">
                <circle
                  cx="90"
                  cy="90"
                  r="72"
                  fill="none"
                  stroke="#d1fae5"
                  strokeWidth="16"
                />
                <circle
                  cx="90"
                  cy="90"
                  r="72"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="16"
                  strokeDasharray="226 452"
                  strokeDashoffset="20"
                  strokeLinecap="round"
                />
                <circle
                  cx="90"
                  cy="90"
                  r="72"
                  fill="none"
                  stroke="#fbbf24"
                  strokeWidth="16"
                  strokeDasharray="70 452"
                  strokeDashoffset="-206"
                  strokeLinecap="round"
                />
                <circle
                  cx="90"
                  cy="90"
                  r="72"
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="16"
                  strokeDasharray="40 452"
                  strokeDashoffset="-276"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <div className="compliance-legend">
              <div className="legend-item">
                <span className="legend-dot" style={{ backgroundColor: "#10b981" }} />
                <span>Compliant</span>
              </div>
              <div className="legend-item">
                <span className="legend-dot" style={{ backgroundColor: "#fbbf24" }} />
                <span>Pending Rectification</span>
              </div>
              <div className="legend-item">
                <span className="legend-dot" style={{ backgroundColor: "#ef4444" }} />
                <span>Non-Compliant</span>
              </div>
            </div>
          </div>

          <div className="dashboard-card">
            <div className="card-header-row">
              <h2 className="section-title">Reporting Shortcuts</h2>
            </div>
            <div className="shortcuts-container">
              {reportingShortcuts.map((shortcut) => (
                <button key={shortcut.title} type="button" className="shortcut-btn">
                  <span className="shortcut-icon">{shortcut.icon}</span>
                  <span className="shortcut-content">
                    <span className="shortcut-title">{shortcut.title}</span>
                    <span className="shortcut-desc">{shortcut.description}</span>
                  </span>
                  <span className="shortcut-arrow">→</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;