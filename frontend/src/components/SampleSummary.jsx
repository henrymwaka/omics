// src/components/SampleSummary.jsx
// -----------------------------------------------------------------------------
// Unified Sample Summary Component
// -----------------------------------------------------------------------------
// Shows sample metadata and linked files.
// Used in sample detail modal or right-panel preview.
// -----------------------------------------------------------------------------

import { useEffect, useState } from "react";
import "../App.css";

function SampleSummary({ sampleId, onClose }) {
  const [sample, setSample] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!sampleId) return;

    setLoading(true);
    fetch(`/api/samples/${sampleId}/`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setSample(data);
        setError("");
      })
      .catch(() => setError("Failed to load sample details."))
      .finally(() => setLoading(false));
  }, [sampleId]);

  if (loading)
    return (
      <div className="card mt-3">
        <p className="muted">Loading sample summary...</p>
      </div>
    );

  if (error)
    return (
      <div className="card mt-3">
        <p className="text-red-600">{error}</p>
      </div>
    );

  if (!sample)
    return (
      <div className="card mt-3">
        <p>No sample found.</p>
      </div>
    );

  return (
    <div className="card mt-3">
      {/* Header */}
      <div className="card-header-row">
        <h3 className="font-semibold text-lg">
          🧬 Sample Summary – {sample.sample_id}
        </h3>

        {onClose && (
          <button onClick={onClose} className="btn small">
            ✖ Close
          </button>
        )}
      </div>

      {/* Summary table */}
      <table className="summary-table">
        <tbody>
          <tr><td>Project</td><td>{sample.project}</td></tr>
          <tr><td>Organism</td><td>{sample.organism_name || "—"}</td></tr>
          <tr><td>Tissue Type</td><td>{sample.tissue_type_name || "—"}</td></tr>
          <tr><td>Data Type</td><td>{sample.data_type}</td></tr>
          <tr><td>Collected On</td><td>{sample.collected_on || "—"}</td></tr>
          <tr><td>Created At</td><td>{new Date(sample.created_at).toLocaleString()}</td></tr>
        </tbody>
      </table>

      {/* Files */}
      <h4 className="mt-4 font-medium">📁 Linked Files</h4>

      {sample.files && sample.files.length > 0 ? (
        <ul className="file-list mt-2">
          {sample.files.map((f) => (
            <li key={f.id} className="file-item">
              <div className="flex justify-between items-center">
                <span>
                  <strong>{f.file_type}</strong> &nbsp;
                  <small className="muted">
                    ({new Date(f.uploaded_at).toLocaleString()})
                  </small>
                </span>
                <a
                  href={f.file}
                  className="btn small secondary"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  ⬇ Download
                </a>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted mt-2">No linked files.</p>
      )}
    </div>
  );
}

export default SampleSummary;
