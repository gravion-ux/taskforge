import React, { useCallback, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, getStoredUser } from '../api/client';
import TaskModal from '../components/TaskModal';

const PRIORITY_CLASS = { low: 'p-low', medium: 'p-medium', high: 'p-high', urgent: 'p-urgent' };

export default function ProjectBoard() {
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [board, setBoard] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null); // task object or 'new'
  const [memberEmail, setMemberEmail] = useState('');
  const [newColumn, setNewColumn] = useState('');
  const me = getStoredUser();

  const load = useCallback(async () => {
    try {
      const [p, b] = await Promise.all([api.getProject(projectId), api.getBoard(projectId)]);
      setProject(p.project);
      setBoard(b.board);
      setTasks(b.tasks);
    } catch (err) {
      setError(err.message);
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  const isOwner = project && me && (project.owner === me._id || project.owner?._id === me._id || me.role === 'admin');

  async function onDrop(e, columnId) {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/task-id');
    const task = tasks.find((t) => t._id === taskId);
    if (!task || task.columnId === columnId) return;
    const position = tasks.filter((t) => t.columnId === columnId).length;
    setTasks((ts) => ts.map((t) => (t._id === taskId ? { ...t, columnId, position } : t)));
    try {
      await api.updateTask(projectId, taskId, { columnId, position });
    } catch (err) {
      setError(err.message);
      load();
    }
  }

  async function onAddMember(e) {
    e.preventDefault();
    try {
      await api.addMember(projectId, memberEmail);
      setMemberEmail('');
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function onAddColumn(e) {
    e.preventDefault();
    try {
      await api.addColumn(projectId, newColumn);
      setNewColumn('');
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  if (error && !board) return <div className="page"><div className="error-box">{error}</div></div>;
  if (!board || !project) return <div className="page"><p className="muted">Loading board…</p></div>;

  const columns = [...board.columns].sort((a, b) => a.position - b.position);

  return (
    <div className="page wide">
      <div className="board-head">
        <div>
          <Link to="/" className="muted small">← All projects</Link>
          <h2>{project.name}</h2>
          <p className="muted">{project.description}</p>
        </div>
        <button className="btn primary" onClick={() => setSelected('new')}>
          + New task
        </button>
      </div>
      {error && <div className="error-box">{error}</div>}

      {isOwner && (
        <div className="row wrap">
          <form onSubmit={onAddMember} className="inline-form">
            <input
              type="email"
              placeholder="Add member by email"
              value={memberEmail}
              onChange={(e) => setMemberEmail(e.target.value)}
              required
            />
            <button className="btn">Add member</button>
          </form>
          <form onSubmit={onAddColumn} className="inline-form">
            <input placeholder="New column title" value={newColumn} onChange={(e) => setNewColumn(e.target.value)} required />
            <button className="btn">Add column</button>
          </form>
        </div>
      )}

      <div className="board">
        {columns.map((col) => {
          const colTasks = tasks
            .filter((t) => t.columnId === col._id)
            .sort((a, b) => a.position - b.position);
          return (
            <section
              key={col._id}
              className="column"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => onDrop(e, col._id)}
            >
              <header>
                <h4>{col.title}</h4>
                <span className="count">{colTasks.length}</span>
              </header>
              {colTasks.map((t) => (
                <article
                  key={t._id}
                  className="task-card"
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData('text/task-id', t._id)}
                  onClick={() => setSelected(t)}
                >
                  <div className="task-top">
                    <strong>{t.title}</strong>
                    <span className={`badge ${PRIORITY_CLASS[t.priority]}`}>{t.priority}</span>
                  </div>
                  {t.labels?.length > 0 && (
                    <div className="labels">
                      {t.labels.map((l) => (
                        <span key={l} className="label">
                          {l}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="muted small">
                    {t.assignee ? `Assigned: ${t.assignee.name}` : 'Unassigned'}
                    {t.dueDate ? ` · Due ${new Date(t.dueDate).toLocaleDateString()}` : ''}
                  </div>
                </article>
              ))}
              {colTasks.length === 0 && <p className="muted small empty">Drop tasks here</p>}
            </section>
          );
        })}
      </div>

      {selected && (
        <TaskModal
          projectId={projectId}
          task={selected === 'new' ? null : selected}
          columns={columns}
          onClose={() => setSelected(null)}
          onChanged={load}
        />
      )}
    </div>
  );
}
