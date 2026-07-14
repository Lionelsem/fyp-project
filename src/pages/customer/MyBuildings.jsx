import React, { useMemo } from "react";
import { useAuthContext } from "../../context/AuthContext";
import { useFsmDashboardData } from "../../hooks/useFsmDashboardData";

const mockBuildings = [
  {
    id: "BLD-001",
    buildingName: "Tech Park B",
    address: "123 Corporate Blvd, District 9, 100021",
    occupancyType: "Commercial / Office",
    noOfStoreys: "12 Levels + 2 Basements",
    grossFloorAreaGfa: "25,000 sqm",
    occupantLoad: "Approx. 1,250",
    assignedFsm: "John Smith",
    assignedFsmId: "USR-002",
    nextInspection: "Oct 15, 2026",
    imageUrl: "https://thumbs.dreamstime.com/b/asia-china-beijing-cbd-central-business-district-international-city-business-complex-modern-architecture-yuanyang-guanghua-43498817.jpg"
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

const getFirstTextValue = (source, fieldNames) => {
  if (!source) return "";

  for (const fieldName of fieldNames) {
    const value = source?.[fieldName];
    if (value !== undefined && value !== null && String(value).trim()) {
      return String(value).trim();
    }
  }

  const normalizedFieldNames = new Set(fieldNames.map((fn) => 
    String(fn || "").replace(/[\s_-]+/g, "").toLowerCase()
  ));
  
  const matchingEntry = Object.entries(source).find(([key, value]) => {
    const normalizedKey = String(key || "").replace(/[\s_-]+/g, "").toLowerCase();
    return (
      normalizedFieldNames.has(normalizedKey) &&
      value !== undefined &&
      value !== null &&
      String(value).trim()
    );
  });

  if (matchingEntry) {
    return String(matchingEntry[1]).trim();
  }

  return "";
};

const getBuildingName = (building) =>
  getFirstTextValue(building, BUILDING_NAME_FIELDS) || "Unnamed Building";

const MyBuildings = () => {
  const { user } = useAuthContext();
  const {
    loading,
    error,
    buildings: liveBuildings
  } = useFsmDashboardData([]);

  const buildings = useMemo(() => {
    if (liveBuildings.length > 0) {
      return liveBuildings;
    }
    return loading ? [] : mockBuildings;
  }, [liveBuildings, loading]);

  const selectedBuilding = buildings[0];

  return (
    <div className="dashboard-container">
      {error && (
        <div className="error-state" style={{ marginBottom: "18px" }}>
          {error}
        </div>
      )}

      {loading && buildings.length === 0 && (
        <div className="loading-state" style={{ marginBottom: "18px" }}>
          Loading assigned buildings...
        </div>
      )}

      {!loading && !selectedBuilding && (
        <div className="empty-state">No assigned buildings found.</div>
      )}

      {selectedBuilding && (
        <div>
          <div style={{ marginBottom: "28px" }}>
            <h1 style={{ fontSize: "32px", fontWeight: 700, marginBottom: "8px", color: "#0f172a" }}>
              My Building
            </h1>
            <p style={{ fontSize: "15px", color: "#64748b", maxWidth: "600px" }}>
              Details and specifications for your assigned property.
            </p>
          </div>

          <div className="dashboard-card" style={{ marginBottom: "24px" }}>
            <div className="building-details-layout">
              {selectedBuilding.imageUrl && (
                <div className="building-image-container">
                  <img 
                    src={selectedBuilding.imageUrl} 
                    alt={getBuildingName(selectedBuilding)}
                    className="building-image"
                  />
                </div>
              )}
              
              <div className="building-info-section">
                <h2 style={{ fontSize: "26px", fontWeight: 700, marginBottom: "8px", color: "#0f172a" }}>
                  {getBuildingName(selectedBuilding)}
                </h2>
                <p style={{ fontSize: "14px", color: "#64748b", marginBottom: "4px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <span>📍</span>
                  {selectedBuilding.address || "-"}
                </p>
                <span style={{ 
                  display: "inline-block",
                  fontSize: "12px",
                  fontWeight: 600,
                  backgroundColor: "#ecfdf5",
                  color: "#047857",
                  padding: "6px 12px",
                  borderRadius: "8px",
                  marginTop: "12px"
                }}>
                  {selectedBuilding.occupancyType || "-"}
                </span>

                <div style={{ marginTop: "28px", paddingTop: "24px", borderTop: "1px solid #e5e7eb" }}>
                  <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a", marginBottom: "16px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    # Specifications
                  </h3>
                  <div className="building-spec-grid">
                    <div>
                      <p style={{ fontSize: "12px", fontWeight: 600, color: "#64748b", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Number of Storeys
                      </p>
                      <p style={{ fontSize: "15px", fontWeight: 600, color: "#0f172a" }}>
                        {selectedBuilding.noOfStoreys || "-"}
                      </p>
                    </div>
                    <div>
                      <p style={{ fontSize: "12px", fontWeight: 600, color: "#64748b", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Occupant Load
                      </p>
                      <p style={{ fontSize: "15px", fontWeight: 600, color: "#0f172a" }}>
                        {selectedBuilding.occupantLoad || "-"}
                      </p>
                    </div>
                    <div>
                      <p style={{ fontSize: "12px", fontWeight: 600, color: "#64748b", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Gross Floor Area
                      </p>
                      <p style={{ fontSize: "15px", fontWeight: 600, color: "#0f172a" }}>
                        {selectedBuilding.grossFloorAreaGfa || "-"}
                      </p>
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: "28px", paddingTop: "24px", borderTop: "1px solid #e5e7eb" }}>
                  <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a", marginBottom: "16px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    🔥 Fire Safety Management
                  </h3>
                  <div className="building-spec-grid">
                    <div>
                      <p style={{ fontSize: "12px", fontWeight: 600, color: "#64748b", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Assigned FSM
                      </p>
                      <p style={{ fontSize: "15px", fontWeight: 600, color: "#0f172a" }}>
                        {selectedBuilding.assignedFsm || "-"}
                      </p>
                      {selectedBuilding.assignedFsmId && (
                        <p style={{ fontSize: "12px", color: "#94a3b8" }}>
                          {selectedBuilding.assignedFsmId}
                        </p>
                      )}
                    </div>
                    <div>
                      <p style={{ fontSize: "12px", fontWeight: 600, color: "#64748b", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Next Scheduled Inspection
                      </p>
                      <p style={{ fontSize: "15px", fontWeight: 600, color: "#0f172a" }}>
                        {formatDate(selectedBuilding.nextInspection) || "-"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyBuildings;
