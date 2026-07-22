import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getUserById, removeUserProfilePicture, updateUser, updateUserProfilePicture } from "../../services/userService";
import { ROLES } from "../../constants/roles";
import UserAvatar from "../../components/common/UserAvatar";
import { useAuthContext } from "../../context/AuthContext";

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
  const [photoURL, setPhotoURL] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [removePhoto, setRemovePhoto] = useState(false);
  const navigate = useNavigate();
  const { user: currentUser, updateLocalProfile } = useAuthContext();

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
        setPhotoURL(user.photoURL || "");
      } catch (error) {
        console.error("Failed to load user", error);
        setMessage({ type: "error", text: "Could not load user details." });
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [id]);

  useEffect(() => () => {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
  }, [photoPreview]);

  const handleChange = (field) => (event) => {
    setForm({ ...form, [field]: event.target.value });
  };

  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setMessage({ type: "error", text: "Please choose an image file." });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: "error", text: "Profile picture must be 5 MB or smaller." });
      return;
    }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setRemovePhoto(false);
    setMessage(null);
    event.target.value = "";
  };

  const cancelPhotoChange = () => {
    setPhotoFile(null);
    setPhotoPreview("");
    setRemovePhoto(false);
    setMessage(null);
  };

  const markPhotoForRemoval = () => {
    setPhotoFile(null);
    setPhotoPreview("");
    setRemovePhoto(true);
    setMessage(null);
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
      if (photoFile) {
        const savedPhotoURL = await updateUserProfilePicture(id, photoFile, photoURL);
        if (id === currentUser?.uid || id === currentUser?.profileId) {
          updateLocalProfile({ photoURL: savedPhotoURL });
        }
      } else if (removePhoto) {
        await removeUserProfilePicture(id, photoURL);
        if (id === currentUser?.uid || id === currentUser?.profileId) {
          updateLocalProfile({ photoURL: "" });
        }
      }
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
    <div className="dashboard-container admin-page admin-record-page">
      <div className="dashboard-card admin-record-card">
        <div className="card-header-row admin-record-header">
          <div>
            <h2 className="section-title">Edit User</h2>
            <p style={{ color: "#6b7280", marginTop: "4px" }}>
              Update the user profile, role, and account status.
            </p>
          </div>
          <button
            type="button"
            className="primary-btn admin-record-back-button"
            onClick={() => navigate("/users")}
          >
            ← Back to Users
          </button>
        </div>

        {loading ? (
          <div className="admin-record-loading">
            Loading user details...
          </div>
        ) : (
          <form className="admin-record-form" onSubmit={handleSubmit}>
            <div className="admin-profile-photo-field">
              <UserAvatar
                className="admin-edit-user-avatar"
                photoURL={removePhoto ? "" : photoPreview || photoURL}
                name={`${form.firstName} ${form.lastName}`.trim() || "User"}
              />
              <div>
                <label className="profile-photo-button">
                  {(photoURL && !removePhoto) || photoFile ? "Change profile picture" : "Upload profile picture"}
                  <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={handlePhotoChange} />
                </label>
                {(photoFile || removePhoto) && (
                  <button type="button" className="secondary-btn admin-photo-action" onClick={cancelPhotoChange}>
                    Cancel change
                  </button>
                )}
                {photoURL && !removePhoto && !photoFile && (
                  <button type="button" className="danger-button admin-photo-action" onClick={markPhotoForRemoval}>
                    Remove picture
                  </button>
                )}
                <p className="admin-photo-help">Admin only · JPG, PNG, WebP or GIF · max 5 MB</p>
              </div>
            </div>
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
              <div
                className="admin-form-message"
                style={{ color: message.type === "error" ? "#b91c1c" : "#047857" }}
              >
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
