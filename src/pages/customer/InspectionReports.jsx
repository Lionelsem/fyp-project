import React, { useEffect, useMemo, useState } from "react";
import ResponsiveTableRegion from "../../components/common/ResponsiveTableRegion";

const mockReports = [
  {
    id: "REP-09-2026",
    reportId: "REP-09-2026",
    inspectionMonth: "September 2026",
    inspectionDate: "Sep 12, 2026",
    fsmInCharge: "John Smith",
    totalFindings: 3,
    status: "Submitted",
    defectCount: 3,
    summary: "Found three minor deficiencies in emergency lighting and signage.",
    customerComments: ""
  },
  {
    id: "REP-08-2026",
    reportId: "REP-08-2026",
    inspectionMonth: "August 2026",
    inspectionDate: "Aug 15, 2026",
    fsmInCharge: "John Smith",
    totalFindings: 1,
    status: "Submitted",
    defectCount: 1,
    summary: "Single finding for a blocked exit route that was corrected on-site.",
    customerComments: ""
  },
  {
    id: "REP-07-2026",
    reportId: "REP-07-2026",
    inspectionMonth: "July 2026",
    inspectionDate: "Jul 10, 2026",
    fsmInCharge: "John Smith",
    totalFindings: 0,
    status: "Submitted",
    defectCount: 0,
    summary: "Inspection passed without any findings.",
    customerComments: ""
  }
];

const parseReportYear = (dateString) => {
  return parseInt(dateString?.split(",")[1]?.trim() || "", 10);
};

const formatInspectionMonth = (monthString) => {
  if (!monthString) return "";
  return String(monthString).replace(/\s+\d{4}$/, "");
};

const InspectionReports = () => {
  const [search, setSearch] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [reports, setReports] = useState(mockReports);
  const [loading] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [isSavingRemarks, setIsSavingRemarks] = useState(false);
  const [remarksSavedMessage, setRemarksSavedMessage] = useState("");

  const filteredReports = useMemo(() => {
    const query = search.trim().toLowerCase();
    return reports.filter((report) => {
      const matchesSearch =
        !query ||
        String(report.reportId || "").toLowerCase().includes(query) ||
        String(report.inspectionMonth || "").toLowerCase().includes(query) ||
        String(report.fsmInCharge || "").toLowerCase().includes(query);

      const year = yearFilter ? parseInt(yearFilter, 10) : null;
      const reportYear = year ? parseReportYear(report.inspectionDate) : null;
      const matchesYear = !year || reportYear === year;

      return matchesSearch && matchesYear;
    });
  }, [reports, search, yearFilter]);

  const latestReport = filteredReports[0] || reports[0];

  useEffect(() => {
    setRemarks(latestReport?.customerComments || "");
    setRemarksSavedMessage("");
    // Comments are edited by this form; resync only when the selected report changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latestReport?.id]);

  const years = useMemo(() => {
    return Array.from(
      new Set(
        reports
          .map((r) => parseReportYear(r.inspectionDate))
          .filter(Boolean)
      )
    ).sort((a, b) => b - a);
  }, [reports]);

  const handleSaveRemarks = () => {
    setIsSavingRemarks(true);
    setRemarksSavedMessage("");

    setReports((currentReports) =>
      currentReports.map((report) =>
        report.id === latestReport.id ? { ...report, customerComments: remarks } : report
      )
    );

    setTimeout(() => {
      setIsSavingRemarks(false);
      setRemarksSavedMessage("Feedback saved.");
    }, 300);
  };

  return (
    <div className="dashboard-container">
      <div className="page-header" style={{ marginBottom: "24px" }}>
        <div>
          <h1 style={{ margin: "0 0 8px", fontSize: "30px" }}>Inspection Reports</h1>
          <p className="page-subtitle">
            Review monthly safety inspections, findings, and corrective actions for your building.
          </p>
        </div>
        <div className="header-actions">
          <button
            type="button"
            className="primary-btn"
            onClick={() => {
              if (!latestReport) {
                alert("No inspection report is selected.");
                return;
              }
              alert("Download not available for mock inspection data.");
            }}
          >
            Download Latest Report
          </button>
        </div>
      </div>

      <div className="summary-grid">
        <div className="summary-card">
          <div className="card-top">
            <div className="card-icon" style={{ backgroundColor: "#ecfdf5", color: "#047857" }}>
              📊
            </div>
            <div className="card-label">Total Inspection Reports</div>
          </div>
          <div className="card-value">{reports.length}</div>
        </div>
        <div className="summary-card">
          <div className="card-top">
            <div className="card-icon" style={{ backgroundColor: "#eff6ff", color: "#2563eb" }}>
              ✅
            </div>
            <div className="card-label">All Clear</div>
          </div>
          <div className="card-value">{reports.filter((report) => report.defectCount === 0).length}</div>
        </div>
        <div className="summary-card">
          <div className="card-top">
            <div className="card-icon" style={{ backgroundColor: "#fef3c7", color: "#b45309" }}>
              🧾
            </div>
            <div className="card-label">Reports with Findings</div>
          </div>
          <div className="card-value">{reports.filter((report) => report.defectCount > 0).length}</div>
        </div>
        <div className="summary-card">
          <div className="card-top">
            <div className="card-icon" style={{ backgroundColor: "#fce7f3", color: "#be185d" }}>
              🗓️
            </div>
            <div className="card-label">Latest Month</div>
          </div>
          <div className="card-value">{formatInspectionMonth(latestReport?.inspectionMonth) || "—"}</div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="content-left">
          <div className="dashboard-card">
            <div className="card-header-row">
              <div>
                <h2 className="section-title">Latest Inspection Overview</h2>
                <p style={{ margin: "6px 0 0", color: "#64748b", fontSize: "14px" }}>
                  {formatInspectionMonth(latestReport?.inspectionMonth) || "Inspection summary"}
                </p>
              </div>
              <span className="status-badge" style={{ color: "#047857", backgroundColor: "#ecfdf5" }}>
                {latestReport?.status || "Pending"}
              </span>
            </div>

            <div style={{ display: "grid", gap: "14px", padding: "8px 0 4px" }}>
              <div className="responsive-info-grid">
                <div style={{ background: "#f8fafc", borderRadius: "14px", padding: "14px" }}>
                  <div style={{ color: "#64748b", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Report ID</div>
                  <strong style={{ display: "block", marginTop: "6px" }}>{latestReport?.reportId || "—"}</strong>
                </div>
                <div style={{ background: "#f8fafc", borderRadius: "14px", padding: "14px" }}>
                  <div style={{ color: "#64748b", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.06em" }}>FSM In-Charge</div>
                  <strong style={{ display: "block", marginTop: "6px" }}>{latestReport?.fsmInCharge || "—"}</strong>
                </div>
              </div>

              <div style={{ border: "1px solid #e5e7eb", borderRadius: "16px", padding: "16px", background: "#ffffff" }}>
                <div style={{ fontSize: "13px", fontWeight: "700", color: "#16a34a", marginBottom: "10px" }}>Inspection Summary</div>
                <p style={{ margin: 0, color: "#334155", lineHeight: "1.7" }}>
                  {latestReport?.summary || "A summary of the latest inspection will appear here."}
                </p>
              </div>

              <div className="form-field" style={{ marginTop: "20px" }}>
                <label className="form-label">Your Remarks / Feedback</label>
                <textarea
                  className="form-input"
                  rows={5}
                  value={remarks}
                  onChange={(event) => setRemarks(event.target.value)}
                  placeholder="Add comments or feedback for this inspection report..."
                  style={{ minHeight: "140px" }}
                />
                <div className="responsive-form-actions">
                  <small className="overflow-safe" style={{ color: "#64748b" }}>
                    This note is saved to the selected inspection report in the current session.
                  </small>
                  <button
                    type="button"
                    className="primary-btn"
                    onClick={handleSaveRemarks}
                    disabled={isSavingRemarks || !latestReport?.id}
                  >
                    {isSavingRemarks ? "Saving..." : "Save Feedback"}
                  </button>
                </div>
                {remarksSavedMessage && (
                  <p style={{ margin: "10px 0 0", color: remarksSavedMessage.includes("Unable") ? "#b91c1c" : "#047857" }}>
                    {remarksSavedMessage}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="dashboard-card">
            <div className="card-header-row">
              <h2 className="section-title">Inspection History</h2>
            </div>

            <div className="issues-search-controls" style={{ marginBottom: "16px" }}>
              <div className="issues-search-field">
                <div className="search-box">
                  <span className="search-icon">🔍</span>
                  <input
                    type="text"
                    className="search-input"
                    placeholder="Search inspections..."
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </div>
              </div>
              <div className="issues-actions">
                <select className="form-input responsive-control" value={yearFilter} onChange={(event) => setYearFilter(event.target.value)}>
                  <option value="">All Years</option>
                  {years.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {loading ? (
              <div style={{ color: "#64748b", padding: "12px 0" }}>Loading inspection reports...</div>
            ) : filteredReports.length === 0 ? (
              <div style={{ color: "#64748b", padding: "12px 0" }}>No inspection records found.</div>
            ) : (
              <ResponsiveTableRegion
                label="Inspection history"
                className="fire-drill-history-table-wrapper responsive-table-region--cards"
              >
                <table className="dashboard-table responsive-card-table">
                  <thead>
                    <tr>
                      <th>REPORT</th>
                      <th>MONTH</th>
                      <th>DATE</th>
                      <th>STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReports.map((report) => (
                      <tr key={report.id}>
                        <td data-label="Report">
                          <div className="id-cell">{report.reportId}</div>
                          <div style={{ color: "#64748b", fontSize: "12px" }}>{report.fsmInCharge}</div>
                        </td>
                        <td data-label="Month">{report.inspectionMonth}</td>
                        <td data-label="Date">{report.inspectionDate}</td>
                        <td data-label="Status">
                          <span className="status-badge" style={{ color: "#047857", backgroundColor: "#ecfdf5" }}>
                            {report.status}
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
              <h2 className="section-title">Inspection Summary</h2>
            </div>
            <div style={{ display: "grid", gap: "12px" }}>
              <div style={{ padding: "14px", borderRadius: "14px", background: "#f8fafc" }}>
                <div style={{ color: "#64748b", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Total Findings</div>
                <strong style={{ display: "block", marginTop: "6px" }}>{latestReport?.totalFindings ?? "—"}</strong>
              </div>
              <div style={{ padding: "14px", borderRadius: "14px", background: "#f8fafc" }}>
                <div style={{ color: "#64748b", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Inspector</div>
                <strong style={{ display: "block", marginTop: "6px" }}>{latestReport?.fsmInCharge || "—"}</strong>
              </div>
              <div style={{ padding: "14px", borderRadius: "14px", background: "#f8fafc" }}>
                <div style={{ color: "#64748b", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Status</div>
                <strong style={{ display: "block", marginTop: "6px" }}>{latestReport?.status || "Pending"}</strong>
              </div>
            </div>
          </div>

          <div className="dashboard-card">
            <div className="card-header-row">
              <h2 className="section-title">Need Assistance?</h2>
            </div>
            <p style={{ margin: "0 0 12px", color: "#64748b", lineHeight: "1.6" }}>
              Contact the fire safety team if you need a full inspection report, actions, or clarifications.
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

export default InspectionReports;
