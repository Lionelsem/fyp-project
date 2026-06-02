import React, { useEffect, useState } from "react";
import { createUserAccount } from "../../services/authService";
import { getAllUsers } from "../../services/userService";

const initialForm = {
  firstName: "",
  lastName: "",
  email: "",
  phoneNumber: "",
  role: "FSM",
  password: ""
};

const ManageUsers = () => {
  const [form, setForm] = useState(initialForm);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const userList = await getAllUsers();
        setUsers(userList);
      } catch (error) {
        console.error("Failed to load users", error);
      }
    };
    loadUsers();
  }, []);

  const handleChange = (field) => (event) => {
    setForm({ ...form, [field]: event.target.value });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage(null);

    if (!form.firstName || !form.lastName || !form.email || !form.password) {
      setMessage({ type: "error", text: "Please fill in all required fields." });
      return;
    }

    setLoading(true);
    try {
      await createUserAccount({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phoneNumber: form.phoneNumber,
        role: form.role,
        password: form.password
      });
      setMessage({ type: "success", text: "User created successfully." });
      setForm(initialForm);
      const updatedUsers = await getAllUsers();
      setUsers(updatedUsers);
    } catch (error) {
      console.error("Could not create user", error);
      setMessage({ type: "error", text: error.message || "Failed to create user." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-card">
        <div className="card-header-row">
          <div>
            <h2 className="section-title">Create New User</h2>
            <p style={{ color: "#6b7280", marginTop: "4px" }}>
              Add a new FSM or Customer account to the system.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: "24px", padding: "20px 0" }}>
          <div className="form-grid">
            <div className="form-field">
              <label className="form-label">First Name *</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. John"
                value={form.firstName}
                onChange={handleChange("firstName")}
              />
            </div>
            <div className="form-field">
              <label className="form-label">Last Name *</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Smith"
                value={form.lastName}
                onChange={handleChange("lastName")}
              />
            </div>
          </div>

          <div className="form-grid">
            <div className="form-field">
              <label className="form-label">Email Address *</label>
              <input
                type="email"
                className="form-input"
                placeholder="e.g. john.smith@cbre.com"
                value={form.email}
                onChange={handleChange("email")}
              />
            </div>
            <div className="form-field">
              <label className="form-label">Phone Number</label>
              <input
                type="tel"
                className="form-input"
                placeholder="e.g. +1 234 567 890"
                value={form.phoneNumber}
                onChange={handleChange("phoneNumber")}
              />
            </div>
          </div>

          <div className="form-grid">
            <div className="form-field">
              <label className="form-label">User Role *</label>
              <select className="form-input" value={form.role} onChange={handleChange("role")}> 
                <option value="FSM">FSM</option>
                <option value="Customer">Customer</option>
              </select>
            </div>
            <div className="form-field">
              <label className="form-label">Password *</label>
              <input
                type="password"
                className="form-input"
                placeholder="Enter initial password"
                value={form.password}
                onChange={handleChange("password")}
              />
            </div>
          </div>

          <div className="form-note" style={{ padding: "16px", backgroundColor: "#ecfdf5", borderRadius: "12px", color: "#166534" }}>
            Password setup is managed directly by the admin. No invitation email is sent automatically.
          </div>

          {message && (
            <div style={{ color: message.type === "error" ? "#b91c1c" : "#047857", fontWeight: 600 }}>
              {message.text}
            </div>
          )}

          <button type="submit" className="primary-btn" disabled={loading}>
            {loading ? "Creating user..." : "Create User"}
          </button>
        </form>
      </div>

      <div className="dashboard-card">
        <div className="card-header-row">
          <h2 className="section-title">User Accounts</h2>
        </div>
        <table className="dashboard-table" style={{ marginTop: "16px" }}>
          <thead>
            <tr>
              <th>USER ID</th>
              <th>NAME</th>
              <th>ROLE</th>
              <th>EMAIL</th>
              <th>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.uid}>
                <td className="id-cell">{user.uid}</td>
                <td>{user.fullName || "-"}</td>
                <td>{user.role || "-"}</td>
                <td>{user.email || "-"}</td>
                <td>{user.status || "Active"}</td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", padding: "24px 0" }}>
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ManageUsers;
