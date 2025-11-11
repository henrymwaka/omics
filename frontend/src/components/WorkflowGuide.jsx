function WorkflowGuide() {
  return (
    <section id="learn" className="workflow">
      <h2>How It Works</h2>
      <p>
        Whether you’re just getting started or already managing active projects,
        the workflow is designed to be simple and transparent.
      </p>

      <div className="steps">
        <div className="step">
          <h3>1. Create a Project</h3>
          <p>Define your study and register associated metadata.</p>
        </div>
        <div className="step">
          <h3>2. Add Samples</h3>
          <p>Record details about each biological or experimental sample.</p>
        </div>
        <div className="step">
          <h3>3. Upload Data</h3>
          <p>Attach sequencing files such as FASTQ, BAM, or VCF.</p>
        </div>
        <div className="step">
          <h3>4. Analyze & Explore</h3>
          <p>Run automated pipelines and visualize your results.</p>
        </div>
      </div>
    </section>
  );
}

export default WorkflowGuide;
