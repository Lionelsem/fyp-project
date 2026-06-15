import React, { useState } from "react";
import { login } from "../../services/authService";
import { useAuth } from "../../hooks/useAuth";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const { loading } = useAuth();

  const handleLogin = async (event) => {
    event.preventDefault();
    setError("");
    try {
      await login(email, password);
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
              <button type="button" className="login-link-button">
                Forgot password?
              </button>
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              autoComplete="current-password"
              required
            />
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
            Need access? <span>Contact System Administrator</span>
          </div>
        </form>
      </section>
    </div>
  );
};

export default Login;
