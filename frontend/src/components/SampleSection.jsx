// frontend/src/components/SampleSection.jsx
import { useState, useEffect } from "react";
import "../App.css";
import SampleWizard from "./SampleWizard";
import SampleSummary from "./SampleSummary";

function SampleSection({ project, onRefreshProject }) {
  const [showWizard, setShowWizard] = useState(false);

  // Auto-refresh sample list when the project changes
  useEffect(() => {
    if (project && onRefreshProject) {
      onRefreshProject();
    }
  }, [project]);

  const handleWizardComplete = () => {
    setShowWizard(false);
    if (onRefreshProject) {
      onRefreshProject();   // reload project samples
    }
  };

  if (!project) {
    return (
      <div className="card">
        <p>Select a project to view its samples.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header-row">
        <h2>Samples in {project.name}</h2>
        <button className="btn primary" onClick={() => setShowWizard(true)}>
          + Add Sample
        </button>
      </div>

      {!showWizard && (
        <>
          {project.samples && project.samples.length > 0 ? (
            <ul className="list">
              {project.samples.map((s) => (
                <li key={s.id} className="list-item">
                  <strong>{s.sample_id}</strong>
                  {" — "}
                  <span className="muted">
                    {s.organism_name || "No organism"}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">No samples yet.</p>
          )}
        </>
      )}

      {showWizard && (
        <div className="wizard-container">
          <SampleWizard
            projectId={project.id}
            onComplete={handleWizardComplete}
          />

          <button
            className="btn secondary mt-3"
            onClick={() => setShowWizard(false)}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

export default SampleSection;
