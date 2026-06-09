import React from "react";

const reportActions = [
  {
    title: "Monthly Fire Safety Inspection",
    description: "Track and view regular monthly inspections",
    action: "View Reports",
    icon: "\uD83D\uDCCB",
    tone: "green"
  },
  {
    title: "Annual Fire Safety Report",
    description: "Comprehensive yearly compliance review",
    action: "View Reports",
    icon: "\uD83D\uDCC5",
    tone: "blue"
  },
  {
    title: "Fire Drill Report",
    description: "Logs and results of evacuation drills",
    action: "View Reports",
    icon: "\uD83D\uDD25",
    tone: "orange"
  },
  {
    title: "Upload Manual Report",
    description: "Upload external contractor assessments etc.",
    action: "Upload New",
    icon: "\u2601",
    tone: "purple"
  }
];

const latestReports = [
  {
    title: "May 2026 Monthly Report",
    submittedDate: "01 May 2026",
    status: "Approved",
    tone: "approved"
  },
  {
    title: "Annual Report 2026",
    submittedDate: "10 May 2026",
    status: "Approved",
    tone: "approved"
  },
  {
    title: "Evacuation Drill",
    submittedDate: "22 May 2026",
    status: "Follow-Up",
    tone: "follow-up"
  },
  {
    title: "Fire Safety Inspection",
    submittedDate: "15 May 2026",
    status: "Approved",
    tone: "approved"
  }
];

const Reports = () => (
  <div className="dashboard-container fsm-reports-page">
    <div className="fsm-reports-panel">
      <section className="fsm-report-action-list" aria-label="Report actions">
        {reportActions.map((report) => (
          <button
            key={report.title}
            type="button"
            className={`fsm-report-action-card fsm-report-action-card--${report.tone}`}
          >
            <span className="fsm-report-action-icon" aria-hidden="true">
              {report.icon}
            </span>
            <span className="fsm-report-action-body">
              <strong>{report.title}</strong>
              <span>{report.description}</span>
              <em>{report.action}</em>
            </span>
          </button>
        ))}
      </section>

      <section className="dashboard-card fsm-latest-report-card">
        <div className="card-header-row">
          <h2 className="section-title">Latest Report</h2>
          <button type="button" className="view-all-link">
            View All
          </button>
        </div>

        <div className="fsm-latest-report-list">
          {latestReports.map((report) => (
            <div key={`${report.title}-${report.submittedDate}`} className="fsm-latest-report-row">
              <div className="fsm-latest-report-copy">
                <strong>{report.title}</strong>
                <span>Submitted on {report.submittedDate}</span>
              </div>
              <span className={`fsm-report-status-pill fsm-report-status-pill--${report.tone}`}>
                {report.status}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  </div>
);

export default Reports;
