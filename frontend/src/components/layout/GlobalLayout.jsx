// src/components/layout/GlobalLayout.jsx
// -----------------------------------------------------------------------------
// Full polished global layout for ResLab Omics
// -----------------------------------------------------------------------------

import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import Footer from "../Footer";
import UserBar from "../../UserBar.jsx";
import "../../App.css";

function GlobalLayout({ children, title = "", subtitle = "" }) {
  const location = useLocation();
  const { user } = useAuth();

  const isActive = (path) => {
    return location.pathname.startsWith(path);
  };

  return (
    <div className="layout-root">

      {/* SIDEBAR */}
      <aside className="layout-sidebar">
        <div className="layout-sidebar-header">
          <div className="layout-app-title">ResLab Omics</div>
          <div className="layout-app-sub">Integrated analysis hub</div>
        </div>

        <nav className="layout-sidebar-nav">
          <Link
            to="/"
            className={
              isActive("/") && !isActive("/dashboard")
                ? "layout-nav-item active"
                : "layout-nav-item"
            }
          >
            <span className="nav-icon">🏠</span>
            <span>Home</span>
          </Link>

          <Link
            to="/dashboard"
            className={
              isActive("/dashboard")
                ? "layout-nav-item active"
                : "layout-nav-item"
            }
          >
            <span className="nav-icon">📊</span>
            <span>Dashboard</span>
          </Link>

          <Link
            to="/wizard"
            className={
              isActive("/wizard")
                ? "layout-nav-item active"
                : "layout-nav-item"
            }
          >
            <span className="nav-icon">🧬</span>
            <span>Sample Wizard</span>
          </Link>

          {!user && (
            <Link
              to="/login"
              className={
                isActive("/login")
                  ? "layout-nav-item active"
                  : "layout-nav-item"
              }
            >
              <span className="nav-icon">🔐</span>
              <span>Sign in</span>
            </Link>
          )}
        </nav>
      </aside>

      {/* MAIN AREA */}
      <main className="layout-main">

        {/* User bar (username + logout) */}
        <UserBar />

        {/* HEADER */}
        <header className="layout-page-header">
          {title && <h1 className="page-title">{title}</h1>}
          {subtitle && <p className="page-subtitle">{subtitle}</p>}
        </header>

        {/* PAGE CONTENT */}
        <div className="layout-page-content">{children}</div>

        <Footer />
      </main>
    </div>
  );
}

export default GlobalLayout;
