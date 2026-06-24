import React from 'react';
import { Navigate, NavLink, Route, Routes } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { AuthProvider, useAuth } from './auth.jsx';
import logo from './assets/logo.png';
import Home from './pages/Home.jsx';
import AuthPage from './pages/AuthPage.jsx';
import GadgetDetail from './pages/GadgetDetail.jsx';
import ArticleDetail from './pages/ArticleDetail.jsx';
import AdminPanel from './pages/AdminPanel.jsx';
import Feed from './pages/Feed.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import PublicProfile from './pages/PublicProfile.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import AllGadgets from './pages/AllGadgets.jsx';

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:4000';
function resolveImage(url) {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${API_BASE}${url}`;
}

function Shell() {
  const { user, logout, loading } = useAuth();

  return (
    <>
      <header className="topbar">
        <NavLink to="/" className="brand">
          <img src={logo} alt="BoysGadget Stream" style={{ height: 36, width: 'auto' }} />
        </NavLink>
        <nav className="nav">
          <NavLink to="/">Explore</NavLink>
          <NavLink to="/feed">Feed</NavLink>
          {user?.role === 'admin' && (
            <NavLink to="/admin" className="admin-link">
              <ShieldCheck size={16} />
              Admin
            </NavLink>
          )}
          {!loading && user ? (
            <NavLink to="/profile" className="icon-text profile-nav-btn">
              {user.avatar_url ? (
                <img src={resolveImage(user.avatar_url)} alt="avatar" className="nav-avatar" />
              ) : (
                <span className="nav-avatar-placeholder">{user.username?.[0]?.toUpperCase()}</span>
              )}
              {user.username}
            </NavLink>
          ) : (
            <NavLink to="/auth">Masuk</NavLink>
          )}
        </nav>
      </header>

      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/gadgets" element={<AllGadgets />} />
          <Route path="/feed" element={<Feed />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/user/:username" element={<PublicProfile />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/gadgets/:id" element={<GadgetDetail />} />
          <Route path="/articles/:slug" element={<ArticleDetail />} />
          <Route path="/admin" element={<RequireAdmin><AdminPanel /></RequireAdmin>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  );
}

function RequireAdmin({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="page"><div className="empty">Loading...</div></div>;
  if (user?.role !== 'admin') return <Navigate to="/auth" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  );
}
