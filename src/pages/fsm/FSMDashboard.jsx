import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthContext } from "../../context/AuthContext";
import { useFsmDashboardData } from "../../hooks/useFsmDashboardData";

const hasMonthlyTrendData = (monthlyTrend) =>
  monthlyTrend.some((item) => item.passed + item.pending + item.failed > 0);

const BarChart = ({ monthlyTrend }) => {
  const currentMonthShort = new Date().toLocaleString(undefined, { month: "short" });

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
        No issue trend data found.
      </div>
    );
  }

  const maxValue = Math.max(1, ...monthlyTrend.map((item) => item.passed + item.pending + item.failed));

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
        const isCurrent = String((item.month || "").slice(0, 3)).toLowerCase() === String(currentMonthShort).slice(0, 3).toLowerCase();

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
            <div style={{ marginTop: "8px", fontSize: "12px", fontWeight: "600", color: isCurrent ? "#111" : "#444" }}>
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
          <span>Closed</span>
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
          <span>Urgent</span>
        </div>
      </div>
    </div>
  );
};

const AnnualBarChart = ({ annualTrend }) => {
  if (!annualTrend || annualTrend.length === 0) {
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
        No trend data found for yearly view.
      </div>
    );
  }

  const maxValue = Math.max(1, ...annualTrend.map((i) => i.passed + i.pending + i.failed));

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
      {annualTrend.map((item) => {
        const passedHeight = (item.passed / maxValue) * 150;
        const pendingHeight = (item.pending / maxValue) * 150;
        const failedHeight = (item.failed / maxValue) * 150;

        return (
          <div
            key={item.year}
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
            <div style={{ marginTop: "8px", fontSize: "12px", fontWeight: "600" }}>{item.year}</div>
          </div>
        );
      })}
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
    icon: "\uD83D\uDCCB",
    label: "Start Inspection",
    path: "/fsm/inspections"
  },
  {
    icon: "\uD83D\uDD0D",
    label: "Issue Tickets",
    path: "/fsm/issues"
  },
  {
    icon: "\u2713",
    label: "Verify Closure",
    path: "/fsm/inspections/verify"
  }
];

const FSMDashboard = () => {
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const fsmLookupIds = [
    user?.uid,
    user?.authUid,
    user?.profileId,
    user?.id,
    user?.userId,
    user?.fullName,
    user?.displayName,
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

  const [trendTab, setTrendTab] = useState("monthly");
  const [trendFilterDraft, setTrendFilterDraft] = useState("");
  const [trendFilter, setTrendFilter] = useState("");
  const [trendFilterOpen, setTrendFilterOpen] = useState(false);

  const annualTrend = useMemo(() => {
    const map = {};

    if (Array.isArray(monthlyTrend)) {
      monthlyTrend.forEach((item) => {
        let y = null;
        if (item.year) y = Number(item.year);
        else if (item.month && typeof item.month === 'string') {
          const m = item.month.match(/(20\d{2})/);
          if (m) y = Number(m[1]);
        }
        if (!y && item.date && typeof item.date === 'string') {
          const m = item.date.match(/(20\d{2})/);
          if (m) y = Number(m[1]);
        }
        if (!y) return;
        if (!map[y]) map[y] = { year: y, passed: 0, pending: 0, failed: 0 };
        map[y].passed += item.passed || 0;
        map[y].pending += item.pending || 0;
        map[y].failed += item.failed || 0;
      });
    }

    return Object.values(map).sort((a, b) => a.year - b.year);
  }, [monthlyTrend]);

  const filteredMonthlyTrend = useMemo(
    () => trendFilter ? monthlyTrend.filter((item) => item.key === trendFilter) : monthlyTrend,
    [monthlyTrend, trendFilter]
  );

  const filteredAnnualTrend = useMemo(
    () => trendFilter ? annualTrend.filter((item) => String(item.year) === trendFilter) : annualTrend,
    [annualTrend, trendFilter]
  );

  useEffect(() => {
    setTrendFilter("");
    setTrendFilterDraft("");
    setTrendFilterOpen(false);
  }, [trendTab]);

  return (
    <div className="dashboard-container fsm-dashboard-page">
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
          <div className="dashboard-card fsm-chart-card">
            <div className="fsm-chart-grid">
              <section className="fsm-chart-panel">
                <div className="card-header-row">
                  <h2 className="section-title">Inspection Issue Ticket Status Breakdown</h2>
                </div>
                <div className="fsm-chart-donut-body">
                  <DonutChart statusBreakdown={statusBreakdown} />
                </div>
              </section>

              <section className="fsm-chart-panel">
                <div className="card-header-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "18px", paddingRight: "8px" }}>
                  <h2 className="section-title">Inspection Issue Ticket Trend</h2>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", justifyContent: "flex-end" }}>
                    <select
                      aria-label="Trend period"
                      value={trendTab}
                      onChange={(event) => setTrendTab(event.target.value)}
                      style={{
                        padding: "6px 10px",
                        borderRadius: "8px",
                        background: "#f8fafc",
                        color: "#111",
                        cursor: "pointer",
                        border: "1px solid #e5e7eb"
                      }}
                    >
                      <option value="monthly">Monthly</option>
                      <option value="annual">Annually</option>
                    </select>
                    <div style={{ position: "relative" }}>
                      <button
                        type="button"
                        aria-label="Filter trend"
                        onClick={() => setTrendFilterOpen((current) => !current)}
                        style={{
                          width: "34px",
                          height: "34px",
                          display: "grid",
                          placeItems: "center",
                          borderRadius: "8px",
                          background: trendFilter ? "#2563eb" : "#f8fafc",
                          color: trendFilter ? "#fff" : "#111",
                          cursor: "pointer",
                          border: "1px solid #e5e7eb"
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <path d="M4 5h16l-6 7v5l-4 2v-7L4 5z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                        </svg>
                      </button>
                      {trendFilterOpen && (
                        <div
                          style={{
                            position: "absolute",
                            right: 0,
                            top: "42px",
                            zIndex: 10,
                            width: "220px",
                            display: "grid",
                            gap: "10px",
                            padding: "12px",
                            borderRadius: "10px",
                            border: "1px solid #e5e7eb",
                            background: "#fff",
                            boxShadow: "0 14px 30px rgba(15, 23, 42, 0.14)"
                          }}
                        >
                          <label style={{ display: "grid", gap: "6px", fontSize: "12px", fontWeight: 700, color: "#475569" }}>
                            <span>{trendTab === "monthly" ? "Month and year" : "Year"}</span>
                            <input
                              type={trendTab === "monthly" ? "month" : "number"}
                              value={trendFilterDraft}
                              min={trendTab === "annual" ? "1900" : undefined}
                              max={trendTab === "annual" ? "2100" : undefined}
                              onChange={(event) => setTrendFilterDraft(event.target.value)}
                              placeholder={trendTab === "annual" ? "2026" : undefined}
                              style={{
                                padding: "7px 9px",
                                borderRadius: "8px",
                                border: "1px solid #e5e7eb"
                              }}
                            />
                          </label>
                          <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                            <button
                              type="button"
                              onClick={() => {
                                setTrendFilter("");
                                setTrendFilterDraft("");
                                setTrendFilterOpen(false);
                              }}
                              style={{
                                padding: "7px 10px",
                                borderRadius: "8px",
                                background: "#f8fafc",
                                color: "#111",
                                cursor: "pointer",
                                border: "1px solid #e5e7eb",
                                fontWeight: 700
                              }}
                            >
                              Clear
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setTrendFilter(trendFilterDraft);
                                setTrendFilterOpen(false);
                              }}
                              style={{
                                padding: "7px 10px",
                                borderRadius: "8px",
                                background: "#2563eb",
                                color: "#fff",
                                cursor: "pointer",
                                border: "none",
                                fontWeight: 700
                              }}
                            >
                              Apply
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="fsm-chart-trend-body">
                  {trendTab === "monthly" ? (
                    <BarChart monthlyTrend={filteredMonthlyTrend} />
                  ) : (
                    <AnnualBarChart annualTrend={filteredAnnualTrend} />
                  )}
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
                      <span>Closed</span>
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
                      <span>Urgent</span>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>

        <div className="content-right">
          <div className="dashboard-card fsm-quick-actions-card">
            <div className="card-header-row">
              <h2 className="section-title">Quick Actions</h2>
            </div>
            <div className="fsm-quick-actions-list">
              {quickActions.map((action) => (
                <button
                  key={action.path}
                  type="button"
                  className="fsm-quick-action-btn"
                  onClick={() => navigate(action.path)}
                >
                  <span className="fsm-quick-action-icon" aria-hidden="true">
                    {action.icon}
                  </span>
                  <span>{action.label}</span>
                </button>
              ))}
            </div>
          </div>

            <div className="dashboard-card fsm-recent-reports-card">
            <div className="card-header-row">
              <h2 className="section-title">Recent Reports</h2>
              <button type="button" className="view-all-link" onClick={() => navigate("/fsm/building")}>
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

          <div className="dashboard-card fsm-upcoming-card">
            <div className="card-header-row">
              <h2 className="section-title">Upcoming Schedule</h2>
              <button type="button" className="view-all-link" onClick={() => navigate("/fsm/fire-drill")}>
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
                      padding: "10px 0",
                      borderBottom:
                        index < upcomingSchedule.length - 1
                          ? "1px solid #e5e7eb"
                          : "none",
                      display: "flex",
                      gap: "12px"
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
