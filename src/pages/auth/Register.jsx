import React, { useState } from "react";
import { register } from "../../services/authService";
import { useNavigate } from "react-router-dom";
import { ROLES } from "../../constants/roles";

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
    <div style={{ maxWidth: "420px", margin: "auto" }}>
      <h2>Register</h2>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <form onSubmit={handleSubmit}>
        <input placeholder="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        <br />
        <input placeholder="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
        <br />
        <input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <br />
        <input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <br />
        <label>
          Role:
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value={ROLES.ADMIN}>{ROLES.ADMIN}</option>
            <option value={ROLES.FSM}>{ROLES.FSM}</option>
            <option value={ROLES.CUSTOMER}>{ROLES.CUSTOMER}</option>
          </select>
        </label>
        <br />
        <button type="submit" disabled={loading}>
          {loading ? "Registering..." : "Sign Up"}
        </button>
      </form>
    </div>
  );
};

export default Register;
