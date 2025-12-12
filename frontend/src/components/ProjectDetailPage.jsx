// src/components/ProjectDetailPage.jsx

import { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";

import SampleWizard from "./SampleWizard.jsx";
import BulkSampleFastqUploader from "./BulkSampleFastqUploader.jsx";
import BulkSampleCsvImporter from "./BulkSampleCsvImporter.jsx";

/* -------------------------------------------------------------
   Helper utilities
------------------------------------------------------------- */
function stringToColor(str = "") {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 65%, 48%)`;
}

function dataTypeClass(dt = "") {
  const key = dt.toUpperCase();
  if (key === "DNA") return "chip chip-dna";
  if (key === "RNA") return "chip chip-rna";
  if (key === "META") return "chip chip-meta";
  if (key === "PROT") return "chip chip-prot";
  if (key === "METAB") return "chip chip-metab";
  return "chip chip-other";
}

function qcStatus(s = {}) {
  const v =
    s.qc_status ||
    s.fastqc_status ||
    s.multiqc_status ||
    "Unknown";
  const key = v.toUpperCase();

  if (key.includes("PASS")) return { text: "Pass", cls: "qc-badge qc-pass" };
  if (key.includes("WARN")) return { text: "Warn", cls: "qc-badge qc-warn" };
  if (key.includes("FAIL")) return { text: "Fail", cls: "qc-badge qc-fail" };
  return { text: "Unknown", cls: "qc-badge qc-unknown" };
}

/* -------------------------------------------------------------
   Analytics Components
------------------------------------------------------------- */
function QCDonut({ samples }) {
  const data = useMemo(() => {
    const counts = { pass: 0, warn: 0, fail: 0, unknown: 0 };
    samples.forEach((s) => {
      const q = qcStatus(s).text.toLowerCase();
      counts[q] = (counts[q] || 0) + 1;
    });
    return counts;
  }, [samples]);

  const total = Object.values(data).reduce((a, b) => a + b, 0);
  if (total === 0) {
    return (
      <div className="analytics-block">
        <h4 className="analytics-title">QC Overview</h4>
        <p className="text-gray-500 text-sm">No QC data</p>
      </div>
    );
  }

  const pct = (v) => (v / total) * 100;

  const segments = [
    { color: "#16a34a", value: pct(data.pass) },
    { color: "#eab308", value: pct(data.warn) },
    { color: "#dc2626", value: pct(data.fail) },
    { color: "#6b7280", value: pct(data.unknown) },
  ];

  let offset = 25;

  return (
    <div className="analytics-block">
      <h4 className="analytics-title">QC Overview</h4>

      <div className="qc-donut-wrapper">
        <svg width="140" height="140" viewBox="0 0 32 32">
          {segments.map((seg, i) => {
            const dash = (seg.value / 100) * 100;
            const gap = 100 - dash;

            const element = (
              <circle
                key={i}
                r="16"
                cx="16"
                cy="16"
                fill="transparent"
                stroke={seg.color}
                strokeWidth="6"
                strokeDasharray={`${dash} ${gap}`}
                strokeDashoffset={-offset}
              />
            );

            offset += dash;
            return element;
          })}
        </svg>

        <div className="qc-center">
          <div className="qc-center-value">{total}</div>
          <div className="qc-center-label">Samples</div>
        </div>
      </div>

      <div className="analytics-legend">
        <span><span className="legend-box" style={{ background: "#16a34a" }} /> Pass {data.pass}</span>
        <span><span className="legend-box" style={{ background: "#eab308" }} /> Warn {data.warn}</span>
        <span><span className="legend-box" style={{ background: "#dc2626" }} /> Fail {data.fail}</span>
        <span><span className="legend-box" style={{ background: "#6b7280" }} /> Unknown {data.unknown}</span>
      </div>
    </div>
  );
}

function BarChart({ title, data }) {
  const maxVal = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="analytics-block">
      <h4 className="analytics-title">{title}</h4>

      <div className="bar-chart">
        {data.map((d) => (
          <div key={d.label} className="bar-row">
            <span className="bar-label">{d.label}</span>

            <div className="bar-track">
              <div
                className="bar-fill"
                style={{
                  width: `${(d.count / maxVal) * 100}%`,
                  background: stringToColor(d.label),
                }}
              />
            </div>

            <span className="bar-count">{d.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProjectAnalytics({ samples }) {
  const typeData = useMemo(() => {
    const m = {};
    samples.forEach((s) => {
      const key = (s.data_type || "Unknown").toUpperCase();
      m[key] = (m[key] || 0) + 1;
    });
    return Object.entries(m).map(([label, count]) => ({ label, count }));
  }, [samples]);

  const organismData = useMemo(() => {
    const m = {};
    samples.forEach((s) => {
      const key = s.organism_name || "Unknown";
      m[key] = (m[key] || 0) + 1;
    });
    return Object.entries(m).map(([label, count]) => ({ label, count }));
  }, [samples]);

  return (
    <div className="card section-card analytics-panel">
      <h3>Project Analytics</h3>

      <div className="analytics-grid">
        <QCDonut samples={samples} />
        <BarChart title="Data Type Distribution" data={typeData} />
        <BarChart title="Organism Distribution" data={organismData} />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------
   MAIN COMPONENT
------------------------------------------------------------- */
export default function ProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ingestMode, setIngestMode] = useState("wizard");
  const [sampleView, setSampleView] = useState("table");

  const fetchProject = () => {
    setLoading(true);
    fetch(`/api/projects/${id}/`)
      .then((res) => res.json())
      .then((data) => setProject(data))
      .catch(() => setProject(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchProject();
  }, [id]);

  if (loading) return <div className="card p-6">Loading…</div>;

  if (!project) {
    return (
      <div className="card p-6">
        <p>Project not found.</p>
        <button className="btn mt-3" onClick={() => navigate("/projects")}>
          Back
        </button>
      </div>
    );
  }

  const samples = project.samples || [];

  const renderSampleCards = (items) => (
    <div className="project-sample-card-grid">
      {items.map((s) => {
        const label = s.organism_name || "Unknown";
        const letter = label.charAt(0).toUpperCase();
        const color = stringToColor(label);
        const qc = qcStatus(s);
        const hasFiles = s.files && s.files.length > 0;

        return (
          <div
            key={s.id}
            className="project-sample-card"
            onClick={() => navigate(`/sample/${s.id}`)}
          >
            <div className="psc-header">
              <div className="psc-idblock">
                <span className="organism-avatar" style={{ backgroundColor: color }}>
                  {letter}
                </span>
                <div>
                  <div className="psc-id">{s.sample_id}</div>
                  <div className="psc-sub">{label} · {s.data_type}</div>
                </div>
              </div>

              <span className={qc.cls}>{qc.text}</span>
            </div>

            <div className="psc-body">
              <div className="psc-row">
                <span className="psc-label">Tissue</span>{s.tissue_name || "—"}
              </div>

              <div className="psc-row">
                <span className="psc-label">Collected</span>{s.collected_on || "—"}
              </div>

              <div className="psc-row">
                <span className="psc-label">Created</span>{new Date(s.created_at).toLocaleDateString()}
              </div>

              <div className="psc-row">
                <span className="psc-label">Files</span>
                <span className={hasFiles ? "file-pill" : "file-pill file-pill-empty"}>
                  {hasFiles ? `${s.files.length} file${s.files.length > 1 ? "s" : ""}` : "None"}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="project-detail-layout">

      <div className="project-header-card">
        <div>
          <h1 className="project-title">{project.name}</h1>
          {project.description && (
            <p className="project-description">{project.description}</p>
          )}
          <p className="project-meta-info">
            Created: {new Date(project.created_at).toLocaleString()}
          </p>
        </div>

        <button className="btn" onClick={() => navigate("/projects")}>
          Back to Projects
        </button>
      </div>

      <div className="project-grid">

        {/* LEFT COLUMN */}
        <div className="left-column">

          <div className="card section-card">
            <h3>Sample Ingestion</h3>

            <div className="ingestion-tabs">
              <button
                type="button"
                aria-pressed={ingestMode === "wizard"}
                className={`tab-btn ${ingestMode === "wizard" ? "active" : ""}`}
                onClick={() => setIngestMode("wizard")}
              >
                Manual Wizard
              </button>

              <button
                type="button"
                aria-pressed={ingestMode === "fastq"}
                className={`tab-btn ${ingestMode === "fastq" ? "active" : ""}`}
                onClick={() => setIngestMode("fastq")}
              >
                Bulk FASTQ Upload
              </button>

              <button
                type="button"
                aria-pressed={ingestMode === "csv"}
                className={`tab-btn ${ingestMode === "csv" ? "active" : ""}`}
                onClick={() => setIngestMode("csv")}
              >
                Bulk CSV Import
              </button>
            </div>

            {ingestMode === "wizard" && (
              <SampleWizard projectId={project.id} onComplete={fetchProject} />
            )}

            {ingestMode === "fastq" && (
              <BulkSampleFastqUploader projectId={project.id} onComplete={fetchProject} />
            )}

            {ingestMode === "csv" && (
              <BulkSampleCsvImporter projectId={project.id} onComplete={fetchProject} />
            )}
          </div>

          <div className="card section-card">
            <h3>Project Tools</h3>
            <p className="text-sm text-gray-600">
              QC and pipeline tools for all samples.
            </p>

            <div className="tool-btn-group">
              <button className="btn small">Run FastQC (All)</button>
              <button className="btn small">Run MultiQC</button>
              <button className="btn small">Download QC Bundle</button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="right-column">

          <ProjectAnalytics samples={samples} />

          <div className="card section-card">
            <div className="psc-header-top">
              <h3>Samples in this project</h3>

              <div className="psc-view-toggle">
                <button
                  type="button"
                  className={sampleView === "table" ? "toggle-btn active" : "toggle-btn"}
                  onClick={() => setSampleView("table")}
                >
                  Table
                </button>

                <button
                  type="button"
                  className={sampleView === "cards" ? "toggle-btn active" : "toggle-btn"}
                  onClick={() => setSampleView("cards")}
                >
                  Cards
                </button>
              </div>
            </div>

            {samples.length === 0 ? (
              <p className="text-gray-600 mt-2">No samples yet.</p>
            ) : sampleView === "table" ? (
              <table className="summary-table project-samples-table mt-3">
                <thead>
                  <tr>
                    <th>Sample ID</th>
                    <th>Organism</th>
                    <th>Tissue</th>
                    <th>Type</th>
                    <th>QC</th>
                    <th>Files</th>
                    <th>Created</th>
                    <th></th>
                  </tr>
                </thead>

                <tbody>
                  {samples.map((s) => {
                    const label = s.organism_name || "Unknown";
                    const letter = label.charAt(0).toUpperCase();
                    const color = stringToColor(label);
                    const qc = qcStatus(s);
                    const dt = s.data_type || "";
                    const hasFiles = s.files && s.files.length > 0;

                    return (
                      <tr
                        key={s.id}
                        className="project-sample-row"
                        onClick={() => navigate(`/sample/${s.id}`)}
                      >
                        <td><span className="sample-id-text">{s.sample_id}</span></td>

                        <td>
                          <div className="cell-organism">
                            <span className="organism-avatar" style={{ backgroundColor: color }}>
                              {letter}
                            </span>
                            {label}
                          </div>
                        </td>

                        <td>{s.tissue_name || "—"}</td>
                        <td><span className={dataTypeClass(dt)}>{dt}</span></td>
                        <td><span className={qc.cls}>{qc.text}</span></td>

                        <td>
                          {hasFiles ? (
                            <span className="file-pill">
                              {s.files.length} file{s.files.length > 1 ? "s" : ""}
                            </span>
                          ) : (
                            <span className="file-pill file-pill-empty">None</span>
                          )}
                        </td>

                        <td>{new Date(s.created_at).toLocaleDateString()}</td>

                        <td>
                          <button
                            className="btn small"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/sample/${s.id}`);
                            }}
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              renderSampleCards(samples)
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
