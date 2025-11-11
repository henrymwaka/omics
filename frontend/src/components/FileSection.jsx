// frontend/src/components/FileSection.jsx
import { useState } from "react";
import "../App.css";

const FILE_TYPES = [
  { value: "FASTQ", label: "FASTQ reads" },
  { value: "BAM", label: "Aligned reads (BAM)" },
  { value: "VCF", label: "Variant calls (VCF)" },
  { value: "GFF", label: "Genome annotation (GFF)" },
  { value: "COUNTS", label: "Expression counts" },
  { value: "META", label: "Metadata table" },
  { value: "OTHER", label: "Other" },
];

function FileSection({
  selectedProject,
  samples,
  selectedSampleId,
  onSelectSampleId,
  files,
  onUploadFile,
}) {
  const [fileType, setFileType] = useState("FASTQ");
  const [fileObj, setFileObj] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedProject) return;
    if (!selectedSampleId) return;
    if (!fileObj) return;

    setUploading(true);
    try {
      await onUploadFile({
        sampleId: selectedSampleId,
        fileType,
        file: fileObj,
      });
      setFileObj(null);
      e.target.reset();
    } finally {
      setUploading(false);
    }
  };

  const hasSamples = samples && samples.length > 0;

  return (
    <section className="card">
      <h2>Files</h2>

      {!selectedProject ? (
        <p className="muted">Select a project to manage files.</p>
      ) : !hasSamples ? (
        <p className="muted">
          No samples for this project yet. Add samples before uploading files.
        </p>
      ) : (
        <>
          <div className="filters-row">
            <select
              value={selectedSampleId || ""}
              onChange={(e) => onSelectSampleId(e.target.value || null)}
            >
              <option value="">Select sample</option>
              {samples.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.sample_id} - {s.organism}
                </option>
              ))}
            </select>
          </div>

          {/* File list */}
          {selectedSampleId ? (
            <>
              <table className="table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Path</th>
                    <th>Uploaded</th>
                    <th>Size (bytes)</th>
                  </tr>
                </thead>
                <tbody>
                  {files.map((f) => (
                    <tr key={f.id}>
                      <td>{f.file_type}</td>
                      <td>
                        <a href={f.file} target="_blank" rel="noreferrer">
                          {f.file}
                        </a>
                      </td>
                      <td>{new Date(f.uploaded_at).toLocaleString()}</td>
                      <td>{f.size_bytes}</td>
                    </tr>
                  ))}
                  {files.length === 0 && (
                    <tr>
                      <td colSpan="4" className="muted">
                        No files for this sample yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Upload form */}
              <div className="new-file-form">
                <h3>Upload file</h3>
                <form onSubmit={handleSubmit}>
                  <div className="form-grid">
                    <label>
                      File type
                      <select
                        value={fileType}
                        onChange={(e) => setFileType(e.target.value)}
                      >
                        {FILE_TYPES.map((ft) => (
                          <option key={ft.value} value={ft.value}>
                            {ft.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      File
                      <input
                        type="file"
                        onChange={(e) => setFileObj(e.target.files[0] || null)}
                        required
                      />
                    </label>
                  </div>
                  <button
                    type="submit"
                    className="btn primary"
                    disabled={uploading}
                  >
                    {uploading ? "Uploading..." : "Upload file"}
                  </button>
                </form>
              </div>
            </>
          ) : (
            <p className="muted">Select a sample to view and upload files.</p>
          )}
        </>
      )}
    </section>
  );
}

export default FileSection;
