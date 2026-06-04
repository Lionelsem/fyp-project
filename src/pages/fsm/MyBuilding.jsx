import React, { useMemo } from "react";
import { useAuthContext } from "../../context/AuthContext";
import { useFsmDashboardData } from "../../hooks/useFsmDashboardData";

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
    latestReport: "Annual Compliance Report - May 10, 2026",
    openIssueCount: 0,
    status: "Active"
  }
];

const normalizeText = (value) => String(value || "").trim().toLowerCase();

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

const getBuildingName = (building) =>
  building.buildingName || building.name || building.building || "Unnamed Building";

const isForBuilding = (record, building) => {
  const buildingId = String(building.id || "");
  const buildingName = normalizeText(getBuildingName(building));

  return (
    String(record.buildingId || "") === buildingId ||
    normalizeText(record.building || record.buildingName) === buildingName
  );
};

const sortByLatestDate = (items, fieldNames) =>
  [...items].sort((first, second) => {
    const firstDate = fieldNames.map((field) => toDate(first[field])).find(Boolean);
    const secondDate = fieldNames.map((field) => toDate(second[field])).find(Boolean);
    return (secondDate?.getTime() || 0) - (firstDate?.getTime() || 0);
  });

const buildBuildingCard = ({ building, reports, inspections, issues }) => {
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
    occupantLoad: building.occupantLoad || "-",
    assignedFsm: building.assignedFsm || building.assignedFsmName || building.assignedFsmId || "Current FSM",
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
  const {
    loading,
    error,
    buildings: liveBuildings,
    reports,
    inspections,
    issues
  } = useFsmDashboardData(getFsmLookupIds(user));

  const buildingCards = useMemo(() => {
    const sourceBuildings = liveBuildings.length > 0 ? liveBuildings : loading ? [] : mockBuildings;

    return sourceBuildings.map((building) =>
      buildBuildingCard({
        building,
        reports,
        inspections,
        issues
      })
    );
  }, [inspections, issues, liveBuildings, loading, reports]);

  const selectedBuilding = buildingCards[0];

  return (
    <div className="dashboard-container">
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

            <div
              className="building-card-details"
              style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}
            >
              <DetailItem label="Customer" value={selectedBuilding.customerName} />
              <DetailItem label="FSM Assigned" value={selectedBuilding.assignedFsm} />
              <DetailItem label="Next Inspection" value={selectedBuilding.nextInspection} />
              <DetailItem label="Latest Report" value={selectedBuilding.latestReport} />
              <DetailItem label="Occupancy Type" value={selectedBuilding.occupancyType} />
              <DetailItem label="Storeys" value={selectedBuilding.noOfStoreys} />
              <DetailItem label="Occupant Load" value={selectedBuilding.occupantLoad} />
              <DetailItem label="Open Issues" value={selectedBuilding.openIssueCount} />
            </div>
          </div>
        </div>
      )}

      {!loading && !selectedBuilding && (
        <div className="empty-state">No assigned buildings found.</div>
      )}
    </div>
  );
};

export default MyBuilding;
