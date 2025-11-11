// frontend/src/components/ProjectList.jsx
import "../App.css";

function ProjectList({
  projects,
  selectedProjectId,
  onSelectProject,
  onRefresh,
}) {
  return (
    <div className="card">
      <div className="card-header-row">
        <h2>Projects</h2>
        <button type="button" onClick={onRefresh} className="btn">
          Refresh
        </button>
      </div>
      <ul className="list">
        {projects.map((p) => (
          <li
            key={p.id}
            className={
              selectedProjectId === p.id ? "list-item active" : "list-item"
            }
            onClick={() => onSelectProject(p)}
          >
            <strong>{p.name}</strong>
            {p.description && <span className="muted"> - {p.description}</span>}
          </li>
        ))}
        {projects.length === 0 && (
          <li className="muted">No projects yet.</li>
        )}
      </ul>
    </div>
  );
}

export default ProjectList;
