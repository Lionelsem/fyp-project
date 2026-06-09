import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAllUsers, deleteUser } from "../../services/userService";

const ManageUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingUserId, setDeletingUserId] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const userList = await getAllUsers();
        setUsers(userList);
      } catch (error) {
        console.error("Failed to load users", error);
      } finally {
        setLoading(false);
      }
    };
    loadUsers();
  }, []);

  return (
    <div className="dashboard-container">
      <div className="dashboard-card" style={{ marginBottom: "24px" }}>
        <div className="card-header-row" style={{ justifyContent: "space-between" }}>
          <div>
            <h2 className="section-title">User Management</h2>
            <p style={{ color: "#6b7280", marginTop: "4px" }}>
              Manage roles, permissions, and status for FSMs and customers.
            </p>
          </div>
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

      <div className="dashboard-card">
        <table className="dashboard-table" style={{ width: "100%" }}>
          <thead>
            <tr>
              <th>USER ID</th>
              <th>NAME</th>
              <th>ROLE</th>
              <th>ASSIGNED BUILDING</th>
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
                  <td className="id-cell">{user.uid}</td>
                  <td>{user.fullName || "-"}</td>
                  <td>{user.role || "-"}</td>
                  <td>{user.assignedBuilding || "-"}</td>
                  <td>{user.email || "-"}</td>
                  <td>{user.status || "Active"}</td>
                  <td>
                    <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
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
                          } catch (deleteError) {
                            console.error("Failed to delete user", deleteError);
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
      </div>
    </div>
  );
};

export default ManageUsers;
