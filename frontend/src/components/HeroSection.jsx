// src/components/HeroSection.jsx
import { useNavigate } from "react-router-dom";

function HeroSection() {
  const navigate = useNavigate();

  return (
    <div className="hero-wrapper fade-in">
      <div className="dna-bg-animated"></div>

      <div className="hero-card">
        <h1 className="hero-title">ResLab Omics Platform</h1>

        <p className="hero-subtitle">
          A unified data environment for genomics, transcriptomics, and proteomics,
          empowering researchers to upload, analyze, visualize, and collaborate seamlessly.
        </p>

        <div className="hero-buttons">
          <button className="btn primary" onClick={() => navigate("/dashboard")}>
            Enter Dashboard
          </button>

          <button
            className="btn secondary"
            onClick={() => {
              const about = document.getElementById("about-section");
              if (about) about.scrollIntoView({ behavior: "smooth" });
            }}
          >
            Learn More
          </button>
        </div>

        <div className="hero-features">
          <div>
            <h3>🧬 Upload</h3>
            <p>Organize FASTQ, GFF, and metadata files by project.</p>
          </div>

          <div>
            <h3>⚙️ Analyze</h3>
            <p>Automated QC, alignment, and differential analysis.</p>
          </div>

          <div>
            <h3>📊 Visualize</h3>
            <p>Heatmaps, genome views, and statistical summaries.</p>
          </div>

          <div>
            <h3>🤝 Collaborate</h3>
            <p>Share datasets securely within your research network.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HeroSection;
