// src/components/NavBar.jsx
// -----------------------------------------------------------------------------
// Top Navigation Bar (Clean Compact Theme C)
// -----------------------------------------------------------------------------

import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import "../App.css";

function NavBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { showToast } = useToast();

  const isActive = (path) =>
    location.pathname === path ? "nav-link active" : "nav-link";

  const handleLogout = async () => {
    try {
      await logout();
      showToast("Signed out", "info");
      navigate("/login", { replace: true });
    } catch {
      showToast("Logout failed", "error");
    }
  };

  return (
    <header className="navbar">

      {/* Brand */}
      <div className="navbar-left">
        <Link to="/" className="nav-brand">
          ResLab Omics
        </Link>
      </div>

      {/* Right Menu */}
      <nav className="navbar-right">

        <Link to="/dashboard" className={isActive("/dashboard")}>
          Dashboard
        </Link>

        <Link to="/wizard" className={isActive("/wizard")}>
          Add Sample
        </Link>

        {/* NOT LOGGED IN */}
        {!user && location.pathname !== "/login" && (
          <Link to="/login" className={isActive("/login")}>
            Sign in
          </Link>
        )}

        {/* LOGGED IN */}
        {user && (
          <>
            <span className="nav-user-label">{user.username}</span>

            <button
              className="btn small nav-logout-btn"
              onClick={handleLogout}
            >
              Sign out
            </button>
          </>
        )}
      </nav>
    </header>
  );
}

export default NavBar;
