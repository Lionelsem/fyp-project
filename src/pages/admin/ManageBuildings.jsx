import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import { getAllBuildings, createBuilding, deleteBuilding, updateBuilding } from "../../services/buildingService";
import { getAllUsers } from "../../services/userService";
import { ROLES } from "../../constants/roles";
import ResponsiveTableRegion from "../../components/common/ResponsiveTableRegion";

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

  const fsmUsers = useMemo(() => users.filter((user) => user.role === ROLES.FSM), [users]);

  const userMap = useMemo(() => {
    const entries = users.flatMap((user) =>
      [user.uid, user.userId, user.id, user.authUid]
        .filter(Boolean)
        .map((key) => [String(key), user.fullName || user.displayName || user.email || user.uid])
    );
    return new Map(entries);
  }, [users]);

  const getAssignedFsmName = useCallback(
    (assignedFsmId) => {
      if (!assignedFsmId) return "Unassigned";
      return userMap.get(assignedFsmId) || assignedFsmId;
    },
    [userMap]
  );

  const handleFsmChange = async (building, newFsmId) => {
    const currentFsmId = building.assignedFsmId || "";
    if (newFsmId === currentFsmId) return;

    const buildingName = building.buildingName || building.building_name || "this building";

    if (newFsmId) {
      if (!fsmUsers.some((fsm) => fsm.uid === newFsmId)) {
        toast.error("Selected user is not a valid FSM.");
        return;
      }
      if (currentFsmId) {
        const confirmed = window.confirm(
          `${buildingName} is currently assigned to ${getAssignedFsmName(currentFsmId)}. Reassign to ${getAssignedFsmName(newFsmId)}?`
        );
        if (!confirmed) return;
      }
    } else {
      const confirmed = window.confirm(
        `Remove ${getAssignedFsmName(currentFsmId)} from ${buildingName}?`
      );
      if (!confirmed) return;
    }

    setSavingFsmId(building.id);
    try {
      await updateBuilding(building.id, { assignedFsmId: newFsmId });
      setBuildings((prev) =>
        prev.map((b) => (b.id === building.id ? { ...b, assignedFsmId: newFsmId } : b))
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
    <div className="dashboard-container admin-page admin-page-stack">
      <div className="dashboard-card admin-page-header-card">
        <div className="card-header-row admin-page-header">
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
            className="form-input responsive-search-control"
            placeholder="Search buildings..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <ResponsiveTableRegion label="Buildings" className="responsive-table-region--cards">
          <table className="dashboard-table responsive-card-table admin-buildings-table" style={{ width: "100%" }}>
          <colgroup>
            <col style={{ width: "14%" }} />
            <col style={{ width: "24%" }} />
            <col style={{ width: "8%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "18%" }} />
            <col style={{ width: "12%" }} />
            <col style={{ width: "14%" }} />
          </colgroup>
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
                  <td data-label="Building">{building.building_name || building.buildingName || "-"}</td>
                  <td data-label="Address">{building.address || "-"}</td>
                  <td data-label="Storeys">{building.noOfStoreys || "-"}</td>
                  <td data-label="Occupant load">{building.occupantLoad || "-"}</td>
                  <td data-label="Assigned FSM">
                    <select
                      className="form-input"
                      value={building.assignedFsmId || ""}
                      onChange={(e) => handleFsmChange(building, e.target.value)}
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
                  <td data-label="Status">
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        padding: "8px 14px",
                        borderRadius: "999px",
                        fontSize: "clamp(0.6875rem, 0.68rem + 0.15vw, 0.75rem)",
                        fontWeight: 700,
                        ...statusStyles[building.status || "Compliant"]
                      }}
                    >
                      {building.status || "Compliant"}
                    </span>
                  </td>
                  <td data-label="Action">
                    <div className="compact-row-actions">
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
                          const confirmed = window.confirm(`Delete ${building.buildingName || building.building_name || "this building"}?`);
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
        </ResponsiveTableRegion>
      </div>
    </div>
  );
};

export default ManageBuildings;
