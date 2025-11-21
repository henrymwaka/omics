// src/components/ProjectDetailPage.jsx
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

function ProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/projects/${id}/`)
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => setProject(data))
      .catch(() => setProject(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="card p-6">
        <p>Loading project...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="card p-6">
        <p>Project not found.</p>
        <button className="btn mt-3" onClick={() => navigate("/")}>
          Back to dashboard
        </button>
      </div>
    );
  }

  const samples = project.samples || [];

  return (
    <div className="card p-6">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2>{project.name}</h2>
          {project.description && (
            <p className="text-sm text-gray-600 mt-1">
              {project.description}
            </p>
          )}
          <p className="text-xs text-gray-500 mt-1">
            Created: {new Date(project.created_at).toLocaleString()}
          </p>
        </div>
        <button className="btn" onClick={() => navigate("/")}>
          Dashboard
        </button>
      </div>

      <h3 className="mt-4 mb-2">Samples in this project</h3>

      {samples.length === 0 ? (
        <p className="text-sm text-gray-600">No samples yet.</p>
      ) : (
        <table className="summary-table mt-2">
          <thead>
            <tr>
              <th>Sample ID</th>
              <th>Organism</th>
              <th>Tissue</th>
              <th>Data type</th>
              <th>Collected on</th>
              <th>Created at</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {samples.map((s) => (
              <tr key={s.id}>
                <td>{s.sample_id}</td>
                <td>{s.organism_name || "—"}</td>
                <td>{s.tissue_type_name || "—"}</td>
                <td>{s.data_type}</td>
                <td>{s.collected_on || "—"}</td>
                <td>{new Date(s.created_at).toLocaleString()}</td>
                <td>
                  <button
                    className="btn small"
                    onClick={() => navigate(`/sample/${s.id}`)}
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default ProjectDetailPage;
