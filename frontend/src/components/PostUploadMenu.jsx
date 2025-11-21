// src/components/PostUploadMenu.jsx
import { useToast } from "../context/ToastContext";

function PostUploadMenu({ sampleId, projectId, onAddAnother }) {
  const { showToast } = useToast();

  const viewSample = () => {
    window.location.href = `/sample/${sampleId}`;
  };

  const viewProject = () => {
    window.location.href = `/project/${projectId}`;
  };

  const runFastQC = () => {
    fetch(`/api/jobs/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sample: sampleId,
        job_type: "FASTQC",
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error();
        showToast("FASTQC job submitted.", "success");
      })
      .catch(() => showToast("Failed to submit FASTQC job.", "error"));
  };

  return (
    <div className="card p-6">
      <h3>Sample and file uploaded successfully.</h3>

      <div className="mt-4 flex flex-col gap-3">
        <button onClick={onAddAnother} className="btn primary">
          Add another sample
        </button>

        <button onClick={viewSample} className="btn secondary">
          View this sample
        </button>

        <button onClick={viewProject} className="btn secondary">
          Return to project
        </button>

        <button onClick={runFastQC} className="btn secondary">
          Run FastQC
        </button>

        <button
          onClick={() => (window.location.href = "/")}
          className="btn secondary"
        >
          Go to dashboard
        </button>
      </div>
    </div>
  );
}

export default PostUploadMenu;
