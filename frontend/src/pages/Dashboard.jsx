// src/pages/Dashboard.jsx
import { useEffect, useState } from "react";
import "../App.css";
import DashboardHeader from "../components/dashboard/DashboardHeader";
import ProjectList from "../components/dashboard/ProjectList";
import ProjectForm from "../components/dashboard/ProjectForm";
import SamplePanel from "../components/dashboard/SamplePanel";

const API_BASE = "/api";

function Dashboard() {
  // ------------------- STATE -------------------
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [samples, setSamples] = useState([]);
  const [files, setFiles] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(null);

  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");

  // ------------------- LOADERS -------------------
  const fetchProjects = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/projects/`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setProjects(await res.json());
    } catch {
      setError("Failed to load projects.");
    } finally {
      setLoading(false);
    }
  };

  const fetchSamples = async (projectId) => {
    if (!projectId) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/samples/?project=${projectId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setSamples(data);
      const fileMap = {};
      for (const s of data) {
        const resF = await fetch(`${API_BASE}/files/?sample=${s.id}`);
        if (resF.ok) fileMap[s.id] = await resF.json();
      }
      setFiles(fileMap);
    } catch {
      setError("Failed to load samples.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  // ------------------- HANDLERS -------------------
  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!newProjectName.trim()) return setError("Project name is required.");
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
    } catch {
      setError("Failed to create project.");
    }
  };

  const handleUploadFile = async (e, sampleId, fileType) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(sampleId);
    try {
      const formData = new FormData();
      formData.append("sample", sampleId);
      formData.append("file_type", fileType);
      formData.append("file", file);

      const res = await fetch(`${API_BASE}/files/`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const resF = await fetch(`${API_BASE}/files/?sample=${sampleId}`);
      if (resF.ok) {
        const updated = await resF.json();
        setFiles((prev) => ({ ...prev, [sampleId]: updated }));
      }
    } catch {
      setError("Failed to upload file.");
    } finally {
      setUploading(null);
    }
  };

  // ------------------- RENDER -------------------
  return (
    <div className="app">
      <DashboardHeader />

      <main className="container">
        {error && <div className="alert error">{error}</div>}
        {loading && <div className="alert info">Loading…</div>}

        <section className="grid">
          <ProjectList
            projects={projects}
            selectedProject={selectedProject}
            onSelect={(p) => {
              setSelectedProject(p);
              setFiles({});
              fetchSamples(p.id);
            }}
            onRefresh={fetchProjects}
          />

          <ProjectForm
            name={newProjectName}
            description={newProjectDescription}
            onNameChange={setNewProjectName}
            onDescChange={setNewProjectDescription}
            onSubmit={handleCreateProject}
          />
        </section>

        <SamplePanel
          project={selectedProject}
          samples={samples}
          files={files}
          uploading={uploading}
          onUpload={handleUploadFile}
          onReload={fetchSamples}
        />
      </main>
    </div>
  );
}

export default Dashboard;
