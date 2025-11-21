/* =============================================================================
   Dashboard.jsx
   ResLab Omics Platform
   =============================================================================
   Responsibilities:
   - Fetch and list all projects
   - Fetch samples for a selected project
   - Display files attached to each sample
   - Create new projects
   - Edit and soft delete projects
   - Edit and soft delete samples
   - View and restore items from trash
   - Upload files to a sample (click or drag and drop)
   - Trigger and view FastQC jobs
   - Display QC summary and job history
   - Track job status per sample and auto poll while running
   - Persist QC status after refresh by hydrating from backend
   ============================================================================= */

import { useEffect, useMemo, useState } from "react";
import "../App.css";
import { useToast } from "../context/ToastContext";

const API_BASE = "/api";

function Dashboard() {
  const { showToast } = useToast();

  // Core state
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);

  const [samples, setSamples] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [uploadingSampleId, setUploadingSampleId] = useState(null);
  const [dragOverSampleId, setDragOverSampleId] = useState(null);

  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");

  // FastQC state
  const [qcInfo, setQcInfo] = useState(null);
  const [qcLoading, setQcLoading] = useState(false);
  const [qcMap, setQcMap] = useState({});
  const [qcMetaMap, setQcMetaMap] = useState({});
  const [jobHistory, setJobHistory] = useState([]);
  const [jobHistoryLoading, setJobHistoryLoading] = useState(false);
  const [jobStatusMap, setJobStatusMap] = useState({}); // sampleId -> job_status

  // Soft delete trash state
  const [projectTrash, setProjectTrash] = useState([]);
  const [sampleTrash, setSampleTrash] = useState([]);
  const [trashLoading, setTrashLoading] = useState(false);
  const [trashError, setTrashError] = useState("");

  // Edit state
  const [editingProject, setEditingProject] = useState(null);
  const [editingSample, setEditingSample] = useState(null);
  const [editSaving, setEditSaving] = useState(false);

  // Vocab for sample edit
  const [organisms, setOrganisms] = useState([]);
  const [tissues, setTissues] = useState([]);
  const [vocabError, setVocabError] = useState("");

  // ---------------------------------------------------------------------------
  // Helper: derive overall QC status from FastQC JSON
  // ---------------------------------------------------------------------------

  const deriveOverallFromFastqc = (fastqcData) => {
    if (fastqcData.overall_status && fastqcData.overall_status !== "UNKNOWN") {
      return fastqcData.overall_status;
    }

    const summary = Array.isArray(fastqcData.summary)
      ? fastqcData.summary
      : [];

    if (summary.length === 0) {
      return null;
    }

    const hasFail = summary.some((row) => row.status === "FAIL");
    const hasWarn = summary.some((row) => row.status === "WARN");
    const hasPass = summary.some((row) => row.status === "PASS");

    if (hasFail) return "FAIL";
    if (hasWarn) return "WARN";
    if (hasPass) return "PASS";
    return null;
  };

  // ---------------------------------------------------------------------------
  // Initial loads
  // ---------------------------------------------------------------------------

  const fetchProjects = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE}/projects/`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setProjects(data);
    } catch (e) {
      setError("Failed to load projects.");
      console.error("PROJECT LOAD ERROR:", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchSamples = async (projectId) => {
    if (!projectId) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE}/samples/?project=${projectId}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      const filtered = data.filter((s) => s.project === projectId);
      setSamples(filtered);

      await hydrateQcForSamples(filtered);
    } catch (e) {
      console.error("SAMPLE LOAD ERROR:", e);
      setError("Failed to load samples for this project.");
    } finally {
      setLoading(false);
    }
  };

  const hydrateQcForSamples = async (sampleList) => {
    if (!sampleList || sampleList.length === 0) {
      setQcMap({});
      setQcMetaMap({});
      setJobStatusMap({});
      return;
    }

    const newQcMap = {};
    const newMetaMap = {};
    const newJobStatusMap = {};

    for (const s of sampleList) {
      try {
        const fastqcUrl = `${API_BASE}/samples/${s.id}/fastqc/`;
        const res = await fetch(fastqcUrl, { credentials: "include" });

        if (res.status === 404) continue;
        if (!res.ok) {
          console.warn("FASTQC HYDRATE ERROR:", await res.text());
          continue;
        }

        const fastqcData = await res.json();
        const overall = deriveOverallFromFastqc(fastqcData);
        const generatedOn = fastqcData.generated_on || null;
        const jobStatus = fastqcData.job_status || null;

        if (overall) newQcMap[s.id] = overall;
        newMetaMap[s.id] = {
          overallStatus: overall,
          generatedOn,
        };
        if (jobStatus) newJobStatusMap[s.id] = jobStatus;
      } catch (err) {
        console.error("FASTQC HYDRATE EXCEPTION:", err);
      }
    }

    setQcMap(newQcMap);
    setQcMetaMap(newMetaMap);
    setJobStatusMap(newJobStatusMap);
  };

  const fetchTrash = async () => {
    setTrashLoading(true);
    setTrashError("");

    try {
      const [projRes, sampRes] = await Promise.all([
        fetch(`${API_BASE}/projects/trash/`, { credentials: "include" }),
        fetch(`${API_BASE}/samples/trash/`, { credentials: "include" }),
      ]);

      if (!projRes.ok) {
        console.warn("TRASH PROJECTS ERROR:", await projRes.text());
      } else {
        const projData = await projRes.json();
        setProjectTrash(projData);
      }

      if (!sampRes.ok) {
        console.warn("TRASH SAMPLES ERROR:", await sampRes.text());
      } else {
        const sampData = await sampRes.json();
        setSampleTrash(sampData);
      }
    } catch (e) {
      console.error("TRASH LOAD ERROR:", e);
      setTrashError("Failed to load trash items.");
    } finally {
      setTrashLoading(false);
    }
  };

  const fetchVocab = async () => {
    try {
      const [orgRes, tissueRes] = await Promise.all([
        fetch(`${API_BASE}/organisms/`, { credentials: "include" }),
        fetch(`${API_BASE}/tissues/`, { credentials: "include" }),
      ]);

      if (orgRes.ok) {
        const orgData = await orgRes.json();
        setOrganisms(orgData);
      } else {
        console.warn("ORGANISM LOAD ERROR:", await orgRes.text());
      }

      if (tissueRes.ok) {
        const tissueData = await tissueRes.json();
        setTissues(tissueData);
      } else {
        console.warn("TISSUE LOAD ERROR:", await tissueRes.text());
      }
    } catch (e) {
      console.error("VOCAB LOAD ERROR:", e);
      setVocabError("Failed to load organism or tissue vocab.");
    }
  };

  useEffect(() => {
    fetchProjects();
    fetchVocab();
  }, []);

  // ---------------------------------------------------------------------------
  // Summary statistics for top cards
  // ---------------------------------------------------------------------------

  const stats = useMemo(() => {
    const totalProjects = projects.length;
    const totalSamples = samples.length;
    const totalFiles = samples.reduce((sum, s) => {
      return sum + (Array.isArray(s.files) ? s.files.length : 0);
    }, 0);

    let passCount = 0;
    let warnCount = 0;
    let failCount = 0;
    let runningJobs = 0;

    samples.forEach((s) => {
      const qcStatus = qcMap[s.id];
      if (qcStatus === "PASS") passCount += 1;
      else if (qcStatus === "WARN") warnCount += 1;
      else if (qcStatus === "FAIL") failCount += 1;

      const js = jobStatusMap[s.id];
      if (js === "running") runningJobs += 1;
    });

    return {
      totalProjects,
      totalSamples,
      totalFiles,
      passCount,
      warnCount,
      failCount,
      runningJobs,
    };
  }, [projects, samples, qcMap, jobStatusMap]);

  // ---------------------------------------------------------------------------
  // Project operations
  // ---------------------------------------------------------------------------

  const handleSelectProject = (project) => {
    setSelectedProject(project);
    setSamples([]);
    setQcInfo(null);
    setQcMap({});
    setQcMetaMap({});
    setJobHistory([]);
    setJobStatusMap({});
    fetchSamples(project.id);
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();

    if (!newProjectName.trim()) {
      setError("Project name is required.");
      return;
    }

    setError("");

    try {
      const res = await fetch(`${API_BASE}/projects/`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newProjectName.trim(),
          description: newProjectDescription.trim(),
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      setNewProjectName("");
      setNewProjectDescription("");
      await fetchProjects();
      showToast("Project created.", "success");
    } catch (e) {
      console.error("PROJECT CREATE ERROR:", e);
      setError("Failed to create project.");
    }
  };

  const handleDeleteProject = async (project) => {
    const confirmed = window.confirm(
      `Move project "${project.name}" and its samples to trash?`,
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`${API_BASE}/projects/${project.id}/`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      showToast("Project moved to trash.", "success");
      await fetchProjects();
      await fetchTrash();

      if (selectedProject && selectedProject.id === project.id) {
        setSelectedProject(null);
        setSamples([]);
        setQcInfo(null);
        setQcMap({});
        setQcMetaMap({});
        setJobHistory([]);
        setJobStatusMap({});
      }
    } catch (e) {
      console.error("PROJECT DELETE ERROR:", e);
      setError("Failed to delete project.");
      showToast("Failed to delete project.", "error");
    }
  };

  const openEditProject = (project) => {
    setEditingProject({
      id: project.id,
      name: project.name || "",
      description: project.description || "",
    });
  };

  const handleSaveProjectEdit = async () => {
    if (!editingProject) return;

    const payload = {
      name: editingProject.name.trim(),
      description: editingProject.description.trim(),
    };

    if (!payload.name) {
      showToast("Project name cannot be empty.", "error");
      return;
    }

    setEditSaving(true);

    try {
      const res = await fetch(
        `${API_BASE}/projects/${editingProject.id}/`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      if (!res.ok) {
        console.error("PROJECT EDIT ERROR:", await res.text());
        showToast("Failed to update project.", "error");
        return;
      }

      showToast("Project updated.", "success");
      setEditingProject(null);
      await fetchProjects();

      if (selectedProject && selectedProject.id === editingProject.id) {
        setSelectedProject((prev) =>
          prev
            ? {
                ...prev,
                name: payload.name,
                description: payload.description,
              }
            : prev,
        );
      }
    } catch (e) {
      console.error("PROJECT EDIT EXCEPTION:", e);
      showToast("Failed to update project.", "error");
    } finally {
      setEditSaving(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Sample operations
  // ---------------------------------------------------------------------------

  const uploadFileForSample = async (file, sampleId, fileType) => {
    if (!file || !selectedProject) return;

    setUploadingSampleId(sampleId);
    setError("");

    try {
      const formData = new FormData();
      formData.append("sample", sampleId);
      formData.append("file_type", fileType);
      formData.append("file", file);

      const res = await fetch(`${API_BASE}/files/`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      await fetchSamples(selectedProject.id);
      showToast("File uploaded.", "success");
    } catch (e) {
      console.error("FILE UPLOAD ERROR:", e);
      setError("Failed to upload file.");
      showToast("File upload failed.", "error");
    } finally {
      setUploadingSampleId(null);
    }
  };

  const handleUploadFile = async (e, sampleId, fileType) => {
    const file = e.target.files[0];
    if (!file) return;
    await uploadFileForSample(file, sampleId, fileType);
    e.target.value = "";
  };

  const handleDropFile = async (event, sampleId) => {
    event.preventDefault();
    event.stopPropagation();
    setDragOverSampleId(null);

    const files = event.dataTransfer?.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    await uploadFileForSample(file, sampleId, "FASTQ");
  };

  const handleDragOver = (event, sampleId) => {
    event.preventDefault();
    event.stopPropagation();
    setDragOverSampleId(sampleId);
  };

  const handleDragLeave = (event, sampleId) => {
    event.preventDefault();
    event.stopPropagation();
    if (dragOverSampleId === sampleId) {
      setDragOverSampleId(null);
    }
  };

  const handleDeleteSample = async (sample) => {
    const confirmed = window.confirm(
      `Move sample "${sample.sample_id}" to trash?`,
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`${API_BASE}/samples/${sample.id}/`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      showToast("Sample moved to trash.", "success");

      if (selectedProject) {
        await fetchSamples(selectedProject.id);
      }
      await fetchTrash();
    } catch (e) {
      console.error("SAMPLE DELETE ERROR:", e);
      setError("Failed to delete sample.");
      showToast("Failed to delete sample.", "error");
    }
  };

  const openEditSample = (sample) => {
    setEditingSample({
      id: sample.id,
      sample_id: sample.sample_id || "",
      data_type: sample.data_type || "DNA",
      collected_on: sample.collected_on || "",
      organism: sample.organism ? String(sample.organism) : "",
      tissue_type: sample.tissue_type ? String(sample.tissue_type) : "",
    });
  };

  const handleSaveSampleEdit = async () => {
    if (!editingSample) return;

    const payload = {
      sample_id: editingSample.sample_id.trim(),
      data_type: editingSample.data_type,
      collected_on:
        editingSample.collected_on && editingSample.collected_on !== ""
          ? editingSample.collected_on
          : null,
      organism:
        editingSample.organism && editingSample.organism !== ""
          ? Number(editingSample.organism)
          : null,
      tissue_type:
        editingSample.tissue_type && editingSample.tissue_type !== ""
          ? Number(editingSample.tissue_type)
          : null,
    };

    if (!payload.sample_id) {
      showToast("Sample ID cannot be empty.", "error");
      return;
    }

    setEditSaving(true);

    try {
      const res = await fetch(
        `${API_BASE}/samples/${editingSample.id}/`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      if (!res.ok) {
        console.error("SAMPLE EDIT ERROR:", await res.text());
        showToast("Failed to update sample.", "error");
        return;
      }

      showToast("Sample updated.", "success");
      setEditingSample(null);

      if (selectedProject) {
        await fetchSamples(selectedProject.id);
      }
    } catch (e) {
      console.error("SAMPLE EDIT EXCEPTION:", e);
      showToast("Failed to update sample.", "error");
    } finally {
      setEditSaving(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Restore operations
  // ---------------------------------------------------------------------------

  const handleRestoreProject = async (projectId) => {
    try {
      const res = await fetch(
        `${API_BASE}/projects/${projectId}/restore/`,
        {
          method: "POST",
          credentials: "include",
        },
      );

      if (!res.ok) {
        console.error("RESTORE PROJECT ERROR:", await res.text());
        showToast("Failed to restore project.", "error");
        return;
      }

      showToast("Project restored.", "success");
      await fetchProjects();
      await fetchTrash();
    } catch (e) {
      console.error("RESTORE PROJECT EXCEPTION:", e);
      showToast("Failed to restore project.", "error");
    }
  };

  const handleRestoreSample = async (sampleId) => {
    try {
      const res = await fetch(
        `${API_BASE}/samples/${sampleId}/restore/`,
        {
          method: "POST",
          credentials: "include",
        },
      );

      if (!res.ok) {
        console.error("RESTORE SAMPLE ERROR:", await res.text());
        showToast("Failed to restore sample.", "error");
        return;
      }

      showToast("Sample restored.", "success");
      await fetchTrash();

      if (selectedProject) {
        await fetchSamples(selectedProject.id);
      }
    } catch (e) {
      console.error("RESTORE SAMPLE EXCEPTION:", e);
      showToast("Failed to restore sample.", "error");
    }
  };

  // ---------------------------------------------------------------------------
  // FastQC operations
  // ---------------------------------------------------------------------------

  const handleRunFastqc = async (sample) => {
    const sampleId = sample.id;
    try {
      const createPayload = {
        sample: sampleId,
        job_type: "FASTQC",
        status: "pending",
      };

      const createRes = await fetch(`${API_BASE}/jobs/`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createPayload),
      });

      if (!createRes.ok) {
        console.error("FASTQC CREATE ERROR:", await createRes.text());
        showToast("Could not create FastQC job.", "error");
        return;
      }

      const job = await createRes.json();

      const triggerRes = await fetch(
        `${API_BASE}/jobs/${job.id}/trigger_fastqc/`,
        {
          method: "POST",
          credentials: "include",
        },
      );

      if (!triggerRes.ok) {
        console.error("FASTQC TRIGGER ERROR:", await triggerRes.text());
        showToast("FastQC job created but could not be started.", "error");
        return;
      }

      setJobStatusMap((prev) => ({
        ...prev,
        [sampleId]: "running",
      }));

      setQcInfo((current) => {
        if (current && current.sampleId && current.sampleId !== sampleId) {
          return current;
        }
        return {
          sampleId,
          sampleName: sample.sample_id,
          htmlReport: null,
          zipDownload: null,
          generatedOn: null,
          overallStatus: null,
          jobId: job.id,
          jobStatus: "running",
          summary: [],
        };
      });

      showToast(`FastQC job ${job.id} started.`, "success");
    } catch (e) {
      console.error("FASTQC ERROR:", e);
      showToast("Could not start FastQC job.", "error");
    }
  };

  const handleViewFastqc = async (sample) => {
    setQcLoading(true);
    setJobHistoryLoading(true);
    setQcInfo(null);

    try {
      const fastqcUrl = `${API_BASE}/samples/${sample.id}/fastqc/`;
      const jobsUrl = `${API_BASE}/samples/${sample.id}/jobs/`;

      const [fastqcRes, jobsRes] = await Promise.all([
        fetch(fastqcUrl, { credentials: "include" }),
        fetch(jobsUrl, { credentials: "include" }),
      ]);

      if (fastqcRes.status === 404) {
        showToast("No FastQC results found for this sample.", "info");
        setQcLoading(false);
        setJobHistoryLoading(false);
        setJobHistory([]);
        return;
      }

      if (!fastqcRes.ok) {
        console.error("FASTQC SUMMARY ERROR:", await fastqcRes.text());
        showToast("Failed to load FastQC summary.", "error");
        setQcLoading(false);
        setJobHistoryLoading(false);
        return;
      }

      const fastqcData = await fastqcRes.json();
      let jobs = [];
      if (jobsRes.ok) {
        jobs = await jobsRes.json();
      } else {
        console.warn("JOB HISTORY ERROR:", await jobsRes.text());
      }

      const overall = deriveOverallFromFastqc(fastqcData);
      const generatedOn = fastqcData.generated_on || null;
      const js = fastqcData.job_status || "completed";

      setQcMap((prev) => ({
        ...prev,
        [sample.id]: overall || prev[sample.id] || null,
      }));

      setQcMetaMap((prev) => ({
        ...prev,
        [sample.id]: {
          overallStatus: overall,
          generatedOn,
        },
      }));

      setJobStatusMap((prev) => ({
        ...prev,
        [sample.id]: js || prev[sample.id] || "completed",
      }));

      setQcInfo({
        sampleId: fastqcData.sample_id,
        sampleName: fastqcData.sample_name,
        htmlReport: fastqcData.html_report,
        zipDownload: fastqcData.zip_download,
        generatedOn,
        overallStatus: overall,
        jobId: fastqcData.job_id,
        jobStatus: js,
        summary: Array.isArray(fastqcData.summary) ? fastqcData.summary : [],
      });

      setJobHistory(jobs);
    } catch (e) {
      console.error("FASTQC VIEW ERROR:", e);
      showToast("Failed to load FastQC details.", "error");
    } finally {
      setQcLoading(false);
      setJobHistoryLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Auto polling while jobs are running
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const runningSampleIds = Object.entries(jobStatusMap)
      .filter(([, status]) => status === "running")
      .map(([sampleId]) => Number(sampleId));

    if (runningSampleIds.length === 0) {
      return;
    }

    const intervalId = setInterval(async () => {
      try {
        for (const sampleId of runningSampleIds) {
          const fastqcUrl = `${API_BASE}/samples/${sampleId}/fastqc/`;
          const res = await fetch(fastqcUrl, { credentials: "include" });

          if (res.status === 404) {
            continue;
          }

          if (!res.ok) {
            console.warn("FASTQC POLL ERROR:", await res.text());
            continue;
          }

          const fastqcData = await res.json();
          const newJobStatus = fastqcData.job_status || "completed";
          const overall = deriveOverallFromFastqc(fastqcData);
          const generatedOn = fastqcData.generated_on || null;

          if (newJobStatus && newJobStatus !== "running") {
            setJobStatusMap((prev) => ({
              ...prev,
              [sampleId]: newJobStatus,
            }));

            setQcMap((prev) => ({
              ...prev,
              [sampleId]: overall || prev[sampleId] || null,
            }));

            setQcMetaMap((prev) => ({
              ...prev,
              [sampleId]: {
                overallStatus: overall,
                generatedOn,
              },
            }));

            setQcInfo((current) => {
              if (!current || current.sampleId !== sampleId) {
                return current;
              }
              return {
                ...current,
                overallStatus: overall || current.overallStatus,
                jobStatus: newJobStatus,
                generatedOn: generatedOn || current.generatedOn,
              };
            });
          }
        }
      } catch (err) {
        console.error("FASTQC POLL EXCEPTION:", err);
      }
    }, 5000);

    return () => clearInterval(intervalId);
  }, [jobStatusMap]);

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  const renderQcBadge = (sampleId) => {
    const status = qcMap[sampleId];

    if (!status || status === "UNKNOWN") {
      return (
        <span className="muted" style={{ fontSize: "0.75rem" }}>
          No QC result yet
        </span>
      );
    }

    const badgeBase = {
      padding: "0.15rem 0.4rem",
      borderRadius: "999px",
      fontSize: "0.7rem",
      fontWeight: 600,
      color: "white",
    };

    let bg = "#6b7280";
    if (status === "PASS") bg = "#16a34a";
    else if (status === "WARN") bg = "#f97316";
    else if (status === "FAIL") bg = "#dc2626";

    return <span style={{ ...badgeBase, backgroundColor: bg }}>{status}</span>;
  };

  const renderJobStatusPill = (sampleId) => {
    const status = jobStatusMap[sampleId];
    if (!status) return null;

    const baseStyle = {
      padding: "0.15rem 0.5rem",
      borderRadius: "999px",
      fontSize: "0.7rem",
      fontWeight: 500,
      color: "white",
      display: "inline-block",
    };

    let bg = "#6b7280";
    let label = status;

    if (status === "pending") {
      bg = "#6b7280";
      label = "Pending";
    } else if (status === "running") {
      bg = "#0284c7";
      label = "Running";
    } else if (status === "completed") {
      bg = "#16a34a";
      label = "Completed";
    } else if (status === "failed") {
      bg = "#dc2626";
      label = "Failed";
    }

    return <span style={{ ...baseStyle, backgroundColor: bg }}>{label}</span>;
  };

  const uploadZoneStyle = (sampleId) => {
    const base = {
      border: "1px dashed #d1d5db",
      borderRadius: "999px",
      padding: "0.25rem 0.75rem",
      fontSize: "0.75rem",
      cursor: "pointer",
      display: "inline-flex",
      alignItems: "center",
      gap: "0.35rem",
      backgroundColor: "#f9fafb",
      transition: "background-color 0.15s, border-color 0.15s",
      whiteSpace: "nowrap",
    };

    if (dragOverSampleId === sampleId) {
      return {
        ...base,
        borderColor: "#0ea5e9",
        backgroundColor: "#e0f2fe",
      };
    }
    return base;
  };

  const modalBackdropStyle = {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(15,23,42,0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 50,
  };

  const modalStyle = {
    backgroundColor: "white",
    borderRadius: "0.75rem",
    padding: "1.5rem",
    maxWidth: "480px",
    width: "100%",
    boxShadow: "0 10px 40px rgba(15,23,42,0.35)",
  };

  // ---------------------------------------------------------------------------
  // Render UI
  // ---------------------------------------------------------------------------

  return (
    <div className="dash-root">
      {error && <div className="alert error">{error}</div>}
      {loading && <div className="alert info">Loading…</div>}
      {vocabError && <div className="alert error">{vocabError}</div>}

      <section className="dash-summary-strip">
        <div className="dash-summary-card">
          <span className="dash-summary-label">Projects</span>
          <span className="dash-summary-value">{stats.totalProjects}</span>
        </div>

        <div className="dash-summary-card">
          <span className="dash-summary-label">Samples in view</span>
          <span className="dash-summary-value">{stats.totalSamples}</span>
        </div>

        <div className="dash-summary-card">
          <span className="dash-summary-label">Files in view</span>
          <span className="dash-summary-value">{stats.totalFiles}</span>
        </div>

        <div className="dash-summary-card">
          <span className="dash-summary-label">QC PASS / WARN / FAIL</span>
          <span className="dash-summary-value">
            {stats.passCount} / {stats.warnCount} / {stats.failCount}
          </span>
        </div>

        <div className="dash-summary-card">
          <span className="dash-summary-label">Jobs running</span>
          <span className="dash-summary-value">{stats.runningJobs}</span>
        </div>
      </section>

      <section className="dash-columns">
        {/* Left column: projects, create, trash */}
        <div className="dash-column-left">
          <div className="card">
            <div className="card-header-row">
              <h2>Projects</h2>
              <button
                className="btn small"
                type="button"
                onClick={fetchProjects}
              >
                Refresh
              </button>
            </div>

            <ul className="project-list">
              {projects.map((p) => (
                <li
                  key={p.id}
                  className={
                    selectedProject?.id === p.id
                      ? "project-item active"
                      : "project-item"
                  }
                  onClick={() => handleSelectProject(p)}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <div>
                      <div className="project-name">{p.name}</div>
                      {p.description && (
                        <div className="project-desc">{p.description}</div>
                      )}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.25rem",
                      }}
                    >
                      <button
                        type="button"
                        className="btn small"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditProject(p);
                        }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteProject(p);
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </li>
              ))}

              {projects.length === 0 && (
                <li className="project-empty">No projects yet.</li>
              )}
            </ul>
          </div>

          <div className="card mt-4">
            <h3>Create project</h3>

            <form onSubmit={handleCreateProject} className="project-form">
              <label>Name</label>
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="e.g., Banana RNA seq"
              />

              <label>Description</label>
              <textarea
                value={newProjectDescription}
                onChange={(e) => setNewProjectDescription(e.target.value)}
                placeholder="Optional description"
              />

              <button type="submit" className="btn primary mt-2">
                Save project
              </button>
            </form>
          </div>

          <div className="card mt-4">
            <div className="card-header-row">
              <h3>Trash</h3>
              <button
                className="btn small"
                type="button"
                onClick={fetchTrash}
              >
                Refresh
              </button>
            </div>

            {trashError && <p className="alert error">{trashError}</p>}
            {trashLoading && <p className="muted">Loading trash…</p>}

            {!trashLoading &&
              projectTrash.length === 0 &&
              sampleTrash.length === 0 && (
                <p className="muted">Trash is empty.</p>
              )}

            {!trashLoading && projectTrash.length > 0 && (
              <>
                <h4>Projects</h4>
                <ul className="project-list">
                  {projectTrash.map((p) => (
                    <li key={p.id} className="project-item">
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: "0.5rem",
                        }}
                      >
                        <div>
                          <div className="project-name">{p.name}</div>
                          {p.description && (
                            <div className="project-desc">{p.description}</div>
                          )}
                        </div>
                        <button
                          type="button"
                          className="btn small"
                          onClick={() => handleRestoreProject(p.id)}
                        >
                          Restore
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {!trashLoading && sampleTrash.length > 0 && (
              <>
                <h4>Samples</h4>
                <ul className="project-list">
                  {sampleTrash.map((s) => (
                    <li key={s.id} className="project-item">
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: "0.5rem",
                        }}
                      >
                        <div className="project-name">{s.sample_id}</div>
                        <button
                          type="button"
                          className="btn small"
                          onClick={() => handleRestoreSample(s.id)}
                        >
                          Restore
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>

        {/* Right column: samples table and QC panel */}
        <div className="dash-column-right">
          <div className="card">
            <div className="card-header-row">
              <div>
                <h2>
                  {selectedProject
                    ? selectedProject.name
                    : "No project selected"}
                </h2>
                {selectedProject?.description && (
                  <p className="muted">{selectedProject.description}</p>
                )}
              </div>
            </div>

            {!selectedProject && (
              <p className="muted">
                Select a project on the left to see its samples and files.
              </p>
            )}

            {selectedProject && (
              <div className="sample-table-wrapper">
                <table className="sample-table">
                  <thead>
                    <tr>
                      <th>Sample ID</th>
                      <th>Organism</th>
                      <th>Tissue</th>
                      <th>Data type</th>
                      <th>Files</th>
                      <th>Last QC</th>
                      <th>Upload</th>
                      <th>QC</th>
                      <th>Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {samples.map((s) => {
                      const isRunning = jobStatusMap[s.id] === "running";
                      const qcMeta = qcMetaMap[s.id] || {};
                      const qcStatus = qcMap[s.id];

                      let rowClass = "";
                      if (isRunning) {
                        rowClass = "row-running";
                      } else if (qcStatus === "FAIL") {
                        rowClass = "row-fail";
                      } else if (qcStatus === "WARN") {
                        rowClass = "row-warn";
                      } else if (qcStatus === "PASS") {
                        rowClass = "row-pass";
                      }

                      return (
                        <tr key={s.id} className={rowClass}>
                          <td>{s.sample_id}</td>
                          <td>{s.organism_name || "Unspecified"}</td>
                          <td>{s.tissue_type_name || "Unspecified"}</td>
                          <td>{s.data_type}</td>

                          <td>
                            {s.files && s.files.length > 0 ? (
                              <ul className="file-list-compact">
                                {s.files.map((f) => (
                                  <li key={f.id}>
                                    {f.file_type}{" "}
                                    <small className="muted">
                                      (
                                      {new Date(
                                        f.uploaded_at,
                                      ).toLocaleString()}
                                      )
                                    </small>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <span className="muted">None</span>
                            )}
                          </td>

                          <td>
                            {qcMeta.generatedOn ? (
                              <span style={{ fontSize: "0.75rem" }}>
                                {new Date(
                                  qcMeta.generatedOn,
                                ).toLocaleString()}
                              </span>
                            ) : (
                              <span
                                className="muted"
                                style={{ fontSize: "0.75rem" }}
                              >
                                No QC yet
                              </span>
                            )}
                          </td>

                          <td>
                            <div
                              style={uploadZoneStyle(s.id)}
                              onDragOver={(e) => handleDragOver(e, s.id)}
                              onDragLeave={(e) => handleDragLeave(e, s.id)}
                              onDrop={(e) => handleDropFile(e, s.id)}
                              onClick={() => {
                                const input = document.getElementById(
                                  `file-input-${s.id}`,
                                );
                                if (input) input.click();
                              }}
                            >
                              <span
                                style={{
                                  fontSize: "0.75rem",
                                  fontWeight: 500,
                                }}
                              >
                                {uploadingSampleId === s.id
                                  ? "Uploading…"
                                  : "Add FASTQ"}
                              </span>
                              <span
                                style={{
                                  fontSize: "0.7rem",
                                  color: "#6b7280",
                                }}
                              >
                                (click or drop)
                              </span>
                              <input
                                id={`file-input-${s.id}`}
                                type="file"
                                accept=".fastq,.fq,.fastq.gz,.fq.gz"
                                style={{ display: "none" }}
                                onChange={(e) =>
                                  handleUploadFile(e, s.id, "FASTQ")
                                }
                              />
                            </div>
                          </td>

                          <td>
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "0.25rem",
                              }}
                            >
                              <div style={{ display: "flex", gap: "0.25rem" }}>
                                {renderQcBadge(s.id)}
                                {renderJobStatusPill(s.id)}
                              </div>

                              <div
                                style={{
                                  display: "flex",
                                  gap: "0.25rem",
                                  flexWrap: "wrap",
                                }}
                              >
                                <button
                                  type="button"
                                  className="btn small"
                                  onClick={() => handleRunFastqc(s)}
                                  disabled={isRunning}
                                >
                                  {isRunning ? "Running…" : "Run FastQC"}
                                </button>

                                <button
                                  type="button"
                                  className="btn small"
                                  onClick={() => handleViewFastqc(s)}
                                >
                                  View QC
                                </button>
                              </div>
                            </div>
                          </td>

                          <td>
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "0.25rem",
                              }}
                            >
                              <button
                                type="button"
                                className="btn small"
                                onClick={() => openEditSample(s)}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="btn small"
                                onClick={() => handleDeleteSample(s)}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {selectedProject && samples.length === 0 && (
                      <tr>
                        <td colSpan={9} className="muted">
                          No samples yet for this project.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {qcInfo && (
            <div className="card mt-4">
              <div className="card-header-row">
                <h3>
                  FastQC summary for {qcInfo.sampleName}{" "}
                  {qcInfo.sampleId &&
                    qcInfo.overallStatus &&
                    qcInfo.overallStatus !== "UNKNOWN" && (
                      <span style={{ marginLeft: "0.5rem" }}>
                        {renderQcBadge(qcInfo.sampleId)}
                      </span>
                    )}
                  {qcInfo.sampleId && (
                    <span style={{ marginLeft: "0.5rem" }}>
                      {renderJobStatusPill(qcInfo.sampleId)}
                    </span>
                  )}
                </h3>
              </div>

              {qcLoading ? (
                <p className="muted">Loading QC details…</p>
              ) : (
                <>
                  <p className="muted">
                    Generated on{" "}
                    {qcInfo.generatedOn
                      ? new Date(qcInfo.generatedOn).toLocaleString()
                      : "not available yet"}
                    {qcInfo.jobId && (
                      <>
                        {" "}
                        • Job {qcInfo.jobId} (
                        {qcInfo.jobStatus || "unknown"})
                      </>
                    )}
                  </p>

                  <div style={{ marginBottom: "0.75rem" }}>
                    {qcInfo.htmlReport && (
                      <a
                        href={qcInfo.htmlReport}
                        target="_blank"
                        rel="noreferrer"
                        className="btn small primary"
                        style={{ marginRight: "0.5rem" }}
                      >
                        View HTML report
                      </a>
                    )}
                    {qcInfo.zipDownload && (
                      <a href={qcInfo.zipDownload} className="btn small">
                        Download ZIP
                      </a>
                    )}
                  </div>

                  <h4>Module summary</h4>
                  {qcInfo.summary && qcInfo.summary.length > 0 ? (
                    <table className="sample-table">
                      <thead>
                        <tr>
                          <th style={{ width: "40%" }}>Module</th>
                          <th style={{ width: "10%" }}>Status</th>
                          <th>Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        {qcInfo.summary.map((row, idx) => (
                          <tr key={idx}>
                            <td>{row.module}</td>
                            <td>{row.status}</td>
                            <td>{row.description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="muted">
                      No module summary was recorded for this job.
                    </p>
                  )}

                  <h4 style={{ marginTop: "1rem" }}>Job history</h4>
                  {jobHistoryLoading ? (
                    <p className="muted">Loading job history…</p>
                  ) : jobHistory && jobHistory.length > 0 ? (
                    <table className="sample-table">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Type</th>
                          <th>Status</th>
                          <th>Started</th>
                        </tr>
                      </thead>
                      <tbody>
                        {jobHistory.map((j) => (
                          <tr key={j.id}>
                            <td>{j.id}</td>
                            <td>{j.job_type}</td>
                            <td>{j.status}</td>
                            <td>
                              {j.started_at
                                ? new Date(j.started_at).toLocaleString()
                                : ""}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="muted">No jobs found for this sample.</p>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Project edit modal */}
      {editingProject && (
        <div style={modalBackdropStyle}>
          <div style={modalStyle}>
            <h3>Edit project</h3>
            <label>Name</label>
            <input
              type="text"
              value={editingProject.name}
              onChange={(e) =>
                setEditingProject((prev) => ({
                  ...prev,
                  name: e.target.value,
                }))
              }
            />

            <label style={{ marginTop: "0.75rem" }}>Description</label>
            <textarea
              value={editingProject.description}
              onChange={(e) =>
                setEditingProject((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
            />

            <div
              style={{
                marginTop: "1rem",
                display: "flex",
                justifyContent: "flex-end",
                gap: "0.5rem",
              }}
            >
              <button
                type="button"
                className="btn"
                onClick={() => setEditingProject(null)}
                disabled={editSaving}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn primary"
                onClick={handleSaveProjectEdit}
                disabled={editSaving}
              >
                {editSaving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sample edit modal */}
      {editingSample && (
        <div style={modalBackdropStyle}>
          <div style={modalStyle}>
            <h3>Edit sample</h3>

            <label>Sample ID</label>
            <input
              type="text"
              value={editingSample.sample_id}
              onChange={(e) =>
                setEditingSample((prev) => ({
                  ...prev,
                  sample_id: e.target.value,
                }))
              }
            />

            <label style={{ marginTop: "0.75rem" }}>Data type</label>
            <select
              value={editingSample.data_type}
              onChange={(e) =>
                setEditingSample((prev) => ({
                  ...prev,
                  data_type: e.target.value,
                }))
              }
            >
              <option value="DNA">DNA seq</option>
              <option value="RNA">RNA seq</option>
              <option value="META">Metagenomics</option>
              <option value="PROT">Proteomics</option>
              <option value="METAB">Metabolomics</option>
            </select>

            <label style={{ marginTop: "0.75rem" }}>Collected on</label>
            <input
              type="date"
              value={editingSample.collected_on || ""}
              onChange={(e) =>
                setEditingSample((prev) => ({
                  ...prev,
                  collected_on: e.target.value,
                }))
              }
            />

            <label style={{ marginTop: "0.75rem" }}>Organism</label>
            <select
              value={editingSample.organism}
              onChange={(e) =>
                setEditingSample((prev) => ({
                  ...prev,
                  organism: e.target.value,
                }))
              }
            >
              <option value="">Unspecified</option>
              {organisms.map((o) => (
                <option key={o.db_id} value={String(o.db_id)}>
                  {o.scientific_name}
                  {o.common_name ? ` (${o.common_name})` : ""}
                </option>
              ))}
            </select>

            <label style={{ marginTop: "0.75rem" }}>Tissue type</label>
            <select
              value={editingSample.tissue_type}
              onChange={(e) =>
                setEditingSample((prev) => ({
                  ...prev,
                  tissue_type: e.target.value,
                }))
              }
            >
              <option value="">Unspecified</option>
              {tissues.map((t) => (
                <option key={t.id} value={String(t.id)}>
                  {t.name}
                  {t.kingdom ? ` (${t.kingdom})` : ""}
                </option>
              ))}
            </select>

            <div
              style={{
                marginTop: "1rem",
                display: "flex",
                justifyContent: "flex-end",
                gap: "0.5rem",
              }}
            >
              <button
                type="button"
                className="btn"
                onClick={() => setEditingSample(null)}
                disabled={editSaving}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn primary"
                onClick={handleSaveSampleEdit}
                disabled={editSaving}
              >
                {editSaving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
