import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Settings } from 'lucide-react';
import api from '../api.js';
import { useAuth } from '../auth.jsx';

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:4000';

function resolveImage(url) {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${API_BASE}${url}`;
}

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60) return 'baru saja';
  if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
  return `${Math.floor(diff / 86400)} hari lalu`;
}

export default function ProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [historyTab, setHistoryTab] = useState('posts');
  const [posts, setPosts] = useState([]);
  const [replies, setReplies] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    if (!user) return;
    api.get(`/feed/user/${user.username}`)
      .then(({ data }) => {
        setPosts(data.posts || []);
        setReplies(data.replies || []);
      })
      .finally(() => setLoadingHistory(false));
  }, [user?.username]);

  if (!user) { navigate('/auth'); return null; }

  const avatarSrc = resolveImage(user.avatar_url);

  return (
    <div className="page" style={{ maxWidth: 680 }}>

      {/* Kartu profil dengan icon settings */}
      <div className="profile-avatar-section" style={{ marginBottom: 24, position: 'relative' }}>
        <div className="profile-avatar-wrap">
          {avatarSrc
            ? <img src={avatarSrc} alt="avatar" className="profile-avatar-img" />
            : <div className="profile-avatar-placeholder">{user.username?.[0]?.toUpperCase()}</div>
          }
        </div>
        <div style={{ flex: 1 }}>
          <strong style={{ fontSize: '1.2rem' }}>{user.username}</strong>
          <p className="muted" style={{ margin: '4px 0 0', fontSize: '.9rem' }}>{user.email}</p>
          <p className="muted" style={{ margin: '2px 0 0', fontSize: '.85rem' }}>
            {user.role === 'admin' ? '👑 Admin' : '👤 Member'}
          </p>
          <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
            <span style={{ fontSize: '.9rem' }}><strong>{posts.length}</strong> <span className="muted">post</span></span>
            <span style={{ fontSize: '.9rem' }}><strong>{replies.length}</strong> <span className="muted">reply</span></span>
          </div>
        </div>
        <Link
          to="/settings"
          title="Pengaturan akun"
          style={{ position: 'absolute', top: 0, right: 0, padding: 6, color: 'var(--muted)', borderRadius: 8, display: 'grid', placeItems: 'center' }}
        >
          <Settings size={20} />
        </Link>
      </div>

      {/* Tab post / reply */}
      <div className="segmented" style={{ marginBottom: 16 }}>
        <button type="button" className={historyTab === 'posts' ? 'active' : ''} onClick={() => setHistoryTab('posts')}>
          Post ({posts.length})
        </button>
        <button type="button" className={historyTab === 'replies' ? 'active' : ''} onClick={() => setHistoryTab('replies')}>
          Reply ({replies.length})
        </button>
      </div>

      {loadingHistory ? (
        <div className="empty">Memuat riwayat...</div>
      ) : historyTab === 'posts' ? (
        <div className="posts-list">
          {posts.length === 0 ? (
            <div className="empty">Belum ada post.</div>
          ) : posts.map(post => (
            <Link key={post.id} to={`/feed?post=${post.id}`} className="profile-activity-card">
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: '0 0 8px', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {post.content}
                </p>
                {post.gadget_names && (
                  <span className="post-tag" style={{ fontSize: '.78rem' }}>{post.gadget_names}</span>
                )}
                <div className="profile-activity-meta">
                  <span className="muted" style={{ fontSize: '.8rem' }}>{timeAgo(post.created_at)}</span>
                  <span className="muted" style={{ fontSize: '.8rem' }}>❤ {post.like_count} · 💬 {post.reply_count}</span>
                </div>
              </div>
              {post.image_url && (
                <img
                  src={resolveImage(post.image_url)}
                  alt=""
                  style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }}
                />
              )}
            </Link>
          ))}
        </div>
      ) : (
        <div className="posts-list">
          {replies.length === 0 ? (
            <div className="empty">Belum ada reply.</div>
          ) : replies.map(reply => (
            <Link key={reply.id} to={`/feed?post=${reply.post_id}`} className="profile-activity-card">
              <div style={{ flex: 1 }}>
                <p className="muted" style={{ margin: '0 0 6px', fontSize: '.82rem' }}>
                  Membalas <strong>{reply.post_author}</strong>:
                  <em style={{ marginLeft: 6 }}>
                    "{reply.post_content?.slice(0, 80)}{reply.post_content?.length > 80 ? '...' : ''}"
                  </em>
                </p>
                <p style={{ margin: 0 }}>{reply.content}</p>
                <p className="muted" style={{ margin: '6px 0 0', fontSize: '.8rem' }}>{timeAgo(reply.created_at)}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
