// src/pages/Login.jsx
import { useState } from "react";
import { useLocation, useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import "../App.css";

function Login() {
  const { user, initializing, login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const from =
    location.state?.from?.pathname ||
    location.state?.from ||
    "/dashboard";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!initializing && user) {
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await login(username.trim(), password.trim());
      showToast("Signed in successfully", "success");
      navigate(from, { replace: true });
    } catch {
      setError("Invalid username or password");
      showToast("Login failed", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="layout">
      <main className="main">
        <div className="card" style={{ maxWidth: 420, margin: "0 auto" }}>
          <h2 style={{ marginBottom: "0.5rem" }}>Sign in</h2>
          <p className="muted" style={{ marginBottom: "1.5rem" }}>
            Use your Django admin credentials for now.
          </p>

          {error && <div className="alert error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <label
              style={{
                display: "block",
                fontSize: "0.75rem",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: "0.25rem",
                color: "var(--color-text-muted)",
              }}
            >
              Username
            </label>
            <input
              type="text"
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              style={{
                width: "100%",
                padding: "0.5rem 0.6rem",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--color-border)",
                marginBottom: "0.75rem",
              }}
            />

            <label
              style={{
                display: "block",
                fontSize: "0.75rem",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: "0.25rem",
                color: "var(--color-text-muted)",
              }}
            >
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              style={{
                width: "100%",
                padding: "0.5rem 0.6rem",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--color-border)",
                marginBottom: "1rem",
              }}
            />

            <button
              type="submit"
              className="btn primary"
              disabled={submitting}
              style={{ width: "100%", marginTop: "0.5rem" }}
            >
              {submitting ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

export default Login;
