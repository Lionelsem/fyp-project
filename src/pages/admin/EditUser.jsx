import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getUserById, updateUser } from "../../services/userService";
import { ROLES } from "../../constants/roles";

const initialForm = {
  firstName: "",
  lastName: "",
  email: "",
  phoneNumber: "",
  role: ROLES.FSM,
  status: "Active"
};

const normalizeUserPayload = (form) => ({
  fullName: `${form.firstName.trim()} ${form.lastName.trim()}`.trim(),
  email: form.email.trim().toLowerCase(),
  phoneNumber: String(form.phoneNumber || "").trim(),
  role: form.role,
  status: form.status
});

const EditUser = () => {
  const { id } = useParams();
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await getUserById(id);
        if (!user) {
          setMessage({ type: "error", text: "User not found." });
          return;
        }

        const [firstName, ...lastParts] = (user.fullName || "").split(" ");
        setForm({
          firstName: firstName || "",
          lastName: lastParts.join(" ") || "",
          email: user.email || "",
          phoneNumber: user.phoneNumber || "",
          role: user.role || ROLES.FSM,
          status: user.status || "Active"
        });
      } catch (error) {
        console.error("Failed to load user", error);
        setMessage({ type: "error", text: "Could not load user details." });
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [id]);

  const handleChange = (field) => (event) => {
    setForm({ ...form, [field]: event.target.value });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage(null);

    if (!form.firstName || !form.lastName || !form.email) {
      setMessage({ type: "error", text: "Please fill in all required fields." });
      return;
    }

    setSaving(true);
    try {
      await updateUser(id, normalizeUserPayload(form));
      setMessage({ type: "success", text: "User updated successfully." });
      navigate("/users");
    } catch (error) {
      console.error("Could not update user", error);
      const errorMessage = error.details || error.message || "Failed to update user.";
      setMessage({ type: "error", text: errorMessage });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-card" style={{ width: "min(100%, 960px)", margin: "0 auto" }}>
        <div className="card-header-row" style={{ justifyContent: "space-between" }}>
          <div>
            <h2 className="section-title">Edit User</h2>
            <p style={{ color: "#6b7280", marginTop: "4px" }}>
              Update the user profile, role, and account status.
            </p>
          </div>
          <button
            type="button"
            className="primary-btn"
            onClick={() => navigate("/users")}
            style={{
              height: "clamp(2.5rem, 2.35rem + 0.5vw, 2.75rem)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            ← Back to Users
          </button>
        </div>

        {loading ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: "#6b7280" }}>
            Loading user details...
          </div>
        ) : (
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
                  <option value={ROLES.ADMIN}>{ROLES.ADMIN}</option>
                  <option value={ROLES.FSM}>{ROLES.FSM}</option>
                  <option value={ROLES.CUSTOMER}>{ROLES.CUSTOMER}</option>
                </select>
              </div>
              <div className="form-field">
                <label className="form-label">Status</label>
                <select className="form-input" value={form.status} onChange={handleChange("status")}> 
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>

            {message && (
              <div style={{ color: message.type === "error" ? "#b91c1c" : "#047857", fontWeight: 600 }}>
                {message.text}
              </div>
            )}

            <button type="submit" className="primary-btn" disabled={saving}>
              {saving ? "Updating user..." : "Update User"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default EditUser;
