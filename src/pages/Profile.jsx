import React, { useEffect, useMemo, useState } from "react";
import { useAuthContext } from "../context/AuthContext";
import { ROLES } from "../constants/roles";
import { getAllBuildings } from "../services/buildingService";
import { getUserProfile, updateCurrentUserProfile } from "../services/userService";
import { signOutAllDevices } from "../services/authService";

const DEFAULT_PHONE_NUMBER = "+65 9123 4567";

const getDisplayName = (profile) =>
  profile?.fullName ||
  profile?.displayName ||
  profile?.userId ||
  [profile?.firstName, profile?.lastName].filter(Boolean).join(" ") ||
  "";

const getInitials = (name, email) => {
  const source = name || email || "";
  const parts = source.includes("@") ? [source.charAt(0)] : source.split(" ");
  return parts
    .filter(Boolean)
    .map((part) => part.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();
};

const getRoleLabel = (role) => {
  if (role === ROLES.FSM) return "FSM / Fire Safety Manager";
  if (role === ROLES.ADMIN) return "Admin";
  if (role === ROLES.CUSTOMER) return "Customer";
  return role || "-";
};

const getLookupIds = (profile) =>
  [
    profile?.uid,
    profile?.authUid,
    profile?.profileId,
    profile?.id,
    profile?.userId,
    profile?.fullName,
    profile?.displayName,
    profile?.email,
    profile?.fsmId,
    profile?.assignedFsmId,
    profile?.customerId,
    profile?.accountId,
    profile?.staffId,
    profile?.employeeId
  ]
    .filter(Boolean)
    .map((value) => String(value).trim())
    .filter(Boolean);

const getBuildingName = (building) =>
  building?.buildingName || building?.building_name || building?.name || building?.buildingId || building?.id || "";

const isLinkedBuilding = (building, profile, lookupIds) => {
  if (profile?.role === ROLES.ADMIN) return true;

  const candidateFields = [
    building?.assignedFsmId,
    building?.assignedFsm,
    building?.assignedFsmName,
    building?.fsmId,
    building?.customerId,
    building?.customer,
    building?.customerName,
    building?.ownerId,
    building?.createdBy
  ]
    .filter(Boolean)
    .map((value) => String(value).trim());

  return candidateFields.some((value) => lookupIds.includes(value));
};

const ProfileIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M20 21a8 8 0 0 0-16 0" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const SecurityIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
    <path d="m9 12 2 2 4-5" />
  </svg>
);

const NotificationsIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

const OrganizationIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M3 21h18" />
    <path d="M5 21V7l7-4 7 4v14" />
    <path d="M9 21v-6h6v6" />
    <path d="M9 9h.01" />
    <path d="M15 9h.01" />
  </svg>
);

const settingsSections = [
  { id: "profile", label: "Profile Information", Icon: ProfileIcon },
  { id: "security", label: "Security", Icon: SecurityIcon },
  { id: "notifications", label: "Notifications", Icon: NotificationsIcon },
  { id: "organization", label: "Organization", Icon: OrganizationIcon }
];

const notificationSettings = [
  ["emailNotifications", "Email notifications", "Receive important account and workflow updates by email."],
  ["inspectionReminders", "Inspection reminders", "Get reminders before scheduled inspection tasks."],
  ["issueUpdates", "Issue / defect updates", "Stay informed when issue status or assignment changes."],
  ["reportUpdates", "Report/status updates", "Receive updates when reports are generated or reviewed."],
  ["systemAnnouncements", "System announcements", "Receive platform maintenance and policy notices."]
];

const Profile = () => {
  const { user, updateLocalProfile } = useAuthContext();
  const [profile, setProfile] = useState(user);
  const [activeSection, setActiveSection] = useState("profile");
  const [loading, setLoading] = useState(false);
  const [buildings, setBuildings] = useState([]);
  const [buildingLoading, setBuildingLoading] = useState(false);
  const [form, setForm] = useState({ fullName: "", email: "", phoneNumber: "" });
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [saveError, setSaveError] = useState("");
  const [signingOutAll, setSigningOutAll] = useState(false);
  const [securityError, setSecurityError] = useState("");
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    inspectionReminders: true,
    issueUpdates: true,
    reportUpdates: true,
    systemAnnouncements: false
  });

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      if (!user?.uid && !user?.email) {
        setProfile(user);
        return;
      }

      try {
        setLoading(true);
        const latestProfile = await getUserProfile(user.uid, user.email);
        if (isMounted) {
          setProfile({
            ...user,
            ...latestProfile,
            uid: user.uid,
            authUid: user.authUid || user.uid,
            email: user.email
          });
        }
      } catch (error) {
        console.error("Failed to load profile", error);
        if (isMounted) setProfile(user);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [user]);

  useEffect(() => {
    setForm({
      fullName: getDisplayName(profile),
      email: profile?.email || "",
      phoneNumber:
        profile?.phoneNumber ||
        profile?.phone ||
        profile?.contactNumber ||
        DEFAULT_PHONE_NUMBER
    });
  }, [profile]);

  useEffect(() => {
    let isMounted = true;

    const loadBuildings = async () => {
      try {
        setBuildingLoading(true);
        const buildingData = await getAllBuildings();
        if (isMounted) setBuildings(buildingData);
      } catch (error) {
        console.error("Failed to load organization buildings", error);
        if (isMounted) setBuildings([]);
      } finally {
        if (isMounted) setBuildingLoading(false);
      }
    };

    loadBuildings();

    return () => {
      isMounted = false;
    };
  }, []);

  const displayName = useMemo(() => {
    const profileName = getDisplayName(profile);
    return profileName;
  }, [profile]);
  const initials = useMemo(
    () => getInitials(displayName, profile?.email),
    [displayName, profile?.email]
  );
  const roleLabel = getRoleLabel(profile?.role);
  const lookupIds = useMemo(() => getLookupIds(profile), [profile]);
  const linkedBuildings = useMemo(
    () => buildings.filter((building) => isLinkedBuilding(building, profile, lookupIds)),
    [buildings, lookupIds, profile]
  );
  const linkedBuildingNames = linkedBuildings.map(getBuildingName).filter(Boolean).slice(0, 3);
  const organizationName =
    profile?.organizationName ||
    profile?.organisationName ||
    profile?.companyName ||
    profile?.company ||
    "CBRE Fire Safety Management";
  const accountType = profile?.accountType || profile?.workspaceType || `${roleLabel} workspace`;
  const supportContact =
    profile?.supportEmail ||
    profile?.adminEmail ||
    profile?.managerEmail ||
    "Contact System Administrator";
  const passwordUpdated = profile?.passwordUpdatedAt || profile?.passwordLastUpdated || "Not recorded";

  const handleProfileChange = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
    setSaveMessage("");
    setSaveError("");
  };

  const handleProfileSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    setSaveMessage("");
    setSaveError("");

    try {
      const changes = await updateCurrentUserProfile(profile?.profileId, form);
      setProfile((current) => ({ ...current, ...changes }));
      updateLocalProfile(changes);
      setSaveMessage("Profile updated successfully.");
    } catch (error) {
      const message = error?.code === "auth/requires-recent-login"
        ? "Please sign out and sign in again before changing your email address."
        : error?.message || "Unable to update profile.";
      setSaveError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleSignOutAllDevices = async () => {
    const confirmed = window.confirm(
      "Sign out of every device, including this one? You will need to sign in again."
    );

    if (!confirmed) return;

    setSigningOutAll(true);
    setSecurityError("");

    try {
      await signOutAllDevices();
    } catch (error) {
      console.error("Failed to sign out all devices", error);
      setSecurityError(
        error?.code === "functions/unauthenticated"
          ? "Your session has expired. Please sign in again."
          : "Unable to sign out all devices. Please try again."
      );
      setSigningOutAll(false);
    }
  };

  const renderProfileSection = () => (
    <>
      <div className="profile-summary">
        <div className="profile-avatar">{initials || "U"}</div>
        <div>
          <h2>{displayName || "-"}</h2>
          <p>{roleLabel}</p>
          {profile?.status && <span className="status-pill">{profile.status}</span>}
        </div>
      </div>

      <form className="profile-details-grid" onSubmit={handleProfileSave}>
        <label className="profile-field">
          <span>Full Name</span>
          <input className="form-input" value={form.fullName} onChange={handleProfileChange("fullName")} required />
        </label>

        <label className="profile-field">
          <span>Email Address</span>
          <input className="form-input" type="email" value={form.email} onChange={handleProfileChange("email")} required />
        </label>

        <label className="profile-field">
          <span>Role</span>
          <input className="form-input" value={roleLabel} readOnly />
        </label>

        <label className="profile-field">
          <span>Phone Number</span>
          <input className="form-input" type="tel" value={form.phoneNumber} onChange={handleProfileChange("phoneNumber")} />
        </label>

        {saveError && <p className="profile-save-message profile-save-error" role="alert">{saveError}</p>}
        {saveMessage && <p className="profile-save-message profile-save-success" role="status">{saveMessage}</p>}
        <div className="profile-form-actions">
          <button type="submit" className="primary-button" disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>

      <p className="profile-note">
        Your role is assigned by the system and cannot be edited here.
      </p>
    </>
  );

  const renderSecuritySection = () => (
    <div className="profile-settings-stack">
      <div className="profile-section-heading">
        <h2>Security</h2>
        <p>Review sign-in protection and account access controls.</p>
      </div>

      <div className="profile-setting-row">
        <div>
          <h3>Change Password</h3>
          <p>Password changes are handled through the authentication provider.</p>
        </div>
        <button type="button" className="secondary-button" disabled>Unavailable</button>
      </div>

      <div className="profile-setting-row">
        <div>
          <h3>Two-Factor Authentication</h3>
          <p>Add an extra verification step when signing in. Setup is not connected yet.</p>
        </div>
        <span className="profile-status-muted">Not enabled</span>
      </div>

      <div className="profile-setting-row">
        <div>
          <h3>Active Sessions / Signed-in Devices</h3>
          <p>Current browser session is active. Device history is not available in this app yet.</p>
        </div>
        <span className="status-pill">Active</span>
      </div>

      <div className="profile-setting-row">
        <div>
          <h3>Sign out of all devices</h3>
          <p>Revoke access on every signed-in device, including this browser. Other devices may take up to one hour to sign out.</p>
        </div>
        <button
          type="button"
          className="danger-button"
          onClick={handleSignOutAllDevices}
          disabled={signingOutAll}
        >
          {signingOutAll ? "Signing out..." : "Sign out all"}
        </button>
      </div>

      {securityError && (
        <p className="profile-save-message profile-save-error" role="alert">
          {securityError}
        </p>
      )}

      <div className="profile-info-strip">
        <span>Password last updated</span>
        <strong>{String(passwordUpdated)}</strong>
      </div>
    </div>
  );

  const renderNotificationsSection = () => (
    <div className="profile-settings-stack">
      <div className="profile-section-heading">
        <h2>Notifications</h2>
        <p>Choose which updates you want to receive. These controls are ready for persistence.</p>
      </div>

      <div className="profile-toggle-list">
        {notificationSettings.map(([key, label, helper]) => (
          <label className="profile-toggle-row" key={key}>
            <div>
              <h3>{label}</h3>
              <p>{helper}</p>
            </div>
            <input
              type="checkbox"
              checked={notifications[key]}
              onChange={(event) =>
                setNotifications((current) => ({ ...current, [key]: event.target.checked }))
              }
            />
          </label>
        ))}
      </div>

      <p className="profile-note">
        Notification preferences are shown in the UI for now and can be saved once backend storage is added.
      </p>
    </div>
  );

  const renderOrganizationSection = () => (
    <div className="profile-settings-stack">
      <div className="profile-section-heading">
        <h2>Organization</h2>
        <p>Workspace and building information linked to your account.</p>
      </div>

      <div className="profile-info-grid">
        <div className="profile-info-tile">
          <span>Company / Organization</span>
          <strong>{organizationName}</strong>
        </div>
        <div className="profile-info-tile">
          <span>Assigned Role</span>
          <strong>{roleLabel}</strong>
        </div>
        <div className="profile-info-tile">
          <span>Assigned Buildings</span>
          <strong>{buildingLoading ? "Loading..." : linkedBuildings.length}</strong>
        </div>
        <div className="profile-info-tile">
          <span>Account Type / Workspace</span>
          <strong>{accountType}</strong>
        </div>
      </div>

      <div className="profile-linked-card">
        <h3>Linked Building Info</h3>
        {linkedBuildingNames.length > 0 ? (
          <ul>
            {linkedBuildingNames.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
        ) : (
          <p>{buildingLoading ? "Loading linked buildings..." : "No linked buildings found for this account."}</p>
        )}
      </div>

      <div className="profile-info-strip">
        <span>Support / Admin Contact</span>
        <strong>{supportContact}</strong>
      </div>
    </div>
  );

  const renderActiveSection = () => {
    if (activeSection === "security") return renderSecuritySection();
    if (activeSection === "notifications") return renderNotificationsSection();
    if (activeSection === "organization") return renderOrganizationSection();
    return renderProfileSection();
  };

  return (
    <div className="profile-page">
      <div className="page-header profile-page-header">
        <div>
          <h1>Settings & Profile</h1>
          <p className="page-subtitle">Manage your account preferences and security.</p>
        </div>
      </div>

      <div className="profile-layout">
        <aside className="profile-tabs" aria-label="Profile sections">
          {settingsSections.map((section) => (
            <button
              key={section.id}
              type="button"
              className={activeSection === section.id ? "profile-tab active" : "profile-tab"}
              onClick={() => setActiveSection(section.id)}
            >
              <span className="profile-tab-icon">
                <section.Icon />
              </span>
              {section.label}
            </button>
          ))}
        </aside>

        <section className="dashboard-card profile-card">
          {loading ? <div className="loading-state">Loading profile...</div> : renderActiveSection()}
        </section>
      </div>
    </div>
  );
};

export default Profile;
