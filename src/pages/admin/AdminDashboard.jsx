import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getAllBuildings } from "../../services/buildingService";
import { getAllFireDrills } from "../../services/fireDrillService";
import { getIssues } from "../../services/issueService";
import { getAllReports } from "../../services/reportService";
import { getAllUsers } from "../../services/userService";
import { ROLES } from "../../constants/roles";
import ResponsiveTableRegion from "../../components/common/ResponsiveTableRegion";

const CIRCUMFERENCE = 2 * Math.PI * 72;

const parseDate = (v) => {
  if (!v) return null;
  if (v instanceof Date) return v;
  if (typeof v.toDate === "function") return v.toDate();
  if (typeof v.seconds === "number") return new Date(v.seconds * 1000);
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

const fmtDate = (v) => {
  const d = parseDate(v);
  if (!d) return "-";
  return d.toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" });
};

const statusStyle = (s) => {
  const lower = String(s || "").toLowerCase();
  if (lower === "open")        return { color: "#dc2626" };
  if (lower === "in progress") return { color: "#ea580c" };
  if (lower === "resolved")    return { color: "#16a34a" };
  if (lower === "closed")      return { color: "#6b7280" };
  return { color: "#475569" };
};

const drillResultStyle = (drill) => {
  const s = String(drill.performanceStatus || drill.status || "").toLowerCase();
  if (["passed", "completed"].includes(s)) return { backgroundColor: "#dcfce7", color: "#166534" };
  if (s === "failed")                       return { backgroundColor: "#fee2e2", color: "#991b1b" };
  return { backgroundColor: "#fef3c7", color: "#b45309" };
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [buildings, setBuildings] = useState([]);
  const [users, setUsers]         = useState([]);
  const [issues, setIssues]       = useState([]);
  const [drills, setDrills]       = useState([]);
  const [reports, setReports]     = useState([]);

  useEffect(() => {
    let active = true;
    Promise.all([
      getAllBuildings(),
      getAllUsers(),
      getIssues(),
      getAllFireDrills(),
      getAllReports()
    ]).then(([b, u, i, d, r]) => {
      if (!active) return;
      setBuildings(b);
      setUsers(u);
      setIssues(i);
      setDrills(d);
      setReports(r);
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const buildingMap = useMemo(
    () => new Map(buildings.map((b) => [b.id, b.buildingName || b.building_name || "Unnamed building"])),
    [buildings]
  );

  // ── Computed stats ──
  const fsmCount        = useMemo(() => users.filter((u) => u.role === ROLES.FSM).length, [users]);
  const assignedCount   = useMemo(() => buildings.filter((b) => b.assignedFsmId).length, [buildings]);

  const openIssues      = useMemo(() => issues.filter((i) => String(i.status || "").toLowerCase() === "open"),        [issues]);
  const inProgressIssues= useMemo(() => issues.filter((i) => String(i.status || "").toLowerCase() === "in progress"), [issues]);
  const resolvedIssues  = useMemo(() => issues.filter((i) => String(i.status || "").toLowerCase() === "resolved"),    [issues]);
  const closedIssues    = useMemo(() => issues.filter((i) => String(i.status || "").toLowerCase() === "closed"),      [issues]);

  const completedDrills = useMemo(
    () => drills.filter((d) => String(d.status || "").toLowerCase() === "completed"),
    [drills]
  );
  const pendingReports  = useMemo(
    () => reports.filter((r) => ["draft", "pending"].includes(String(r.status || "").toLowerCase())),
    [reports]
  );

  const summaryCards = [
    { label: "Total Buildings",     value: buildings.length,                         icon: "🏢", iconBg: "#ecfdf5", iconColor: "#047857" },
    { label: "Total FSM Users",     value: fsmCount,                                 icon: "👥", iconBg: "#eff6ff", iconColor: "#1d4ed8" },
    { label: "Assigned Buildings",  value: assignedCount,                            icon: "📍", iconBg: "#eef2ff", iconColor: "#4338ca" },
    { label: "Outstanding Issues",  value: openIssues.length + inProgressIssues.length, icon: "⚠️", iconBg: "#fffbeb", iconColor: "#b45309" },
    { label: "Resolved Issues",     value: resolvedIssues.length,                   icon: "✅", iconBg: "#ecfdf5", iconColor: "#047857" },
    { label: "Closed Issues",       value: closedIssues.length,                     icon: "🔒", iconBg: "#eef2ff", iconColor: "#4338ca" },
    { label: "Completed Fire Drills",value: completedDrills.length,                 icon: "🚒", iconBg: "#fce7f3", iconColor: "#be185d" },
    { label: "Pending Reports",     value: pendingReports.length,                   icon: "📄", iconBg: "#ffedd5", iconColor: "#c2410c" }
  ];

  // ── Recent records ──
  const recentIssues = useMemo(
    () => [...issues].sort((a, b) => (parseDate(b.createdAt) || 0) - (parseDate(a.createdAt) || 0)).slice(0, 5),
    [issues]
  );
  const recentDrills = useMemo(
    () => [...drills]
      .sort((a, b) => {
        const da = parseDate(b.conductedDate || b.actualDate || b.createdAt) || new Date(0);
        const db2 = parseDate(a.conductedDate || a.actualDate || a.createdAt) || new Date(0);
        return da - db2;
      })
      .slice(0, 3),
    [drills]
  );
  const recentReports = useMemo(() => reports.slice(0, 3), [reports]);

  // ── Compliance chart ──
  const compliant     = resolvedIssues.length + closedIssues.length;
  const pending       = inProgressIssues.length;
  const nonCompliant  = openIssues.length;
  const totalIssues   = issues.length;

  const cDash = totalIssues > 0 ? (compliant    / totalIssues) * CIRCUMFERENCE : 0;
  const pDash = totalIssues > 0 ? (pending      / totalIssues) * CIRCUMFERENCE : 0;
  const nDash = totalIssues > 0 ? (nonCompliant / totalIssues) * CIRCUMFERENCE : 0;

  const o1 = CIRCUMFERENCE / 4;
  const o2 = o1 - cDash;
  const o3 = o2 - pDash;

  const compliantPct = totalIssues > 0 ? Math.round((compliant / totalIssues) * 100) : null;

  if (loading) {
    return (
      <div className="dashboard-container admin-page admin-dashboard-page role-dashboard-page">
        <div className="loading-state">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="dashboard-container admin-page admin-dashboard-page role-dashboard-page">
      {/* Summary cards */}
      <div
        className="summary-grid compact-summary-grid"
        role="list"
        aria-label="Admin status summary"
      >
        {summaryCards.map((card) => (
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
          {/* Recent Issues */}
          <div className="dashboard-card">
            <div className="card-header-row">
              <h2 className="section-title">Recent Issues</h2>
              <Link to="/issues-defects" className="view-all-link">View All</Link>
            </div>
            {recentIssues.length === 0 ? (
              <p style={{ color: "#9ca3af", fontSize: "clamp(0.8125rem, 0.8rem + 0.15vw, 0.875rem)" }}>
                No issues recorded.
              </p>
            ) : (
              <ResponsiveTableRegion
                label="Recent issues"
                className="responsive-table-region--cards"
              >
                <table className="dashboard-table responsive-card-table">
                <thead>
                  <tr>
                    <th>BUILDING</th>
                    <th>FINDING</th>
                    <th>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {recentIssues.map((issue) => (
                    <tr key={issue.id}>
                      <td data-label="Building">{buildingMap.get(issue.buildingId) || "Unknown building"}</td>
                      <td data-label="Finding">{issue.issueTitle || issue.issueDescription || "-"}</td>
                      <td data-label="Status">
                        <span className="status-badge" style={statusStyle(issue.status)}>
                          {issue.status || "-"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                </table>
              </ResponsiveTableRegion>
            )}
          </div>

          {/* Recent Fire Drills */}
          <div className="dashboard-card">
            <div className="card-header-row">
              <h2 className="section-title">Recent Fire Drill Records</h2>
              <Link to="/fire-drill" className="view-all-link">View All</Link>
            </div>
            {recentDrills.length === 0 ? (
              <p style={{ color: "#9ca3af", fontSize: "clamp(0.8125rem, 0.8rem + 0.15vw, 0.875rem)" }}>
                No fire drills recorded.
              </p>
            ) : (
              <ResponsiveTableRegion
                label="Recent fire drill records"
                className="responsive-table-region--cards"
              >
                <table className="dashboard-table responsive-card-table">
                <thead>
                  <tr>
                    <th>DATE</th>
                    <th>BUILDING</th>
                    <th>EVACUATION TIME</th>
                    <th>RESULT</th>
                  </tr>
                </thead>
                <tbody>
                  {recentDrills.map((drill) => (
                    <tr key={drill.id}>
                      <td data-label="Date">{drill.conductedDate || drill.actualDate || drill.drillDate || "-"}</td>
                      <td data-label="Building">{buildingMap.get(drill.buildingId) || drill.buildingName || "-"}</td>
                      <td data-label="Evacuation time">{drill.totalEvacuationTime || drill.evacuationTime || "-"}</td>
                      <td data-label="Result">
                        <span className="result-badge" style={drillResultStyle(drill)}>
                          {drill.performanceStatus || drill.status || "-"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                </table>
              </ResponsiveTableRegion>
            )}
          </div>

          {/* Recent Reports */}
          <div className="dashboard-card">
            <div className="card-header-row">
              <h2 className="section-title">Recent Submitted Reports</h2>
              <Link to="/reports" className="view-all-link">View All</Link>
            </div>
            {recentReports.length === 0 ? (
              <p style={{ color: "#9ca3af", fontSize: "clamp(0.8125rem, 0.8rem + 0.15vw, 0.875rem)" }}>
                No reports generated yet.
              </p>
            ) : (
              <ResponsiveTableRegion
                label="Recent submitted reports"
                className="responsive-table-region--cards"
              >
                <table className="dashboard-table responsive-card-table">
                <thead>
                  <tr>
                    <th>REPORT TYPE</th>
                    <th>BUILDING</th>
                    <th>DATE</th>
                  </tr>
                </thead>
                <tbody>
                  {recentReports.map((report) => (
                    <tr key={report.id}>
                      <td data-label="Report type">{report.reportTitle || report.reportType || "-"}</td>
                      <td data-label="Building">{buildingMap.get(report.buildingId) || "All Buildings"}</td>
                      <td data-label="Date">{fmtDate(report.generatedDate || report.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
                </table>
              </ResponsiveTableRegion>
            )}
          </div>
        </div>

        <div className="content-right">
          {/* Compliance chart */}
          <div className="dashboard-card">
            <div className="card-header-row">
              <h2 className="section-title">Compliance Status</h2>
            </div>
            <div className="compliance-chart">
              <svg width="180" height="180" viewBox="0 0 180 180">
                {totalIssues === 0 ? (
                  <circle cx="90" cy="90" r="72" fill="none" stroke="#e5e7eb" strokeWidth="16" />
                ) : (
                  <>
                    <circle cx="90" cy="90" r="72" fill="none" stroke="#f3f4f6" strokeWidth="16" />
                    {cDash > 0 && (
                      <circle
                        cx="90" cy="90" r="72" fill="none"
                        stroke="#10b981" strokeWidth="16"
                        strokeDasharray={`${cDash} ${CIRCUMFERENCE}`}
                        strokeDashoffset={o1}
                        strokeLinecap="round"
                      />
                    )}
                    {pDash > 0 && (
                      <circle
                        cx="90" cy="90" r="72" fill="none"
                        stroke="#fbbf24" strokeWidth="16"
                        strokeDasharray={`${pDash} ${CIRCUMFERENCE}`}
                        strokeDashoffset={o2}
                        strokeLinecap="round"
                      />
                    )}
                    {nDash > 0 && (
                      <circle
                        cx="90" cy="90" r="72" fill="none"
                        stroke="#ef4444" strokeWidth="16"
                        strokeDasharray={`${nDash} ${CIRCUMFERENCE}`}
                        strokeDashoffset={o3}
                        strokeLinecap="round"
                      />
                    )}
                  </>
                )}
                <text x="90" y="86" textAnchor="middle" fontSize="22" fontWeight="bold" fill="#1f2937">
                  {compliantPct !== null ? `${compliantPct}%` : "—"}
                </text>
                <text x="90" y="104" textAnchor="middle" fontSize="11" fill="#6b7280">
                  {totalIssues > 0 ? "Compliant" : "No data"}
                </text>
              </svg>
            </div>
            <div className="compliance-legend">
              <div className="legend-item">
                <span className="legend-dot" style={{ backgroundColor: "#10b981" }} />
                <span>Compliant ({compliant})</span>
              </div>
              <div className="legend-item">
                <span className="legend-dot" style={{ backgroundColor: "#fbbf24" }} />
                <span>Pending Rectification ({pending})</span>
              </div>
              <div className="legend-item">
                <span className="legend-dot" style={{ backgroundColor: "#ef4444" }} />
                <span>Non-Compliant ({nonCompliant})</span>
              </div>
            </div>
          </div>

          {/* Shortcuts */}
          <div className="dashboard-card">
            <div className="card-header-row">
              <h2 className="section-title">Reporting Shortcuts</h2>
            </div>
            <div className="shortcuts-container">
              <button type="button" className="shortcut-btn" onClick={() => navigate("/reports")}>
                <span className="shortcut-icon">📊</span>
                <span className="shortcut-content">
                  <span className="shortcut-title">Generate Monthly Report</span>
                  <span className="shortcut-desc">Summary of all building stats</span>
                </span>
                <span className="shortcut-arrow">→</span>
              </button>
              <button type="button" className="shortcut-btn" onClick={() => navigate("/reports")}>
                <span className="shortcut-icon">📄</span>
                <span className="shortcut-content">
                  <span className="shortcut-title">Generate Annual Report</span>
                  <span className="shortcut-desc">Full compliance certification</span>
                </span>
                <span className="shortcut-arrow">→</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
