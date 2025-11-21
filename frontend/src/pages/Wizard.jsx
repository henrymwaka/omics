/* =============================================================================
   Wizard.jsx
   ResLab Omics Platform
   =============================================================================
   Responsibilities:
   - High level wizard flow for:
       1. Creating a new project
       2. Adding a sample to an existing project
       3. (Placeholder) Analysis module
   - Coordinates SampleWizard component
   - Loads project list when required
   ============================================================================= */

import { useState, useEffect } from "react";
import SampleWizard from "../components/SampleWizard";
import { useToast } from "../context/ToastContext";
import "../App.css";

const API_BASE = "/api";

function Wizard() {
  /* ---------------------------------------------------------------------------
     STATE VARIABLES
     ---------------------------------------------------------------------------
     mode                 – wizard screen selector
     projects[]           – list of projects (only used in add-sample mode)
     selectedProject      – project id selected in dropdown
     loading              – shows when project list is being fetched
     error                – form / fetch feedback
     newProjectName       – bound to form input
     newProjectDescription– bound to form input
     creating             – locks create button to prevent double submit
     --------------------------------------------------------------------------- */
  const [mode, setMode] = useState("");
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");
  const [creating, setCreating] = useState(false);

  const { showToast } = useToast();

  /* ---------------------------------------------------------------------------
     MODE CONTROL
     ---------------------------------------------------------------------------
     handleSelect(m)  – move to selected mode
     handleBack()     – return to main menu and clear errors
     --------------------------------------------------------------------------- */
  const handleSelect = (m) => setMode(m);

  const handleBack = () => {
    setMode("");
    setError("");
    setSelectedProject("");
  };

  /* ---------------------------------------------------------------------------
     LOAD PROJECT LIST WHEN ENTERING "add-sample" MODE
     ---------------------------------------------------------------------------
     - Calls GET /api/projects/
     - Ensures we do not load all projects on initial page load
     - Runs only when mode transitions to "add-sample"
     --------------------------------------------------------------------------- */
  useEffect(() => {
    if (mode === "add-sample") {
      setLoading(true);
      setError("");

      fetch(`${API_BASE}/projects/`)
        .then((r) => (r.ok ? r.json() : []))
        .then((data) => setProjects(Array.isArray(data) ? data : []))
        .catch(() => setError("Failed to load projects."))
        .finally(() => setLoading(false));
    }
  }, [mode]);

  /* ---------------------------------------------------------------------------
     CREATE NEW PROJECT
     ---------------------------------------------------------------------------
     - Calls POST /api/projects/
     - Shows toast on success or failure
     - After success → moves user directly to sample creation screen
     --------------------------------------------------------------------------- */
  const handleCreateProject = async (e) => {
    e.preventDefault();

    if (!newProjectName.trim()) {
      setError("Project name is required.");
      return;
    }

    setCreating(true);
    setError("");

    try {
const res = await fetch(`${API_BASE}/projects/`, {
  method: "POST",
  credentials: "include",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    name: newProjectName,
    description: newProjectDescription,
  }),
});

      if (!res.ok) throw new Error("Create failed");

      const data = await res.json();

      showToast(`Project “${data.name}” created successfully`, "success");

      setNewProjectName("");
      setNewProjectDescription("");

      /* 
         Important: after creating a project, we jump user into "add-sample"
         mode so they can immediately register their first sample.
      */
      setTimeout(() => setMode("add-sample"), 3500);
    } catch {
      showToast("Failed to create project", "error");
    } finally {
      setCreating(false);
    }
  };

  /* =============================================================================
     MODE 1: ADD SAMPLE TO PROJECT
     ============================================================================= */
  if (mode === "add-sample") {
    return (
      <div className="layout">
        <main className="main">
          <div className="card">

            <button className="btn small" onClick={handleBack}>
              ← Back
            </button>

            <h2>Add Sample to Project</h2>

            {/* Loader and errors */}
            {loading ? (
              <p className="muted">Loading projects…</p>
            ) : error ? (
              <div className="alert error">{error}</div>
            ) : (
              <>
                <label>Select a project</label>
                <select
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                >
                  <option value="">-- choose project --</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.description ? `(${p.description})` : ""}
                    </option>
                  ))}
                </select>
              </>
            )}

            {/* Show SampleWizard once user chooses a project */}
            {selectedProject && (
              <div className="mt-4">
                <SampleWizard
                  projectId={selectedProject}
                  onComplete={() =>
                    showToast("Sample added successfully", "success")
                  }
                />
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  /* =============================================================================
     MODE 2: CREATE A NEW PROJECT
     ============================================================================= */
  if (mode === "create-project") {
    return (
      <div className="layout">
        <main className="main">
          <div className="card">
            <button className="btn small" onClick={handleBack}>
              ← Back
            </button>

            <h2>Create New Project</h2>

            {error && <div className="alert error">{error}</div>}

            <form onSubmit={handleCreateProject}>
              <label>Name</label>
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="e.g., Banana RNA-seq"
                required
              />

              <label>Description</label>
              <textarea
                value={newProjectDescription}
                onChange={(e) => setNewProjectDescription(e.target.value)}
                placeholder="Optional project description"
              />

              <button
                type="submit"
                className="btn primary mt-3"
                disabled={creating}
              >
                {creating ? "Saving…" : "Save Project"}
              </button>
            </form>
          </div>
        </main>
      </div>
    );
  }

  /* =============================================================================
     MODE 3: ANALYSIS PLACEHOLDER
     ============================================================================= */
  if (mode === "analyze-data") {
    return (
      <div className="layout">
        <main className="main">
          <div className="card">
            <button className="btn small" onClick={handleBack}>
              ← Back
            </button>
            <h2>Analyze Data</h2>
            <p>Analysis modules will appear here soon.</p>
          </div>
        </main>
      </div>
    );
  }

  /* =============================================================================
     DEFAULT MENU – ENTRY POINT
     ============================================================================= */
  return (
    <div className="layout">
      <main className="main">
        <div className="card" style={{ textAlign: "center" }}>
          <h1 className="text-2xl font-bold mb-2">What would you like to do?</h1>
          <p className="muted">Choose an action below to get started.</p>

          {/* Main option buttons */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              flexWrap: "wrap",
              gap: "1.5rem",
              marginTop: "2rem",
            }}
          >
            <button
              className="btn primary"
              onClick={() => handleSelect("create-project")}
            >
              🧪 Create New Project
            </button>

            <button
              className="btn primary"
              onClick={() => handleSelect("add-sample")}
            >
              🧬 Add New Sample
            </button>

            <button
              className="btn primary"
              onClick={() => handleSelect("analyze-data")}
            >
              📊 Analyze Data
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Wizard;
