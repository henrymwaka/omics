// src/components/Footer.jsx

function Footer() {
  const year = new Date().getFullYear();

  return (
    <>
      {/* Top Thin Band */}
      <div className="footer-band">
        © {year} ResLab Omics Platform | Version 0.3-beta | Developed by Henry Mwaka
      </div>

      {/* Main Footer */}
      <footer className="footer">
        <div className="footer-content">

          <div className="footer-left">
            <h3>ResLab Omics Platform</h3>
            <p>
              Empowering scientists with integrated genomics, transcriptomics, and proteomics data pipelines.
            </p>
          </div>

          <div className="footer-links">
            <a href="https://reslab.dev" target="_blank" rel="noopener noreferrer">Docs</a>
            <a href="mailto:support@reslab.dev">Contact</a>
            <a href="https://github.com/henrymwaka" target="_blank" rel="noopener noreferrer">GitHub</a>
          </div>

        </div>

        <div className="footer-bottom">
          © {year} ResLab Omics — All Rights Reserved.
        </div>
      </footer>
    </>
  );
}

export default Footer;
