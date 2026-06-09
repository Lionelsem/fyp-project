import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ROLES } from "../../constants/roles";
import { getAllBuildings, updateBuilding } from "../../services/buildingService";
import { getAllUsers } from "../../services/userService";

const FsmAssignment = () => {
  const [buildings, setBuildings] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState("");
  const [selectedFsmId, setSelectedFsmId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      try {
        const [buildingData, userData] = await Promise.all([
          getAllBuildings(),
          getAllUsers()
        ]);
        if (!active) return;
        setBuildings(buildingData);
        setUsers(userData);
        setSelectedBuildingId(buildingData[0]?.id || "");
        setSelectedFsmId(buildingData[0]?.assignedFsmId || "");
      } catch (loadError) {
        console.error("Failed to load assignment data", loadError);
        if (active) setMessage({ type: "error", text: loadError.message || "Could not load assignment data." });
      } finally {
        if (active) setLoading(false);
      }
    };

    loadData();
    return () => {
      active = false;
    };
  }, []);

  const fsmUsers = useMemo(
    () => users.filter((user) => user.role === ROLES.FSM),
    [users]
  );

  const buildingMap = useMemo(
    () => new Map(buildings.map((building) => [building.id, building])),
    [buildings]
  );

  const selectedBuilding = buildingMap.get(selectedBuildingId) || null;

  useEffect(() => {
    if (selectedBuilding) {
      setSelectedFsmId(selectedBuilding.assignedFsmId || "");
    }
  }, [selectedBuilding]);

  const getFsmName = (userId) => {
    const user = users.find((item) => item.uid === userId || item.userId === userId);
    return user?.fullName || user?.email || userId || "Unassigned";
  };

  const selectedFsmName = getFsmName(selectedFsmId);
  const currentBuildingName = selectedBuilding?.buildingName || selectedBuilding?.building_name || selectedBuilding?.buildingId || "";

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage(null);

    if (!selectedBuildingId) {
      setMessage({ type: "error", text: "Select a building first." });
      return;
    }

    setSaving(true);
    try {
      await updateBuilding(selectedBuildingId, {
        assignedFsmId: selectedFsmId || ""
      });
      setMessage({ type: "success", text: "FSM assignment saved successfully." });
      const updatedBuildings = buildings.map((building) =>
        building.id === selectedBuildingId
          ? { ...building, assignedFsmId: selectedFsmId }
          : building
      );
      setBuildings(updatedBuildings);
    } catch (updateError) {
      console.error("Failed to update building assignment", updateError);
      setMessage({ type: "error", text: updateError.message || "Failed to save assignment." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-card" style={{ marginBottom: "24px" }}>
        <div className="card-header-row">
          <div>
            <h2 className="section-title">FSM Assignment</h2>
            <p style={{ color: "#6b7280", marginTop: "4px" }}>
              Assign Fire Safety Managers to specific buildings and manage their portfolios.
            </p>
          </div>
        </div>
      </div>

      <div className="assignment-grid">
        <div className="assignment-card">
          <div className="card-header-row" style={{ marginBottom: "16px" }}>
            <div>
              <h3 className="section-title">New Assignment</h3>
              <p style={{ color: "#6b7280", marginTop: "6px", fontSize: "14px" }}>
                Select a building and FSM to create the next assignment.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} style={{ display: "grid", gap: "24px" }}>
            <div className="form-stack">
              <div className="form-field">
                <label className="form-label">Select Building</label>
                <select
                  className="form-input"
                  value={selectedBuildingId}
                  onChange={(event) => setSelectedBuildingId(event.target.value)}
                >
                  <option value="">Select building</option>
                  {buildings.map((building) => (
                    <option key={building.id} value={building.id}>
                      {building.buildingName || building.building_name || building.buildingId}
                    </option>
                  ))}
                </select>
              </div>

              <div className="assignment-flow">
                <span className="assignment-flow-arrow">↓</span>
                <p>Choose the FSM to assign to the selected building.</p>
              </div>

              <div className="form-field">
                <label className="form-label">Select FSM</label>
                <select
                  className="form-input"
                  value={selectedFsmId}
                  onChange={(event) => setSelectedFsmId(event.target.value)}
                >
                  <option value="">Unassigned</option>
                  {fsmUsers.map((user) => (
                    <option key={user.uid} value={user.uid}>
                      {user.fullName || user.email}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {message && (
              <div style={{ color: message.type === "error" ? "#b91c1c" : "#047857", fontWeight: 600 }}>
                {message.text}
              </div>
            )}

            <button type="submit" className="primary-btn" disabled={saving || loading}>
              {saving ? "Saving assignment..." : "Save Assignment"}
            </button>
          </form>
        </div>

        <div style={{ display: "grid", gap: "24px" }}>
          <div className="assignment-card current">
            <div className="card-header-row" style={{ alignItems: "flex-start" }}>
              <div>
                <h3 className="section-title">Current Assignment</h3>
                <p style={{ color: "#6b7280", marginTop: "6px", fontSize: "14px" }}>
                  Details for the selected building.
                </p>
              </div>
              <span className="status-pill">
                {selectedFsmId ? "Currently Assigned" : "Unassigned"}
              </span>
            </div>
            {selectedBuilding ? (
              <div className="assignment-meta">
                <div className="assignment-avatar">
                  {selectedFsmName
                    .split(" ")
                    .map((part) => part[0])
                    .join("")
                    .slice(0, 2)}
                </div>
                <div>
                  <div style={{ fontSize: "18px", fontWeight: 700, color: "#0f172a" }}>
                    {selectedFsmId ? selectedFsmName : "No FSM Assigned"}
                  </div>
                  <div style={{ color: "#6b7280", marginTop: "4px" }}>
                    {currentBuildingName}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ color: "#6b7280", marginTop: "12px" }}>
                Select a building to preview current assignment details.
              </div>
            )}
          </div>

          <div className="dashboard-card">
            <div className="card-header-row">
              <h2 className="section-title">Assignment History</h2>
            </div>
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>DATE</th>
                  <th>BUILDING</th>
                  <th>ACTION</th>
                  <th>FSM</th>
                  <th>PERFORMED BY</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", padding: "24px 0" }}>
                      Loading history...
                    </td>
                  </tr>
                ) : buildings.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", padding: "24px 0" }}>
                      No assignment history available.
                    </td>
                  </tr>
                ) : (
                  buildings.map((building) => (
                    <tr key={building.id}>
                      <td>{building.updatedAt ? new Date(building.updatedAt.seconds * 1000).toLocaleDateString() : "—"}</td>
                      <td>{building.buildingName || building.building_name || building.buildingId || "Unknown"}</td>
                      <td>
                        <span className="status-pill" style={{ backgroundColor: building.assignedFsmId ? "#ecfdf5" : "#f8fafc", color: building.assignedFsmId ? "#047857" : "#475569", borderColor: building.assignedFsmId ? "#d1fae5" : "#e5e7eb" }}>
                          {building.assignedFsmId ? "Assigned" : "Unassigned"}
                        </span>
                      </td>
                      <td>{getFsmName(building.assignedFsmId)}</td>
                      <td style={{ color: "#6b7280" }}>System Auto</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FsmAssignment;
