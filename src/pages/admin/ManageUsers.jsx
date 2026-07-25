import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import { getAllUsers, deleteUser } from "../../services/userService";
import { createUserAccount } from "../../services/authService";
import { getAllBuildings } from "../../services/buildingService";
import { ROLES } from "../../constants/roles";
import ResponsiveTableRegion from "../../components/common/ResponsiveTableRegion";
import UserAvatar from "../../components/common/UserAvatar";

const normalizeHeader = (h) => String(h || "").trim().toLowerCase().replace(/[\s_-]+/g, "");

const parseUserRow = (row) => {
  const get = (keys) => {
    for (const k of keys) {
      const match = Object.keys(row).find((h) => normalizeHeader(h) === k);
      if (match !== undefined && row[match] !== undefined && row[match] !== "") return String(row[match]).trim();
    }
    return "";
  };
  const rawRole = get(["role", "userrole", "type"]).toLowerCase();
  let role = ROLES.FSM;
  if (rawRole.includes("customer") || rawRole.includes("client")) role = ROLES.CUSTOMER;
  else if (rawRole.includes("admin")) role = ROLES.ADMIN;
  return {
    firstName:   get(["firstname", "first", "fname"]),
    lastName:    get(["lastname", "last", "lname", "surname"]),
    email:       get(["email", "emailaddress"]),
    phoneNumber: get(["phone", "phonenumber", "mobile", "contact"]),
    role,
    password:    get(["password", "pass", "pwd"])
  };
};

const ManageUsers = () => {
  const [users, setUsers] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState("");
  const importRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const loadData = async () => {
      try {
        const [userList, buildingList] = await Promise.all([getAllUsers(), getAllBuildings()]);
        setUsers(userList);
        setBuildings(buildingList);
      } catch (error) {
        console.error("Failed to load users", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const assignedBuildingsMap = useMemo(() => {
    const map = new Map();
    buildings.forEach((building) => {
      if (!building.assignedFsmId) return;
      const name = building.buildingName || building.building_name || "-";
      if (!map.has(building.assignedFsmId)) {
        map.set(building.assignedFsmId, []);
      }
      map.get(building.assignedFsmId).push(name);
    });
    return map;
  }, [buildings]);

  const getAssignedBuildings = (uid) => {
    const names = assignedBuildingsMap.get(uid);
    if (!names || names.length === 0) return "-";
    return names.join(", ");
  };

  const handleImportExcel = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setImporting(true);
    const toastId = toast.loading("Importing users...");
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

      for (const row of rows) {
        const parsed = parseUserRow(row);
        if (!parsed.firstName || !parsed.email || !parsed.password) {
          failed += 1;
          continue;
        }
        try {
          await createUserAccount({
            firstName:   parsed.firstName,
            lastName:    parsed.lastName,
            email:       parsed.email.toLowerCase(),
            phoneNumber: parsed.phoneNumber,
            role:        parsed.role,
            password:    parsed.password
          });
          succeeded += 1;
        } catch {
          failed += 1;
        }
      }

      if (succeeded > 0) {
        const [refreshed] = await Promise.all([getAllUsers()]);
        setUsers(refreshed);
      }

      if (failed === 0) {
        toast.success(`${succeeded} user${succeeded !== 1 ? "s" : ""} imported.`, { id: toastId });
      } else {
        toast(`${succeeded} imported, ${failed} skipped (missing required fields or duplicate email).`, {
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

  return (
    <div className="dashboard-container admin-page admin-page-stack">
      <div className="dashboard-card admin-page-header-card">
        <div className="card-header-row admin-page-header">
          <div>
            <h2 className="section-title">User Management</h2>
            <p style={{ color: "#6b7280", marginTop: "4px" }}>
              Manage roles, permissions, and status for FSMs and customers.
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
              style={{ minWidth: "160px" }}
              onClick={() => navigate("/users/create")}
            >
              + Add User
            </button>
          </div>
        </div>
      </div>

      <div className="dashboard-card">
        <ResponsiveTableRegion label="Users" className="responsive-table-region--cards">
          <table className="dashboard-table responsive-card-table">
          <thead>
            <tr>
              <th>NAME</th>
              <th>ROLE</th>
              <th>ASSIGNED BUILDINGS</th>
              <th>EMAIL</th>
              <th>STATUS</th>
              <th>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: "24px 0" }}>
                  Loading users...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: "24px 0" }}>
                  No users found.
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.uid}>
                  <td data-label="Name">
                    <span className="admin-user-name-cell">
                      <UserAvatar className="admin-user-list-avatar" photoURL={user.photoURL} name={user.fullName || "User"} />
                      {user.fullName || "-"}
                    </span>
                  </td>
                  <td data-label="Role">{user.role || "-"}</td>
                  <td data-label="Assigned building">{getAssignedBuildings(user.uid)}</td>
                  <td data-label="Email">{user.email || "-"}</td>
                  <td data-label="Status">{user.status || "Active"}</td>
                  <td data-label="Action">
                    <div className="compact-row-actions">
                      <button
                        type="button"
                        className="secondary-btn action-icon-btn"
                        title="Edit user"
                        onClick={() => navigate(`/users/edit/${user.uid}`)}
                      >
                        ✏️
                      </button>
                      <button
                        type="button"
                        className="danger-button action-icon-btn"
                        title="Delete user"
                        disabled={deletingUserId === user.uid}
                        onClick={async () => {
                          const confirmed = window.confirm(`Delete user ${user.fullName || user.email}?`);
                          if (!confirmed) return;
                          setDeletingUserId(user.uid);
                          try {
                            await deleteUser(user.uid);
                            setUsers((prev) => prev.filter((item) => item.uid !== user.uid));
                            toast.success("User deleted.");
                          } catch (deleteError) {
                            console.error("Failed to delete user", deleteError);
                            toast.error("Failed to delete user.");
                          } finally {
                            setDeletingUserId("");
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

export default ManageUsers;
