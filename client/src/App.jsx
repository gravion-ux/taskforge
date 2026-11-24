import React from 'react';
import { Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ProjectBoard from './pages/ProjectBoard';
import { isLoggedIn, clearSession, getStoredUser } from './api/client';

function RequireAuth({ children }) {
  return isLoggedIn() ? children : <Navigate to="/login" replace />;
}

function Layout({ children }) {
  const navigate = useNavigate();
  const user = getStoredUser();
  function logout() {
    clearSession();
    navigate('/login');
  }
  return (
    <div>
      <header className="topbar">
        <Link to="/" className="brand">
          TaskForge
        </Link>
        <div className="topbar-right">
          {user && (
            <span className="muted small">
              {user.name} ({user.role})
            </span>
          )}
          <button className="btn ghost" onClick={logout}>
            Log out
          </button>
        </div>
      </header>
      {children}
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <Layout>
              <Dashboard />
            </Layout>
          </RequireAuth>
        }
      />
      <Route
        path="/projects/:projectId"
        element={
          <RequireAuth>
            <Layout>
              <ProjectBoard />
            </Layout>
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
