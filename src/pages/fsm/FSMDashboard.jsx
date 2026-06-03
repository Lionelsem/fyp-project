import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuthContext } from "../../context/AuthContext";
import { useFsmDashboardData } from "../../hooks/useFsmDashboardData";

const hasMonthlyTrendData = (monthlyTrend) =>
  monthlyTrend.some((item) => item.passed + item.pending + item.failed > 0);

const BarChart = ({ monthlyTrend }) => {
  if (!hasMonthlyTrendData(monthlyTrend)) {
    return (
      <div
        style={{
          height: "200px",
          display: "grid",
          placeItems: "center",
          color: "#64748b",
          fontSize: "14px"
        }}
      >
        No inspection trend data found.
      </div>
    );
  }

  const maxValue = Math.max(
    1,
    ...monthlyTrend.map((item) => item.passed + item.pending + item.failed)
  );

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        gap: "20px",
        height: "200px",
        padding: "20px 0"
      }}
    >
      {monthlyTrend.map((item) => {
        const passedHeight = (item.passed / maxValue) * 150;
        const pendingHeight = (item.pending / maxValue) * 150;
        const failedHeight = (item.failed / maxValue) * 150;

        return (
          <div
            key={item.month}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center"
            }}
          >
            <div
              style={{
                display: "flex",
                width: "100%",
                height: "150px",
                alignItems: "flex-end"
              }}
            >
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
            <div style={{ marginTop: "8px", fontSize: "12px", fontWeight: "600" }}>
              {item.month}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const DonutChart = ({ statusBreakdown }) => {
  const total = statusBreakdown.total;
  const passedPercent = total ? (statusBreakdown.passed / total) * 100 : 0;
  const pendingPercent = total ? (statusBreakdown.pending / total) * 100 : 0;

  const passedDeg = (passedPercent / 100) * 360;
  const pendingDeg = (pendingPercent / 100) * 360;
  const pendingEndDeg = passedDeg + pendingDeg;
  const chartBackground = total
    ? `conic-gradient(#10b981 0deg ${passedDeg}deg, #f59e0b ${passedDeg}deg ${pendingEndDeg}deg, #ef4444 ${pendingEndDeg}deg 360deg)`
    : "#e5e7eb";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "20px"
      }}
    >
      <div
        style={{
          width: "150px",
          height: "150px",
          borderRadius: "50%",
          background: chartBackground,
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
          <div
            style={{
              width: "12px",
              height: "12px",
              backgroundColor: "#10b981",
              borderRadius: "2px"
            }}
          />
          <span>Passed</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              width: "12px",
              height: "12px",
              backgroundColor: "#f59e0b",
              borderRadius: "2px"
            }}
          />
          <span>Pending</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              width: "12px",
              height: "12px",
              backgroundColor: "#ef4444",
              borderRadius: "2px"
            }}
          />
          <span>Failed</span>
        </div>
      </div>
    </div>
  );
};

const EmptyTableRow = ({ colSpan, children }) => (
  <tr>
    <td
      colSpan={colSpan}
      style={{
        textAlign: "center",
        color: "#64748b",
        padding: "28px 0"
      }}
    >
      {children}
    </td>
  </tr>
);

const quickActions = [
  {
    label: "Schedule Fire Drill",
    path: "/fsm/fire-drill",
    icon: "🚒",
    color: "#f97316",
    background: "#fff7ed"
  },
  {
    label: "Start Inspection",
    path: "/fsm/inspections",
    icon: "📋",
    color: "#2563eb",
    background: "#eff6ff"
  },
  {
    label: "Verify Issues",
    path: "/fsm/issues",
    icon: "⚠️",
    color: "#059669",
    background: "#ecfdf5"
  }
];

const FSMDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const fsmLookupIds = [
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
  ];
  const {
    loading,
    error,
    summaryCards,
    statusBreakdown,
    monthlyTrend,
    recentReports,
    upcomingSchedule
  } = useFsmDashboardData(fsmLookupIds);

  return (
    <div className="dashboard-container">
      {error && (
        <div className="error-state" style={{ marginBottom: "18px" }}>
          {error}
        </div>
      )}

      {loading && (
        <div className="loading-state" style={{ marginBottom: "18px" }}>
          Syncing dashboard data...
        </div>
      )}

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

      <div className="dashboard-grid">
        <div className="content-left">
          <div className="dashboard-card">
            <div className="card-header-row">
              <h2 className="section-title">Status Breakdown</h2>
            </div>
            <div style={{ display: "flex", justifyContent: "center", padding: "20px" }}>
              <DonutChart statusBreakdown={statusBreakdown} />
            </div>
          </div>

          <div className="dashboard-card">
            <div className="card-header-row">
              <h2 className="section-title">Monthly Inspection Trend</h2>
            </div>
            <div style={{ padding: "20px" }}>
              <BarChart monthlyTrend={monthlyTrend} />
              <div
                style={{
                  display: "flex",
                  gap: "20px",
                  justifyContent: "center",
                  fontSize: "12px",
                  marginTop: "20px"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <div
                    style={{
                      width: "12px",
                      height: "12px",
                      backgroundColor: "#10b981"
                    }}
                  />
                  <span>Passed</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <div
                    style={{
                      width: "12px",
                      height: "12px",
                      backgroundColor: "#f59e0b"
                    }}
                  />
                  <span>Pending</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <div
                    style={{
                      width: "12px",
                      height: "12px",
                      backgroundColor: "#ef4444"
                    }}
                  />
                  <span>Failed</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="content-right">
          <div className="dashboard-card">
            <div className="card-header-row">
              <h2 className="section-title">Quick Actions</h2>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: "12px"
              }}
            >
              {quickActions.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  onClick={() => navigate(action.path)}
                  style={{
                    minHeight: "112px",
                    display: "grid",
                    gridTemplateRows: "44px 1fr",
                    justifyItems: "center",
                    alignItems: "center",
                    gap: "8px",
                    padding: "14px 10px",
                    border: "1px solid #e5e7eb",
                    borderRadius: "14px",
                    background: "#f8fafc",
                    color: "#0f172a",
                    cursor: "pointer",
                    textAlign: "center"
                  }}
                >
                  <span
                    style={{
                      width: "44px",
                      height: "44px",
                      display: "grid",
                      placeItems: "center",
                      borderRadius: "12px",
                      backgroundColor: action.background,
                      color: action.color,
                      fontSize: "22px",
                      fontWeight: 800
                    }}
                  >
                    {action.icon}
                  </span>
                  <span
                    style={{
                      fontSize: "14px",
                      fontWeight: 700,
                      lineHeight: 1.2,
                      maxWidth: "90px",
                      whiteSpace: "normal",
                      wordBreak: "normal"
                    }}
                  >
                    {action.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="dashboard-card">
            <div className="card-header-row">
              <h2 className="section-title">Recent Reports</h2>
              <button type="button" className="view-all-link">
                View All &gt;
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
                {recentReports.length === 0 ? (
                  <EmptyTableRow colSpan={4}>
                    {loading ? "Loading reports..." : "No records found."}
                  </EmptyTableRow>
                ) : (
                  recentReports.map((report) => (
                    <tr key={report.id}>
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
                      <td style={{ color: report.priorityColor }}>
                        {report.priority}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="dashboard-card">
            <div className="card-header-row">
              <h2 className="section-title">Upcoming Schedule</h2>
              <button type="button" className="view-all-link">
                View All &gt;
              </button>
            </div>
            <div style={{ padding: "0" }}>
              {upcomingSchedule.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    color: "#64748b",
                    padding: "28px 0"
                  }}
                >
                  {loading ? "Loading schedule..." : "No records found."}
                </div>
              ) : (
                upcomingSchedule.map((item, index) => (
                  <div
                    key={item.id}
                    style={{
                      padding: "16px",
                      borderBottom:
                        index < upcomingSchedule.length - 1
                          ? "1px solid #e5e7eb"
                          : "none",
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
                        {item.date}
                      </div>
                      <div style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}>
                        Location: {item.building}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FSMDashboard;
