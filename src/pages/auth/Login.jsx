import React, { useState } from "react";
import { login, logout } from "../../services/authService";
import { useAuth } from "../../hooks/useAuth";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { user, loading } = useAuth();

  const handleLogin = async () => {
    setError("");
    try {
      await login(email, password);
    } catch (err) {
      console.error(err);
      setError(err.message || "Login failed");
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.error(err);
      setError(err.message || "Logout failed");
    }
  };

  if (loading) {
    return <div>Loading authentication...</div>;
  }

  return (
    <div style={{ maxWidth: "420px", margin: "auto" }}>
      <h2>Login</h2>

      {error && <p style={{ color: "red" }}>{error}</p>}

      <input
        placeholder="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <br />

      <input
        placeholder="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <br />

      <button onClick={handleLogin}>Login</button>
      <button onClick={handleLogout} style={{ marginLeft: "8px" }}>
        Logout
      </button>

      {user && (
        <div style={{ marginTop: "16px" }}>
          <h3>Signed in user</h3>
          <p>Email: {user.email}</p>
          {user.fullName && <p>Full Name: {user.fullName}</p>}
          {user.role && <p>Role: {user.role}</p>}
        </div>
      )}
    </div>
  );
};

export default Login;
