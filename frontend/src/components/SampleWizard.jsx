// src/components/SampleWizard.jsx
// -----------------------------------------------------------------------------
// ResLab Omics Sample Entry Wizard
// -----------------------------------------------------------------------------
// This component guides the user through a multi step workflow for creating a
// new sample and attaching a file.
//
// Steps:
//   1. Select kingdom
//   2. Search and select organism
//   3. Select tissue type
//   4. Enter sample metadata
//   5. Upload file
//   6. Post upload actions (via PostUploadMenu)
// -----------------------------------------------------------------------------
// Key design points:
//   - Always use backend primary keys correctly (organism db_id, tissue id)
//   - Apply strict frontend validation before calling the API
//   - Handle backend errors clearly through toasts
//   - Keep side effects isolated inside useEffect hooks
// -----------------------------------------------------------------------------

import { useEffect, useState } from "react";
import { useToast } from "../context/ToastContext";
import PostUploadMenu from "./PostUploadMenu.jsx";

const API_BASE = "/api";

/* =============================================================================
   KINGDOM ICONS
   Icons are purely cosmetic and help orientation in the organism search.
============================================================================= */
const KINGDOM_ICONS = {
  Plant: "🌱",
  Animal: "🐛",
  Fungus: "🍄",
  Bacteria: "🦠",
  Virus: "🧬",
  Archaea: "🔬",
};

/* =============================================================================
   DATA TYPES (user facing labels)
   TYPE_BACKEND maps labels to the short codes expected by the Django backend.
   Example:
     - UI shows "RNA-seq"
     - Backend receives "RNA"
============================================================================= */
const DATA_TYPES = {
  DNA: "DNA-seq",
  RNA: "RNA-seq",
  META: "Metagenomics",
  PROT: "Proteomics",
  METAB: "Metabolomics",
};

const TYPE_BACKEND = {
  "DNA-seq": "DNA",
  "RNA-seq": "RNA",
  Metagenomics: "META",
  Proteomics: "PROT",
  Metabolomics: "METAB",
};

/* =============================================================================
   ORGANISM SEARCH COMPONENT
   - Takes current kingdom and an onSelect callback.
   - Performs debounced like search as user types.
   - Uses credentials include so that session cookie is sent.
   - Robust to both paginated and plain list responses.
============================================================================= */
function OrganismSearch({ kingdom, onSelect }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);

  // Reset search state when kingdom changes
  useEffect(() => {
    setQuery("");
    setResults([]);
    setSelected(null);
  }, [kingdom]);

  // Perform organism search whenever query or kingdom changes
  useEffect(() => {
    // Short circuit if there is no query or insufficient length
    if (!query || query.length < 2 || !kingdom) {
      setResults([]);
      return;
    }

    const controller = new AbortController();
    const url = `${API_BASE}/organisms/?search=${encodeURIComponent(
      query
    )}&kingdom=${encodeURIComponent(kingdom)}`;

    setLoading(true);

    fetch(url, {
      signal: controller.signal,
      credentials: "include",
    })
      .then((res) => {
        if (!res.ok) {
          return null;
        }
        return res.json();
      })
      .then((data) => {
        // Support both paginated and plain list formats
        let list = [];
        if (Array.isArray(data)) {
          list = data;
        } else if (data && Array.isArray(data.results)) {
          list = data.results;
        }
        setResults(list.slice(0, 50));
      })
      .catch(() => {
        // Swallow fetch aborts and network errors quietly
        setResults([]);
      })
      .finally(() => setLoading(false));

    // Cancel the request if the component unmounts or query changes
    return () => controller.abort();
  }, [query, kingdom]);

  // When user clicks an organism in the list
  const handleSelect = (org) => {
    setSelected(org);
    setQuery(org.scientific_name || "");
    setResults([]);
    // Pass entire organism object up to parent
    onSelect(org);
  };

  return (
    <div style={{ position: "relative", paddingBottom: "5rem" }}>
      <label className="font-semibold block mb-2">
        {KINGDOM_ICONS[kingdom]} Select Organism ({kingdom})
      </label>

      <input
        type="text"
        className="border border-gray-300 rounded-md p-2 w-full"
        placeholder="Type scientific or common name…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        disabled={!kingdom}
      />

      {loading && <div className="text-sm text-gray-500 mt-1">Searching…</div>}

      {/* Search results dropdown */}
      {results.length > 0 && (
        <ul
          className="border border-gray-300 bg-white shadow-lg rounded-md"
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            zIndex: 9999,
            maxHeight: "260px",
            overflowY: "auto",
            marginTop: "6px",
          }}
        >
          {results.map((r) => (
            <li
              // Use db_id as React key and as stable identifier
              key={r.db_id ?? r.id}
              onClick={() => handleSelect(r)}
              className="cursor-pointer px-2 py-2 hover:bg-blue-100 text-sm flex items-center gap-2"
            >
              <span>{KINGDOM_ICONS[r.kingdom] || "🔬"}</span>
              <span>
                <strong>{r.scientific_name || "Unnamed organism"}</strong>
                {r.common_name && (
                  <span className="text-gray-500"> ({r.common_name})</span>
                )}
                {r.taxonomy_id && (
                  <span className="text-gray-400 text-xs">
                    {" "}
                    [{r.taxonomy_id}]
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}

      {selected && (
        <p className="text-sm text-green-700 mt-2">
          ✓ Selected: {selected.scientific_name}
        </p>
      )}
    </div>
  );
}

/* =============================================================================
   SAMPLE WIZARD MAIN COMPONENT
   Holds the full step state and talks to the backend.
============================================================================= */
function SampleWizard({ projectId, onComplete }) {
  const { showToast } = useToast();

  // Current wizard step (1 to 6)
  const [step, setStep] = useState(1);

  // Static kingdom options
  const kingdoms = ["Plant", "Animal", "Fungus", "Bacteria", "Virus", "Archaea"];

  // User choices
  const [selectedKingdom, setSelectedKingdom] = useState("");
  const [selectedOrganism, setSelectedOrganism] = useState(null);

  const [tissues, setTissues] = useState([]);
  const [selectedTissue, setSelectedTissue] = useState("");

  const [dataType, setDataType] = useState("RNA-seq");

  const [sampleId, setSampleId] = useState("");
  const [collectedOn, setCollectedOn] = useState("");

  const [createdSampleId, setCreatedSampleId] = useState(null);

  const [file, setFile] = useState(null);
  const [fileType, setFileType] = useState("FASTQ");

  // Single flag for blocking UI during remote operations
  const [saving, setSaving] = useState(false);

  /* =============================================================================
     LOAD TISSUE TYPES FOR SELECTED KINGDOM
     Whenever selectedKingdom changes, fetch the corresponding tissue list.
  ============================================================================= */
  useEffect(() => {
    if (!selectedKingdom) {
      setTissues([]);
      setSelectedTissue("");
      return;
    }

    const controller = new AbortController();

    fetch(
      `${API_BASE}/tissues/?kingdom=${encodeURIComponent(selectedKingdom)}`,
      {
        credentials: "include",
        signal: controller.signal,
      }
    )
      .then((r) => {
        if (!r.ok) {
          return null;
        }
        return r.json();
      })
      .then((data) => {
        let list = [];
        if (Array.isArray(data)) {
          list = data;
        } else if (data && Array.isArray(data.results)) {
          list = data.results;
        }
        setTissues(list);
      })
      .catch(() => {
        setTissues([]);
      });

    return () => controller.abort();
  }, [selectedKingdom]);

  /* =============================================================================
     LOCAL VALIDATION BEFORE SAMPLE SAVE
     This avoids sending obviously invalid payloads to the backend.
  ============================================================================= */
  const validateSampleFields = () => {
    if (!projectId) {
      showToast("Project is missing. Please return to project selection.", "error");
      return false;
    }

    if (!selectedKingdom) {
      showToast("Select a kingdom first.", "error");
      return false;
    }

    if (!selectedOrganism || !selectedOrganism.db_id) {
      showToast("Select an organism for this sample.", "error");
      return false;
    }

    if (!selectedTissue) {
      showToast("Select a tissue type.", "error");
      return false;
    }

    if (!sampleId || !sampleId.trim()) {
      showToast("Sample ID cannot be empty.", "error");
      return false;
    }

    return true;
  };

  /* =============================================================================
     SAVE SAMPLE METADATA
     POST /api/samples/
  ============================================================================= */
  const handleSaveSample = async (e) => {
    e.preventDefault();

    if (!validateSampleFields()) {
      return;
    }

    setSaving(true);

    // Map user visible label to backend short code
    const backendType = TYPE_BACKEND[dataType] || "RNA";

    const payload = {
      sample_id: sampleId.trim(),
      project: projectId,
      organism: selectedOrganism.db_id,
      tissue_type: Number(selectedTissue),
      data_type: backendType,
      collected_on: collectedOn || null,
    };

    try {
      const res = await fetch(`${API_BASE}/samples/`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        // Specific handling for authentication failure
        if (res.status === 401) {
          showToast("You are not logged in. Please sign in again.", "error");
          return;
        }

        let errDetail = null;
        try {
          errDetail = await res.json();
        } catch {
          errDetail = null;
        }

        console.error("Sample save error:", errDetail || res.status);
        showToast("Failed to save sample metadata.", "error");
        return;
      }

      const data = await res.json();
      setCreatedSampleId(data.id);
      showToast("Sample metadata saved successfully.", "success");
      setStep(5);
    } catch (err) {
      console.error("Sample save exception:", err);
      showToast("Failed to save sample metadata due to a network error.", "error");
    } finally {
      setSaving(false);
    }
  };

  /* =============================================================================
     FILE UPLOAD
     POST /api/files/
  ============================================================================= */
  const handleUploadFile = async (e) => {
    e.preventDefault();

    if (!createdSampleId) {
      showToast("Sample ID is missing. Save the sample metadata first.", "error");
      return;
    }

    if (!file) {
      showToast("Select a file before uploading.", "info");
      return;
    }

    setSaving(true);

    const formData = new FormData();
    formData.append("sample", createdSampleId);
    formData.append("file_type", fileType);
    formData.append("file", file);

    try {
      const res = await fetch(`${API_BASE}/files/`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!res.ok) {
        if (res.status === 401) {
          showToast("You are not logged in. Please sign in again.", "error");
          return;
        }

        console.error("File upload error status:", res.status);
        showToast("File upload failed.", "error");
        return;
      }

      showToast("File uploaded successfully.", "success");
      setStep(6);
    } catch (err) {
      console.error("File upload exception:", err);
      showToast("File upload failed due to a network error.", "error");
    } finally {
      setSaving(false);
    }
  };

  /* =============================================================================
     NAVIGATION HELPERS
  ============================================================================= */
  const next = () => setStep((s) => s + 1);
  const back = () => setStep((s) => s - 1);

  // Reset state to allow another sample entry in the same project
  const resetWizard = () => {
    setStep(1);
    setSelectedKingdom("");
    setSelectedOrganism(null);
    setTissues([]);
    setSelectedTissue("");
    setDataType("RNA-seq");
    setSampleId("");
    setCollectedOn("");
    setCreatedSampleId(null);
    setFile(null);
    setFileType("FASTQ");
  };

  /* =============================================================================
     STEP RENDERING
  ============================================================================= */
  const renderStep = () => {
    switch (step) {
      // Step 1: Kingdom
      case 1:
        return (
          <>
            <h3>Select Kingdom</h3>

            <select
              value={selectedKingdom}
              onChange={(e) => {
                setSelectedKingdom(e.target.value);
                setSelectedOrganism(null);
                setSelectedTissue("");
              }}
              className="border p-2 rounded w-full"
            >
              <option value="">-- choose --</option>
              {kingdoms.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>

            <div className="wizard-nav mt-4">
              <button
                disabled={!selectedKingdom}
                onClick={next}
                className="btn primary"
              >
                Next
              </button>
            </div>
          </>
        );

      // Step 2: Organism
      case 2:
        return (
          <>
            <OrganismSearch
              kingdom={selectedKingdom}
              onSelect={setSelectedOrganism}
            />

            <div className="wizard-nav mt-4">
              <button onClick={back} className="btn">
                Back
              </button>
              <button
                disabled={!selectedOrganism}
                onClick={next}
                className="btn primary"
              >
                Next
              </button>
            </div>
          </>
        );

      // Step 3: Tissue
      case 3:
        return (
          <>
            <h3>Select Tissue Type ({selectedKingdom})</h3>

            <select
              value={selectedTissue}
              onChange={(e) => setSelectedTissue(e.target.value)}
              className="border p-2 rounded w-full"
            >
              <option value="">-- choose tissue --</option>
              {tissues.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>

            <div className="wizard-nav mt-4">
              <button onClick={back} className="btn">
                Back
              </button>
              <button
                disabled={!selectedTissue}
                onClick={next}
                className="btn primary"
              >
                Next
              </button>
            </div>
          </>
        );

      // Step 4: Sample metadata
      case 4:
        return (
          <form onSubmit={handleSaveSample}>
            <h3>Sample Details</h3>

            <label>Sample ID</label>
            <input
              className="border p-2 rounded w-full"
              value={sampleId}
              onChange={(e) => setSampleId(e.target.value)}
            />

            <label className="mt-3">Data Type</label>
            <select
              className="border p-2 rounded w-full"
              value={dataType}
              onChange={(e) => setDataType(e.target.value)}
            >
              {Object.entries(DATA_TYPES).map(([code, label]) => (
                <option key={code} value={label}>
                  {label}
                </option>
              ))}
            </select>

            <label className="mt-3">Collected On</label>
            <input
              type="date"
              className="border p-2 rounded w-full"
              value={collectedOn}
              onChange={(e) => setCollectedOn(e.target.value)}
            />

            <div className="wizard-nav mt-4">
              <button onClick={back} type="button" className="btn">
                Back
              </button>
              <button type="submit" className="btn primary" disabled={saving}>
                {saving ? "Saving…" : "Save Sample"}
              </button>
            </div>
          </form>
        );

      // Step 5: File upload
      case 5:
        return (
          <form onSubmit={handleUploadFile}>
            <h3>Upload Data File</h3>

            <label>File Type</label>
            <select
              className="border p-2 rounded w-full"
              value={fileType}
              onChange={(e) => setFileType(e.target.value)}
            >
              <option value="FASTQ">FASTQ</option>
              <option value="BAM">BAM</option>
              <option value="VCF">VCF</option>
              <option value="COUNTS">Expression counts</option>
              <option value="META">Metadata</option>
            </select>

            <label className="mt-3">Choose File</label>
            <input
              type="file"
              className="border p-2 rounded w-full"
              onChange={(e) => setFile(e.target.files[0])}
            />

            <div className="wizard-nav mt-4">
              <button onClick={() => setStep(4)} className="btn" type="button">
                Back
              </button>
              <button type="submit" className="btn primary" disabled={saving}>
                {saving ? "Uploading…" : "Upload File"}
              </button>
            </div>
          </form>
        );

      // Step 6: Summary and next actions
      case 6:
        return (
          <PostUploadMenu
            sampleId={createdSampleId}
            projectId={projectId}
            onAddAnother={() => {
              resetWizard();
              if (onComplete) {
                onComplete(null);
              }
            }}
          />
        );

      default:
        return <p>Invalid step.</p>;
    }
  };

  /* =============================================================================
     MAIN RENDER
  ============================================================================= */
  return (
    <div className="card p-6">
      <h2>Sample Entry Wizard</h2>
      <div className="mt-4">{renderStep()}</div>
    </div>
  );
}

export default SampleWizard;
