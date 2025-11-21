// src/components/ProjectList.jsx
// -----------------------------------------------------------------------------
// Unified Project List Component
// -----------------------------------------------------------------------------
// Used by the Dashboard sidebar or panels.
// Displays all projects and highlights the selected one.
// -----------------------------------------------------------------------------

import "../App.css";

function ProjectList({ projects, selectedProjectId, onSelectProject, onRefresh }) {
  return (
    <div className="card">
      <div className="card-header-row">
        <h2>Projects</h2>
        <button type="button" onClick={onRefresh} className="btn small">
          Refresh
        </button>
      </div>

      <ul className="project-list">
        {projects.map((p) => (
          <li
            key={p.id}
            className={
              selectedProjectId === p.id
                ? "project-item active"
                : "project-item"
            }
            onClick={() => onSelectProject(p)}
          >
            <div className="project-name">{p.name}</div>
            {p.description && (
              <div className="project-desc">{p.description}</div>
            )}
          </li>
        ))}

        {projects.length === 0 && (
          <li className="project-empty">No projects yet.</li>
        )}
      </ul>
    </div>
  );
}

export default ProjectList;
