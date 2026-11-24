import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';

export default function Dashboard() {
  const [projects, setProjects] = useState([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const data = await api.listProjects();
      setProjects(data.projects);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onCreate(e) {
    e.preventDefault();
    setError('');
    try {
      await api.createProject({ name, description });
      setName('');
      setDescription('');
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="page">
      <h2>Your projects</h2>
      {error && <div className="error-box">{error}</div>}
      <form className="card new-project" onSubmit={onCreate}>
        <h3>New project</h3>
        <input placeholder="Project name" value={name} onChange={(e) => setName(e.target.value)} required />
        <input
          placeholder="Short description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <button className="btn primary">Create project</button>
      </form>

      {loading ? (
        <p className="muted">Loading…</p>
      ) : projects.length === 0 ? (
        <p className="muted">No projects yet — create your first one above.</p>
      ) : (
        <div className="project-grid">
          {projects.map((p) => (
            <Link key={p._id} to={`/projects/${p._id}`} className="card project-card">
              <h3>{p.name}</h3>
              <p className="muted">{p.description || 'No description'}</p>
              <p className="muted small">
                {Array.isArray(p.members) ? p.members.length : 0} member(s) · updated{' '}
                {new Date(p.updatedAt).toLocaleDateString()}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
