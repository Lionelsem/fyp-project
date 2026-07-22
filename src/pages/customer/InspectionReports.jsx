import React, { useEffect, useMemo, useState } from "react";
import ResponsiveTableRegion from "../../components/common/ResponsiveTableRegion";
import { getAllReports, updateReport } from "../../services/reportService";

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
  const yearMatch = String(dateString || "").match(/\b(?:19|20)\d{2}\b/);
  return yearMatch ? parseInt(yearMatch[0], 10) : NaN;
};

const parseDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value.toDate === "function") return value.toDate();
  if (typeof value.seconds === "number") return new Date(value.seconds * 1000);
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatReportDate = (value) => {
  const date = parseDate(value);
  return date
    ? date.toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" })
    : "—";
};

const normalizeInspectionReport = (report) => {
  const reportDate = parseDate(report.generatedDate || report.createdAt || report.updatedAt);
  return {
    ...report,
    reportId: report.reportId || report.id,
    inspectionMonth:
      report.inspectionMonth ||
      report.period ||
      (reportDate?.toLocaleDateString("en-SG", { month: "long", year: "numeric" }) || "—"),
    inspectionDate: report.inspectionDate || formatReportDate(reportDate),
    fsmInCharge: report.fsmInCharge || report.generatedByName || report.generatedBy || "Assigned FSM",
    totalFindings: report.totalFindings ?? report.defectCount ?? 0,
    defectCount: report.defectCount ?? report.totalFindings ?? 0,
    summary: report.summary || report.aiSummary || "No summary available.",
    customerComments: report.customerComments || ""
  };
};

const formatInspectionMonth = (monthString) => {
  if (!monthString) return "";
  return String(monthString).replace(/\s+\d{4}$/, "");
};

const escapePdfText = (value) => {
  return String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
};

const buildInspectionOverviewPdf = (report) => {
  const title = "Latest Inspection Overview";
  const lines = [
    title,
    "",
    `Report ID: ${report?.reportId || "—"}`,
    `Inspection Month: ${formatInspectionMonth(report?.inspectionMonth) || "—"}`,
    `Inspection Date: ${report?.inspectionDate || "—"}`,
    `FSM In-Charge: ${report?.fsmInCharge || "—"}`,
    `Status: ${report?.status || "Pending"}`,
    `Total Findings: ${report?.totalFindings ?? "—"}`,
    `Summary: ${report?.summary || "No summary available."}`,
    `Customer Feedback: ${report?.customerComments || "No feedback added."}`,
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
    "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
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

const InspectionReports = () => {
  const [search, setSearch] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [remarks, setRemarks] = useState("");
  const [isSavingRemarks, setIsSavingRemarks] = useState(false);
  const [remarksSavedMessage, setRemarksSavedMessage] = useState("");
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  useEffect(() => {
    let active = true;

    const loadReports = async () => {
      try {
        const data = await getAllReports();
        const inspectionReports = (data || []).filter((report) => {
          const type = String(report.reportType || report.reportTitle || "").toLowerCase();
          return !type.includes("annual");
        });
        if (active) {
          setReports(
            inspectionReports.length
              ? inspectionReports.map(normalizeInspectionReport)
              : mockReports
          );
        }
      } catch (error) {
        if (active) setReports(mockReports);
      } finally {
        if (active) setLoading(false);
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
        String(report.reportId || "").toLowerCase().includes(query) ||
        String(report.inspectionMonth || "").toLowerCase().includes(query) ||
        String(report.fsmInCharge || "").toLowerCase().includes(query);

      const year = yearFilter ? parseInt(yearFilter, 10) : null;
      const reportYear = year ? parseReportYear(report.inspectionDate) : null;
      const matchesYear = !year || reportYear === year;

      return matchesSearch && matchesYear;
    });
  }, [reports, search, yearFilter]);

  const latestReport = filteredReports[0] || reports[0] || mockReports[0];

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

  const handleSaveRemarks = async () => {
    if (!latestReport?.id) {
      setRemarksSavedMessage("Unable to save feedback for this report.");
      return;
    }

    setIsSavingRemarks(true);
    setRemarksSavedMessage("");

    try {
      await updateReport(latestReport.id, { customerComments: remarks });
      setReports((currentReports) =>
        currentReports.map((report) =>
          report.id === latestReport.id ? { ...report, customerComments: remarks } : report
        )
      );
      setRemarksSavedMessage("Feedback saved.");
    } catch (error) {
      setRemarksSavedMessage("Unable to save feedback. Please try again.");
      console.error("Failed to save inspection report feedback", error);
    } finally {
      setIsSavingRemarks(false);
    }
  };

  const handleDownloadLatestInspectionPdf = () => {
    if (!latestReport) {
      alert("No inspection report is selected.");
      return;
    }

    setIsDownloadingPdf(true);

    try {
      const pdf = buildInspectionOverviewPdf(latestReport);
      const blob = new Blob([pdf], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${latestReport.reportId || "inspection-overview"}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to export inspection overview to PDF", error);
      alert("Unable to download the inspection overview PDF right now.");
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-card" style={{ marginBottom: "24px" }}>
        <div className="card-header-row" style={{ justifyContent: "space-between", marginBottom: "20px" }}>
          <div>
            <h4 className="page-subtitle">
              Review monthly safety inspections, findings, and corrective actions for your building.
            </h4>
          </div>
          <div className="header-actions">
            <button
              type="button"
              className="primary-btn"
              onClick={handleDownloadLatestInspectionPdf}
              disabled={isDownloadingPdf}
            >
              {isDownloadingPdf ? "Preparing PDF..." : "Download Latest Report"}
            </button>
          </div>
        </div>
      </div>

      <div className="summary-grid compact-summary-grid">
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
                <p style={{ margin: "6px 0 0", color: "#64748b", fontSize: "clamp(0.8125rem, 1.2vw, 0.875rem)" }}>
                  {formatInspectionMonth(latestReport?.inspectionMonth) || "Inspection summary"}
                </p>
              </div>
              <span className="status-badge" style={{ color: "#047857", backgroundColor: "#ecfdf5" }}>
                {latestReport?.status || "Pending"}
              </span>
            </div>

              <div style={{ display: "grid", gap: "14px", padding: "8px 0 4px" }}>
              {/* Report ID and FSM In-Charge removed per request */}

              <div style={{ border: "1px solid #e5e7eb", borderRadius: "16px", padding: "16px", background: "#ffffff" }}>
                <div style={{ fontSize: "clamp(0.75rem, 1.1vw, 0.8125rem)", fontWeight: "700", color: "#16a34a", marginBottom: "10px" }}>Inspection Summary</div>
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
                  style={{ minHeight: "clamp(120px, 20vw, 140px)" }}
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

            <div className="issues-search-controls report-history-filters">
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
                      <th>MONTH</th>
                      <th>DATE</th>
                      <th>STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReports.map((report) => (
                      <tr key={report.id}>
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
                <div style={{ color: "#64748b", fontSize: "clamp(0.75rem, 1vw, 0.8125rem)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Total Findings</div>
                <strong style={{ display: "block", marginTop: "6px" }}>{latestReport?.totalFindings ?? "—"}</strong>
              </div>
              <div style={{ padding: "14px", borderRadius: "14px", background: "#f8fafc" }}>
                <div style={{ color: "#64748b", fontSize: "clamp(0.75rem, 1vw, 0.8125rem)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Inspector</div>
                <strong style={{ display: "block", marginTop: "6px" }}>{latestReport?.fsmInCharge || "—"}</strong>
              </div>
              <div style={{ padding: "14px", borderRadius: "14px", background: "#f8fafc" }}>
                <div style={{ color: "#64748b", fontSize: "clamp(0.75rem, 1vw, 0.8125rem)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Status</div>
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
