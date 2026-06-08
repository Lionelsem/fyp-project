import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createUserAccount } from "../../services/authService";
import { ROLES } from "../../constants/roles";

const initialForm = {
  firstName: "",
  lastName: "",
  email: "",
  phoneNumber: "",
  role: ROLES.FSM,
  password: ""
};

const normalizeUserPayload = (form) => ({
  firstName: form.firstName.trim(),
  lastName: form.lastName.trim(),
  email: form.email.trim().toLowerCase(),
  phoneNumber: String(form.phoneNumber || "").trim(),
  role: form.role,
  password: form.password
});

const CreateUser = () => {
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const navigate = useNavigate();

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
      await createUserAccount(normalizeUserPayload(form));
      setMessage({ type: "success", text: "User created successfully." });
      setForm(initialForm);
      navigate("/users");
    } catch (error) {
      console.error("Could not create user", error);
      const errorCode = error.code ? `${error.code}: ` : "";
      const errorMessage = error.details || error.message || "Failed to create user.";
      setMessage({ type: "error", text: `${errorCode}${errorMessage}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-card" style={{ maxWidth: "960px", margin: "0 auto" }}>
        <div className="card-header-row" style={{ justifyContent: "space-between" }}>
          <div>
            <h2 className="section-title">Create New User</h2>
            <p style={{ color: "#6b7280", marginTop: "4px" }}>
              Add a new FSM or Customer account to the system.
            </p>
          </div>
          <button
            type="button"
            className="primary-btn"
            onClick={() => navigate("/users")}
            style={{
              height: "40px",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            ← Back to Users
          </button>
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
                <option value={ROLES.FSM}>{ROLES.FSM}</option>
                <option value={ROLES.CUSTOMER}>{ROLES.CUSTOMER}</option>
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
    </div>
  );
};

export default CreateUser;
