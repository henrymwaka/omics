// src/pages/Home.jsx
import HeroSection from "../components/HeroSection";
import Footer from "../components/Footer";
import "../App.css";

function Home() {
  return (
    <div className="landing-page">
      <HeroSection />

      {/* About Section */}
      <section id="about-section" className="about-section fade-in">
        <div className="about-content">
          <h2>About the Platform</h2>

          <p>
            The ResLab Omics Platform integrates multiple bioinformatics workflows into
            a single streamlined environment. It supports scientists working in agriculture,
            biotechnology, and environmental genomics.
          </p>

          <p>
            Built for interoperability with SmartField Dashboard and LIMS-GT, the platform
            ensures seamless flow of data from field experiments to molecular analysis.
          </p>

          <ul>
            <li>Genomics, transcriptomics, and proteomics support</li>
            <li>Automated pipelines with progress tracking</li>
            <li>Interactive visualization tools</li>
            <li>Secure multi-user access</li>
          </ul>
        </div>
      </section>

      {/* Data to Discovery */}
      <section className="preview-section fade-in">
        <h2>Data to Discovery</h2>
        <p>
          Move from raw FASTQ reads to biological interpretation with interactive visual
          tools, full experiment tracking, and exportable structured reports.
        </p>
      </section>

      <Footer />
    </div>
  );
}

export default Home;
