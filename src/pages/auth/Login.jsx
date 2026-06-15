import React, { useState } from "react";
import { login } from "../../services/authService";
import { useAuth } from "../../hooks/useAuth";
import { Link } from "react-router-dom";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { loading } = useAuth();

  const handleLogin = async () => {
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
    <div style={{ maxWidth: "420px", margin: "auto" }}>
      <h2>Login</h2>

      {error && <p style={{ color: "red" }}>{error}</p>}

      <input
        placeholder="Username"
        type="text"
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

      <button onClick={handleLogin}>Log In</button>
      <Link to="/register" style={{ marginLeft: "8px" }}>
        <button>Sign Up</button>
      </Link>
    </div>
  );
};

export default Login;
