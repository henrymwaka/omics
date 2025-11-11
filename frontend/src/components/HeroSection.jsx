import "./HeroSection.css";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

function HeroSection() {
  const navigate = useNavigate();

  // Fade-in animation
  useEffect(() => {
    const sections = document.querySelectorAll(".fade-in");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add("visible");
        });
      },
      { threshold: 0.15 }
    );
    sections.forEach((section) => observer.observe(section));
    return () => sections.forEach((section) => observer.unobserve(section));
  }, []);

  // Smooth scroll handler
  const scrollToAbout = () => {
    const aboutSection = document.getElementById("about-section");
    if (aboutSection) {
      aboutSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="landing-wrapper">
      {/* ===== HERO ===== */}
      <section className="hero-container fade-in">
        <div className="hero-overlay">
          <h1 className="hero-title">ResLab Omics Platform</h1>
          <p className="hero-subtitle">
            A unified data environment for genomics, transcriptomics, and proteomics —
            empowering researchers to upload, analyze, visualize, and collaborate
            seamlessly across disciplines.
          </p>

          <div className="hero-buttons">
            <button onClick={() => navigate("/dashboard")} className="btn-primary glow">
              Enter Dashboard
            </button>
            <button onClick={scrollToAbout} className="btn-secondary glow">
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
              <p>Execute automated QC, alignment, and differential analysis.</p>
            </div>
            <div>
              <h3>📊 Visualize</h3>
              <p>Generate heatmaps, genome views, and statistical summaries.</p>
            </div>
            <div>
              <h3>🤝 Collaborate</h3>
              <p>Share datasets securely within your research network.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== ABOUT ===== */}
      <section id="about-section" className="about-section fade-in">
        <div className="about-content">
          <h2>About the Platform</h2>
          <p>
            The ResLab Omics Platform integrates multiple bioinformatics workflows in one
            environment. It is built for scientists working in agriculture, biotechnology,
            and environmental genomics.
          </p>
          <p>
            Designed for interoperability with ResLab modules like SmartField Dashboard
            and LIMS-GT, it ensures seamless movement of data from field experiments to
            molecular analysis.
          </p>
          <ul>
            <li>🔹 Supports genomics, transcriptomics, and proteomics datasets</li>
            <li>🔹 Automated pipeline execution and progress tracking</li>
            <li>🔹 Interactive visualization of results</li>
            <li>🔹 Secure multi-user access management</li>
          </ul>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section className="how-section fade-in">
        <div className="how-content">
          <h2>How It Works</h2>
          <div className="steps-grid">
            <div>
              <h3>1️⃣ Upload</h3>
              <p>
                Drag and drop sequencing files or link existing datasets directly from
                ResLab LIMS.
              </p>
            </div>
            <div>
              <h3>2️⃣ Analyze</h3>
              <p>
                Trigger workflows for QC, trimming, alignment, variant calling, and
                annotation.
              </p>
            </div>
            <div>
              <h3>3️⃣ Explore</h3>
              <p>
                View interactive QC reports, expression profiles, and variant maps in
                real time.
              </p>
            </div>
            <div>
              <h3>4️⃣ Collaborate</h3>
              <p>
                Share projects and results securely with team members and collaborators.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== DATA TO DISCOVERY (NO IMAGE) ===== */}
      <section className="preview-section fade-in">
        <div className="preview-content">
          <h2>Data to Discovery</h2>
          <p>
            From FASTQ to functional insight — visualize results interactively, track
            experiment history, and export structured reports in one place.
          </p>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="landing-footer fade-in">
        <p>© 2025 ResLab Omics Platform | Version 0.3-beta | Developed by Henry Mwaka</p>
      </footer>
    </div>
  );
}

export default HeroSection;
