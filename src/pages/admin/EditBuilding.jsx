import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getBuildingById, updateBuilding } from "../../services/buildingService";

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

const EditBuilding = () => {
  const { id } = useParams();
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const loadBuilding = async () => {
      try {
        const building = await getBuildingById(id);
        if (!building) {
          setMessage({ type: "error", text: "Building not found." });
          return;
        }

        setForm({
          buildingId: building.buildingId || building.id || "",
          buildingName: building.building_name || building.buildingName || "",
          address: building.address || "",
          storeys: building.noOfStoreys ? String(building.noOfStoreys) : "",
          occupantLoad: building.occupantLoad || "",
          assignedFsm: building.assignedFsmId || "",
          status: building.status || "Compliant"
        });
      } catch (error) {
        console.error("Failed to load building", error);
        setMessage({ type: "error", text: "Could not load building details." });
      } finally {
        setLoading(false);
      }
    };

    loadBuilding();
  }, [id]);

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

    setSaving(true);
    try {
      await updateBuilding(id, normalizeBuildingPayload(form));
      setMessage({ type: "success", text: "Building updated successfully." });
      navigate("/buildings");
    } catch (error) {
      console.error("Could not update building", error);
      const errorMessage = error.details || error.message || "Failed to update building.";
      setMessage({ type: "error", text: errorMessage });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="dashboard-container admin-page admin-record-page">
      <div className="dashboard-card admin-record-card">
        <div className="card-header-row admin-record-header">
          <div>
            <h2 className="section-title">Edit Building</h2>
            <p style={{ color: "#6b7280", marginTop: "4px" }}>
              Update the building record and assigned FSM information.
            </p>
          </div>
          <button
            type="button"
            className="primary-btn admin-record-back-button"
            onClick={() => navigate("/buildings")}
          >
            ← Back to Buildings
          </button>
        </div>

        {loading ? (
          <div className="admin-record-loading">
            Loading building details...
          </div>
        ) : (
          <form className="admin-record-form" onSubmit={handleSubmit}>
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
              <div className="form-field admin-record-field--wide">
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
              <div
                className="admin-form-message"
                style={{ color: message.type === "error" ? "#b91c1c" : "#047857" }}
              >
                {message.text}
              </div>
            )}

            <button type="submit" className="primary-btn" disabled={saving}>
              {saving ? "Updating building..." : "Update Building"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default EditBuilding;
