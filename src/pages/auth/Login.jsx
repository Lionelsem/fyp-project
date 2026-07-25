import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../../services/authService";
import { useAuth } from "../../hooks/useAuth";
import { ROUTES } from "../../constants/routes";
import {
  clearRememberedEmail,
  getRememberedEmail,
  saveRememberedEmail
} from "../../services/rememberedLoginService";

const Login = () => {
  const [email, setEmail] = useState(() => getRememberedEmail());
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [rememberMe, setRememberMe] = useState(() => Boolean(getRememberedEmail()));
  const [showPassword, setShowPassword] = useState(false);
  const { loading } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (event) => {
    event.preventDefault();
    setError("");
    try {
      const user = await login(email, password);
      const loginEmail = user?.email || email;

      if (rememberMe) {
        saveRememberedEmail(loginEmail);
      } else {
        clearRememberedEmail();
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Login failed");
    }
  };

  if (loading) {
    return <div>Loading authentication...</div>;
  }

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
          © {new Date().getFullYear()} FireGuard Systems. All rights reserved.
        </p>
      </section>

      <section className="login-form-panel">
        <form className="login-form-card" onSubmit={handleLogin}>
          <div className="login-form-heading">
            <h2>Welcome back</h2>
            <p>Please enter your credentials to access the portal.</p>
          </div>

          {error && <p className="login-error">{error}</p>}

          <label className="login-field">
            <span>Email Address</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              autoComplete="email"
              required
            />
          </label>

          <label className="login-field">
            <span className="login-label-row">
              Password
              <button
                type="button"
                className="login-link-button"
                onClick={() => navigate(ROUTES.ADMIN_CONTACT)}
              >
                Forgot password?
              </button>
            </span>
            <span className="login-password-control">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="login-password-toggle"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
                  <circle cx="12" cy="12" r="2.75" />
                </svg>
              </button>
            </span>
          </label>

          <label className="login-checkbox-row">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            <span>Remember me for 30 days</span>
          </label>

          <button type="submit" className="login-submit-button">
            Log In
          </button>

          <div className="login-support">
            Need access?{" "}
            <button
              type="button"
              className="login-link-button login-support-button"
              onClick={() => navigate(ROUTES.ADMIN_CONTACT)}
            >
              Contact System Administrator
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};

export default Login;
