// src/components/dashboard/SamplePanel.jsx
import SampleWizard from "../SampleWizard";
function SamplePanel({
  project,
  samples,
  files,
  uploading,
  onUpload,
  onReload,
}) {
  return (
    <section className="card">
      <h2>Samples</h2>

      {project ? (
        <>
          <p>
            Showing samples for <strong>{project.name}</strong>
          </p>

          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Organism</th>
                <th>Tissue</th>
                <th>Type</th>
                <th>Date</th>
                <th>Files</th>
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
                  <td>
                    <button
                      className="btn small primary"
                      disabled={uploading === s.id}
                      onClick={() =>
                        document.getElementById(`file-input-${s.id}`).click()
                      }
                    >
                      {uploading === s.id ? "Uploading…" : "Upload File"}
                    </button>

                    <input
                      id={`file-input-${s.id}`}
                      type="file"
                      style={{ display: "none" }}
                      onChange={(e) => onUpload(e, s.id, "FASTQ")}
                    />

                    {files[s.id]?.length > 0 && (
                      <ul className="muted small" style={{ marginTop: "6px" }}>
                        {files[s.id].map((f) => (
                          <li key={f.id}>
                            <a href={f.file} target="_blank" rel="noreferrer">
                              {f.file_type}
                            </a>{" "}
                            ({new Date(f.uploaded_at).toLocaleDateString()})
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>
                </tr>
              ))}

              {samples.length === 0 && (
                <tr>
                  <td colSpan="6" className="muted">
                    No samples yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="new-sample-form">
            <h3>Add Sample via Wizard</h3>
            <SampleWizard
              projectId={project.id}
              onComplete={() => onReload(project.id)}
            />
          </div>
        </>
      ) : (
        <p className="muted">Select a project to view or add samples.</p>
      )}
    </section>
  );
}
export default SamplePanel;
