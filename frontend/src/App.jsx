import { useEffect, useState } from "react";

const API_BASE = "/api";

function App() {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [samples, setSamples] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");
  const [error, setError] = useState("");

  // Fetch all projects
  const fetchProjects = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/projects/`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setProjects(data);
    } catch (e) {
      setError("Failed to load projects.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Fetch samples for a given project
  const fetchSamples = async (projectId) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/samples/?project=${projectId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setSamples(data);
    } catch (e) {
      setError("Failed to load samples.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleSelectProject = (project) => {
    setSelectedProject(project);
    fetchSamples(project.id);
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    setError("");

    if (!newProjectName.trim()) {
      setError("Project name is required.");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/projects/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newProjectName,
          description: newProjectDescription,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setNewProjectName("");
      setNewProjectDescription("");
      fetchProjects();
    } catch (e) {
      setError("Failed to create project.");
      console.error(e);
    }
  };

  return (
    <div className="app">
      <header className="navbar">
        <div className="navbar-left">
          <h1>ResLab Omics Platform</h1>
        </div>
        <div className="navbar-right">
          <a href="/admin/" className="nav-link">
            Admin
          </a>
        </div>
      </header>

      <main className="container">
        {error && <div className="alert error">{error}</div>}
        {loading && <div className="alert info">Loading…</div>}

        <section className="grid">
          <div className="card">
            <h2>Projects</h2>
            <button onClick={fetchProjects} className="btn">
              Refresh
            </button>
            <ul className="list">
              {projects.map((p) => (
                <li
                  key={p.id}
                  className={
                    selectedProject && selectedProject.id === p.id
                      ? "list-item active"
                      : "list-item"
                  }
                  onClick={() => handleSelectProject(p)}
                >
                  <strong>{p.name}</strong>
                  {p.description && (
                    <span className="muted"> — {p.description}</span>
                  )}
                </li>
              ))}
              {projects.length === 0 && (
                <li className="muted">No projects yet.</li>
              )}
            </ul>
          </div>

          <div className="card">
            <h2>Create Project</h2>
            <form onSubmit={handleCreateProject}>
              <label>
                Name
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="e.g., Banana RNA-seq"
                />
              </label>
              <label>
                Description
                <textarea
                  value={newProjectDescription}
                  onChange={(e) => setNewProjectDescription(e.target.value)}
                  placeholder="Optional description"
                />
              </label>
              <button type="submit" className="btn primary">
                Save
              </button>
            </form>
          </div>
        </section>

        <section className="card">
          <h2>Samples</h2>
          {selectedProject ? (
            <>
              <p>
                Showing samples for <strong>{selectedProject.name}</strong>
              </p>
              <table className="table">
                <thead>
                  <tr>
                    <th>Sample ID</th>
                    <th>Organism</th>
                    <th>Tissue</th>
                    <th>Data type</th>
                    <th>Collected on</th>
                  </tr>
                </thead>
                <tbody>
                  {samples.map((s) => (
                    <tr key={s.id}>
                      <td>{s.sample_id}</td>
                      <td>{s.organism}</td>
                      <td>{s.tissue_type}</td>
                      <td>{s.data_type}</td>
                      <td>{s.collected_on || "-"}</td>
                    </tr>
                  ))}
                  {samples.length === 0 && (
                    <tr>
                      <td colSpan="5" className="muted">
                        No samples for this project yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </>
          ) : (
            <p className="muted">Select a project to see its samples.</p>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
