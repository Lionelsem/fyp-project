import React, { useMemo } from "react";
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
    <div className="dashboard-container customer-buildings-page">
      {error && (
        <div className="error-state customer-buildings-page-state">
          {error}
        </div>
      )}

      {loading && buildings.length === 0 && (
        <div className="loading-state customer-buildings-page-state">
          Loading assigned buildings...
        </div>
      )}

      {!loading && !selectedBuilding && (
        <div className="empty-state">No assigned buildings found.</div>
      )}

      {selectedBuilding && (
        <div className="customer-buildings-content">
          <header className="page-header customer-buildings-header">
            <div>
              <h1>My Building</h1>
              <p className="page-subtitle">
                Details and specifications for your assigned property.
              </p>
            </div>
          </header>

          <div className="dashboard-card customer-building-detail-card">
            <div
              className={`building-details-layout${selectedBuilding.imageUrl ? "" : " building-details-layout--no-image"}`}
            >
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
                <h2 className="customer-building-name">
                  {getBuildingName(selectedBuilding)}
                </h2>
                <p className="customer-building-address">
                  <span className="customer-building-location-icon" aria-hidden="true">
                    📍
                  </span>
                  <span>{selectedBuilding.address || "-"}</span>
                </p>
                <span className="customer-building-occupancy">
                  {selectedBuilding.occupancyType || "-"}
                </span>

                <section className="customer-building-section">
                  <h3 className="customer-building-section-title">
                    # Specifications
                  </h3>
                  <div className="building-spec-grid customer-building-spec-grid">
                    <div className="customer-building-spec-item">
                      <p className="customer-building-spec-label">
                        Number of Storeys
                      </p>
                      <p className="customer-building-spec-value">
                        {selectedBuilding.noOfStoreys || "-"}
                      </p>
                    </div>
                    <div className="customer-building-spec-item">
                      <p className="customer-building-spec-label">
                        Occupant Load
                      </p>
                      <p className="customer-building-spec-value">
                        {selectedBuilding.occupantLoad || "-"}
                      </p>
                    </div>
                    <div className="customer-building-spec-item">
                      <p className="customer-building-spec-label">
                        Gross Floor Area
                      </p>
                      <p className="customer-building-spec-value">
                        {selectedBuilding.grossFloorAreaGfa || "-"}
                      </p>
                    </div>
                  </div>
                </section>

                <section className="customer-building-section">
                  <h3 className="customer-building-section-title">
                    🔥 Fire Safety Management
                  </h3>
                  <div className="building-spec-grid customer-building-spec-grid">
                    <div className="customer-building-spec-item">
                      <p className="customer-building-spec-label">
                        Assigned FSM
                      </p>
                      <p className="customer-building-spec-value">
                        {selectedBuilding.assignedFsm || "-"}
                      </p>
                      {selectedBuilding.assignedFsmId && (
                        <p className="customer-building-spec-meta">
                          {selectedBuilding.assignedFsmId}
                        </p>
                      )}
                    </div>
                    <div className="customer-building-spec-item">
                      <p className="customer-building-spec-label">
                        Next Scheduled Inspection
                      </p>
                      <p className="customer-building-spec-value">
                        {formatDate(selectedBuilding.nextInspection) || "-"}
                      </p>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyBuildings;
