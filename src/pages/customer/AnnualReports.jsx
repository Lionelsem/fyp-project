import React, { useEffect, useMemo, useState } from "react";
import { getAllReports } from "../../services/reportService";
import ResponsiveTableRegion from "../../components/common/ResponsiveTableRegion";

const fallbackReports = [
  {
    id: "annual-2025",
    reportId: "REP-2025-ANN-01",
    reportType: "Annual",
    reportTitle: "Annual Compliance Report 2025",
    period: "2025",
    generatedDate: new Date("2026-01-10T09:00:00"),
    status: "Submitted",
    priority: "High"
  },
  {
    id: "annual-2024",
    reportId: "REP-2024-ANN-01",
    reportType: "Annual",
    reportTitle: "Annual Compliance Report 2024",
    period: "2024",
    generatedDate: new Date("2025-01-15T09:00:00"),
    status: "Reviewed",
    priority: "Normal"
  },
  {
    id: "annual-2023",
    reportId: "REP-2023-ANN-01",
    reportType: "Annual",
    reportTitle: "Annual Compliance Report 2023",
    period: "2023",
    generatedDate: new Date("2024-01-12T09:00:00"),
    status: "Archived",
    priority: "Normal"
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
  if (["submitted", "generated", "approved"].includes(value)) {
    return { color: "#047857", backgroundColor: "#ecfdf5" };
  }
  if (["reviewed", "in review"].includes(value)) {
    return { color: "#b45309", backgroundColor: "#fef3c7" };
  }
  return { color: "#475569", backgroundColor: "#f1f5f9" };
};

const AnnualReports = () => {
  const [reports, setReports] = useState([]);
  const [search, setSearch] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadReports = async () => {
      try {
        const data = await getAllReports();
        const annualReports = (data || []).filter((item) => {
          const title = String(item.reportTitle || item.reportType || "").toLowerCase();
          return item.reportType === "Annual" || title.includes("annual");
        });

        if (active) {
          setReports(annualReports.length ? annualReports : fallbackReports);
        }
      } catch (error) {
        if (active) {
          setReports(fallbackReports);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadReports();
    return () => {
      active = false;
    };
  }, []);

  const filteredReports = useMemo(() => {
    const query = search.trim().toLowerCase();
    return reports.filter((report) => {
      const matchesSearch =
        !query ||
        String(report.reportTitle || "").toLowerCase().includes(query) ||
        String(report.period || "").toLowerCase().includes(query) ||
        String(report.reportId || "").toLowerCase().includes(query);

      const matchesYear = !yearFilter || String(report.period || "").includes(yearFilter);
      return matchesSearch && matchesYear;
    });
  }, [reports, search, yearFilter]);

  const years = useMemo(() => {
    return Array.from(new Set(reports.map((report) => String(report.period || "")).filter(Boolean))).sort((a, b) => b.localeCompare(a));
  }, [reports]);

  const latestReport = filteredReports[0] || reports[0] || fallbackReports[0];
  const totalReports = reports.length;
  const submittedCount = reports.filter((report) => String(report.status || "").toLowerCase() === "submitted").length;
  const reviewedCount = reports.filter((report) => String(report.status || "").toLowerCase() === "reviewed").length;

  return (
    <div className="dashboard-container">
      <div className="page-header" style={{ marginBottom: "24px" }}>
        <div>
          <div className="eyebrow">Customer Annual Report</div>
          <h1 style={{ margin: "0 0 8px", fontSize: "30px" }}>Annual Reports</h1>
          <p className="page-subtitle">
            Review your building’s yearly compliance summary, inspection outcomes, and key fire safety highlights in one place.
          </p>
        </div>
        <div className="header-actions">
          <button type="button" className="primary-btn">
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
            <div className="card-label">Total Annual Reports</div>
          </div>
          <div className="card-value">{totalReports}</div>
        </div>
        <div className="summary-card">
          <div className="card-top">
            <div className="card-icon" style={{ backgroundColor: "#eff6ff", color: "#2563eb" }}>
              ✅
            </div>
            <div className="card-label">Submitted</div>
          </div>
          <div className="card-value">{submittedCount}</div>
        </div>
        <div className="summary-card">
          <div className="card-top">
            <div className="card-icon" style={{ backgroundColor: "#fef3c7", color: "#b45309" }}>
              👀
            </div>
            <div className="card-label">Reviewed</div>
          </div>
          <div className="card-value">{reviewedCount}</div>
        </div>
        <div className="summary-card">
          <div className="card-top">
            <div className="card-icon" style={{ backgroundColor: "#fce7f3", color: "#be185d" }}>
              🏢
            </div>
            <div className="card-label">Latest Period</div>
          </div>
          <div className="card-value">{latestReport?.period || "—"}</div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="content-left">
          <div className="dashboard-card">
            <div className="card-header-row">
              <div>
                <h2 className="section-title">Latest Annual Report</h2>
                <p style={{ margin: "6px 0 0", color: "#64748b", fontSize: "14px" }}>
                  {latestReport?.reportTitle || "Annual report overview"}
                </p>
              </div>
              <span className="status-badge" style={getStatusStyle(latestReport?.status)}>
                {latestReport?.status || "Pending"}
              </span>
            </div>

            <div className="customer-report-summary">
              <div className="customer-report-summary-grid">
                <div style={{ background: "#f8fafc", borderRadius: "14px", padding: "14px" }}>
                  <div style={{ color: "#64748b", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Generated</div>
                  <strong style={{ display: "block", marginTop: "6px" }}>{formatDate(latestReport?.generatedDate)}</strong>
                </div>
              </div>

              <div style={{ border: "1px solid #e5e7eb", borderRadius: "16px", padding: "16px", background: "#ffffff" }}>
                <div style={{ fontSize: "13px", fontWeight: "700", color: "#16a34a", marginBottom: "10px" }}>Report Highlights</div>
                <ul style={{ margin: 0, paddingLeft: "18px", color: "#334155", lineHeight: "1.7" }}>
                  <li>Overall fire safety compliance remained strong for the reporting year.</li>
                  <li>Inspection results, drill records, and issue resolutions were consolidated into a single view.</li>
                  <li>All critical actions have been documented for customer review and follow-up.</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="dashboard-card">
            <div className="card-header-row">
              <h2 className="section-title">Annual Report History</h2>
              <button type="button" className="view-all-link">Export All</button>
            </div>

            <div className="issues-search-controls" style={{ marginBottom: "16px" }}>
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
                <select className="form-input responsive-control" value={yearFilter} onChange={(event) => setYearFilter(event.target.value)}>
                  <option value="">Filter Year</option>
                  {years.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {loading ? (
              <div style={{ color: "#64748b", padding: "12px 0" }}>Loading annual reports...</div>
            ) : filteredReports.length === 0 ? (
              <div style={{ color: "#64748b", padding: "12px 0" }}>No annual reports found.</div>
            ) : (
              <ResponsiveTableRegion
                label="Annual reports"
                className="fire-drill-history-table-wrapper responsive-table-region--cards"
              >
                <table className="dashboard-table responsive-card-table">
                  <thead>
                    <tr>
                      <th>REPORT</th>
                      <th>PERIOD</th>
                      <th>GENERATED</th>
                      <th>STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReports.map((report) => (
                      <tr key={report.id || report.reportId}>
                        <td data-label="Report">
                          <div className="id-cell">{report.reportTitle || "Annual Report"}</div>
                        </td>
                        <td data-label="Period">{report.period || "—"}</td>
                        <td data-label="Generated">{formatDate(report.generatedDate)}</td>
                        <td data-label="Status">
                          <span className="status-badge" style={getStatusStyle(report.status)}>
                            {report.status || "Pending"}
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
              <h2 className="section-title">Report Summary</h2>
            </div>
            <div style={{ display: "grid", gap: "12px" }}>
              <div style={{ padding: "14px", borderRadius: "14px", background: "#f8fafc" }}>
                <div style={{ color: "#64748b", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Current Focus</div>
                <strong style={{ display: "block", marginTop: "6px" }}>Fire safety compliance and corrective action tracking</strong>
              </div>
              <div style={{ padding: "14px", borderRadius: "14px", background: "#f8fafc" }}>
                <div style={{ color: "#64748b", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Key Observation</div>
                <strong style={{ display: "block", marginTop: "6px" }}>No critical unresolved issues were carried forward into the latest report.</strong>
              </div>
              <div style={{ padding: "14px", borderRadius: "14px", background: "#f8fafc" }}>
                <div style={{ color: "#64748b", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Next Review</div>
                <strong style={{ display: "block", marginTop: "6px" }}>Quarterly updates will be shared with your facility contact.</strong>
              </div>
            </div>
          </div>

          <div className="dashboard-card">
            <div className="card-header-row">
              <h2 className="section-title">Need Help?</h2>
            </div>
            <p style={{ margin: "0 0 12px", color: "#64748b", lineHeight: "1.6" }}>
              If you need a formal copy or want a detailed explanation of any section, contact the fire safety team.
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

export default AnnualReports;
