import React, { useMemo, useState } from "react";
import { useAuthContext } from "../../context/AuthContext";

const mockReports = [
  {
    id: "REP-09-2026",
    reportId: "REP-09-2026",
    inspectionMonth: "September 2026",
    inspectionDate: "Sep 12, 2026",
    fsmInCharge: "John Smith",
    totalFindings: 3,
    status: "Submitted",
    defectCount: 3
  },
  {
    id: "REP-08-2026",
    reportId: "REP-08-2026",
    inspectionMonth: "August 2026",
    inspectionDate: "Aug 15, 2026",
    fsmInCharge: "John Smith",
    totalFindings: 1,
    status: "Submitted",
    defectCount: 1
  },
  {
    id: "REP-07-2026",
    reportId: "REP-07-2026",
    inspectionMonth: "July 2026",
    inspectionDate: "Jul 10, 2026",
    fsmInCharge: "John Smith",
    totalFindings: 0,
    status: "Submitted",
    defectCount: 0
  }
];

const getFindingsBadgeStyle = (count) => {
  if (count === 0) {
    return { color: "#047857", backgroundColor: "#ecfdf5" };
  }
  return { color: "#b91c1c", backgroundColor: "#fee2e2" };
};

const getFindingsLabel = (count) => {
  if (count === 0) return "All Clear";
  return `${count} ${count === 1 ? "Defect" : "Defects"}`;
};

const InspectionReports = () => {
  const { user } = useAuthContext();
  const [search, setSearch] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [loading] = useState(false);
  const [error] = useState(null);

  // Mock data - in production, this would come from Firestore
  const reports = mockReports;

  const filteredReports = useMemo(() => {
    const query = search.trim().toLowerCase();
    return reports.filter((report) => {
      const matchesSearch =
        !query ||
        String(report.reportId || "").toLowerCase().includes(query) ||
        String(report.inspectionMonth || "").toLowerCase().includes(query) ||
        String(report.fsmInCharge || "").toLowerCase().includes(query);

      const year = yearFilter ? parseInt(yearFilter, 10) : null;
      const reportYear = year
        ? parseInt(report.inspectionDate?.split(",")[1]?.trim() || "", 10)
        : null;
      const matchesYear = !year || reportYear === year;

      return matchesSearch && matchesYear;
    });
  }, [reports, search, yearFilter]);

  const years = useMemo(() => {
    return Array.from(
      new Set(
        reports
          .map((r) => r.inspectionDate?.split(",")[1]?.trim())
          .filter(Boolean)
      )
    ).sort((a, b) => (b || "").localeCompare(a || ""));
  }, [reports]);

  return (
    <div className="dashboard-container">
      {loading && (
        <div className="loading-state" style={{ marginBottom: "18px" }}>
          Loading inspection reports...
        </div>
      )}
      {error && (
        <div className="error-state" style={{ marginBottom: "18px" }}>
          {error}
        </div>
      )}

      <div className="dashboard-card" style={{ marginBottom: "24px" }}>
        <div className="card-header-row" style={{ justifyContent: "space-between", marginBottom: "20px" }}>
          <div>
            <h2 className="section-title">Inspection Reports</h2>
            <p style={{ color: "#6b7280", marginTop: "4px", fontSize: "14px" }}>
              Review monthly fire safety inspection records and checklists for your property.
            </p>
          </div>
        </div>

        <div className="issues-search-controls">
          <div className="issues-search-field">
            <div className="search-box">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                className="search-input"
                placeholder="Search reports..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </div>
          <div className="issues-actions">
            <select
              className="form-input"
              value={yearFilter}
              onChange={(event) => setYearFilter(event.target.value)}
              style={{ minWidth: "200px" }}
            >
              <option value="">Filter Year</option>
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="dashboard-card">
        <div className="fire-drill-history-table-wrapper">
          <table className="dashboard-table">
            <thead>
              <tr>
                <th>REPORT ID</th>
                <th>INSPECTION MONTH</th>
                <th>INSPECTION DATE</th>
                <th>FSM IN-CHARGE</th>
                <th>TOTAL FINDINGS</th>
                <th>STATUS</th>
                <th>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "24px 0" }}>
                    Loading reports...
                  </td>
                </tr>
              ) : filteredReports.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "24px 0" }}>
                    No inspection reports found.
                  </td>
                </tr>
              ) : (
                filteredReports.map((report) => (
                  <tr key={report.id}>
                    <td className="id-cell">{report.reportId}</td>
                    <td>{report.inspectionMonth}</td>
                    <td>{report.inspectionDate}</td>
                    <td>{report.fsmInCharge}</td>
                    <td>
                      <span
                        className="status-badge"
                        style={getFindingsBadgeStyle(report.defectCount)}
                      >
                        {getFindingsLabel(report.defectCount)}
                      </span>
                    </td>
                    <td>
                      <span className="status-badge" style={{ color: "#047857", backgroundColor: "#ecfdf5" }}>
                        {report.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                        <button
                          type="button"
                          style={{
                            border: "none",
                            background: "none",
                            color: "#6b7280",
                            cursor: "pointer",
                            fontSize: "14px",
                            padding: "4px 8px"
                          }}
                          title="View"
                        >
                          👁️ View
                        </button>
                        <button
                          type="button"
                          style={{
                            border: "none",
                            background: "none",
                            color: "#6b7280",
                            cursor: "pointer",
                            fontSize: "14px",
                            padding: "4px 8px"
                          }}
                          title="Download"
                        >
                          ↓
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default InspectionReports;
