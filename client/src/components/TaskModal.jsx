import React, { useEffect, useState } from 'react';
import { api, getStoredUser } from '../api/client';

export default function TaskModal({ projectId, task, columns, onClose, onChanged }) {
  const [form, setForm] = useState({
    title: task?.title || '',
    description: task?.description || '',
    priority: task?.priority || 'medium',
    dueDate: task?.dueDate ? task.dueDate.slice(0, 10) : '',
    labels: (task?.labels || []).join(', '),
    columnId: task?.columnId || columns[0]?._id || '',
  });
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [error, setError] = useState('');
  const me = getStoredUser();

  useEffect(() => {
    if (task) {
      api
        .listComments(projectId, task._id)
        .then((d) => setComments(d.comments))
        .catch((err) => setError(err.message));
    }
  }, [projectId, task]);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function onSave(e) {
    e.preventDefault();
    setError('');
    const payload = {
      title: form.title,
      description: form.description,
      priority: form.priority,
      dueDate: form.dueDate || null,
      labels: form.labels.split(',').map((s) => s.trim()).filter(Boolean),
      columnId: form.columnId,
    };
    try {
      if (task) await api.updateTask(projectId, task._id, payload);
      else await api.createTask(projectId, payload);
      onChanged();
      onClose();
    } catch (err) {
      setError(err.message);
    }
  }

  async function onDelete() {
    if (!task || !window.confirm('Delete this task?')) return;
    try {
      await api.deleteTask(projectId, task._id);
      onChanged();
      onClose();
    } catch (err) {
      setError(err.message);
    }
  }

  async function onComment(e) {
    e.preventDefault();
    try {
      const d = await api.addComment(projectId, task._id, commentText);
      setComments((c) => [...c, d.comment]);
      setCommentText('');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{task ? 'Task details' : 'New task'}</h3>
          <button className="btn ghost" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        {error && <div className="error-box">{error}</div>}
        <form onSubmit={onSave} className="task-form">
          <label>
            Title
            <input value={form.title} onChange={(e) => set('title', e.target.value)} required />
          </label>
          <label>
            Description
            <textarea rows={3} value={form.description} onChange={(e) => set('description', e.target.value)} />
          </label>
          <div className="row">
            <label>
              Column
              <select value={form.columnId} onChange={(e) => set('columnId', e.target.value)}>
                {columns.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Priority
              <select value={form.priority} onChange={(e) => set('priority', e.target.value)}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </label>
            <label>
              Due date
              <input type="date" value={form.dueDate} onChange={(e) => set('dueDate', e.target.value)} />
            </label>
          </div>
          <label>
            Labels (comma separated)
            <input value={form.labels} onChange={(e) => set('labels', e.target.value)} placeholder="bug, ui, backend" />
          </label>
          <div className="row end">
            {task && (
              <button type="button" className="btn danger" onClick={onDelete}>
                Delete task
              </button>
            )}
            <button className="btn primary">{task ? 'Save changes' : 'Create task'}</button>
          </div>
        </form>

        {task && (
          <div className="comments">
            <h4>Comments</h4>
            {comments.length === 0 && <p className="muted small">No comments yet.</p>}
            {comments.map((c) => (
              <div key={c._id} className="comment">
                <strong>{c.author?.name || 'Unknown'}</strong>{' '}
                <span className="muted small">
                  {new Date(c.createdAt).toLocaleString()}
                  {me && c.author && c.author._id === me._id ? ' · you' : ''}
                </span>
                <p>{c.body}</p>
              </div>
            ))}
            <form onSubmit={onComment} className="row">
              <input
                placeholder="Write a comment…"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                required
              />
              <button className="btn">Comment</button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
