import React, { useEffect, useMemo, useState } from "react";
import { getAllFireDrills } from "../../services/fireDrillService";
import ResponsiveTableRegion from "../../components/common/ResponsiveTableRegion";

const fallbackDrills = [
  {
    id: "DR-001",
    drillType: "Full Building Evacuation",
    buildingName: "Tech Park B",
    drillDate: "2026-05-15",
    status: "Completed",
    performanceStatus: "Passed",
    actualDate: "2026-05-15",
    totalEvacuationTime: "6 min 20 sec",
    observations: "Evacuation was completed smoothly with minor delay at the west stairwell.",
    recommendations: "Reinforce stairwell briefing for new occupants."
  },
  {
    id: "DR-002",
    drillType: "Fire Alarm Drill",
    buildingName: "Tech Park B",
    drillDate: "2026-08-20",
    status: "Scheduled",
    performanceStatus: "Pending",
    actualDate: "",
    totalEvacuationTime: "",
    observations: "",
    recommendations: ""
  },
  {
    id: "DR-003",
    drillType: "Tenant Emergency Drill",
    buildingName: "Tech Park B",
    drillDate: "2026-02-10",
    status: "Completed",
    performanceStatus: "Needs Improvement",
    actualDate: "2026-02-10",
    totalEvacuationTime: "8 min 05 sec",
    observations: "Assembly point communication was delayed for several tenants.",
    recommendations: "Conduct a short refresher briefing before the next exercise."
  }
];

const parseDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value.toDate === "function") return value.toDate();
  if (typeof value.seconds === "number") return new Date(value.seconds * 1000);
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatDate = (value) => {
  const parsed = parseDate(value);
  if (!parsed) return "—";
  return parsed.toLocaleDateString("en-SG", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
};

const getStatusStyle = (status) => {
  const value = String(status || "").toLowerCase();
  if (["completed", "passed"].includes(value)) {
    return { color: "#047857", backgroundColor: "#ecfdf5" };
  }
  if (["needs improvement", "pending", "scheduled"].includes(value)) {
    return { color: "#b45309", backgroundColor: "#fef3c7" };
  }
  return { color: "#475569", backgroundColor: "#f1f5f9" };
};

const FireDrillReports = () => {
  const [drills, setDrills] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadDrills = async () => {
      try {
        const data = await getAllFireDrills();
        if (active) {
          setDrills(data && data.length ? data : fallbackDrills);
        }
      } catch (error) {
        if (active) {
          setDrills(fallbackDrills);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadDrills();
    return () => {
      active = false;
    };
  }, []);

  const filteredDrills = useMemo(() => {
    const query = search.trim().toLowerCase();
    return drills.filter((drill) => {
      const matchesSearch =
        !query ||
        String(drill.drillType || "").toLowerCase().includes(query) ||
        String(drill.buildingName || "").toLowerCase().includes(query) ||
        String(drill.id || "").toLowerCase().includes(query);

      const matchesStatus = !statusFilter || String(drill.status || "").toLowerCase() === statusFilter.toLowerCase();
      return matchesSearch && matchesStatus;
    });
  }, [drills, search, statusFilter]);

  const latestDrill = filteredDrills[0] || drills[0] || fallbackDrills[0];
  const completedCount = drills.filter((drill) => String(drill.status || "").toLowerCase() === "completed").length;
  const scheduledCount = drills.filter((drill) => String(drill.status || "").toLowerCase() === "scheduled").length;
  const averageTime = useMemo(() => {
    const completedDrills = drills.filter((drill) => drill.totalEvacuationTime);
    if (!completedDrills.length) return "—";
    return completedDrills[0].totalEvacuationTime;
  }, [drills]);

  return (
    <div className="dashboard-container">
      <div className="page-header" style={{ marginBottom: "24px" }}>
        <div>
          <div className="eyebrow">Customer Fire Drill Report</div>
          <h1 style={{ margin: "0 0 8px", fontSize: "30px" }}>Fire Drill Reports</h1>
          <p className="page-subtitle">
            Review drill schedules, outcomes, response times, and follow-up actions for your facility.
          </p>
        </div>
        <div className="header-actions">
          <button type="button" className="primary-btn">
            Download Report
          </button>
        </div>
      </div>

      <div className="summary-grid">
        <div className="summary-card">
          <div className="card-top">
            <div className="card-icon" style={{ backgroundColor: "#ecfdf5", color: "#047857" }}>
              🚒
            </div>
            <div className="card-label">Total Drills</div>
          </div>
          <div className="card-value">{drills.length}</div>
        </div>
        <div className="summary-card">
          <div className="card-top">
            <div className="card-icon" style={{ backgroundColor: "#eff6ff", color: "#2563eb" }}>
              ✅
            </div>
            <div className="card-label">Completed</div>
          </div>
          <div className="card-value">{completedCount}</div>
        </div>
        <div className="summary-card">
          <div className="card-top">
            <div className="card-icon" style={{ backgroundColor: "#fef3c7", color: "#b45309" }}>
              ⏳
            </div>
            <div className="card-label">Scheduled</div>
          </div>
          <div className="card-value">{scheduledCount}</div>
        </div>
        <div className="summary-card">
          <div className="card-top">
            <div className="card-icon" style={{ backgroundColor: "#fce7f3", color: "#be185d" }}>
              ⏱️
            </div>
            <div className="card-label">Latest Evacuation Time</div>
          </div>
          <div className="card-value">{averageTime}</div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="content-left">
          <div className="dashboard-card">
            <div className="card-header-row">
              <div>
                <h2 className="section-title">Latest Drill Overview</h2>
                <p style={{ margin: "6px 0 0", color: "#64748b", fontSize: "14px" }}>
                  {latestDrill?.drillType || "Fire drill summary"}
                </p>
              </div>
              <span className="status-badge" style={getStatusStyle(latestDrill?.status)}>
                {latestDrill?.status || "Pending"}
              </span>
            </div>

            <div className="customer-report-summary">
              <div className="customer-report-summary-grid">
                <div style={{ background: "#f8fafc", borderRadius: "14px", padding: "14px" }}>
                  <div style={{ color: "#64748b", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Building</div>
                  <strong style={{ display: "block", marginTop: "6px" }}>{latestDrill?.buildingName || "—"}</strong>
                </div>
                <div style={{ background: "#f8fafc", borderRadius: "14px", padding: "14px" }}>
                  <div style={{ color: "#64748b", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Drill Date</div>
                  <strong style={{ display: "block", marginTop: "6px" }}>{formatDate(latestDrill?.actualDate || latestDrill?.drillDate)}</strong>
                </div>
              </div>

              <div style={{ border: "1px solid #e5e7eb", borderRadius: "16px", padding: "16px", background: "#ffffff" }}>
                <div style={{ fontSize: "13px", fontWeight: "700", color: "#16a34a", marginBottom: "10px" }}>Observations</div>
                <p style={{ margin: 0, color: "#334155", lineHeight: "1.7" }}>
                  {latestDrill?.observations || "No observations recorded for this drill yet."}
                </p>
              </div>
            </div>
          </div>

          <div className="dashboard-card">
            <div className="card-header-row">
              <h2 className="section-title">Drill History</h2>
            </div>

            <div className="issues-search-controls" style={{ marginBottom: "16px" }}>
              <div className="issues-search-field">
                <div className="search-box">
                  <span className="search-icon">🔍</span>
                  <input
                    type="text"
                    className="search-input"
                    placeholder="Search drills..."
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </div>
              </div>
              <div className="issues-actions">
                <select className="form-input responsive-control" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                  <option value="">All Status</option>
                  <option value="Completed">Completed</option>
                  <option value="Scheduled">Scheduled</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div style={{ color: "#64748b", padding: "12px 0" }}>Loading fire drill reports...</div>
            ) : filteredDrills.length === 0 ? (
              <div style={{ color: "#64748b", padding: "12px 0" }}>No fire drill records found.</div>
            ) : (
              <ResponsiveTableRegion
                label="Fire drill reports"
                className="fire-drill-history-table-wrapper responsive-table-region--cards"
              >
                <table className="dashboard-table responsive-card-table">
                  <thead>
                    <tr>
                      <th>DRILL</th>
                      <th>BUILDING</th>
                      <th>DATE</th>
                      <th>STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDrills.map((drill) => (
                      <tr key={drill.id}>
                        <td data-label="Drill">
                          <div className="id-cell">{drill.drillType || "Fire Drill"}</div>
                        </td>
                        <td data-label="Building">{drill.buildingName || "—"}</td>
                        <td data-label="Date">{formatDate(drill.actualDate || drill.drillDate)}</td>
                        <td data-label="Status">
                          <span className="status-badge" style={getStatusStyle(drill.status || drill.performanceStatus)}>
                            {drill.status || drill.performanceStatus || "Pending"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ResponsiveTableRegion>
            )}
          </div>
        </div>

        <div className="content-right">
          <div className="dashboard-card">
            <div className="card-header-row">
              <h2 className="section-title">Drill Summary</h2>
            </div>
            <div style={{ display: "grid", gap: "12px" }}>
              <div style={{ padding: "14px", borderRadius: "14px", background: "#f8fafc" }}>
                <div style={{ color: "#64748b", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Performance</div>
                <strong style={{ display: "block", marginTop: "6px" }}>{latestDrill?.performanceStatus || "Pending review"}</strong>
              </div>
              <div style={{ padding: "14px", borderRadius: "14px", background: "#f8fafc" }}>
                <div style={{ color: "#64748b", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Response Time</div>
                <strong style={{ display: "block", marginTop: "6px" }}>{latestDrill?.totalEvacuationTime || "Not recorded"}</strong>
              </div>
              <div style={{ padding: "14px", borderRadius: "14px", background: "#f8fafc" }}>
                <div style={{ color: "#64748b", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Follow-Up</div>
                <strong style={{ display: "block", marginTop: "6px" }}>{latestDrill?.recommendations || "No immediate follow-up listed."}</strong>
              </div>
            </div>
          </div>

          <div className="dashboard-card">
            <div className="card-header-row">
              <h2 className="section-title">Need Assistance?</h2>
            </div>
            <p style={{ margin: "0 0 12px", color: "#64748b", lineHeight: "1.6" }}>
              Contact the fire safety team if you need a full drill report, a briefing, or help with corrective actions.
            </p>
            <button type="button" className="secondary-btn" style={{ width: "100%" }}>
              Contact Support
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FireDrillReports;
