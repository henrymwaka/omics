function ProjectForm() {
  return (
    <div className="card">
      <h2>Create Project</h2>
      <form className="form-grid">
        <label>Name</label>
        <input type="text" placeholder="e.g., Banana RNA-seq" />
        <label>Description</label>
        <textarea placeholder="Optional description"></textarea>
        <button type="submit" className="btn btn-blue">Save</button>
      </form>
    </div>
  );
}
export default ProjectForm;
