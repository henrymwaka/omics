// src/components/dashboard/DashboardHeader.jsx
function DashboardHeader() {
  return (
    <header className="navbar">
      <div className="navbar-left">
        <h1>ResLab Omics Dashboard</h1>
      </div>
      <div className="navbar-right">
        <a href="/" className="nav-link">🏠 Home</a>
        <a href="/wizard" className="nav-link">Wizard</a>
        <a href="/admin/" className="nav-link">Admin</a>
      </div>
    </header>
  );
}
export default DashboardHeader;
