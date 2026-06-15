import React, { useEffect, useMemo, useState } from "react";
import { useAuthContext } from "../context/AuthContext";
import { ROLES } from "../constants/roles";
import { getUserProfile } from "../services/userService";

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

const Profile = () => {
  const { user } = useAuthContext();
  const [profile, setProfile] = useState(user);
  const [loading, setLoading] = useState(false);

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

  const displayName = useMemo(() => getDisplayName(profile), [profile]);
  const initials = useMemo(
    () => getInitials(displayName, profile?.email),
    [displayName, profile?.email]
  );
  const roleLabel = getRoleLabel(profile?.role);
  const phoneNumber = profile?.phoneNumber || profile?.phone || profile?.contactNumber || "";

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
          <button type="button" className="profile-tab active">
            <span className="profile-tab-icon">P</span>
            Profile Information
          </button>
          <button type="button" className="profile-tab" disabled>
            <span className="profile-tab-icon">S</span>
            Security
          </button>
          <button type="button" className="profile-tab" disabled>
            <span className="profile-tab-icon">N</span>
            Notifications
          </button>
          <button type="button" className="profile-tab" disabled>
            <span className="profile-tab-icon">O</span>
            Organization
          </button>
        </aside>

        <section className="dashboard-card profile-card">
          {loading ? (
            <div className="loading-state">Loading profile...</div>
          ) : (
            <>
              <div className="profile-summary">
                <div className="profile-avatar">{initials || "U"}</div>
                <div>
                  <h2>{displayName || "-"}</h2>
                  <p>{roleLabel}</p>
                  {profile?.status && <span className="status-pill">{profile.status}</span>}
                </div>
              </div>

              <div className="profile-details-grid">
                <label className="profile-field">
                  <span>Full Name</span>
                  <input className="form-input" value={displayName || "-"} readOnly />
                </label>

                <label className="profile-field">
                  <span>Email Address</span>
                  <input className="form-input" value={profile?.email || "-"} readOnly />
                </label>

                <label className="profile-field">
                  <span>Role</span>
                  <input className="form-input" value={roleLabel} readOnly />
                </label>

                {phoneNumber && (
                  <label className="profile-field">
                    <span>Phone Number</span>
                    <input className="form-input" value={phoneNumber} readOnly />
                  </label>
                )}
              </div>

              <p className="profile-note">
                To change your role or account email, please contact your system administrator.
              </p>
            </>
          )}
        </section>
      </div>
    </div>
  );
};

export default Profile;
