import { useEffect, useState } from "react";

function StatsPanel() {
  const [stats, setStats] = useState({ projects: 0, samples: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const [projectsRes, samplesRes] = await Promise.all([
          fetch("/api/projects/"),
          fetch("/api/samples/"),
        ]);
        const projects = await projectsRes.json();
        const samples = await samplesRes.json();
        setStats({ projects: projects.length, samples: samples.length });
      } catch {
        setStats({ projects: 0, samples: 0 });
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  return (
    <section className="stats">
      <h2>Platform Overview</h2>
      {loading ? (
        <p>Loading metrics...</p>
      ) : (
        <div className="stat-cards">
          <div className="stat">
            <h3>{stats.projects}</h3>
            <p>Projects</p>
          </div>
          <div className="stat">
            <h3>{stats.samples}</h3>
            <p>Samples</p>
          </div>
          <div className="stat">
            <h3>Online</h3>
            <p>System Status</p>
          </div>
        </div>
      )}
    </section>
  );
}

export default StatsPanel;
