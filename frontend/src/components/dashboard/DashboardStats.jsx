function DashboardStats() {
  const stats = [
    { title: "Projects", value: 4 },
    { title: "Samples", value: 18 },
    { title: "Files", value: 42 },
    { title: "Active Pipelines", value: 2 },
  ];

  return (
    <div className="stats-grid">
      {stats.map((s) => (
        <div key={s.title} className="stat-card">
          <h3>{s.title}</h3>
          <p>{s.value}</p>
        </div>
      ))}
    </div>
  );
}
export default DashboardStats;
