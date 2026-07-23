import React, { useEffect, useMemo, useState } from "react";
import { getAllFireDrills, updateFireDrill } from "../../services/fireDrillService";
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

const escapePdfText = (value) => {
  return String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
};

const buildFireDrillPdf = (drill) => {
  const title = "Latest Fire Drill Report";
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
    `Customer Feedback: ${drill?.customerComments || "No feedback added."}`,
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
  const [drillComment, setDrillComment] = useState(latestDrill.customerComments || "");
  const [isSavingDrillComment, setIsSavingDrillComment] = useState(false);
  const [drillCommentMessage, setDrillCommentMessage] = useState("");
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  useEffect(() => {
    setDrillComment(latestDrill.customerComments || "");
    setDrillCommentMessage("");
    // Comments are edited by this form; resync only when the selected drill changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latestDrill.id]);

  const completedCount = drills.filter((drill) => String(drill.status || "").toLowerCase() === "completed").length;
  const scheduledCount = drills.filter((drill) => String(drill.status || "").toLowerCase() === "scheduled").length;
  const averageTime = useMemo(() => {
    const completedDrills = drills.filter((drill) => drill.totalEvacuationTime);
    if (!completedDrills.length) return "—";
    return completedDrills[0].totalEvacuationTime;
  }, [drills]);

  const handleSaveDrillComment = async () => {
    if (!latestDrill?.id) {
      alert("Cannot save feedback for this drill because no record is available.");
      return;
    }

    setIsSavingDrillComment(true);
    setDrillCommentMessage("");

    try {
      await updateFireDrill(latestDrill.id, { customerComments: drillComment });
      setDrills((currentDrills) =>
        currentDrills.map((drill) =>
          drill.id === latestDrill.id ? { ...drill, customerComments: drillComment } : drill
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
      link.download = `${latestDrill.id || "fire-drill-report"}.pdf`;
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
      <div className="dashboard-card" style={{ marginBottom: "24px" }}>
        <div className="card-header-row" style={{ justifyContent: "space-between", marginBottom: "20px" }}>
          <div>
            <h4 className="page-subtitle">
              Review drill schedules, outcomes, response times, and follow-up actions for your facility.
            </h4>
          </div>
          <div className="header-actions">
            <button
              type="button"
              className="primary-btn"
              onClick={handleDownloadLatestDrillPdf}
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
                <p style={{ margin: "6px 0 0", color: "#64748b", fontSize: "clamp(0.8125rem, 1.2vw, 0.875rem)" }}>
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
                  <div style={{ color: "#64748b", fontSize: "clamp(0.75rem, 1vw, 0.8125rem)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Building</div>
                  <strong style={{ display: "block", marginTop: "6px" }}>{latestDrill?.buildingName || "—"}</strong>
                </div>
                <div style={{ background: "#f8fafc", borderRadius: "14px", padding: "14px" }}>
                  <div style={{ color: "#64748b", fontSize: "clamp(0.75rem, 1vw, 0.8125rem)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Drill Date</div>
                  <strong style={{ display: "block", marginTop: "6px" }}>{formatDate(latestDrill?.actualDate || latestDrill?.drillDate)}</strong>
                </div>
              </div>

              <div style={{ border: "1px solid #e5e7eb", borderRadius: "16px", padding: "16px", background: "#ffffff" }}>
                <div style={{ fontSize: "clamp(0.75rem, 1.1vw, 0.8125rem)", fontWeight: "700", color: "#16a34a", marginBottom: "10px" }}>Observations</div>
                <p style={{ margin: 0, color: "#334155", lineHeight: "1.7" }}>
                  {latestDrill?.observations || "No observations recorded for this drill yet."}
                </p>
              </div>

              <div className="form-field" style={{ marginTop: "20px" }}>
                <label className="form-label">Your Remarks / Feedback</label>
                <textarea
                  className="form-input"
                  rows={5}
                  value={drillComment}
                  onChange={(event) => setDrillComment(event.target.value)}
                  placeholder="Add comments or feedback for this fire drill report..."
                  style={{ minHeight: "clamp(120px, 20vw, 140px)" }}
                />
                <div className="responsive-form-actions">
                  <small className="overflow-safe" style={{ color: "#64748b" }}>
                    This feedback is saved to the current drill record.
                  </small>
                  <button
                    type="button"
                    className="primary-btn"
                    onClick={handleSaveDrillComment}
                    disabled={isSavingDrillComment || !latestDrill?.id}
                  >
                    {isSavingDrillComment ? "Saving..." : "Save Feedback"}
                  </button>
                </div>
                {drillCommentMessage && (
                  <p style={{ margin: "10px 0 0", color: drillCommentMessage.includes("Unable") ? "#b91c1c" : "#047857" }}>
                    {drillCommentMessage}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="dashboard-card">
            <div className="card-header-row">
              <h2 className="section-title">Drill History</h2>
            </div>

            <div className="issues-search-controls report-history-filters">
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
                <div style={{ color: "#64748b", fontSize: "clamp(0.75rem, 1vw, 0.8125rem)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Performance</div>
                <strong style={{ display: "block", marginTop: "6px" }}>{latestDrill?.performanceStatus || "Pending review"}</strong>
              </div>
              <div style={{ padding: "14px", borderRadius: "14px", background: "#f8fafc" }}>
                <div style={{ color: "#64748b", fontSize: "clamp(0.75rem, 1vw, 0.8125rem)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Response Time</div>
                <strong style={{ display: "block", marginTop: "6px" }}>{latestDrill?.totalEvacuationTime || "Not recorded"}</strong>
              </div>
              <div style={{ padding: "14px", borderRadius: "14px", background: "#f8fafc" }}>
                <div style={{ color: "#64748b", fontSize: "clamp(0.75rem, 1vw, 0.8125rem)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Follow-Up</div>
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
