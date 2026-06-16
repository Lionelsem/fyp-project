import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAllBuildings, deleteBuilding } from "../../services/buildingService";
import { getAllUsers } from "../../services/userService";

const statusStyles = {
  Compliant: { backgroundColor: "#dcfce7", color: "#166534" },
  "Needs Review": { backgroundColor: "#fef3c7", color: "#b45309" },
  "Non-Compliant": { backgroundColor: "#fee2e2", color: "#b91c1c" }
};

const ManageBuildings = () => {
  const [buildings, setBuildings] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingBuildingId, setDeletingBuildingId] = useState("");
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const loadData = async () => {
      try {
        const [buildingData, userData] = await Promise.all([getAllBuildings(), getAllUsers()]);
        setBuildings(buildingData);
        setUsers(userData);
      } catch (error) {
        console.error("Failed to load buildings", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const userMap = useMemo(
    () => new Map(users.map((user) => [user.uid, user.fullName || user.email || user.uid])),
    [users]
  );

  const getAssignedFsmName = useCallback((assignedFsmId) => {
    if (!assignedFsmId) {
      return "Unassigned";
    }
    return userMap.get(assignedFsmId) || assignedFsmId;
  }, [userMap]);

  const filteredBuildings = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return buildings;
    }

    return buildings.filter((building) => {
      return [
        building.buildingId,
        building.building_name,
        building.buildingName,
        building.address,
        getAssignedFsmName(building.assignedFsmId),
        building.status
      ]
        .filter(Boolean)
        .some((value) => value.toString().toLowerCase().includes(query));
    });
  }, [buildings, getAssignedFsmName, search]);

  return (
    <div className="dashboard-container">
      <div className="dashboard-card" style={{ marginBottom: "24px" }}>
        <div className="card-header-row" style={{ justifyContent: "space-between" }}>
          <div>
            <h2 className="section-title">Buildings</h2>
            <p style={{ color: "#6b7280", marginTop: "4px" }}>
              Register and maintain building records across the portfolio.
            </p>
          </div>
          <button
            type="button"
            className="primary-btn"
            style={{ minWidth: "180px" }}
            onClick={() => navigate("/buildings/create")}
          >
            + Add Building
          </button>
        </div>
      </div>

      <div className="dashboard-card">
        <div className="card-header-row" style={{ marginBottom: "20px" }}>
          <input
            type="text"
            className="form-input"
            placeholder="Search buildings..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: "100%", maxWidth: "360px" }}
          />
        </div>

        <table className="dashboard-table" style={{ width: "100%" }}>
          <thead>
            <tr>
              <th>BUILDING ID</th>
              <th>BUILDING NAME</th>
              <th>ADDRESS</th>
              <th>STOREYS</th>
              <th>OCCUPANT LOAD</th>
              <th>ASSIGNED FSM</th>
              <th>STATUS</th>
              <th>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: "24px 0" }}>
                  Loading buildings...
                </td>
              </tr>
            ) : filteredBuildings.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: "24px 0" }}>
                  No buildings found.
                </td>
              </tr>
            ) : (
              filteredBuildings.map((building) => (
                <tr key={building.id}>
                  <td className="id-cell">{building.buildingId || building.id}</td>
                  <td>{building.building_name || building.buildingName || "-"}</td>
                  <td>{building.address || "-"}</td>
                  <td>{building.noOfStoreys || "-"}</td>
                  <td>{building.occupantLoad || "-"}</td>
                  <td>{getAssignedFsmName(building.assignedFsmId)}</td>
                  <td>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        padding: "8px 14px",
                        borderRadius: "999px",
                        fontSize: "12px",
                        fontWeight: 700,
                        ...statusStyles[building.status || "Compliant"]
                      }}
                    >
                      {building.status || "Compliant"}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                      <button
                        type="button"
                        className="secondary-btn action-icon-btn"
                        title="Edit building"
                        onClick={() => navigate(`/buildings/edit/${building.id}`)}
                      >
                        ✏️
                      </button>
                      <button
                        type="button"
                        className="danger-button action-icon-btn"
                        title="Delete building"
                        disabled={deletingBuildingId === building.id}
                        onClick={async () => {
                          const confirmed = window.confirm(`Delete building ${building.buildingName || building.buildingId || building.id}?`);
                          if (!confirmed) return;
                          setDeletingBuildingId(building.id);
                          try {
                            await deleteBuilding(building.id);
                            setBuildings((prev) => prev.filter((item) => item.id !== building.id));
                          } catch (deleteError) {
                            console.error("Failed to delete building", deleteError);
                          } finally {
                            setDeletingBuildingId("");
                          }
                        }}
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ManageBuildings;
