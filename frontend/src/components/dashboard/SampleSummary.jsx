// src/components/dashboard/SampleSummary.jsx
import { useEffect, useState } from "react";
import axios from "axios";

function SampleSummary({ sampleId, onClose }) {
  const [sample, setSample] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sampleId) return;
    axios.get(`/api/samples/${sampleId}/`)
      .then(res => {
        setSample(res.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [sampleId]);

  if (loading) {
    return <div className="summary-card loading">Loading sample summary...</div>;
  }

  if (!sample) {
    return <div className="summary-card error">No data available.</div>;
  }

  return (
    <div className="summary-card">
      <div className="summary-header">
        <h3>Sample Summary</h3>
        {onClose && <button onClick={onClose}>✖</button>}
      </div>

      <div className="summary-body">
        <p><strong>ID:</strong> {sample.id}</p>
        <p><strong>Organism:</strong> {sample.organism}</p>
        <p><strong>Tissue:</strong> {sample.tissue}</p>
        <p><strong>Data Type:</strong> {sample.data_type}</p>
        <p><strong>Project:</strong> {sample.project?.name || "—"}</p>
        <p><strong>Created:</strong> {new Date(sample.created_at).toLocaleString()}</p>
      </div>

      {sample.files && sample.files.length > 0 && (
        <div className="summary-files">
          <h4>Uploaded Files</h4>
          <ul>
            {sample.files.map((f, i) => (
              <li key={i}>
                <span className="file-type">{f.file_type}</span>
                <a href={f.file} target="_blank" rel="noopener noreferrer">
                  {f.file.split("/").pop()}
                </a>
                <span className="file-date">{new Date(f.uploaded_at).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default SampleSummary;
