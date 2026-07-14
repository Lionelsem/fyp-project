import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthContext } from "../../context/AuthContext";
import { useFsmDashboardData } from "../../hooks/useFsmDashboardData";
import ResponsiveTableRegion from "../../components/common/ResponsiveTableRegion";

const CHART_SERIES = [
  { key: "passed", label: "Resolved", color: "#009c83" },
  { key: "pending", label: "In Progress", color: "#ff9f0a" },
  { key: "failed", label: "Critical", color: "#f5333f" }
];

const QUICK_ACTIONS = [
  { icon: "\uD83D\uDCCB", label: "Start Inspection", path: "/fsm/inspections" },
  { icon: "\uD83D\uDD0D", label: "Issue Tickets", path: "/fsm/issues" },
  { icon: "\u2713", label: "Verify Closure", path: "/fsm/inspections/verify" }
];

const ArrowRightIcon = () => (
  <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path d="M4 10h11m-4-4 4 4-4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const BuildingIcon = () => (
  <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path d="M4.5 17V4.7L10 2.8v14.1M10 6h5.5v11M2.8 17h14.4M6.8 6.3h.1m-.1 3h.1m-.1 3h.1m5.7-3.2h.1m-.1 3h.1" stroke="currentColor" strokeWidth="1.45" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const CalendarIcon = () => (
  <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <rect x="3.2" y="4.5" width="13.6" height="12.2" rx="2" stroke="currentColor" strokeWidth="1.45" />
    <path d="M6.5 2.8v3.4m7-3.4v3.4M3.5 8h13M6.4 10.8h.1m3.4 0h.1m3.4 0h.1m-7 3h.1m3.4 0h.1m3.4 0h.1" stroke="currentColor" strokeWidth="1.45" strokeLinecap="round" />
  </svg>
);

const CardLink = ({ children, onClick, arrow = false, ariaLabel }) => (
  <button type="button" className="fsm-card-link" onClick={onClick} aria-label={ariaLabel}>
    <span>{children}</span>
    {arrow && <ArrowRightIcon />}
  </button>
);

const getNiceChartMaximum = (items) => {
  const highestValue = Math.max(
    0,
    ...items.flatMap((item) => CHART_SERIES.map((series) => Number(item[series.key]) || 0))
  );

  if (highestValue <= 5) return 5;

  const roughStep = highestValue / 5;
  const magnitude = 10 ** Math.floor(Math.log10(roughStep));
  const normalizedStep = roughStep / magnitude;
  const niceStep = normalizedStep <= 1 ? 1 : normalizedStep <= 2 ? 2 : normalizedStep <= 5 ? 5 : 10;

  return niceStep * magnitude * 5;
};

const TrendChart = ({ items, loading }) => {
  const hasData = items.some((item) =>
    CHART_SERIES.some((series) => (Number(item[series.key]) || 0) > 0)
  );

  if (!hasData) {
    return (
      <div className="fsm-chart-empty">
        {loading ? "Loading issue trends..." : "No issue trend data found."}
      </div>
    );
  }

  const maximum = getNiceChartMaximum(items);
  const step = maximum / 5;
  const ticks = Array.from({ length: 6 }, (_, index) => maximum - (step * index));
  const canvasWidth = Math.max(360, items.length * 104);
  const gridColumns = { gridTemplateColumns: `repeat(${items.length}, minmax(88px, 1fr))` };

  return (
    <div
      className="fsm-trend-chart"
      role="img"
      aria-label={`Issue trend chart. ${items.map((item) => `${item.label}: ${item.passed || 0} resolved, ${item.pending || 0} in progress, and ${item.failed || 0} critical`).join(". ")}`}
    >
      <div className="fsm-trend-canvas" style={{ minWidth: `${canvasWidth}px` }}>
        <div className="fsm-trend-y-axis" aria-hidden="true">
          {ticks.map((tick, index) => (
            <span key={`${tick}-${index}`} style={{ top: `${index * 20}%` }}>
              {Number.isInteger(tick) ? tick : tick.toFixed(1)}
            </span>
          ))}
        </div>

        <div className="fsm-trend-plot" aria-hidden="true">
          <div className="fsm-trend-grid-lines">
            {ticks.map((tick, index) => (
              <span
                key={`${tick}-${index}`}
                className={index === ticks.length - 1 ? "is-baseline" : ""}
                style={{ top: `${index * 20}%` }}
              />
            ))}
          </div>

          <div className="fsm-trend-groups" style={gridColumns}>
            {items.map((item) => (
              <div className="fsm-trend-group" key={item.key || item.label}>
                {CHART_SERIES.map((series) => {
                  const value = Number(item[series.key]) || 0;
                  return (
                    <span
                      key={series.key}
                      className={`fsm-trend-bar${value === 0 ? " is-empty" : ""}`}
                      style={{
                        "--bar-color": series.color,
                        "--bar-height": `${(value / maximum) * 100}%`
                      }}
                    >
                      <strong>{value}</strong>
                    </span>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        <div className="fsm-trend-x-axis" style={gridColumns} aria-hidden="true">
          {items.map((item) => (
            <span key={item.key || item.label}>{item.label}</span>
          ))}
        </div>
      </div>
    </div>
  );
};

const IssueStatusChart = ({ statusBreakdown, loading }) => {
  const total = Number(statusBreakdown?.total) || 0;
  const statusItems = [
    { label: "Resolved", value: Number(statusBreakdown?.passed) || 0, color: "#009c83" },
    { label: "In Progress", value: Number(statusBreakdown?.pending) || 0, color: "#ff9f0a" },
    { label: "Critical", value: Number(statusBreakdown?.failed) || 0, color: "#f5333f" }
  ];
  const resolvedEnd = total ? (statusItems[0].value / total) * 100 : 0;
  const progressEnd = total ? resolvedEnd + ((statusItems[1].value / total) * 100) : 0;
  const chartBackground = total
    ? `conic-gradient(${statusItems[0].color} 0 ${resolvedEnd}%, ${statusItems[1].color} ${resolvedEnd}% ${progressEnd}%, ${statusItems[2].color} ${progressEnd}% 100%)`
    : "#e5eaee";

  return (
    <div className="fsm-status-chart">
      <div
        className="fsm-status-donut"
        style={{ background: chartBackground }}
        role="img"
        aria-label={loading && total === 0
          ? "Loading issue status."
          : `${total} total issues. ${statusItems.map((item) => `${item.label}: ${item.value}`).join(". ")}`}
      >
        <div className="fsm-status-donut-center">
          <strong>{loading && total === 0 ? "–" : total}</strong>
          <span>{loading && total === 0 ? "Syncing..." : "Total Issues"}</span>
        </div>
      </div>

      <div className="fsm-status-legend">
        {statusItems.map((item) => {
          const percentage = total ? Math.round((item.value / total) * 100) : 0;
          return (
            <div className="fsm-status-legend-row" key={item.label}>
              <span className="fsm-status-dot" style={{ backgroundColor: item.color }} />
              <span>{item.label}</span>
              <strong>{item.value} ({percentage}%)</strong>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const getBadgeTone = (value, type) => {
  const normalized = String(value || "").trim().toLowerCase();

  if (type === "priority") {
    if (normalized === "high" || normalized === "critical") return "danger";
    if (normalized === "medium") return "warning";
    if (normalized === "low") return "info";
    return "neutral";
  }

  if (["resolved", "closed", "submitted", "approved"].includes(normalized)) return "success";
  if (["in progress", "pending", "review"].includes(normalized)) return "warning";
  if (["critical", "failed"].includes(normalized)) return "danger";
  return "neutral";
};

const EmptyTableRow = ({ loading }) => (
  <tr>
    <td colSpan="5" className="fsm-table-empty">
      {loading ? "Loading issue reports..." : "No issue reports found."}
    </td>
  </tr>
);

const RecentIssueTable = ({ reports, loading }) => (
  <ResponsiveTableRegion
    label="Recent issue reports"
    className="fsm-reports-table-wrap responsive-table-region--cards"
  >
    <table className="fsm-reports-table responsive-card-table">
      <caption className="sr-only">Recent issue reports</caption>
      <colgroup>
        <col style={{ width: "23%" }} />
        <col style={{ width: "37%" }} />
        <col style={{ width: "14%" }} />
        <col style={{ width: "15%" }} />
        <col style={{ width: "11%" }} />
      </colgroup>
      <thead>
        <tr>
          <th>Building</th>
          <th>Issue</th>
          <th>Date</th>
          <th>Status</th>
          <th>Priority</th>
        </tr>
      </thead>
      <tbody>
        {reports.length === 0 ? (
          <EmptyTableRow loading={loading} />
        ) : (
          reports.map((report) => (
            <tr key={report.id}>
              <td data-label="Building">
                <span className="fsm-building-cell" title={report.building}>
                  <span className="fsm-building-icon"><BuildingIcon /></span>
                  <span>{report.building}</span>
                </span>
              </td>
              <td className="fsm-issue-cell" title={report.issue} data-label="Issue">{report.issue}</td>
              <td data-label="Date">{report.date}</td>
              <td data-label="Status">
                <span className={`fsm-table-badge fsm-table-badge--${getBadgeTone(report.status, "status")}`}>
                  {report.status}
                </span>
              </td>
              <td data-label="Priority">
                <span className={`fsm-table-badge fsm-table-badge--${getBadgeTone(report.priority, "priority")}`}>
                  {report.priority}
                </span>
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  </ResponsiveTableRegion>
);

const UpcomingActivities = ({ activities, loading }) => {
  if (activities.length === 0) {
    return (
      <div className="fsm-activities-empty">
        {loading ? "Loading activities..." : "No upcoming activities found."}
      </div>
    );
  }

  return (
    <div className="fsm-activity-list">
      {activities.map((activity, index) => (
        <div className="fsm-activity-row" key={activity.id}>
          <span className="fsm-activity-rail" aria-hidden="true">
            <span />
            {index < activities.length - 1 && <i />}
          </span>
          <span className="fsm-activity-icon"><CalendarIcon /></span>
          <span className="fsm-activity-copy">
            <strong>{activity.task}</strong>
            <span>{activity.building}</span>
          </span>
          <span className="fsm-activity-date">
            <strong>{activity.time}</strong>
            <span>{activity.date}</span>
          </span>
        </div>
      ))}
    </div>
  );
};

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
  const [trendPeriod, setTrendPeriod] = useState("monthly");

  const annualTrend = useMemo(() => {
    const years = new Map();

    monthlyTrend.forEach((item) => {
      const year = String(item.key || item.month || "").match(/20\d{2}/)?.[0];
      if (!year) return;

      if (!years.has(year)) {
        years.set(year, { key: year, label: year, passed: 0, pending: 0, failed: 0 });
      }

      const entry = years.get(year);
      entry.passed += Number(item.passed) || 0;
      entry.pending += Number(item.pending) || 0;
      entry.failed += Number(item.failed) || 0;
    });

    return Array.from(years.values()).sort((first, second) => Number(first.key) - Number(second.key));
  }, [monthlyTrend]);

  const trendItems = useMemo(() => {
    if (trendPeriod === "annual") return annualTrend.slice(-5);

    return monthlyTrend.slice(-6).map((item) => ({
      ...item,
      label: item.month || item.key
    }));
  }, [annualTrend, monthlyTrend, trendPeriod]);

  return (
    <div className="dashboard-container fsm-dashboard-page" aria-busy={loading}>
      {error && <div className="fsm-dashboard-alert" role="alert">{error}</div>}

      <div className="summary-grid" aria-label="Issue summary">
        {summaryCards.map((card) => (
          <div key={card.label} className="summary-card">
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
            <div className="card-trend">{card.trend}</div>
          </div>
        ))}
      </div>

      <section className="dashboard-card fsm-quick-actions-card" aria-labelledby="fsm-quick-actions-title">
        <div className="card-header-row">
          <h2 className="section-title" id="fsm-quick-actions-title">Quick Actions</h2>
        </div>
        <div className="fsm-quick-actions-list">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.path}
              type="button"
              className="fsm-quick-action-btn"
              onClick={() => navigate(action.path)}
            >
              <span className="fsm-quick-action-icon" aria-hidden="true">{action.icon}</span>
              <span>{action.label}</span>
            </button>
          ))}
        </div>
      </section>

      <div className="fsm-overview-grid">
        <section className="fsm-overview-card fsm-trends-card" aria-labelledby="fsm-trends-title">
          <header className="fsm-card-header">
            <h2 id="fsm-trends-title">Issue Trends</h2>
          </header>

          <div className="fsm-trend-toolbar">
            <select
              aria-label="Issue trend period"
              value={trendPeriod}
              onChange={(event) => setTrendPeriod(event.target.value)}
            >
              <option value="monthly">Monthly</option>
              <option value="annual">Annually</option>
            </select>

            <div className="fsm-trend-legend" aria-hidden="true">
              {CHART_SERIES.map((series) => (
                <span key={series.key}>
                  <i style={{ backgroundColor: series.color }} />
                  {series.label}
                </span>
              ))}
            </div>
            <span className="fsm-trend-toolbar-spacer" />
          </div>

          <TrendChart items={trendItems} loading={loading} />
        </section>

        <section className="fsm-overview-card fsm-status-card" aria-labelledby="fsm-status-title">
          <header className="fsm-card-header">
            <h2 id="fsm-status-title">Issue Status</h2>
          </header>
          <IssueStatusChart statusBreakdown={statusBreakdown} loading={loading} />
          <div className="fsm-card-footer">
            <CardLink arrow onClick={() => navigate("/fsm/issues")}>View all issues</CardLink>
          </div>
        </section>

        <section className="fsm-overview-card fsm-reports-card" aria-labelledby="fsm-reports-title">
          <header className="fsm-card-header">
            <h2 id="fsm-reports-title">Recent Issue Reports</h2>
            <CardLink onClick={() => navigate("/fsm/issues")} ariaLabel="View all issue reports">View all</CardLink>
          </header>
          <RecentIssueTable reports={recentReports} loading={loading} />
        </section>

        <section className="fsm-overview-card fsm-activities-card" aria-labelledby="fsm-activities-title">
          <header className="fsm-card-header">
            <h2 id="fsm-activities-title">Upcoming Activities</h2>
            <CardLink onClick={() => navigate("/fsm/fire-drill")} ariaLabel="View all upcoming activities">View all</CardLink>
          </header>
          <UpcomingActivities activities={upcomingSchedule} loading={loading} />
          <div className="fsm-card-footer fsm-activities-footer">
            <CardLink arrow onClick={() => navigate("/fsm/fire-drill")}>View full schedule</CardLink>
          </div>
        </section>
      </div>
    </div>
  );
};

export default FSMDashboard;
