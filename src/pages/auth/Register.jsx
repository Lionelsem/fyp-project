import React, { useState } from "react";
import { register } from "../../services/authService";
import { useNavigate } from "react-router-dom";
import { ROLES } from "../../constants/roles";
import { ROUTES } from "../../constants/routes";

const Register = () => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState(ROLES.CUSTOMER);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register({ firstName, lastName, email, password, role });
      navigate("/login");
    } catch (err) {
      console.error(err);
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page login-page">
      <section
        className="register-brand-panel login-brand-panel"
        aria-label="CBRE Fire Safety Management"
      >
        <div className="login-brand-logo">CBRE</div>

        <div className="login-brand-copy">
          <h1>Create your portal account</h1>
          <p>
            Register to access fire safety inspections, compliance records, and
            building updates from any device.
          </p>
          <span className="login-brand-badge">Secure Portal Access</span>
        </div>

        <p className="login-brand-footer">
          &copy; {new Date().getFullYear()} FireGuard Systems. All rights reserved.
        </p>
      </section>

      <section className="register-form-panel login-form-panel">
        <form
          className="register-form-card login-form-card"
          onSubmit={handleSubmit}
        >
          <div className="register-form-heading login-form-heading">
            <h2>Register</h2>
            <p>Enter your details to create an account.</p>
          </div>

          {error && (
            <p className="register-error login-error" role="alert">
              {error}
            </p>
          )}

          <label className="register-field login-field">
            <span>First name</span>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="First name"
              autoComplete="given-name"
            />
          </label>

          <label className="register-field login-field">
            <span>Last name</span>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Last name"
              autoComplete="family-name"
            />
          </label>

          <label className="register-field login-field">
            <span>Email address</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              autoComplete="email"
            />
          </label>

          <label className="register-field login-field">
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              autoComplete="new-password"
            />
          </label>

          <label className="register-field login-field">
            <span>Role</span>
            <select
              className="register-role-select form-input"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value={ROLES.ADMIN}>{ROLES.ADMIN}</option>
              <option value={ROLES.FSM}>{ROLES.FSM}</option>
              <option value={ROLES.CUSTOMER}>{ROLES.CUSTOMER}</option>
            </select>
          </label>

          <button
            type="submit"
            className="register-submit-button login-submit-button"
            disabled={loading}
          >
            {loading ? "Registering..." : "Sign Up"}
          </button>

          <div className="register-support login-support">
            Already have an account?{" "}
            <button
              type="button"
              className="login-link-button login-support-button"
              onClick={() => navigate(ROUTES.LOGIN)}
            >
              Log in
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};

export default Register;
