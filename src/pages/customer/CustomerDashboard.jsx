import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import ResponsiveTableRegion from "../../components/common/ResponsiveTableRegion";
import { useAuthContext } from "../../context/AuthContext";
import { useCustomerLiveData } from "../../hooks/useCustomerLiveData";

const summaryCards = (issues) => [
  {
    label: "Open Issues",
    value: issues.filter((issue) => String(issue.status || "").toLowerCase() === "open").length,
    icon: "⚠️",
    iconBg: "#fee2e2",
    iconColor: "#dc2626"
  },
  {
    label: "In Progress",
    value: issues.filter((issue) => String(issue.status || "").toLowerCase() === "in progress").length,
    icon: "🔄",
    iconBg: "#fed7aa",
    iconColor: "#ea580c"
  },
  {
    label: "Resolved",
    value: issues.filter((issue) => String(issue.status || "").toLowerCase() === "resolved").length,
    icon: "✅",
    iconBg: "#dcfce7",
    iconColor: "#16a34a"
  },
  {
    label: "Closed",
    value: issues.filter((issue) => ["closed", "completed"].includes(String(issue.status || "").toLowerCase())).length,
    icon: "🔒",
    iconBg: "#eef2ff",
    iconColor: "#4338ca"
  }
];

const issueDate = (issue) => issue.updatedAt?.toDate?.() || issue.updatedAt || issue.createdAt?.toDate?.() || issue.createdAt || issue.reportedAt?.toDate?.() || issue.reportedAt;
const statusColor = (status) => ({ open: "#dc2626", "in progress": "#ea580c", resolved: "#16a34a", closed: "#4338ca" }[String(status || "").toLowerCase()] || "#475569");
const formatDate = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" });
};

const latestReports = [
  {
    title: "Latest Monthly Report",
    subtitle: "July 2026",
    icon: "📋",
    iconBg: "#ecfdf5",
    path: "/inspection-reports"
  },
  {
    title: "Latest Fire Drill",
    subtitle: "July 24, 2026",
    icon: "🚒",
    iconBg: "#fce7f3",
    path: "/fire-drill-reports"
  },
  {
    title: "Annual Safety Report",
    subtitle: "Year 2026",
    icon: "📊",
    iconBg: "#ecfdf5",
    path: "/annual-reports"
  }
];

const CustomerDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const { buildings, issues, reports, fireDrills, loading } = useCustomerLiveData(user);
  const building = buildings[0];
  const recentIssues = useMemo(() => [...issues]
    .sort((first, second) => new Date(issueDate(second) || 0) - new Date(issueDate(first) || 0))
    .slice(0, 5), [issues]);
  const latestReports = useMemo(() => {
    const latest = (items, type) => [...items].filter((item) => type(item)).sort((a, b) => new Date(b.createdAt?.toDate?.() || b.createdAt || 0) - new Date(a.createdAt?.toDate?.() || a.createdAt || 0))[0];
    const monthly = latest(reports, (item) => !String(item.reportType || item.reportTitle || "").toLowerCase().includes("annual"));
    const annual = latest(reports, (item) => String(item.reportType || item.reportTitle || "").toLowerCase().includes("annual"));
    const drill = latest(fireDrills, () => true);
    return [
      { title: "Latest Monthly Report", subtitle: monthly ? (monthly.inspectionMonth || formatDate(monthly.createdAt)) : "No report available", icon: "📋", iconBg: "#ecfdf5", path: "/inspection-reports" },
      { title: "Latest Fire Drill", subtitle: drill ? formatDate(drill.actualDate || drill.conductedDate || drill.drillDate) : "No drill available", icon: "🚒", iconBg: "#fce7f3", path: "/fire-drill-reports" },
      { title: "Annual Safety Report", subtitle: annual ? (annual.period || formatDate(annual.createdAt)) : "No report available", icon: "📊", iconBg: "#ecfdf5", path: "/annual-reports" }
    ];
  }, [fireDrills, reports]);

  const handleFeedbackNavigation = () => {
    navigate("/feedbacks");
  };

  const handleReportNavigation = (path) => {
    navigate(path);
  };

  return (
    <div className="dashboard-container customer-dashboard-page role-dashboard-page">
      <div className="building-card-section">
        <div className="dashboard-card building-card">
          <div className="building-card-header">
            <span className="building-icon">🏢</span>
            <div>
              <h3 className="building-label">MY BUILDING</h3>
              <h2 className="building-name">{building?.buildingName || building?.building_name || "My Building"}</h2>
              <p className="building-address">{building?.address || "-"}</p>
            </div>
          </div>
          <div className="building-card-details">
            <div className="detail-row">
              <span className="detail-label">FSM Assigned</span>
              <span className="detail-value">{building?.assignedFsm || building?.assignedFsmName || "-"}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Next Inspection</span>
              <span className="detail-value">{building?.nextInspection ? formatDate(building.nextInspection) : "-"}</span>
            </div>
          </div>
        </div>
      </div>

      <div
        className="summary-grid compact-summary-grid"
        role="list"
        aria-label="Customer issue summary"
      >
        {summaryCards(issues).map((card) => (
          <div
            key={card.label}
            className="summary-card"
            role="listitem"
            aria-label={`${card.label}: ${card.value}`}
          >
            <div className="card-top">
              <div
                className="card-icon"
                style={{ backgroundColor: card.iconBg, color: card.iconColor }}
                aria-hidden="true"
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
              <button
                type="button"
                className="view-all-link"
                onClick={() => navigate("/issue-progress")}
              >
                View all →
              </button>
            </div>
            <ResponsiveTableRegion
              label="Recent issue updates"
              className="responsive-table-region--cards"
            >
              <table className="dashboard-table responsive-card-table">
              <thead>
                <tr>
                  <th>LOCATION</th>
                  <th>FINDING</th>
                  <th>STATUS</th>
                  <th>UPDATED</th>
                </tr>
              </thead>
              <tbody>
                {loading ? <tr><td colSpan={4}>Loading live issues...</td></tr> : recentIssues.length === 0 ? <tr><td colSpan={4}>No issues found.</td></tr> : recentIssues.map((issue) => (
                  <tr key={issue.id}>
                    <td data-label="Location">{issue.location || issue.storey || "-"}</td>
                    <td data-label="Finding">{issue.issueTitle || issue.issueDescription || issue.finding || "-"}</td>
                    <td data-label="Status">
                      <span
                        className="status-badge"
                        style={{ color: statusColor(issue.status) }}
                      >
                        {issue.status}
                      </span>
                    </td>
                    <td data-label="Updated">{formatDate(issueDate(issue))}</td>
                  </tr>
                ))}
              </tbody>
              </table>
            </ResponsiveTableRegion>
          </div>
        </div>

        <div className="content-right">
          <div className="dashboard-card">
            <div className="card-header-row">
              <h2 className="section-title">Latest Reports</h2>
            </div>
            <div className="reports-container">
              {latestReports.map((report) => (
                <button
                  key={report.title}
                  type="button"
                  className="report-btn"
                  onClick={() => handleReportNavigation(report.path)}
                >
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
            <button
              type="button"
              className="card-header-row"
              onClick={handleFeedbackNavigation}
              style={{ background: "none", border: "none", padding: 0, width: "100%", cursor: "pointer", textAlign: "left" }}
            >
              <h2 className="section-title">Comments / Feedback</h2>
              <span className="card-icon">→</span>
            </button>
            <p className="comments-subtitle">Request updates or clarify issues</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerDashboard;
