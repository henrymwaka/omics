// src/components/SampleDetailPage.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import SampleSummary from "./SampleSummary";
import { useToast } from "../context/ToastContext";

function SampleDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [sample, setSample] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/samples/${id}/`)
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => {
        setSample(data);
      })
      .catch(() => {
        showToast("Failed to load sample details.", "error");
      })
      .finally(() => setLoading(false));
  }, [id, showToast]);

  const runFastQC = () => {
    fetch(`/api/jobs/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sample: Number(id), job_type: "FASTQC" }),
    })
      .then((res) => {
        if (!res.ok) throw new Error();
        showToast("FASTQC job submitted.", "success");
      })
      .catch(() => showToast("Failed to submit FASTQC job.", "error"));
  };

  if (loading) {
    return (
      <div className="card p-6">
        <p>Loading sample...</p>
      </div>
    );
  }

  if (!sample) {
    return (
      <div className="card p-6">
        <p>Sample not found.</p>
        <button className="btn mt-3" onClick={() => navigate("/")}>
          Back to dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="card p-6">
      <div className="flex justify-between items-center mb-4">
        <h2>Sample: {sample.sample_id}</h2>
        <div className="flex gap-2">
          <button
            className="btn secondary"
            onClick={() => navigate(`/project/${sample.project}`)}
          >
            View project
          </button>
          <button className="btn" onClick={() => navigate("/")}>
            Dashboard
          </button>
        </div>
      </div>

      <SampleSummary sampleId={id} />

      <div className="mt-4 flex gap-2">
        <button className="btn primary" onClick={runFastQC}>
          Run FASTQC
        </button>
      </div>
    </div>
  );
}

export default SampleDetailPage;
