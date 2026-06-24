import React from "react";

const summaryCards = [
  {
    label: "Open Issues",
    value: 3,
    icon: "⚠️",
    iconBg: "#fee2e2",
    iconColor: "#dc2626"
  },
  {
    label: "In Progress",
    value: 5,
    icon: "🔄",
    iconBg: "#fed7aa",
    iconColor: "#ea580c"
  },
  {
    label: "Resolved",
    value: 12,
    icon: "✅",
    iconBg: "#dcfce7",
    iconColor: "#16a34a"
  },
  {
    label: "Closed",
    value: 48,
    icon: "🔒",
    iconBg: "#eef2ff",
    iconColor: "#4338ca"
  }
];

const recentIssues = [
  {
    location: "Lobby Level 1",
    finding: "Fire Extinguisher Expired",
    status: "Open",
    statusColor: "#dc2626",
    updated: "Today"
  },
  {
    location: "Basement 2",
    finding: "Blocked Fire Exit Route",
    status: "In Progress",
    statusColor: "#ea580c",
    updated: "Yesterday"
  },
  {
    location: "Level 4, South Wing",
    finding: "Faulty Fire Alarm Panel Zone 3",
    status: "Resolved",
    statusColor: "#16a34a",
    updated: "2 days ago"
  },
  {
    location: "Roof Deck",
    finding: "Hose Reel Pressure Low",
    status: "Closed",
    statusColor: "#4338ca",
    updated: "5 days ago"
  }
];

const latestReports = [
  {
    title: "Latest Monthly Report",
    subtitle: "September 2026",
    icon: "📋",
    iconBg: "#ecfdf5"
  },
  {
    title: "Latest Fire Drill",
    subtitle: "August 15, 2026",
    icon: "🚒",
    iconBg: "#fce7f3"
  },
  {
    title: "Annual Safety Report",
    subtitle: "Year 2025",
    icon: "📊",
    iconBg: "#ecfdf5"
  }
];

const CustomerDashboard = () => {
  return (
    <div className="dashboard-container">
      <div className="building-card-section">
        <div className="dashboard-card building-card">
          <div className="building-card-header">
            <span className="building-icon">🏢</span>
            <div>
              <h3 className="building-label">MY BUILDING</h3>
              <h2 className="building-name">Tech Park B</h2>
              <p className="building-address">123 Corporate Blvd, District 9</p>
            </div>
          </div>
          <div className="building-card-details">
            <div className="detail-row">
              <span className="detail-label">FSM Assigned</span>
              <span className="detail-value">John Smith (USR-002)</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Next Inspection</span>
              <span className="detail-value">Oct 15, 2028</span>
            </div>
          </div>
        </div>
      </div>

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
              <h2 className="section-title">Recent Issue Updates</h2>
              <button type="button" className="view-all-link">
                View all →
              </button>
            </div>
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>LOCATION</th>
                  <th>FINDING</th>
                  <th>STATUS</th>
                  <th>UPDATED</th>
                </tr>
              </thead>
              <tbody>
                {recentIssues.map((issue, index) => (
                  <tr key={index}>
                    <td>{issue.location}</td>
                    <td>{issue.finding}</td>
                    <td>
                      <span
                        className="status-badge"
                        style={{ color: issue.statusColor }}
                      >
                        {issue.status}
                      </span>
                    </td>
                    <td>{issue.updated}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="content-right">
          <div className="dashboard-card">
            <div className="card-header-row">
              <h2 className="section-title">Latest Reports</h2>
            </div>
            <div className="reports-container">
              {latestReports.map((report) => (
                <button key={report.title} type="button" className="report-btn">
                  <div className="report-icon" style={{ backgroundColor: report.iconBg }}>
                    {report.icon}
                  </div>
                  <div className="report-content">
                    <span className="report-title">{report.title}</span>
                    <span className="report-subtitle">{report.subtitle}</span>
                  </div>
                  <span className="report-arrow">→</span>
                </button>
              ))}
            </div>
          </div>

          <div className="dashboard-card comments-card">
            <div className="card-header-row">
              <h2 className="section-title">Comments / Feedback</h2>
              <span className="card-icon">→</span>
            </div>
            <p className="comments-subtitle">Request updates or clarify issues</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerDashboard;
