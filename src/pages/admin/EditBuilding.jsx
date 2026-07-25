import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { getBuildingById, updateBuilding } from "../../services/buildingService";

const initialForm = {
  buildingId: "",
  buildingName: "",
  address: "",
  storeys: "",
  grossFloorArea: "",
  occupantLoad: "",
  assignedFsm: "",
  customerId: "",
  status: "Compliant"
};

const normalizeBuildingPayload = (form) => ({
  buildingId: form.buildingId.trim(),
  buildingName: form.buildingName.trim(),
  building_name: form.buildingName.trim(),
  address: form.address.trim(),
  noOfStoreys: form.storeys ? Number(form.storeys) : null,
  occupantLoad: String(form.occupantLoad || "").trim(),
  occupancyType: "",
  grossFloorAreaGfa: String(form.grossFloorArea || "").trim(),
  customerId: String(form.customerId || "").trim(),
  status: form.status
});

const EditBuilding = () => {
  const { id } = useParams();
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const loadBuilding = async () => {
      try {
        const building = await getBuildingById(id);
        if (!building) {
          toast.error("Building not found.");
          return;
        }

        setForm({
          buildingId: building.buildingId || building.id || "",
          buildingName: building.building_name || building.buildingName || "",
          address: building.address || "",
          storeys: building.noOfStoreys ? String(building.noOfStoreys) : "",
          grossFloorArea: building.grossFloorAreaGfa || "",
          occupantLoad: building.occupantLoad || "",
          assignedFsm: building.assignedFsmId || "",
          customerId: building.customerId || "",
          status: building.status || "Compliant"
        });
      } catch (error) {
        console.error("Failed to load building", error);
        toast.error("Could not load building details.");
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

    if (!form.buildingName || !form.address) {
      toast.error("Building name and address are required.");
      return;
    }

    setSaving(true);
    try {
      await updateBuilding(id, normalizeBuildingPayload(form));
      toast.success("Building updated successfully.");
      navigate("/buildings");
    } catch (error) {
      console.error("Could not update building", error);
      const errorMessage = error.details || error.message || "Failed to update building.";
      toast.error(errorMessage);
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
                <label className="form-label">Gross Floor Area (m²)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. 12,500"
                  value={form.grossFloorArea}
                  onChange={handleChange("grossFloorArea")}
                />
              </div>
            </div>

            <div className="form-grid">
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
                <label className="form-label">Status</label>
                <select className="form-input" value={form.status} onChange={handleChange("status")}>
                  <option value="Compliant">Compliant</option>
                  <option value="Needs Review">Needs Review</option>
                  <option value="Non-Compliant">Non-Compliant</option>
                </select>
              </div>
            </div>

            
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
