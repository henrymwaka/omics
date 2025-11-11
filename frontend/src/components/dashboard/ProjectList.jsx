// src/components/dashboard/ProjectList.jsx
function ProjectList({ projects, selectedProject, onSelect, onRefresh }) {
  return (
    <div className="card">
      <h2>Projects</h2>
      <button onClick={onRefresh} className="btn">Refresh</button>
      <ul className="list">
        {projects.map((p) => (
          <li
            key={p.id}
            className={selectedProject?.id === p.id ? "list-item active" : "list-item"}
            onClick={() => onSelect(p)}
          >
            <strong>{p.name}</strong>
            {p.description && <span className="muted"> — {p.description}</span>}
          </li>
        ))}
        {projects.length === 0 && <li className="muted">No projects yet.</li>}
      </ul>
    </div>
  );
}
export default ProjectList;
