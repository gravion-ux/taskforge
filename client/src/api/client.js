const BASE = import.meta.env.VITE_API_URL || '';

function getToken() {
  return localStorage.getItem('tf_token');
}

export function setSession(token, user) {
  if (token) localStorage.setItem('tf_token', token);
  if (user) localStorage.setItem('tf_user', JSON.stringify(user));
}

export function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem('tf_user'));
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem('tf_token');
  localStorage.removeItem('tf_user');
}

export function isLoggedIn() {
  return Boolean(getToken());
}

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export const api = {
  register: (body) => request('/api/auth/register', { method: 'POST', body }),
  login: (body) => request('/api/auth/login', { method: 'POST', body }),
  me: () => request('/api/auth/me'),
  listUsers: () => request('/api/auth/users'),
  listProjects: () => request('/api/projects'),
  createProject: (body) => request('/api/projects', { method: 'POST', body }),
  getProject: (id) => request(`/api/projects/${id}`),
  addMember: (id, email) => request(`/api/projects/${id}/members`, { method: 'POST', body: { email } }),
  getBoard: (id) => request(`/api/projects/${id}/board`),
  addColumn: (id, title) => request(`/api/projects/${id}/board/columns`, { method: 'POST', body: { title } }),
  createTask: (projectId, body) => request(`/api/projects/${projectId}/tasks`, { method: 'POST', body }),
  updateTask: (projectId, taskId, body) =>
    request(`/api/projects/${projectId}/tasks/${taskId}`, { method: 'PATCH', body }),
  deleteTask: (projectId, taskId) => request(`/api/projects/${projectId}/tasks/${taskId}`, { method: 'DELETE' }),
  listComments: (projectId, taskId) => request(`/api/projects/${projectId}/tasks/${taskId}/comments`),
  addComment: (projectId, taskId, body) =>
    request(`/api/projects/${projectId}/tasks/${taskId}/comments`, { method: 'POST', body: { body } }),
};
