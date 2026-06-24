import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { MessageCircle, FileText } from 'lucide-react';
import api from '../api.js';

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

export default function PublicProfile() {
  const { username } = useParams();
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('posts');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    api.get(`/feed/user/${username}`)
      .then(({ data }) => setData(data))
      .catch(() => setError('User tidak ditemukan.'))
      .finally(() => setLoading(false));
  }, [username]);

  if (loading) return <div className="page"><div className="empty">Memuat profil...</div></div>;
  if (error) return <div className="page"><div className="empty">{error}</div></div>;

  const { user, posts, replies } = data;
  const avatarSrc = resolveImage(user.avatar_url);

  return (
    <div className="page" style={{ maxWidth: 680 }}>
      {/* Profile header */}
      <div className="profile-avatar-section" style={{ marginBottom: 24 }}>
        <div className="profile-avatar-wrap">
          {avatarSrc ? (
            <img src={avatarSrc} alt={user.username} className="profile-avatar-img" />
          ) : (
            <div className="profile-avatar-placeholder">
              {user.username?.[0]?.toUpperCase()}
            </div>
          )}
        </div>
        <div>
          <strong style={{ fontSize: '1.3rem' }}>{user.username}</strong>
          <p className="muted" style={{ margin: '4px 0 0', fontSize: '.9rem' }}>
            {user.role === 'admin' ? '👑 Admin' : '👤 Member'}
          </p>
          <p className="muted" style={{ margin: '4px 0 0', fontSize: '.85rem' }}>
            Bergabung {new Date(user.created_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'long' })}
          </p>
          <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
            <span style={{ fontSize: '.9rem' }}><strong>{posts.length}</strong> <span className="muted">post</span></span>
            <span style={{ fontSize: '.9rem' }}><strong>{replies.length}</strong> <span className="muted">reply</span></span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="segmented" style={{ marginBottom: 16 }}>
        <button
          type="button"
          className={tab === 'posts' ? 'active' : ''}
          onClick={() => setTab('posts')}
        >
          <FileText size={14} style={{ display: 'inline', marginRight: 6 }} />
          Post ({posts.length})
        </button>
        <button
          type="button"
          className={tab === 'replies' ? 'active' : ''}
          onClick={() => setTab('replies')}
        >
          <MessageCircle size={14} style={{ display: 'inline', marginRight: 6 }} />
          Reply ({replies.length})
        </button>
      </div>

      {/* Posts tab */}
      {tab === 'posts' && (
        <div className="posts-list">
          {posts.length === 0 ? (
            <div className="empty">Belum ada post.</div>
          ) : posts.map(post => (
            <Link
              key={post.id}
              to={`/feed?post=${post.id}`}
              className="profile-activity-card"
            >
              <p className="post-content" style={{ margin: 0, WebkitLineClamp: 3, overflow: 'hidden', display: '-webkit-box', WebkitBoxOrient: 'vertical' }}>
                {post.content}
              </p>
              {post.image_url && (
                <img
                  src={resolveImage(post.image_url)}
                  alt=""
                  style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }}
                />
              )}
              <div className="profile-activity-meta">
                {post.gadget_names && (
                  <span className="post-tag" style={{ fontSize: '.78rem' }}>{post.gadget_names}</span>
                )}
                <span className="muted" style={{ fontSize: '.8rem' }}>{timeAgo(post.created_at)}</span>
                <span className="muted" style={{ fontSize: '.8rem' }}>❤ {post.like_count} · 💬 {post.reply_count}</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Replies tab */}
      {tab === 'replies' && (
        <div className="posts-list">
          {replies.length === 0 ? (
            <div className="empty">Belum ada reply.</div>
          ) : replies.map(reply => (
            <Link
              key={reply.id}
              to={`/feed?post=${reply.post_id}`}
              className="profile-activity-card"
            >
              <div style={{ flex: 1 }}>
                <p className="muted" style={{ margin: '0 0 6px', fontSize: '.82rem' }}>
                  Membalas post <strong>{reply.post_author}</strong>:
                  <em style={{ marginLeft: 6, color: 'var(--muted)' }}>
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
