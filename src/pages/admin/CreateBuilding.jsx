import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createBuilding } from "../../services/buildingService";

const initialForm = {
  buildingId: "",
  buildingName: "",
  address: "",
  storeys: "",
  occupantLoad: "",
  assignedFsm: "",
  status: "Compliant"
};

const normalizeBuildingPayload = (form) => ({
  buildingId: form.buildingId.trim(),
  buildingName: form.buildingName.trim(),
  building_name: form.buildingName.trim(),
  address: form.address.trim(),
  noOfStoreys: form.storeys ? Number(form.storeys) : null,
  occupantLoad: String(form.occupantLoad || "").trim(),
  assignedFsmId: String(form.assignedFsm || "").trim(),
  occupancyType: "",
  grossFloorAreaGfa: "",
  customerId: "",
  status: form.status
});

const CreateBuilding = () => {
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

    if (!form.buildingName || !form.address) {
      setMessage({ type: "error", text: "Building name and address are required." });
      return;
    }

    setLoading(true);
    try {
      const payload = normalizeBuildingPayload({
        ...form,
        buildingId: form.buildingId || `BLD-${Date.now()}`
      });
      await createBuilding(payload);
      setMessage({ type: "success", text: "Building created successfully." });
      setForm(initialForm);
      navigate("/buildings");
    } catch (error) {
      console.error("Could not create building", error);
      const errorMessage = error.details || error.message || "Failed to create building.";
      setMessage({ type: "error", text: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-card" style={{ maxWidth: "960px", margin: "0 auto" }}>
        <div className="card-header-row" style={{ justifyContent: "space-between" }}>
          <div>
            <h2 className="section-title">Add Building</h2>
            <p style={{ color: "#6b7280", marginTop: "4px" }}>
              Create a new building record for the portfolio.
            </p>
          </div>
          <button
            type="button"
            className="primary-btn"
            onClick={() => navigate("/buildings")}
            style={{
              height: "40px",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            ← Back to Buildings
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: "24px", padding: "20px 0" }}>
          <div className="form-grid">
            <div className="form-field">
              <label className="form-label">Building Name *</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Building A (Main Office)"
                value={form.buildingName}
                onChange={handleChange("buildingName")}
              />
            </div>
          </div>

          <div className="form-grid">
            <div className="form-field" style={{ gridColumn: "1 / -1" }}>
              <label className="form-label">Address *</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. 123 Corporate Blvd"
                value={form.address}
                onChange={handleChange("address")}
              />
            </div>
          </div>

          <div className="form-grid">
            <div className="form-field">
              <label className="form-label">No. of Storeys</label>
              <input
                type="number"
                className="form-input"
                placeholder="e.g. 12"
                value={form.storeys}
                onChange={handleChange("storeys")}
              />
            </div>
            <div className="form-field">
              <label className="form-label">Occupant Load</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. 1,200"
                value={form.occupantLoad}
                onChange={handleChange("occupantLoad")}
              />
            </div>
          </div>

          <div className="form-grid">
            <div className="form-field">
              <label className="form-label">Assigned FSM</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Jane Doe"
                value={form.assignedFsm}
                onChange={handleChange("assignedFsm")}
              />
            </div>
            <div className="form-field">
              <label className="form-label">Status</label>
              <select className="form-input" value={form.status} onChange={handleChange("status")}> 
                <option value="Compliant">Compliant</option>
                <option value="Needs Review">Needs Review</option>
                <option value="Non-Compliant">Non-Compliant</option>
              </select>
            </div>
          </div>

          {message && (
            <div style={{ color: message.type === "error" ? "#b91c1c" : "#047857", fontWeight: 600 }}>
              {message.text}
            </div>
          )}

          <button type="submit" className="primary-btn" disabled={loading}>
            {loading ? "Saving building..." : "Create Building"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateBuilding;
