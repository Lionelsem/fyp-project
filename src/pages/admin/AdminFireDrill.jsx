import React, { useEffect, useMemo, useState } from "react";
import { getAllFireDrills } from "../../services/fireDrillService";
import { getAllBuildings } from "../../services/buildingService";
import ResponsiveTableRegion from "../../components/common/ResponsiveTableRegion";

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
  if (!date) return "-";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
};

const getStatusStyle = (status) => {
  const normalized = String(status || "").trim().toLowerCase();
  if (["completed", "pass", "passed"].includes(normalized)) {
    return { color: "#047857", backgroundColor: "#ecfdf5", borderColor: "#6ee7b7" };
  }
  if (["scheduled", "pending"].includes(normalized)) {
    return { color: "#1d4ed8", backgroundColor: "#eff6ff", borderColor: "#bfdbfe" };
  }
  if (["review", "failed", "fail"].includes(normalized)) {
    return { color: "#b45309", backgroundColor: "#fef3c7", borderColor: "#fcd34d" };
  }
  return { color: "#475569", backgroundColor: "#f1f5f9", borderColor: "#cbd5e1" };
};

const getUpcomingDrills = (drills) =>
  drills
    .filter((drill) => {
      const date = toDate(drill.drillDate);
      return date && date >= new Date();
    })
    .sort((a, b) => {
      const first = toDate(a.drillDate);
      const second = toDate(b.drillDate);
      return (first?.getTime() || 0) - (second?.getTime() || 0);
    });

const AdminFireDrill = () => {
  const [fireDrills, setFireDrills] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      try {
        const [drillData, buildingData] = await Promise.all([
          getAllFireDrills(),
          getAllBuildings()
        ]);
        if (!active) return;
        setFireDrills(drillData);
        setBuildings(buildingData);
      } catch (loadError) {
        console.error("Failed to load fire drill data", loadError);
        if (active) setError(loadError.message || "Could not load fire drill records.");
      } finally {
        if (active) setLoading(false);
      }
    };

    loadData();
    return () => {
      active = false;
    };
  }, []);

  const buildingMap = useMemo(
    () => new Map(buildings.map((building) => [building.id, building.buildingName || building.building_name || building.buildingId || ""])),
    [buildings]
  );

  const summary = useMemo(() => {
    const totals = {
      total: fireDrills.length,
      scheduled: 0,
      completed: 0,
      review: 0
    };

    fireDrills.forEach((drill) => {
      const status = String(drill.status || drill.performanceStatus || "").trim().toLowerCase();
      if (status === "scheduled" || status === "pending") totals.scheduled += 1;
      else if (status === "completed" || status === "passed") totals.completed += 1;
      else if (status === "review" || status === "failed") totals.review += 1;
      else totals.review += 0;
    });

    return totals;
  }, [fireDrills]);

  const upcomingDrills = useMemo(() => getUpcomingDrills(fireDrills), [fireDrills]);

  const historyDrills = useMemo(
    () =>
      [...fireDrills]
        .filter((drill) => {
          const status = String(drill.status || drill.performanceStatus || "").trim().toLowerCase();
          return status !== "scheduled" && status !== "pending";
        })
        .sort((a, b) => {
          const first = toDate(a.actualDate || a.drillDate);
          const second = toDate(b.actualDate || b.drillDate);
          return (second?.getTime() || 0) - (first?.getTime() || 0);
        }),
    [fireDrills]
  );

  return (
    <div className="dashboard-container admin-page admin-page-stack">
      {loading && <div className="loading-state">Loading fire drill records...</div>}
      {error && <div className="error-state">{error}</div>}

      <div className="summary-grid compact-summary-grid">
        <div className="summary-card">
          <div className="card-label">Total Fire Drills</div>
          <div className="card-value">{summary.total}</div>
        </div>
        <div className="summary-card">
          <div className="card-label">Scheduled</div>
          <div className="card-value">{summary.scheduled}</div>
        </div>
        <div className="summary-card">
          <div className="card-label">Completed</div>
          <div className="card-value">{summary.completed}</div>
        </div>
        <div className="summary-card">
          <div className="card-label">Needs Review</div>
          <div className="card-value">{summary.review}</div>
        </div>
      </div>

      <section className="dashboard-card">
        <div className="card-header-row">
          <h2 className="section-title">Upcoming Schedule</h2>
        </div>
        {upcomingDrills.length > 0 ? (
          <div className="fire-drill-schedule-list">
            {upcomingDrills.map((drill) => (
              <div key={drill.id} className="fire-drill-schedule-item fire-drill-schedule-item--admin">
                <div className="fire-drill-item-details">
                  <h3>{drill.drillType || drill.task || "Fire Drill"}</h3>
                  <p>{formatDate(drill.drillDate)}</p>
                  <p>{buildingMap.get(drill.buildingId) || drill.buildingName || "Building TBC"}</p>
                </div>
                <span
                  className="fire-drill-status-badge"
                  style={getStatusStyle(drill.status || drill.performanceStatus)}
                >
                  {drill.status || drill.performanceStatus || "Scheduled"}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">No upcoming fire drills scheduled.</div>
        )}
      </section>

      <section className="dashboard-card">
        <div className="card-header-row">
          <h2 className="section-title">Drill History</h2>
        </div>
        {historyDrills.length > 0 ? (
          <ResponsiveTableRegion
            label="Fire drill history"
            className="fire-drill-history-table-wrapper responsive-table-region--cards"
          >
            <table className="dashboard-table responsive-card-table fire-drill-history-table">
              <thead>
                <tr>
                  <th>DATE</th>
                  <th>BUILDING</th>
                  <th>TYPE</th>
                  <th>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {historyDrills.map((drill) => (
                  <tr key={drill.id}>
                    <td data-label="Date">{formatDate(drill.actualDate || drill.drillDate)}</td>
                    <td data-label="Building">{buildingMap.get(drill.buildingId) || drill.buildingName || "Building TBC"}</td>
                    <td data-label="Type">{drill.drillType || drill.task || "Fire Drill"}</td>
                    <td data-label="Status">
                      <span
                        className="fire-drill-status-badge"
                        style={getStatusStyle(drill.status || drill.performanceStatus)}
                      >
                        {drill.status || drill.performanceStatus || "Completed"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ResponsiveTableRegion>
        ) : (
          <div className="empty-state">No fire drill history available.</div>
        )}
      </section>
    </div>
  );
};

export default AdminFireDrill;
