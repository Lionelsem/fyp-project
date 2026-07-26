import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { addFireDrillCustomerFeedback } from "../../services/fireDrillService";
import { addReportCustomerFeedback, getAllReports } from "../../services/reportService";
import ResponsiveTableRegion from "../../components/common/ResponsiveTableRegion";
import FeedbackHistory from "../../components/customer/FeedbackHistory";
import { useAuthContext } from "../../context/AuthContext";
import { useCustomerLiveData } from "../../hooks/useCustomerLiveData";

// --- Fallback Data ---
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
  }
];

const fallbackDrills = [
  {
    id: "DR-001",
    drillType: "Annual Full Building Evacuation Drill",
    buildingName: "Tech Park B",
    drillDate: "2026-05-15",
    status: "Completed",
    performanceStatus: "Passed",
    actualDate: "2026-05-15",
    totalEvacuationTime: "6 min 20 sec",
    observations: "Evacuation was completed smoothly with minor delay at the west stairwell.",
    recommendations: "Reinforce stairwell briefing for new occupants."
  }
];

// --- Helper Functions ---
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
  if (["completed", "passed", "submitted", "generated", "approved"].includes(value)) {
    return { color: "#047857", backgroundColor: "#ecfdf5" };
  }
  if (["needs improvement", "pending", "scheduled", "reviewed", "in review"].includes(value)) {
    return { color: "#b45309", backgroundColor: "#fef3c7" };
  }
  return { color: "#475569", backgroundColor: "#f1f5f9" };
};

const escapePdfText = (value) => {
  return String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
};

const buildFireDrillPdf = (drill) => {
  const title = "Annual Fire Drill Report";
  const lines = [
    title,
    "",
    `Drill ID: ${drill?.id || "—"}`,
    `Drill Type: ${drill?.drillType || "—"}`,
    `Building: ${drill?.buildingName || "—"}`,
    `Drill Date: ${formatDate(drill?.actualDate || drill?.drillDate)}`,
    `Status: ${drill?.status || "Pending"}`,
    `Performance Status: ${drill?.performanceStatus || "—"}`,
    `Evacuation Time: ${drill?.totalEvacuationTime || "—"}`,
    `Observations: ${drill?.observations || "No observations recorded."}`,
    `Recommendations: ${drill?.recommendations || "No recommendations recorded."}`,
    `Customer Feedback: ${drill?.customerComments || "No feedback added."}`
  ];

  const contentStream = lines
    .map((line, index) => {
      const y = 760 - index * 14;
      return `BT /F1 11 Tf 50 ${y} Td (${escapePdfText(line)}) Tj ET`;
    })
    .join("\n");

  const contentStreamLength = contentStream.length;
  const objects = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n",
    `4 0 obj\n<< /Length ${contentStreamLength} >>\nstream\n${contentStream}\nendstream\nendobj\n`,
    "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n"
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object) => {
    offsets.push(pdf.length);
    pdf += object;
  });

  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += `startxref\n${xrefStart}\n%%EOF\n`;
  return pdf;
};

// --- Combined Component ---
const AnnualReports = () => {
  const { user } = useAuthContext();

  // ---------------- Annual Compliance Reports State ----------------
  const [reports, setReports] = useState([]);
  const [annualSearch, setAnnualSearch] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [reportsLoading, setReportsLoading] = useState(true);

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
          setReportsLoading(false);
        }
      }
    };

    loadReports();
    return () => {
      active = false;
    };
  }, []);

  const filteredReports = useMemo(() => {
    const query = annualSearch.trim().toLowerCase();
    return reports.filter((report) => {
      const matchesSearch =
        !query ||
        String(report.reportTitle || "").toLowerCase().includes(query) ||
        String(report.period || "").toLowerCase().includes(query) ||
        String(report.reportId || "").toLowerCase().includes(query);

      const matchesYear = !yearFilter || String(report.period || "").includes(yearFilter);
      return matchesSearch && matchesYear;
    });
  }, [reports, annualSearch, yearFilter]);

  const years = useMemo(() => {
    return Array.from(new Set(reports.map((report) => String(report.period || "")).filter(Boolean))).sort((a, b) => b.localeCompare(a));
  }, [reports]);

  const latestReport = filteredReports[0] || reports[0] || fallbackReports[0];
  const [remarks, setRemarks] = useState(latestReport?.customerComments || "");
  const [isSavingRemarks, setIsSavingRemarks] = useState(false);
  const [remarksSavedMessage, setRemarksSavedMessage] = useState("");

  useEffect(() => {
    setRemarks(latestReport?.customerComments || "");
    setRemarksSavedMessage("");
  }, [latestReport?.id]);

  const handleSaveRemarks = async () => {
    if (!latestReport?.id) {
      alert("Cannot save remarks for this report because no report record is available.");
      return;
    }

    setIsSavingRemarks(true);
    setRemarksSavedMessage("");

    try {
      const submittedAt = new Date();
      const feedbackEntry = {
        message: remarks.trim(),
        submittedAt,
        customerId: user?.uid || user?.authUid || "",
        customerName: user?.fullName || user?.name || user?.email || "Customer"
      };
      await addReportCustomerFeedback(latestReport.id, remarks, user);
      setReports((currentReports) =>
        currentReports.map((report) =>
          report.id === latestReport.id
            ? { ...report, customerComments: feedbackEntry.message, customerFeedbackUpdatedAt: submittedAt, customerFeedbackHistory: [...(report.customerFeedbackHistory || []), feedbackEntry] }
            : report
        )
      );
      setRemarksSavedMessage("Remarks saved successfully.");
    } catch (error) {
      setRemarksSavedMessage("Unable to save remarks. Please try again.");
      console.error(error);
    } finally {
      setIsSavingRemarks(false);
    }
  };

  // ---------------- Annual Fire Drill Reports State ----------------
  const { fireDrills: liveFireDrills, loading: drillsLoading } = useCustomerLiveData(user);
  const [drills, setDrills] = useState([]);
  const [drillComment, setDrillComment] = useState("");
  const [isSavingDrillComment, setIsSavingDrillComment] = useState(false);
  const [drillCommentMessage, setDrillCommentMessage] = useState("");
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  useEffect(() => {
    if (Array.isArray(liveFireDrills) && liveFireDrills.length > 0) {
      setDrills(liveFireDrills);
    } else {
      setDrills(fallbackDrills);
    }
  }, [liveFireDrills]);

  const latestDrill = drills[0] || fallbackDrills[0];

  useEffect(() => {
    setDrillComment(latestDrill?.customerComments || "");
    setDrillCommentMessage("");
  }, [latestDrill?.id]);

  const handleSaveDrillComment = async () => {
    if (!latestDrill?.id) {
      alert("Cannot save feedback for this drill because no record is available.");
      return;
    }

    if (!drillComment.trim()) {
      setDrillCommentMessage("Please enter feedback before saving.");
      return;
    }

    setIsSavingDrillComment(true);
    setDrillCommentMessage("");

    try {
      const submittedAt = new Date();
      const feedbackEntry = {
        message: drillComment.trim(),
        submittedAt,
        customerId: user?.uid || user?.authUid || "",
        customerName: user?.fullName || user?.name || user?.email || "Customer"
      };

      await addFireDrillCustomerFeedback(latestDrill.id, drillComment, user);

      setDrills((currentDrills) =>
        currentDrills.map((drill) =>
          drill.id === latestDrill.id
            ? {
                ...drill,
                customerComments: feedbackEntry.message,
                customerFeedbackUpdatedAt: submittedAt,
                customerFeedbackHistory: [...(drill.customerFeedbackHistory || []), feedbackEntry]
              }
            : drill
        )
      );

      setDrillCommentMessage("Feedback saved successfully.");
    } catch (error) {
      setDrillCommentMessage("Unable to save feedback. Please try again.");
      console.error(error);
    } finally {
      setIsSavingDrillComment(false);
    }
  };

  const handleDownloadLatestDrillPdf = () => {
    if (!latestDrill) {
      alert("No fire drill report is selected.");
      return;
    }

    setIsDownloadingPdf(true);

    try {
      const pdf = buildFireDrillPdf(latestDrill);
      const blob = new Blob([pdf], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${latestDrill.id || "annual-fire-drill-report"}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to export fire drill report to PDF", error);
      alert("Unable to download the fire drill report PDF right now.");
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  return (
    <div className="dashboard-container">
      {/* Top Banner */}
      <div className="dashboard-card" style={{ marginBottom: "24px" }}>
        <div className="card-header-row" style={{ justifyContent: "space-between", marginBottom: "12px" }}>
          <div>
            <h2 className="section-title" style={{ fontSize: "1.5rem", marginBottom: "4px" }}>Annual Building Reports</h2>
            <h4 className="page-subtitle" style={{ margin: 0 }}>
              Review your yearly compliance summary, inspection outcomes, and annual fire drill exercise records all in one place.
            </h4>
          </div>
          <div className="header-actions">
            <a
              className="primary-btn"
              href="/FSM_Annual_Report_Pioneer_Tech_Hub_2026.docx"
              download="FSM_Annual_Report_Pioneer_Tech_Hub_2026.docx"
            >
              Download Annual Report
            </a>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="summary-grid compact-summary-grid">
        <div className="summary-card">
          <div className="card-top">
            <div className="card-icon" style={{ backgroundColor: "#ecfdf5", color: "#047857" }}>📊</div>
            <div className="card-label">Total Annual Reports</div>
          </div>
          <div className="card-value">{reports.length}</div>
        </div>
        <div className="summary-card">
          <div className="card-top">
            <div className="card-icon" style={{ backgroundColor: "#eff6ff", color: "#2563eb" }}>🏢</div>
            <div className="card-label">Latest Period</div>
          </div>
          <div className="card-value">{latestReport?.period || "—"}</div>
        </div>
        <div className="summary-card">
          <div className="card-top">
            <div className="card-icon" style={{ backgroundColor: "#fef3c7", color: "#b45309" }}>🚒</div>
            <div className="card-label">Annual Drill Status</div>
          </div>
          <div className="card-value">{latestDrill?.status || "—"}</div>
        </div>
        <div className="summary-card">
          <div className="card-top">
            <div className="card-icon" style={{ backgroundColor: "#fce7f3", color: "#be185d" }}>⏱️</div>
            <div className="card-label">Latest Evacuation Time</div>
          </div>
          <div className="card-value">{latestDrill?.totalEvacuationTime || "—"}</div>
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="dashboard-grid">
        <div className="content-left">
          
          {/* SECTION 1: ANNUAL COMPLIANCE REPORT */}
          <div className="dashboard-card" style={{ marginBottom: "24px" }}>
            <div className="card-header-row">
              <div>
                <h2 className="section-title">Annual Compliance Summary</h2>
                <p style={{ margin: "6px 0 0", color: "#64748b", fontSize: "clamp(0.8125rem, 1.2vw, 0.875rem)" }}>
                  {latestReport?.reportTitle || "Annual report overview"}
                </p>
              </div>
              <span className="status-badge" style={getStatusStyle(latestReport?.status)}>
                {latestReport?.status || "Pending"}
              </span>
            </div>

            <div className="customer-report-summary">
              <div className="customer-report-summary-grid" style={{ marginBottom: "16px" }}>
                <div style={{ background: "#f8fafc", borderRadius: "14px", padding: "14px" }}>
                  <div style={{ color: "#64748b", fontSize: "clamp(0.75rem, 1vw, 0.8125rem)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Generated Date</div>
                  <strong style={{ display: "block", marginTop: "6px" }}>{formatDate(latestReport?.generatedDate)}</strong>
                </div>
              </div>

              <div style={{ border: "1px solid #e5e7eb", borderRadius: "16px", padding: "16px", background: "#ffffff" }}>
                <div style={{ fontSize: "clamp(0.75rem, 1.1vw, 0.8125rem)", fontWeight: "700", color: "#16a34a", marginBottom: "10px" }}>Annual Highlights</div>
                <ul style={{ margin: 0, paddingLeft: "18px", color: "#334155", lineHeight: "1.7" }}>
                  <li>Overall fire safety compliance remained strong for the reporting year.</li>
                  <li>Inspection results, drill records, and issue resolutions were consolidated into a single view.</li>
                  <li>All critical actions have been documented for customer review and follow-up.</li>
                </ul>
              </div>

              <div className="form-field" style={{ marginTop: "20px" }}>
                <label className="form-label">Annual Compliance Feedback</label>
                <textarea
                  className="form-input"
                  rows={4}
                  value={remarks}
                  onChange={(event) => setRemarks(event.target.value)}
                  placeholder="Add comments or feedback for this annual compliance report..."
                  style={{ minHeight: "100px" }}
                />
                <div className="responsive-form-actions">
                  <small className="overflow-safe" style={{ color: "#64748b" }}>
                    Saved to the annual compliance record.
                  </small>
                  <button
                    type="button"
                    className="primary-btn"
                    onClick={handleSaveRemarks}
                    disabled={isSavingRemarks || !latestReport?.id}
                  >
                    {isSavingRemarks ? "Saving..." : "Save Compliance Feedback"}
                  </button>
                </div>
                {remarksSavedMessage && (
                  <p style={{ margin: "10px 0 0", color: remarksSavedMessage.includes("Unable") ? "#b91c1c" : "#047857" }}>
                    {remarksSavedMessage}
                  </p>
                )}
                <FeedbackHistory record={latestReport} />
              </div>
            </div>
          </div>

          {/* SECTION 2: ANNUAL FIRE DRILL REPORT */}
          <div className="dashboard-card" style={{ marginBottom: "24px" }}>
            <div className="card-header-row" style={{ alignItems: "flex-start" }}>
              <div>
                <h2 className="section-title">Annual Fire Drill Summary</h2>
                <p style={{ margin: "6px 0 0", color: "#64748b", fontSize: "clamp(0.8125rem, 1.2vw, 0.875rem)" }}>
                  {latestDrill?.drillType || "Yearly Evacuation Drill"}
                </p>
              </div>
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <span className="status-badge" style={getStatusStyle(latestDrill?.status)}>
                  {latestDrill?.status || "Pending"}
                </span>
              </div>
            </div>

            <div className="customer-report-summary" style={{ marginTop: "16px" }}>
              <div className="customer-report-summary-grid" style={{ marginBottom: "16px" }}>
                <div style={{ background: "#f8fafc", borderRadius: "14px", padding: "14px" }}>
                  <div style={{ color: "#64748b", fontSize: "clamp(0.75rem, 1vw, 0.8125rem)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Building</div>
                  <strong style={{ display: "block", marginTop: "6px" }}>{latestDrill?.buildingName || "—"}</strong>
                </div>
                <div style={{ background: "#f8fafc", borderRadius: "14px", padding: "14px" }}>
                  <div style={{ color: "#64748b", fontSize: "clamp(0.75rem, 1vw, 0.8125rem)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Drill Date</div>
                  <strong style={{ display: "block", marginTop: "6px" }}>
                    {formatDate(latestDrill?.actualDate || latestDrill?.drillDate)}
                  </strong>
                </div>
              </div>

              <div style={{ border: "1px solid #e5e7eb", borderRadius: "16px", padding: "16px", background: "#ffffff", marginBottom: "16px" }}>
                <div style={{ fontSize: "clamp(0.75rem, 1.1vw, 0.8125rem)", fontWeight: "700", color: "#16a34a", marginBottom: "10px" }}>Drill Observations</div>
                <p style={{ margin: 0, color: "#334155", lineHeight: "1.7" }}>
                  {latestDrill?.observations || "No observations recorded for this drill yet."}
                </p>
              </div>

              <div className="form-field">
                <label className="form-label">Annual Drill Feedback</label>
                <textarea
                  className="form-input"
                  rows={4}
                  value={drillComment}
                  onChange={(event) => setDrillComment(event.target.value)}
                  placeholder="Add comments or feedback for this annual fire drill exercise..."
                  style={{ minHeight: "100px" }}
                />
                <div className="responsive-form-actions">
                  <small className="overflow-safe" style={{ color: "#64748b" }}>
                    Saved to the annual drill exercise record.
                  </small>
                  <button
                    type="button"
                    className="primary-btn"
                    onClick={handleSaveDrillComment}
                    disabled={isSavingDrillComment || !latestDrill?.id}
                  >
                    {isSavingDrillComment ? "Saving..." : "Save Drill Feedback"}
                  </button>
                </div>
                {drillCommentMessage && (
                  <p style={{ margin: "10px 0 0", color: drillCommentMessage.includes("Unable") ? "#b91c1c" : "#047857" }}>
                    {drillCommentMessage}
                  </p>
                )}
                <FeedbackHistory record={latestDrill} />
              </div>
            </div>
          </div>

          {/* SECTION 3: HISTORICAL ANNUAL RECORDS */}
          <div className="dashboard-card">
            <div className="card-header-row">
              <h2 className="section-title">Past Annual Reports</h2>
            </div>

            <div className="issues-search-controls report-history-filters">
              <div className="issues-search-field">
                <div className="search-box">
                  <span className="search-icon">🔍</span>
                  <input
                    type="text"
                    className="search-input"
                    placeholder="Search annual reports..."
                    value={annualSearch}
                    onChange={(event) => setAnnualSearch(event.target.value)}
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

            {reportsLoading ? (
              <div style={{ color: "#64748b", padding: "12px 0" }}>Loading annual reports...</div>
            ) : filteredReports.length === 0 ? (
              <div style={{ color: "#64748b", padding: "12px 0" }}>No past annual reports found.</div>
            ) : (
              <ResponsiveTableRegion label="Annual reports" className="fire-drill-history-table-wrapper responsive-table-region--cards">
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
              <h2 className="section-title">Annual Executive Summary</h2>
            </div>
            <div style={{ display: "grid", gap: "12px" }}>
              <div style={{ padding: "14px", borderRadius: "14px", background: "#f8fafc" }}>
                <div style={{ color: "#64748b", fontSize: "clamp(0.75rem, 1vw, 0.8125rem)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Annual Focus</div>
                <strong style={{ display: "block", marginTop: "6px" }}>Yearly compliance audit & evacuation readiness</strong>
              </div>
              <div style={{ padding: "14px", borderRadius: "14px", background: "#f8fafc" }}>
                <div style={{ color: "#64748b", fontSize: "clamp(0.75rem, 1vw, 0.8125rem)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Drill Performance</div>
                <strong style={{ display: "block", marginTop: "6px" }}>{latestDrill?.performanceStatus || "Pending review"} ({latestDrill?.totalEvacuationTime || "—"})</strong>
              </div>
              <div style={{ padding: "14px", borderRadius: "14px", background: "#f8fafc" }}>
                <div style={{ color: "#64748b", fontSize: "clamp(0.75rem, 1vw, 0.8125rem)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Action Items</div>
                <strong style={{ display: "block", marginTop: "6px" }}>{latestDrill?.recommendations || "No unresolved actions."}</strong>
              </div>
            </div>
          </div>

          <div className="dashboard-card">
            <div className="card-header-row">
              <h2 className="section-title">Need Help?</h2>
            </div>
            <p style={{ margin: "0 0 12px", color: "#64748b", lineHeight: "1.6" }}>
              If you require clarification on any annual report findings or drill exercise evaluations, contact the safety team.
            </p>
            <Link to="/feedbacks" className="secondary-btn" style={{ width: "100%", textAlign: "center" }}>
              Contact Support
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnnualReports;
