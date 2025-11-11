import "./Footer.css";

function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-left">
          <h3>ResLab Omics Platform</h3>
          <p>
            Empowering scientists with integrated genomics, transcriptomics,
            and proteomics data pipelines.
          </p>
        </div>

        <div className="footer-links">
          <a href="https://reslab.dev" target="_blank" rel="noopener noreferrer">
            Docs
          </a>
          <a href="mailto:support@reslab.dev">Contact</a>
          <a href="https://github.com/henrymwaka" target="_blank" rel="noopener noreferrer">
            GitHub
          </a>
        </div>
      </div>

      <div className="footer-bottom">
        © {currentYear} ResLab Omics — All Rights Reserved.
      </div>
    </footer>
  );
}

export default Footer;
