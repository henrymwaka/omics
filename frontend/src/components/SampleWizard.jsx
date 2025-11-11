// src/components/SampleWizard.jsx
import { useEffect, useState } from "react";
import { useToast } from "../context/ToastContext";
import SampleSummary from "./SampleSummary";

const API_BASE = "/api";

function OrganismSearch({ kingdom, onSelect }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setResults([]);
    setSelected(null);
    setError("");
    setQuery("");
  }, [kingdom]);

  useEffect(() => {
    if (!query || query.length < 2 || !kingdom) {
      setResults([]);
      return;
    }

    const controller = new AbortController();
    const url = `${API_BASE}/organisms/search/?q=${encodeURIComponent(
      query
    )}&kingdom=${encodeURIComponent(kingdom)}`;

    setLoading(true);
    setError("");

    fetch(url, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => setResults(Array.isArray(data) ? data.slice(0, 50) : []))
      .catch((err) => {
        if (err.name !== "AbortError") {
          setError("Search failed. Try again.");
        }
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [query, kingdom]);

  const handleSelect = (org) => {
    setSelected(org);
    setQuery(org.scientific_name);
    setResults([]);
    setError("");
    onSelect(org);
  };

  return (
    <div className="mt-3" style={{ position: "relative" }}>
      <label className="font-semibold block mb-1">
        Select Organism ({kingdom || "choose kingdom first"})
      </label>

      <input
        type="text"
        className="border border-gray-300 rounded-md p-2 w-full"
        placeholder={
          kingdom
            ? `Type to search within ${kingdom}…`
            : "Select a kingdom first"
        }
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        disabled={!kingdom}
      />

      {loading && (
        <div className="absolute top-full left-2 mt-1 text-sm text-gray-500">
          🔄 Searching…
        </div>
      )}
      {error && <p className="text-sm text-red-600 mt-1">{error}</p>}

      {results.length > 0 && (
        <ul
          className="border border-gray-300 rounded-md bg-white mt-1 max-h-48 overflow-y-auto shadow-md"
          style={{ position: "absolute", zIndex: 9999, width: "100%" }}
        >
          {results.map((r) => (
            <li
              key={r.id}
              onClick={() => handleSelect(r)}
              className="cursor-pointer px-2 py-1 hover:bg-blue-100 text-sm"
              dangerouslySetInnerHTML={{
                __html: `${r.scientific_name} ${
                  r.common_name
                    ? `<span class='text-gray-500'>(${r.common_name})</span>`
                    : ""
                } ${
                  r.taxonomy_id
                    ? `<span class='text-gray-400 text-xs'>[${r.taxonomy_id}]</span>`
                    : ""
                }`,
              }}
            />
          ))}
        </ul>
      )}

      {selected && (
        <p className="text-sm text-green-700 mt-1">
          ✓ Selected: {selected.scientific_name}
        </p>
      )}
    </div>
  );
}

function SampleWizard({ projectId, onComplete }) {
  const [step, setStep] = useState(1);
  const [kingdoms] = useState([
    "Plant",
    "Animal",
    "Fungus",
    "Bacteria",
    "Virus",
    "Archaea",
  ]);
  const [selectedKingdom, setSelectedKingdom] = useState("");
  const [selectedOrganism, setSelectedOrganism] = useState(null);
  const [tissues, setTissues] = useState([]);
  const [selectedTissue, setSelectedTissue] = useState("");
  const [dataType, setDataType] = useState("RNA");
  const [sampleId, setSampleId] = useState("");
  const [collectedOn, setCollectedOn] = useState("");
  const [createdSampleId, setCreatedSampleId] = useState(null);
  const [file, setFile] = useState(null);
  const [fileType, setFileType] = useState("FASTQ");
  const [saving, setSaving] = useState(false);
  const [showSummary, setShowSummary] = useState(true); // ✅ new toggle
  const { showToast } = useToast();

  const next = () => setStep((s) => s + 1);
  const back = () => setStep((s) => s - 1);

  useEffect(() => {
    if (!selectedKingdom) {
      setTissues([]);
      return;
    }

    fetch(`${API_BASE}/tissues/?kingdom=${encodeURIComponent(selectedKingdom)}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setTissues(Array.isArray(data) ? data : []))
      .catch(() => setTissues([]));
  }, [selectedKingdom]);

  const handleSaveSample = async (e) => {
    e.preventDefault();
    setSaving(true);

    const payload = {
      sample_id: sampleId,
      project: projectId,
      organism: selectedOrganism ? selectedOrganism.id : null,
      tissue_type: selectedTissue || null,
      data_type: dataType,
      collected_on: collectedOn || null,
    };

    try {
      const res = await fetch(`${API_BASE}/samples/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setCreatedSampleId(data.id);
      showToast("✅ Sample metadata saved successfully!", "success");
      setStep(5);
    } catch {
      showToast("❌ Failed to save sample metadata.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleUploadFile = async (e) => {
    e.preventDefault();
    if (!file || !createdSampleId) {
      showToast("⚠️ Select a file before uploading.", "info");
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
        body: formData,
      });
      if (!res.ok) throw new Error();
      showToast("✅ File uploaded successfully!", "success");
      setStep(6);
      setShowSummary(true);
    } catch {
      showToast("❌ File upload failed. Try again.", "error");
    } finally {
      setSaving(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <>
            <h3>Select Kingdom</h3>
            <select
              value={selectedKingdom}
              onChange={(e) => {
                const k = e.target.value;
                setSelectedKingdom(k);
                setSelectedOrganism(null);
                setSelectedTissue("");
              }}
            >
              <option value="">-- choose --</option>
              {kingdoms.map((k) => (
                <option key={k}>{k}</option>
              ))}
            </select>
            <div className="wizard-nav mt-3">
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

      case 2:
        return (
          <>
            <OrganismSearch
              kingdom={selectedKingdom}
              onSelect={(org) => setSelectedOrganism(org)}
            />
            <div className="wizard-nav mt-3">
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

      case 3:
        return (
          <>
            <h3>Select Tissue Type ({selectedKingdom})</h3>
            <select
              value={selectedTissue}
              onChange={(e) => setSelectedTissue(e.target.value)}
            >
              <option value="">-- choose tissue --</option>
              {tissues.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <div className="wizard-nav mt-3">
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

      case 4:
        return (
          <form onSubmit={handleSaveSample}>
            <h3>Sample Details</h3>
            <label>Sample ID</label>
            <input
              type="text"
              value={sampleId}
              onChange={(e) => setSampleId(e.target.value)}
              required
            />
            <label>Data Type</label>
            <select
              value={dataType}
              onChange={(e) => setDataType(e.target.value)}
            >
              <option value="DNA">DNA-seq</option>
              <option value="RNA">RNA-seq</option>
              <option value="META">Metagenomics</option>
              <option value="PROT">Proteomics</option>
              <option value="METAB">Metabolomics</option>
            </select>
            <label>Collected On</label>
            <input
              type="date"
              value={collectedOn}
              onChange={(e) => setCollectedOn(e.target.value)}
            />
            <div className="wizard-nav mt-3">
              <button onClick={back} type="button" className="btn">
                Back
              </button>
              <button type="submit" disabled={saving} className="btn primary">
                {saving ? "Saving…" : "Save Sample"}
              </button>
            </div>
          </form>
        );

      case 5:
        return (
          <form onSubmit={handleUploadFile}>
            <h3>Upload Data File</h3>
            <label>File Type</label>
            <select
              value={fileType}
              onChange={(e) => setFileType(e.target.value)}
            >
              <option value="FASTQ">FASTQ</option>
              <option value="BAM">BAM</option>
              <option value="VCF">VCF</option>
              <option value="COUNTS">Expression counts</option>
              <option value="META">Metadata</option>
            </select>
            <label>Choose File</label>
            <input type="file" onChange={(e) => setFile(e.target.files[0])} />
            <div className="wizard-nav mt-3">
              <button onClick={() => setStep(4)} type="button" className="btn">
                Back
              </button>
              <button type="submit" disabled={saving} className="btn primary">
                {saving ? "Uploading…" : "Upload File"}
              </button>
            </div>
          </form>
        );

      case 6:
        return (
          <div>
            <h3>✅ Sample and file uploaded successfully.</h3>
            <button
              className="btn secondary mt-2"
              onClick={() => setShowSummary((v) => !v)}
            >
              {showSummary ? "Hide Summary ▲" : "Show Summary ▼"}
            </button>
            {showSummary && (
              <SampleSummary sampleId={createdSampleId} />
            )}
            <button
              onClick={() => onComplete && onComplete()}
              className="btn primary mt-3"
            >
              Finish
            </button>
          </div>
        );

      default:
        return <p>Invalid step.</p>;
    }
  };

  return (
    <div className="card">
      <h2>Sample Entry Wizard</h2>
      {renderStep()}
    </div>
  );
}

export default SampleWizard;
