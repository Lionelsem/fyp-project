import React from "react";

const summaryCards = [
  {
    label: "Total Inspections",
    value: 65,
    icon: "📋",
    iconBg: "#ecfdf5",
    iconColor: "#047857",
    trend: "+12% from last month"
  },
  {
    label: "Pending",
    value: 12,
    icon: "⏳",
    iconBg: "#fef3c7",
    iconColor: "#b45309",
    trend: "4 due today"
  },
  {
    label: "Completed",
    value: 45,
    icon: "✅",
    iconBg: "#dbeafe",
    iconColor: "#0284c7",
    trend: "This month"
  },
  {
    label: "Urgent Issues",
    value: 3,
    icon: "🚨",
    iconBg: "#fee2e2",
    iconColor: "#dc2626",
    trend: "Requires immediate action"
  }
];

// Status breakdown data
const statusBreakdown = {
  total: 65,
  passed: 42,
  pending: 15,
  failed: 8
};

// Monthly inspection trend data
const monthlyTrend = [
  { month: "Jan", passed: 3, pending: 1, failed: 0 },
  { month: "Feb", passed: 4, pending: 2, failed: 1 },
  { month: "Mar", passed: 5, pending: 1, failed: 0 },
  { month: "Apr", passed: 4, pending: 2, failed: 1 },
  { month: "May", passed: 6, pending: 1, failed: 0 }
];

const recentReports = [
  {
    building: "Building A, Floor 2",
    date: "May 18, 2026",
    status: "Passed",
    statusColor: "#047857",
    statusBg: "#ecfdf5",
    priority: "Normal"
  },
  {
    building: "Building B, Basement",
    date: "May 18, 2026",
    status: "Failed",
    statusColor: "#dc2626",
    statusBg: "#fee2e2",
    priority: "Urgent"
  }
];

const upcomingSchedule = [
  {
    time: "10:00 AM",
    task: "Fire Extinguisher Check",
    building: "Building D"
  },
  {
    time: "01:30 PM",
    task: "Emergency Exit Route",
    building: "Building A"
  }
];

// Bar chart component using CSS
const BarChart = () => {
  const maxValue = Math.max(
    ...monthlyTrend.map(item => item.passed + item.pending + item.failed)
  );

  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: "20px", height: "200px", padding: "20px 0" }}>
      {monthlyTrend.map((item) => {
        const total = item.passed + item.pending + item.failed;
        const passedHeight = (item.passed / maxValue) * 150;
        const pendingHeight = (item.pending / maxValue) * 150;
        const failedHeight = (item.failed / maxValue) * 150;

        return (
          <div key={item.month} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ display: "flex", width: "100%", height: "150px", alignItems: "flex-end" }}>
              <div
                style={{
                  flex: item.passed || 0.1,
                  backgroundColor: "#10b981",
                  height: `${passedHeight}px`,
                  borderRadius: "4px 4px 0 0"
                }}
              />
              <div
                style={{
                  flex: item.pending || 0.1,
                  backgroundColor: "#f59e0b",
                  height: `${pendingHeight}px`,
                  borderRadius: "4px 4px 0 0"
                }}
              />
              <div
                style={{
                  flex: item.failed || 0.1,
                  backgroundColor: "#ef4444",
                  height: `${failedHeight}px`,
                  borderRadius: "4px 4px 0 0"
                }}
              />
            </div>
            <div style={{ marginTop: "8px", fontSize: "12px", fontWeight: "600" }}>{item.month}</div>
          </div>
        );
      })}
    </div>
  );
};

// Donut chart component using CSS
const DonutChart = () => {
  const total = statusBreakdown.total;
  const passedPercent = (statusBreakdown.passed / total) * 100;
  const pendingPercent = (statusBreakdown.pending / total) * 100;
  const failedPercent = (statusBreakdown.failed / total) * 100;

  const passedDeg = (passedPercent / 100) * 360;
  const pendingDeg = (pendingPercent / 100) * 360;
  const failedDeg = (failedPercent / 100) * 360;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "20px" }}>
      <div
        style={{
          width: "150px",
          height: "150px",
          borderRadius: "50%",
          background: `conic-gradient(#10b981 0deg ${passedDeg}deg, #f59e0b ${passedDeg}deg ${passedDeg + pendingDeg}deg, #ef4444 ${passedDeg + pendingDeg}deg 360deg)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
        }}
      >
        <div
          style={{
            width: "100px",
            height: "100px",
            borderRadius: "50%",
            backgroundColor: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            fontSize: "20px",
            fontWeight: "bold"
          }}
        >
          <div>{total}</div>
          <div style={{ fontSize: "12px", color: "#666" }}>TOTAL</div>
        </div>
      </div>
      <div style={{ display: "flex", gap: "20px", fontSize: "14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ width: "12px", height: "12px", backgroundColor: "#10b981", borderRadius: "2px" }} />
          <span>Passed</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ width: "12px", height: "12px", backgroundColor: "#f59e0b", borderRadius: "2px" }} />
          <span>Pending</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ width: "12px", height: "12px", backgroundColor: "#ef4444", borderRadius: "2px" }} />
          <span>Failed</span>
        </div>
      </div>
    </div>
  );
};

const FSMDashboard = () => {
  return (
    <div className="dashboard-container">
      {/* Summary Cards Grid */}
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
            <div className="card-trend">{card.trend}</div>
          </div>
        ))}
      </div>

      {/* Charts and Tables Grid */}
      <div className="dashboard-grid">
        <div className="content-left">
          {/* Status Breakdown Chart */}
          <div className="dashboard-card">
            <div className="card-header-row">
              <h2 className="section-title">Status Breakdown</h2>
            </div>
            <div style={{ display: "flex", justifyContent: "center", padding: "20px" }}>
              <DonutChart />
            </div>
          </div>

          {/* Monthly Inspection Trend Chart */}
          <div className="dashboard-card">
            <div className="card-header-row">
              <h2 className="section-title">Monthly Inspection Trend</h2>
            </div>
            <div style={{ padding: "20px" }}>
              <BarChart />
              <div style={{ display: "flex", gap: "20px", justifyContent: "center", fontSize: "12px", marginTop: "20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <div style={{ width: "12px", height: "12px", backgroundColor: "#10b981" }} />
                  <span>Passed</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <div style={{ width: "12px", height: "12px", backgroundColor: "#f59e0b" }} />
                  <span>Pending</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <div style={{ width: "12px", height: "12px", backgroundColor: "#ef4444" }} />
                  <span>Failed</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="content-right">
          {/* Recent Reports */}
          <div className="dashboard-card">
            <div className="card-header-row">
              <h2 className="section-title">Recent Reports</h2>
              <button type="button" className="view-all-link">
                View All →
              </button>
            </div>
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>BUILDING</th>
                  <th>DATE</th>
                  <th>STATUS</th>
                  <th>PRIORITY</th>
                </tr>
              </thead>
              <tbody>
                {recentReports.map((report, index) => (
                  <tr key={index}>
                    <td>{report.building}</td>
                    <td>{report.date}</td>
                    <td>
                      <span
                        className="status-badge"
                        style={{
                          backgroundColor: report.statusBg,
                          color: report.statusColor,
                          padding: "4px 12px",
                          borderRadius: "4px",
                          fontSize: "12px",
                          fontWeight: "500"
                        }}
                      >
                        {report.status}
                      </span>
                    </td>
                    <td style={{ color: report.priority === "Urgent" ? "#dc2626" : "#666" }}>
                      {report.priority}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Upcoming Schedule */}
          <div className="dashboard-card">
            <div className="card-header-row">
              <h2 className="section-title">Upcoming Schedule</h2>
              <button type="button" className="view-all-link">
                View All →
              </button>
            </div>
            <div style={{ padding: "0" }}>
              {upcomingSchedule.map((item, index) => (
                <div
                  key={index}
                  style={{
                    padding: "16px",
                    borderBottom: index < upcomingSchedule.length - 1 ? "1px solid #e5e7eb" : "none",
                    display: "flex",
                    gap: "16px"
                  }}
                >
                  <div
                    style={{
                      fontSize: "14px",
                      fontWeight: "600",
                      color: "#111",
                      minWidth: "70px"
                    }}
                  >
                    {item.time}
                  </div>
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: "600", color: "#111" }}>
                      {item.task}
                    </div>
                    <div style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}>
                      📍 {item.building}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FSMDashboard;
