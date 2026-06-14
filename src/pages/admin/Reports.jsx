import React, { useEffect, useMemo, useState } from "react";
import { getAllBuildings } from "../../services/buildingService";
import { getAllFireDrills } from "../../services/fireDrillService";
import { getIssues } from "../../services/issueService";
import { createReport, getAllInspections, getAllReports } from "../../services/reportService";
import {
  generateAnnualReport,
  generateCustomReport,
  generateMonthlyReport
} from "../../services/reportGeneratorService";
import { getAllUsers } from "../../services/userService";
import { useAuth } from "../../hooks/useAuth";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR - 2019 }, (_, i) => CURRENT_YEAR - i);

const MONTHLY_SECTIONS = {
  summary:      { label: "Executive Summary",      default: true },
  inspections:  { label: "Inspection Records",     default: true },
  drills:       { label: "Fire Drill Records",     default: true },
  issues:       { label: "Issues & Defects",       default: true },
  observations: { label: "General Observations",   default: true },
  appendixA:    { label: "Appendix A — Findings",  default: true }
};

const ANNUAL_SECTIONS = {
  buildingInfo:  { label: "Building Information",         default: true },
  epMeasures:   { label: "EP Measures",                  default: true },
  training:     { label: "Training Records",             default: true },
  drills:       { label: "Fire Drill Records",           default: true },
  drillReview:  { label: "Review of Fire Drills",        default: true },
  findings:     { label: "Findings & Rectification",     default: true },
  schedule:     { label: "Next 12 Months Schedule",      default: true },
  mattersArising:{ label: "Matters Arising",             default: true },
  arsonPlan:    { label: "Arson Prevention Plan",        default: true }
};

const defaultSections = (type) => {
  const map = type === "Annual" ? ANNUAL_SECTIONS : MONTHLY_SECTIONS;
  return Object.fromEntries(Object.entries(map).map(([k, v]) => [k, v.default]));
};

const parseDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value.toDate === "function") return value.toDate();
  if (typeof value.seconds === "number") return new Date(value.seconds * 1000);
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const formatDate = (value) => {
  const d = parseDate(value);
  if (!d) return "-";
  return d.toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" });
};

const getStatusStyle = (status) => {
  const s = String(status || "").toLowerCase();
  if (["passed", "approved", "generated", "submitted"].includes(s))
    return { color: "#047857", backgroundColor: "#ecfdf5" };
  if (["failed", "rejected"].includes(s))
    return { color: "#dc2626", backgroundColor: "#fef2f2" };
  if (["draft", "pending"].includes(s))
    return { color: "#b45309", backgroundColor: "#fef3c7" };
  return { color: "#475569", backgroundColor: "#f1f5f9" };
};

const getPriorityStyle = (priority) => {
  const p = String(priority || "").toLowerCase();
  if (p === "urgent") return { color: "#dc2626", backgroundColor: "#fef2f2" };
  if (p === "high")   return { color: "#ea580c", backgroundColor: "#fff7ed" };
  return { color: "#475569", backgroundColor: "#f1f5f9" };
};

const TABS = [
  { key: "recent",  label: "Recent Reports" },
  { key: "monthly", label: "Monthly Summaries" },
  { key: "annual",  label: "Annual Audits" },
  { key: "custom",  label: "Custom" }
];

const ModalHeader = ({ title, onClose, generating }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
    <h2 style={{ fontSize: "18px", fontWeight: "700", color: "#0f172a", margin: 0 }}>{title}</h2>
    <button
      type="button"
      style={{ background: "none", border: "none", cursor: "pointer", fontSize: "18px", color: "#6b7280" }}
      onClick={onClose}
      disabled={generating}
    >
      ✕
    </button>
  </div>
);

const ModalActions = ({ onCancel, onSubmit, generating, submitLabel = "Generate & Download" }) => (
  <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "8px" }}>
    <button type="button" className="secondary-btn" onClick={onCancel} disabled={generating}>
      Cancel
    </button>
    <button type="button" className="primary-btn" onClick={onSubmit} disabled={generating}>
      {generating ? "Generating..." : submitLabel}
    </button>
  </div>
);

const AdminReports = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("recent");
  const [reports, setReports]     = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [users, setUsers]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [search, setSearch]       = useState("");

  // Monthly modal
  const [showMonthlyModal, setShowMonthlyModal] = useState(false);
  const [selectedMonth,    setSelectedMonth]    = useState(new Date().getMonth() + 1);
  const [selectedYear,     setSelectedYear]     = useState(CURRENT_YEAR);
  const [selectedBuilding, setSelectedBuilding] = useState("all");

  // Annual modal
  const [showAnnualModal, setShowAnnualModal] = useState(false);
  const [annualYear,      setAnnualYear]      = useState(CURRENT_YEAR);

  // Custom modal
  const [showCustomModal,      setShowCustomModal]      = useState(false);
  const [customReportType,     setCustomReportType]     = useState("Monthly");
  const [customMonth,          setCustomMonth]          = useState(new Date().getMonth() + 1);
  const [customYear,           setCustomYear]           = useState(CURRENT_YEAR);
  const [customAnnualYear,     setCustomAnnualYear]     = useState(CURRENT_YEAR);
  const [customDateFrom,       setCustomDateFrom]       = useState("");
  const [customDateTo,         setCustomDateTo]         = useState("");
  const [customBuilding,       setCustomBuilding]       = useState("all");
  const [customTitle,          setCustomTitle]          = useState("");
  const [customOpeningRemarks, setCustomOpeningRemarks] = useState("");
  const [customPriority,       setCustomPriority]       = useState("Normal");
  const [customSections,       setCustomSections]       = useState(defaultSections("Monthly"));

  // Shared generating state
  const [generating,     setGenerating]     = useState(false);
  const [generateError,  setGenerateError]  = useState(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const [reportData, buildingData, userData] = await Promise.all([
          getAllReports(),
          getAllBuildings(),
          getAllUsers()
        ]);
        if (!active) return;
        setReports(reportData);
        setBuildings(buildingData);
        setUsers(userData);
      } catch (err) {
        if (active) setError(err.message || "Failed to load reports.");
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, []);

  const buildingMap = useMemo(
    () => new Map(buildings.map((b) => [b.id, b.buildingName || b.building_name || b.id])),
    [buildings]
  );
  const userMap = useMemo(
    () => new Map(users.map((u) => [u.uid, u.fullName || u.email])),
    [users]
  );

  const filteredReports = useMemo(() => {
    let list = reports;
    if (activeTab === "monthly") list = list.filter((r) => r.reportType === "Monthly");
    else if (activeTab === "annual") list = list.filter((r) => r.reportType === "Annual");
    else if (activeTab === "custom") list = list.filter((r) => r.reportType === "Custom");

    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((r) => {
      const id       = String(r.reportId || r.id || "").toLowerCase();
      const building = String(buildingMap.get(r.buildingId) || r.reportTitle || "").toLowerCase();
      const type     = String(r.reportType || "").toLowerCase();
      const status   = String(r.status || "").toLowerCase();
      return id.includes(q) || building.includes(q) || type.includes(q) || status.includes(q);
    });
  }, [reports, activeTab, search, buildingMap]);

  const refreshReports = async () => {
    const updated = await getAllReports();
    setReports(updated);
  };

  const generatedByName = () => user?.fullName || user?.email || "Admin";

  const fetchOperationalData = () =>
    Promise.all([getAllFireDrills(), getAllInspections(), getIssues()]);

  // ── Monthly generate ──
  const openMonthlyModal = () => {
    setGenerateError(null);
    setSelectedMonth(new Date().getMonth() + 1);
    setSelectedYear(CURRENT_YEAR);
    setSelectedBuilding("all");
    setShowMonthlyModal(true);
  };

  const doGenerateMonthly = async () => {
    setGenerating(true);
    setGenerateError(null);
    try {
      const [firedrills, inspections, issueList] = await fetchOperationalData();
      const buildingsToUse = selectedBuilding === "all"
        ? buildings
        : buildings.filter((b) => b.id === selectedBuilding);

      await generateMonthlyReport({
        month: selectedMonth, year: selectedYear,
        buildings: buildingsToUse, fireDrills: firedrills,
        inspections, issues: issueList, generatedBy: generatedByName()
      });

      const monthLabel = MONTHS[selectedMonth - 1];
      await createReport({
        reportId:    `REP-${selectedYear}-M${String(selectedMonth).padStart(2, "0")}-${Date.now()}`,
        reportType:  "Monthly",
        buildingId:  selectedBuilding === "all" ? null : selectedBuilding,
        generatedBy: user?.uid || "admin",
        generatedDate: new Date(),
        reportTitle: `Monthly Report — ${monthLabel} ${selectedYear}`,
        status:   "Generated",
        priority: "Normal",
        period:   `${monthLabel} ${selectedYear}`
      });
      await refreshReports();
      setShowMonthlyModal(false);
    } catch (err) {
      setGenerateError(err.message || "Failed to generate report.");
    } finally {
      setGenerating(false);
    }
  };

  // ── Annual generate ──
  const openAnnualModal = () => {
    setGenerateError(null);
    setAnnualYear(CURRENT_YEAR);
    setShowAnnualModal(true);
  };

  const doGenerateAnnual = async () => {
    setGenerating(true);
    setGenerateError(null);
    try {
      const [firedrills, inspections, issueList] = await fetchOperationalData();
      await generateAnnualReport({
        year: annualYear, buildings,
        fireDrills: firedrills, inspections,
        issues: issueList, generatedBy: generatedByName()
      });
      await createReport({
        reportId:    `REP-${annualYear}-ANN-${Date.now()}`,
        reportType:  "Annual",
        buildingId:  null,
        generatedBy: user?.uid || "admin",
        generatedDate: new Date(),
        reportTitle: `Annual Report ${annualYear}`,
        status:   "Generated",
        priority: "Normal",
        period:   String(annualYear)
      });
      await refreshReports();
      setShowAnnualModal(false);
    } catch (err) {
      setGenerateError(err.message || "Failed to generate annual report.");
    } finally {
      setGenerating(false);
    }
  };

  // ── Custom generate ──
  const openCustomModal = () => {
    setGenerateError(null);
    setCustomReportType("Monthly");
    setCustomMonth(new Date().getMonth() + 1);
    setCustomYear(CURRENT_YEAR);
    setCustomAnnualYear(CURRENT_YEAR);
    setCustomDateFrom("");
    setCustomDateTo("");
    setCustomBuilding("all");
    setCustomTitle("");
    setCustomOpeningRemarks("");
    setCustomPriority("Normal");
    setCustomSections(defaultSections("Monthly"));
    setShowCustomModal(true);
  };

  const handleCustomTypeChange = (type) => {
    setCustomReportType(type);
    setCustomSections(defaultSections(type));
  };

  const toggleSection = (key) =>
    setCustomSections((prev) => ({ ...prev, [key]: !prev[key] }));

  const doGenerateCustom = async () => {
    if (customReportType === "DateRange" && (!customDateFrom || !customDateTo)) {
      setGenerateError("Please select both a start and end date.");
      return;
    }
    setGenerating(true);
    setGenerateError(null);
    try {
      const [firedrills, inspections, issueList] = await fetchOperationalData();
      const buildingsToUse = customBuilding === "all"
        ? buildings
        : buildings.filter((b) => b.id === customBuilding);

      const reportYear = customReportType === "Annual" ? customAnnualYear : customYear;

      await generateCustomReport({
        reportType:     customReportType,
        sections:       customSections,
        month:          customMonth,
        year:           reportYear,
        dateFrom:       customDateFrom,
        dateTo:         customDateTo,
        customTitle:    customTitle.trim() || null,
        openingRemarks: customOpeningRemarks.trim() || null,
        buildings:      buildingsToUse,
        fireDrills:     firedrills,
        inspections,
        issues:         issueList,
        generatedBy:    generatedByName()
      });

      let periodLabel;
      if (customReportType === "DateRange") {
        periodLabel = `${customDateFrom} to ${customDateTo}`;
      } else if (customReportType === "Annual") {
        periodLabel = String(customAnnualYear);
      } else {
        periodLabel = `${MONTHS[customMonth - 1]} ${customYear}`;
      }

      const title = customTitle.trim() || `Custom Report — ${periodLabel}`;
      await createReport({
        reportId:    `REP-CUSTOM-${Date.now()}`,
        reportType:  "Custom",
        buildingId:  customBuilding === "all" ? null : customBuilding,
        generatedBy: user?.uid || "admin",
        generatedDate: new Date(),
        reportTitle: title,
        status:      "Generated",
        priority:    customPriority,
        period:      periodLabel
      });
      await refreshReports();
      setShowCustomModal(false);
    } catch (err) {
      setGenerateError(err.message || "Failed to generate custom report.");
    } finally {
      setGenerating(false);
    }
  };

  const sectionDefs = customReportType === "Annual" ? ANNUAL_SECTIONS : MONTHLY_SECTIONS;

  return (
    <div className="dashboard-container">
      {/* Header */}
      <div className="dashboard-card" style={{ marginBottom: "24px" }}>
        <div
          className="card-header-row"
          style={{ justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}
        >
          <div>
            <h2 className="section-title">Reports &amp; Analytics</h2>
            <p style={{ color: "#6b7280", marginTop: "4px", fontSize: "14px" }}>
              Global view of finalized inspections, monthly summaries, and annual audits.
            </p>
          </div>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <button type="button" className="secondary-btn" onClick={openMonthlyModal}>
              Generate Monthly Report
            </button>
            <button type="button" className="primary-btn" onClick={openAnnualModal}>
              Generate Annual Report
            </button>
            <button type="button" className="primary-btn" onClick={openCustomModal}>
              Custom Report
            </button>
          </div>
        </div>
      </div>

      {/* Tabs + table */}
      <div className="dashboard-card">
        <div style={{ display: "flex", gap: "4px", borderBottom: "1px solid #e5e7eb", marginBottom: "20px" }}>
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              style={{
                background: "none", border: "none", cursor: "pointer",
                padding: "10px 16px", fontSize: "14px",
                fontWeight: activeTab === tab.key ? "600" : "400",
                color: activeTab === tab.key ? "#047857" : "#6b7280",
                borderBottom: activeTab === tab.key ? "2px solid #047857" : "2px solid transparent",
                marginBottom: "-1px", transition: "color 0.15s ease"
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", gap: "12px", marginBottom: "20px", alignItems: "center" }}>
          <div className="search-box" style={{ flex: 1, maxWidth: "400px" }}>
            <span className="search-icon">🔍</span>
            <input
              type="text"
              className="search-input"
              placeholder="Search reports by ID, title, or building..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="loading-state">Loading reports...</div>
        ) : error ? (
          <div className="error-state">{error}</div>
        ) : (
          <div className="fire-drill-history-table-wrapper">
            <table className="dashboard-table" style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th>REPORT ID</th>
                  <th>TITLE / BUILDING</th>
                  <th>DATE</th>
                  <th>GENERATED BY</th>
                  <th>STATUS</th>
                  <th>PRIORITY</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredReports.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: "40px 0", color: "#9ca3af" }}>
                      {search
                        ? "No reports match your search."
                        : "No reports yet. Use the buttons above to generate a report."}
                    </td>
                  </tr>
                ) : (
                  filteredReports.map((report) => (
                    <tr key={report.id}>
                      <td className="id-cell">{report.reportId || report.id}</td>
                      <td>
                        {report.reportTitle || (
                          report.buildingId
                            ? buildingMap.get(report.buildingId) || report.buildingId
                            : "All Buildings"
                        )}
                      </td>
                      <td>{formatDate(report.generatedDate || report.createdAt)}</td>
                      <td>{userMap.get(report.generatedBy) || report.generatedBy || "-"}</td>
                      <td>
                        <span className="status-badge" style={getStatusStyle(report.status)}>
                          {report.status || "Generated"}
                        </span>
                      </td>
                      <td>
                        <span className="status-badge" style={getPriorityStyle(report.priority)}>
                          {report.priority || "Normal"}
                        </span>
                      </td>
                      <td>
                        <span style={{ color: "#047857", fontSize: "14px", fontWeight: "500" }}>
                          View ↗
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Monthly Modal ── */}
      {showMonthlyModal && (
        <div className="issue-ticket-modal-backdrop" onClick={() => !generating && setShowMonthlyModal(false)}>
          <div className="issue-ticket-modal" style={{ width: "min(520px, 100%)" }} onClick={(e) => e.stopPropagation()}>
            <ModalHeader title="Generate Monthly Report" onClose={() => setShowMonthlyModal(false)} generating={generating} />
            <p style={{ color: "#6b7280", fontSize: "14px", marginBottom: "20px" }}>
              Select the month, year, and optionally a specific building.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div className="form-field">
                <label className="form-label">Month</label>
                <select className="form-input" value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))}>
                  {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                </select>
              </div>
              <div className="form-field">
                <label className="form-label">Year</label>
                <select className="form-input" value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))}>
                  {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>
            <div className="form-field">
              <label className="form-label">Building</label>
              <select className="form-input" value={selectedBuilding} onChange={(e) => setSelectedBuilding(e.target.value)}>
                <option value="all">All Buildings</option>
                {buildings.map((b) => (
                  <option key={b.id} value={b.id}>{b.buildingName || b.building_name || b.id}</option>
                ))}
              </select>
            </div>
            {generateError && <div className="error-state" style={{ fontSize: "13px", padding: "10px 14px" }}>{generateError}</div>}
            <ModalActions onCancel={() => setShowMonthlyModal(false)} onSubmit={doGenerateMonthly} generating={generating} />
          </div>
        </div>
      )}

      {/* ── Annual Modal ── */}
      {showAnnualModal && (
        <div className="issue-ticket-modal-backdrop" onClick={() => !generating && setShowAnnualModal(false)}>
          <div className="issue-ticket-modal" style={{ width: "min(480px, 100%)" }} onClick={(e) => e.stopPropagation()}>
            <ModalHeader title="Generate Annual Report" onClose={() => setShowAnnualModal(false)} generating={generating} />
            <p style={{ color: "#6b7280", fontSize: "14px", marginBottom: "20px" }}>
              Generates a full annual report covering all buildings for the selected year.
            </p>
            <div className="form-field">
              <label className="form-label">Year</label>
              <select className="form-input" value={annualYear} onChange={(e) => setAnnualYear(Number(e.target.value))}>
                {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            {generateError && <div className="error-state" style={{ fontSize: "13px", padding: "10px 14px" }}>{generateError}</div>}
            <ModalActions onCancel={() => setShowAnnualModal(false)} onSubmit={doGenerateAnnual} generating={generating} />
          </div>
        </div>
      )}

      {/* ── Custom Modal ── */}
      {showCustomModal && (
        <div className="issue-ticket-modal-backdrop" onClick={() => !generating && setShowCustomModal(false)}>
          <div
            className="issue-ticket-modal"
            style={{ width: "min(680px, 100%)", maxHeight: "90vh", overflowY: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            <ModalHeader title="Custom Report" onClose={() => setShowCustomModal(false)} generating={generating} />

            {/* Report type */}
            <div className="form-field">
              <label className="form-label">Report Type</label>
              <div style={{ display: "flex", gap: "10px" }}>
                {["Monthly", "Annual", "DateRange"].map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleCustomTypeChange(type)}
                    style={{
                      padding: "8px 18px", borderRadius: "6px", fontSize: "13px", fontWeight: "500",
                      cursor: "pointer", border: "2px solid",
                      borderColor: customReportType === type ? "#047857" : "#e5e7eb",
                      backgroundColor: customReportType === type ? "#ecfdf5" : "#fff",
                      color: customReportType === type ? "#047857" : "#374151"
                    }}
                  >
                    {type === "DateRange" ? "Date Range" : type}
                  </button>
                ))}
              </div>
            </div>

            {/* Time scope inputs */}
            {customReportType === "Monthly" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div className="form-field">
                  <label className="form-label">Month</label>
                  <select className="form-input" value={customMonth} onChange={(e) => setCustomMonth(Number(e.target.value))}>
                    {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                  </select>
                </div>
                <div className="form-field">
                  <label className="form-label">Year</label>
                  <select className="form-input" value={customYear} onChange={(e) => setCustomYear(Number(e.target.value))}>
                    {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>
            )}

            {customReportType === "Annual" && (
              <div className="form-field">
                <label className="form-label">Year</label>
                <select className="form-input" value={customAnnualYear} onChange={(e) => setCustomAnnualYear(Number(e.target.value))}>
                  {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            )}

            {customReportType === "DateRange" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div className="form-field">
                  <label className="form-label">From Date</label>
                  <input type="date" className="form-input" value={customDateFrom} onChange={(e) => setCustomDateFrom(e.target.value)} />
                </div>
                <div className="form-field">
                  <label className="form-label">To Date</label>
                  <input type="date" className="form-input" value={customDateTo} onChange={(e) => setCustomDateTo(e.target.value)} />
                </div>
              </div>
            )}

            {/* Building */}
            <div className="form-field">
              <label className="form-label">Building</label>
              <select className="form-input" value={customBuilding} onChange={(e) => setCustomBuilding(e.target.value)}>
                <option value="all">All Buildings</option>
                {buildings.map((b) => (
                  <option key={b.id} value={b.id}>{b.buildingName || b.building_name || b.id}</option>
                ))}
              </select>
            </div>

            {/* Custom title */}
            <div className="form-field">
              <label className="form-label">Report Title <span style={{ color: "#9ca3af", fontWeight: 400 }}>(optional)</span></label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Q2 Fire Safety Summary — Building A"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
              />
            </div>

            {/* Priority */}
            <div className="form-field">
              <label className="form-label">Priority</label>
              <select className="form-input" value={customPriority} onChange={(e) => setCustomPriority(e.target.value)}>
                {["Low", "Normal", "High", "Urgent"].map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            {/* Opening remarks */}
            <div className="form-field">
              <label className="form-label">Opening Remarks <span style={{ color: "#9ca3af", fontWeight: 400 }}>(optional)</span></label>
              <textarea
                className="form-input"
                rows={3}
                placeholder="Additional notes that will appear at the top of the report..."
                value={customOpeningRemarks}
                onChange={(e) => setCustomOpeningRemarks(e.target.value)}
                style={{ resize: "vertical", minHeight: "72px" }}
              />
            </div>

            {/* Section toggles */}
            <div className="form-field">
              <label className="form-label">Sections to Include</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px", marginTop: "8px" }}>
                {Object.entries(sectionDefs).map(([key, { label }]) => (
                  <label
                    key={key}
                    style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "14px", color: "#374151" }}
                  >
                    <input
                      type="checkbox"
                      checked={!!customSections[key]}
                      onChange={() => toggleSection(key)}
                      style={{ accentColor: "#047857", width: "16px", height: "16px" }}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            {generateError && (
              <div className="error-state" style={{ fontSize: "13px", padding: "10px 14px" }}>{generateError}</div>
            )}
            <ModalActions onCancel={() => setShowCustomModal(false)} onSubmit={doGenerateCustom} generating={generating} />
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminReports;
