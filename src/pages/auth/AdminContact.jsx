import React from "react";
import { useNavigate } from "react-router-dom";
import { SUPPORT_CONTACT } from "../../constants/supportContact";
import { ROUTES } from "../../constants/routes";

const AdminContact = () => {
  const navigate = useNavigate();

  return (
    <div className="login-page">
      <section className="login-brand-panel" aria-label="CBRE Fire Safety Management">
        <div className="login-brand-logo">CBRE</div>

        <div className="login-brand-copy">
          <h1>Professional Fire Safety Management</h1>
          <p>
            Streamline inspections, track compliance, and manage emergency issues
            from a single platform.
          </p>
          <span className="login-brand-badge">Certified & Compliant Systems</span>
        </div>

        <p className="login-brand-footer">
          &copy; {new Date().getFullYear()} FireGuard Systems. All rights reserved.
        </p>
      </section>

      <section className="login-form-panel">
        <div className="login-form-card admin-contact-card">
          <div className="login-form-heading">
            <h2>Contact System Administrator</h2>
            <p>
              For password reset, account access, or login assistance, please
              contact your system administrator.
            </p>
          </div>

          <div className="admin-contact-details" aria-label="System administrator contact details">
            <div>
              <span>Email</span>
              <a href={`mailto:${SUPPORT_CONTACT.email}`}>{SUPPORT_CONTACT.email}</a>
            </div>
            <div>
              <span>Phone</span>
              <a href={`tel:${SUPPORT_CONTACT.phone.replace(/\s/g, "")}`}>
                {SUPPORT_CONTACT.phone}
              </a>
            </div>
            <div>
              <span>Office/support hours</span>
              <strong>{SUPPORT_CONTACT.hours}</strong>
            </div>
          </div>

          <button
            type="button"
            className="login-submit-button"
            onClick={() => navigate(ROUTES.LOGIN)}
          >
            Back to Login
          </button>
        </div>
      </section>
    </div>
  );
};

export default AdminContact;
