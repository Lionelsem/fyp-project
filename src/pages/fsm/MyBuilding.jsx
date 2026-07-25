import React, { useEffect, useMemo, useState } from "react";
import { useAuthContext } from "../../context/AuthContext";
import { useFsmDashboardData } from "../../hooks/useFsmDashboardData";
import { getAllUsers } from "../../services/userService";

const mockBuildings = [
  {
    id: "BLD-001",
    buildingName: "Building A",
    address: "123 Main Street, Floor 2",
    occupancyType: "Commercial",
    noOfStoreys: 5,
    occupantLoad: 500,
    assignedFsm: "John Smith",
    customerName: "Building A Customer",
    nextInspection: "Sep 20, 2026",
    latestReport: "Monthly FSM Report - May 18, 2026",
    openIssueCount: 2,
    status: "Active"
  },
  {
    id: "BLD-002",
    buildingName: "Tech Park B",
    address: "123 Corporate Blvd, District 9",
    occupancyType: "Commercial",
    noOfStoreys: 8,
    occupantLoad: 800,
    assignedFsm: "John Smith (USR-002)",
    customerName: "Tech Park Customer",
    nextInspection: "Oct 15, 2028",
    latestReport: "Fire Drill Summary - May 15, 2026",
    openIssueCount: 1,
    status: "Active"
  },
  {
    id: "BLD-003",
    buildingName: "Logistics Hub",
    address: "789 Industrial Road",
    occupancyType: "Warehouse",
    noOfStoreys: 3,
    occupantLoad: 300,
    assignedFsm: "John Smith",
    customerName: "Logistics Hub Customer",
    nextInspection: "Nov 8, 2026",
    latestReport: "Fire Drill Summary - May 10, 2026",
    openIssueCount: 0,
    status: "Active"
  }
];

const reportActions = [
  {
    type: "Monthly",
    title: "Monthly Fire Safety Inspection",
    description: "Track monthly inspection reports for this building",
    action: "View reports",
    icon: "MI",
    tone: "green"
  },
  {
    type: "FireDrill",
    title: "Fire Drill Report",
    description: "Check fire drill logs and results",
    action: "View reports",
    icon: "FD",
    tone: "orange"
  }
];

const normalizeText = (value) => String(value || "").trim().toLowerCase();

const matchesReportMonth = (report, monthValue) => {
  if (!monthValue) return true;
  const [year, month] = monthValue.split("-").map(Number);
  if (Number(report.reportYear) && Number(report.reportMonth)) {
    return Number(report.reportYear) === year && Number(report.reportMonth) === month;
  }
  const monthName = new Date(year, month - 1, 1).toLocaleString("en", { month: "long" }).toLowerCase();
  const period = String(report.period || report.reportTitle || "").toLowerCase();
  return period.includes(String(year)) && period.includes(monthName);
};

const toDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value.toDate === "function") {
    const date = value.toDate();
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof value.seconds === "number") {
    return new Date(value.seconds * 1000);
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDate = (value) => {
  const date = toDate(value);
  if (!date) return value || "-";

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
};

const getStatusStyle = (status) => {
  const normalized = normalizeText(status);

  if (["active", "submitted", "approved", "completed", "pass", "passed"].includes(normalized)) {
    return { statusColor: "#047857", statusBg: "#ecfdf5" };
  }

  if (["inactive", "closed", "failed", "fail"].includes(normalized)) {
    return { statusColor: "#dc2626", statusBg: "#fee2e2" };
  }

  if (["pending", "draft", "review", "in progress"].includes(normalized)) {
    return { statusColor: "#b45309", statusBg: "#fef3c7" };
  }

  return { statusColor: "#475569", statusBg: "#f1f5f9" };
};

const normalizeFieldName = (fieldName) =>
  String(fieldName || "")
    .replace(/[\s_-]+/g, "")
    .toLowerCase();

const getFirstTextValue = (source, fieldNames) => {
  if (!source) return "";

  for (const fieldName of fieldNames) {
    const value = source?.[fieldName];
    if (value !== undefined && value !== null && String(value).trim()) {
      return String(value).trim();
    }
  }

  const normalizedFieldNames = new Set(fieldNames.map(normalizeFieldName));
  const matchingEntry = Object.entries(source).find(([key, value]) => (
    normalizedFieldNames.has(normalizeFieldName(key)) &&
    value !== undefined &&
    value !== null &&
    String(value).trim()
  ));

  if (matchingEntry) {
    return String(matchingEntry[1]).trim();
  }

  return "";
};

const BUILDING_NAME_FIELDS = [
  "building_name",
  "buildingName",
  "BuildingName",
  "building name",
  "Building Name",
  "name",
  "Name",
  "building",
  "Building"
];

const getBuildingName = (building) =>
  getFirstTextValue(building, BUILDING_NAME_FIELDS) || "Unnamed Building";

const getUserDisplayName = (user) =>
  [
    user?.fullName,
    user?.displayName,
    user?.name,
    user?.email
  ]
    .map((value) => String(value || "").trim())
    .find(Boolean) || "";

const getUserLookupIds = (user) =>
  [
    user?.uid,
    user?.authUid,
    user?.profileId,
    user?.id,
    user?.userId,
    user?.fsmId,
    user?.assignedFsmId,
    user?.staffId,
    user?.employeeId,
    user?.accountId,
    user?.firestoreId
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean);

const buildUserNameMap = (users = []) => {
  const userNameMap = new Map();

  users.forEach((user) => {
    const displayName = getUserDisplayName(user);
    if (!displayName) return;

    getUserLookupIds(user).forEach((lookupId) => {
      userNameMap.set(lookupId, displayName);
    });
  });

  return userNameMap;
};

const looksLikeTechnicalId = (value) => {
  const text = String(value || "").trim();
  return text.length >= 12 && !/\s/.test(text) && /^[a-zA-Z0-9_-]+$/.test(text);
};

const resolveAssignedFsmName = (building, userNameMap, currentUser) => {
  const storedName = getFirstTextValue(building, ["assignedFsmName"]);
  if (storedName) return storedName;

  const assignedFsmId = getFirstTextValue(building, ["assignedFsmId", "fsmId"]);
  if (assignedFsmId) {
    const mappedName = userNameMap.get(assignedFsmId);
    if (mappedName) return mappedName;

    if (getUserLookupIds(currentUser).includes(assignedFsmId)) {
      return getUserDisplayName(currentUser) || "Current FSM";
    }
  }

  const legacyAssignedFsm = getFirstTextValue(building, ["assignedFsm"]);
  if (legacyAssignedFsm) {
    const mappedName = userNameMap.get(legacyAssignedFsm);
    if (mappedName) return mappedName;

    if (getUserLookupIds(currentUser).includes(legacyAssignedFsm)) {
      return getUserDisplayName(currentUser) || "Current FSM";
    }

    return looksLikeTechnicalId(legacyAssignedFsm) ? "Assigned FSM" : legacyAssignedFsm;
  }

  return assignedFsmId ? "Assigned FSM" : "Current FSM";
};

const isForBuilding = (record, building) => {
  const buildingId = String(building.id || "");
  const buildingName = normalizeText(getBuildingName(building));

  return (
    String(record.buildingId || "") === buildingId ||
    normalizeText(
      getFirstTextValue(record, BUILDING_NAME_FIELDS)
    ) === buildingName
  );
};

const sortByLatestDate = (items, fieldNames) =>
  [...items].sort((first, second) => {
    const firstDate = fieldNames.map((field) => toDate(first[field])).find(Boolean);
    const secondDate = fieldNames.map((field) => toDate(second[field])).find(Boolean);
    return (secondDate?.getTime() || 0) - (firstDate?.getTime() || 0);
  });

const isReportType = (report, type) => {
  const haystack = normalizeText(`${report.reportType || ""} ${report.reportTitle || ""}`);

  if (type === "Monthly") return haystack.includes("monthly");
  if (type === "FireDrill") return haystack.includes("fire drill") || haystack.includes("firedrill") || haystack.includes("drill");

  return true;
};

const buildBuildingCard = ({ building, reports, inspections, issues, userNameMap, currentUser }) => {
  const relatedReports = reports.filter((report) => isForBuilding(report, building));
  const relatedInspections = inspections.filter((inspection) => isForBuilding(inspection, building));
  const relatedIssues = issues.filter((issue) => isForBuilding(issue, building));
  const latestReport = sortByLatestDate(relatedReports, ["generatedDate", "createdAt", "date"])[0];
  const latestInspection = sortByLatestDate(relatedInspections, ["inspectionDate", "createdAt"])[0];
  const openIssueCount = relatedIssues.filter((issue) => {
    const status = normalizeText(issue.status);
    return status !== "resolved" && status !== "closed";
  }).length;
  const status = building.status || building.buildingStatus || "Active";

  return {
    id: building.id,
    buildingName: getBuildingName(building),
    address: building.address || "-",
    occupancyType: building.occupancyType || "-",
    noOfStoreys: building.noOfStoreys || building.storeys || "-",
    grossFloorAreaGfa: building.grossFloorAreaGfa || "-",
    occupantLoad: building.occupantLoad || "-",
    assignedFsm: resolveAssignedFsmName(building, userNameMap, currentUser),
    customerName: building.customerName || building.customer || building.customerId || "Customer record pending",
    nextInspection: formatDate(building.nextInspection || building.nextInspectionDate),
    latestInspection: latestInspection
      ? formatDate(latestInspection.inspectionDate || latestInspection.createdAt)
      : building.latestInspection || "-",
    latestReport: latestReport
      ? `${latestReport.reportType || "Report"} - ${formatDate(latestReport.generatedDate || latestReport.createdAt || latestReport.date)}`
      : building.latestReport || "No report submitted",
    openIssueCount: Number.isInteger(building.openIssueCount) ? building.openIssueCount : openIssueCount,
    status,
    ...getStatusStyle(status)
  };
};

const getFsmLookupIds = (user) => [
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

const DetailItem = ({ label, value }) => (
  <div className="detail-row">
    <span className="detail-label">{label}</span>
    <span className="detail-value">{value || "-"}</span>
  </div>
);

const MyBuilding = () => {
  const { user } = useAuthContext();
  const [selectedReportType, setSelectedReportType] = useState(reportActions[0].type);
  const [selectedReportMonth, setSelectedReportMonth] = useState("");
  const [users, setUsers] = useState([]);
  const {
    loading,
    error,
    buildings: liveBuildings,
    reports,
    inspections,
    issues
  } = useFsmDashboardData(getFsmLookupIds(user));

  useEffect(() => {
    let active = true;

    const loadUsers = async () => {
      try {
        const userData = await getAllUsers();
        if (active) setUsers(userData);
      } catch (loadError) {
        console.error("Failed to load users for FSM assignment names", loadError);
      }
    };

    loadUsers();

    return () => {
      active = false;
    };
  }, []);

  const userNameMap = useMemo(() => buildUserNameMap(users), [users]);

  const buildingCards = useMemo(() => {
    const sourceBuildings = liveBuildings.length > 0 ? liveBuildings : loading ? [] : mockBuildings;

    return sourceBuildings.map((building) =>
      buildBuildingCard({
        building,
        reports,
        inspections,
        issues,
        userNameMap,
        currentUser: user
      })
    );
  }, [inspections, issues, liveBuildings, loading, reports, user, userNameMap]);

  const selectedBuilding = buildingCards[0];
  const selectedReportAction =
    reportActions.find((report) => report.type === selectedReportType) || reportActions[0];
  const selectedBuildingReports = useMemo(() => {
    if (!selectedBuilding) return [];

    const relatedReports = reports.filter((report) =>
      isForBuilding(report, selectedBuilding) &&
      isReportType(report, selectedReportType) &&
      matchesReportMonth(report, selectedReportMonth)
    );

    return sortByLatestDate(relatedReports, ["generatedDate", "createdAt", "date"]);
  }, [reports, selectedBuilding, selectedReportMonth, selectedReportType]);

  return (
    <div className="dashboard-container my-building-page">
      {error && (
        <div className="error-state" style={{ marginBottom: "18px" }}>
          {error}
        </div>
      )}

      {loading && liveBuildings.length === 0 && (
        <div className="loading-state" style={{ marginBottom: "18px" }}>
          Loading assigned buildings...
        </div>
      )}

      {selectedBuilding && (
        <div className="my-building-content">
          <div className="building-card-section">
            <div className="dashboard-card building-card">
              <div className="building-card-header">
                <span className="building-icon">BLD</span>
                <div>
                  <h3 className="building-label">Customer Building Card</h3>
                  <h2 className="building-name">{selectedBuilding.buildingName}</h2>
                  <p className="building-address">{selectedBuilding.address}</p>
                </div>
              </div>

              <div className="building-card-details">
                <DetailItem label="Customer" value={selectedBuilding.customerName} />
                <DetailItem label="FSM Assigned" value={selectedBuilding.assignedFsm} />
                <DetailItem label="Next Inspection" value={selectedBuilding.nextInspection} />
                <DetailItem label="Latest Report" value={selectedBuilding.latestReport} />
                <DetailItem label="Occupancy Type" value={selectedBuilding.occupancyType} />
                <DetailItem label="Storeys" value={selectedBuilding.noOfStoreys} />
                <DetailItem label="GFA" value={selectedBuilding.grossFloorAreaGfa} />
                <DetailItem label="Occupant Load" value={selectedBuilding.occupantLoad} />
                <DetailItem label="Open Issues" value={selectedBuilding.openIssueCount} />
              </div>
            </div>
          </div>

          <section className="my-building-reports" aria-labelledby="building-reports-title">
            <div className="my-building-section-heading">
              <div>
                <h2 id="building-reports-title" className="section-title">
                  Reports
                </h2>
                <p className="my-building-section-subtitle">
                  Reports linked to {selectedBuilding.buildingName}
                </p>
              </div>
            </div>

            <div className="my-building-report-layout">
              <section className="fsm-report-action-list" aria-label="Report actions">
                {reportActions.map((report) => (
                  <button
                    key={report.title}
                    type="button"
                    onClick={() => setSelectedReportType(report.type)}
                    aria-pressed={selectedReportType === report.type}
                    className={`fsm-report-action-card fsm-report-action-card--${report.tone}`}
                  >
                    <span className="fsm-report-action-icon" aria-hidden="true">
                      {report.icon}
                    </span>
                    <span className="fsm-report-action-body">
                      <strong>{report.title}</strong>
                      <span>{report.description}</span>
                      <em>{report.action}</em>
                    </span>
                  </button>
                ))}
              </section>

              <section className="dashboard-card fsm-latest-report-card">
                <div className="card-header-row">
                  <h2 className="section-title">{selectedReportAction.title}</h2>
                  <label className="report-month-filter">
                    <span>Reporting month</span>
                    <span className="temporal-control report-temporal-control">
                      <input
                        type="month"
                        value={selectedReportMonth}
                        onChange={(event) => setSelectedReportMonth(event.target.value)}
                      />
                    </span>
                  </label>
                </div>

                <div className="fsm-latest-report-list">
                  {selectedBuildingReports.length === 0 ? (
                    <div className="empty-state" style={{ padding: "18px 0" }}>
                      No {selectedReportAction.title.toLowerCase()} records found for this building.
                    </div>
                  ) : (
                    selectedBuildingReports.map((report) => {
                      const statusStyle = getStatusStyle(report.status || report.reportStatus || "Generated");
                      return (
                        <div key={report.id || report.reportId} className="fsm-latest-report-row">
                          <div className="fsm-latest-report-copy">
                            <strong>{report.reportTitle || report.reportId || "Report"}</strong>
                            <span>
                              Generated on {formatDate(report.generatedDate || report.createdAt || report.date)}
                            </span>
                          </div>
                          <span
                            className="fsm-report-status-pill"
                            style={{
                              backgroundColor: statusStyle.statusBg,
                              color: statusStyle.statusColor
                            }}
                          >
                            {report.status || report.reportStatus || "Generated"}
                          </span>
                          {report.reportFileUrl && (
                            <a
                              href={report.reportFileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="view-all-link fsm-report-open-link"
                            >
                              Open
                            </a>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </section>
            </div>
          </section>
        </div>
      )}

      {!loading && !selectedBuilding && (
        <div className="empty-state">No assigned buildings found.</div>
      )}
    </div>
  );
};

export default MyBuilding;
