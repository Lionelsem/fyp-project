import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import { getAllBuildings, createBuilding, deleteBuilding, updateBuilding } from "../../services/buildingService";
import { getAllUsers } from "../../services/userService";
import { ROLES } from "../../constants/roles";

const statusStyles = {
  Compliant: { backgroundColor: "#dcfce7", color: "#166534" },
  "Needs Review": { backgroundColor: "#fef3c7", color: "#b45309" },
  "Non-Compliant": { backgroundColor: "#fee2e2", color: "#b91c1c" }
};

const normalizeHeader = (h) => String(h || "").trim().toLowerCase().replace(/[\s_-]+/g, "");

const parseBuildingRow = (row) => {
  const get = (keys) => {
    for (const k of keys) {
      const match = Object.keys(row).find((h) => normalizeHeader(h) === k);
      if (match !== undefined && row[match] !== undefined && row[match] !== "") return String(row[match]).trim();
    }
    return "";
  };
  return {
    buildingId:   get(["buildingid", "buildingcode", "id", "code"]),
    buildingName: get(["buildingname", "name", "building"]),
    address:      get(["address", "addr", "location"]),
    storeys:      get(["storeys", "floors", "noofstoreys", "numberofstoreys"]),
    occupantLoad: get(["occupantload", "occupants", "load", "capacity"]),
    status:       get(["status"]) || "Compliant"
  };
};

const ManageBuildings = () => {
  const [buildings, setBuildings] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [deletingBuildingId, setDeletingBuildingId] = useState("");
  const [savingFsmId, setSavingFsmId] = useState("");
  const [search, setSearch] = useState("");
  const importRef = useRef(null);
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

  const fsmUsers = useMemo(
    () => users.filter((user) => user.role === ROLES.FSM),
    [users]
  );

  const userMap = useMemo(
    () => new Map(users.map((user) => [user.uid, user.fullName || user.email || user.uid])),
    [users]
  );

  const getAssignedFsmName = useCallback(
    (assignedFsmId) => {
      if (!assignedFsmId) return "Unassigned";
      return userMap.get(assignedFsmId) || assignedFsmId;
    },
    [userMap]
  );

  const handleFsmChange = async (buildingId, newFsmId) => {
    setSavingFsmId(buildingId);
    try {
      await updateBuilding(buildingId, { assignedFsmId: newFsmId });
      setBuildings((prev) =>
        prev.map((b) => (b.id === buildingId ? { ...b, assignedFsmId: newFsmId } : b))
      );
      toast.success(newFsmId ? "FSM assigned successfully." : "FSM unassigned.");
    } catch (error) {
      console.error("Failed to update FSM assignment", error);
      toast.error("Failed to update FSM assignment.");
    } finally {
      setSavingFsmId("");
    }
  };

  const handleImportExcel = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setImporting(true);
    const toastId = toast.loading("Importing buildings...");
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(new Uint8Array(data));
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

      if (rows.length === 0) {
        toast.error("No data rows found in the file.", { id: toastId });
        return;
      }

      let succeeded = 0;
      let failed = 0;
      const imported = [];

      for (const row of rows) {
        const parsed = parseBuildingRow(row);
        if (!parsed.buildingId || !parsed.buildingName || !parsed.address) {
          failed += 1;
          continue;
        }
        try {
          const payload = {
            buildingId:   parsed.buildingId,
            buildingName: parsed.buildingName,
            building_name: parsed.buildingName,
            address:      parsed.address,
            noOfStoreys:  parsed.storeys ? Number(parsed.storeys) : null,
            occupantLoad: parsed.occupantLoad,
            occupancyType: "",
            grossFloorAreaGfa: "",
            customerId: "",
            status: parsed.status
          };
          const ref = await createBuilding(payload);
          imported.push({ id: ref.id, ...payload });
          succeeded += 1;
        } catch {
          failed += 1;
        }
      }

      if (succeeded > 0) {
        const refreshed = await getAllBuildings();
        setBuildings(refreshed);
      }

      if (failed === 0) {
        toast.success(`${succeeded} building${succeeded !== 1 ? "s" : ""} imported.`, { id: toastId });
      } else {
        toast(`${succeeded} imported, ${failed} skipped (missing required fields).`, {
          id: toastId,
          icon: "⚠️"
        });
      }
    } catch (err) {
      toast.error(err.message || "Failed to read file.", { id: toastId });
    } finally {
      setImporting(false);
    }
  };

  const filteredBuildings = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return buildings;

    return buildings.filter((building) =>
      [
        building.building_name,
        building.buildingName,
        building.address,
        getAssignedFsmName(building.assignedFsmId),
        building.status
      ]
        .filter(Boolean)
        .some((value) => value.toString().toLowerCase().includes(query))
    );
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
          <div style={{ display: "flex", gap: "12px" }}>
            <input
              ref={importRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              style={{ display: "none" }}
              onChange={handleImportExcel}
            />
            <button
              type="button"
              className="primary-btn"
              disabled={importing}
              onClick={() => importRef.current?.click()}
            >
              {importing ? "Importing..." : "Import Excel"}
            </button>
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
                  <td>{building.building_name || building.buildingName || "-"}</td>
                  <td>{building.address || "-"}</td>
                  <td>{building.noOfStoreys || "-"}</td>
                  <td>{building.occupantLoad || "-"}</td>
                  <td>
                    <select
                      className="form-input"
                      value={building.assignedFsmId || ""}
                      onChange={(e) => handleFsmChange(building.id, e.target.value)}
                      disabled={savingFsmId === building.id}
                      style={{ minWidth: "160px" }}
                    >
                      <option value="">Unassigned</option>
                      {fsmUsers.map((fsm) => (
                        <option key={fsm.uid} value={fsm.uid}>
                          {fsm.fullName || fsm.email}
                        </option>
                      ))}
                    </select>
                  </td>
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
                          const confirmed = window.confirm(
                            `Delete building ${building.buildingName || building.building_name || building.id}?`
                          );
                          if (!confirmed) return;
                          setDeletingBuildingId(building.id);
                          try {
                            await deleteBuilding(building.id);
                            setBuildings((prev) => prev.filter((item) => item.id !== building.id));
                            toast.success("Building deleted.");
                          } catch (deleteError) {
                            console.error("Failed to delete building", deleteError);
                            toast.error("Failed to delete building.");
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
