import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Edit2, ExternalLink, Heart, Image, MessageCircle, Send, Trash2, X } from 'lucide-react';
import api from '../api.js';
import { useAuth } from '../auth.jsx';

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:4000';

function resolveImage(url) {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${API_BASE}${url}`;
}

function Avatar({ src, username, size = 36 }) {
  return (
    <div style={{
      width: size, height: size, minWidth: size, minHeight: size, maxWidth: size, maxHeight: size,
      borderRadius: '50%', overflow: 'hidden', background: 'var(--brand)', color: '#fff',
      display: 'grid', placeItems: 'center', fontWeight: 800,
      fontSize: size < 32 ? '.8rem' : '1rem', flexShrink: 0, flexGrow: 0,
    }}>
      {src
        ? <img src={src} alt={username} style={{ width: size, height: size, objectFit: 'cover', display: 'block', flexShrink: 0 }} />
        : username?.[0]?.toUpperCase()
      }
    </div>
  );
}

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60) return 'baru saja';
  if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
  return `${Math.floor(diff / 86400)} hari lalu`;
}

function renderContent(content, gadgets) {
  if (!gadgets?.length) return content;
  const idMap = {};
  for (const g of gadgets) {
    const slug = g.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    idMap[slug] = g;
  }
  const parts = content.split(/(#[a-z0-9][a-z0-9-]*)/gi);
  return parts.map((part, i) => {
    const match = part.match(/^#([a-z0-9][a-z0-9-]*)$/i);
    if (match) {
      const slug = match[1].toLowerCase();
      const gadget = idMap[slug];
      if (gadget) return <Link key={i} to={`/gadgets/${gadget.id}`} className="tag-link">#{match[1]}</Link>;
    }
    return part;
  });
}

function PostCard({ post, onLike, onReplyAdded, onDelete }) {
  const { user } = useAuth();
  const [showReplies, setShowReplies] = useState(false);
  const [replies, setReplies] = useState([]);
  const [replyText, setReplyText] = useState('');
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [submittingReply, setSubmittingReply] = useState(false);

  const canDelete = user && (user.id === post.user_id || user.role === 'admin');

  const loadReplies = async () => {
    if (loadingReplies) return;
    setLoadingReplies(true);
    try {
      const { data } = await api.get(`/feed/posts/${post.id}/replies`);
      setReplies(data);
      setShowReplies(true);
    } finally {
      setLoadingReplies(false);
    }
  };

  const toggleReplies = () => {
    if (!showReplies) loadReplies();
    else setShowReplies(false);
  };

  const submitReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || submittingReply) return;
    setSubmittingReply(true);
    try {
      const { data } = await api.post(`/feed/posts/${post.id}/replies`, { content: replyText });
      setReplies(r => [...r, data]);
      setReplyText('');
      onReplyAdded(post.id);
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal mengirim reply.');
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleDeletePost = async () => {
    if (!window.confirm('Hapus post ini?')) return;
    try {
      await api.delete(`/feed/posts/${post.id}`);
      onDelete(post.id);
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal menghapus.');
    }
  };

  const handleDeleteReply = async (replyId) => {
    if (!window.confirm('Hapus reply ini?')) return;
    try {
      await api.delete(`/feed/posts/${post.id}/replies/${replyId}`);
      setReplies(r => r.filter(reply => reply.id !== replyId));
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal menghapus reply.');
    }
  };

  const avatarSrc = post.avatar_url ? resolveImage(post.avatar_url) : null;

  return (
    <div className="post-card">
      <div className="post-header">
        <Avatar src={avatarSrc} username={post.username} size={36} />
        <div style={{ flex: 1 }}>
          <Link to={`/user/${post.username}`} style={{ fontWeight: 700, color: 'var(--text)' }}>
            {post.username}
          </Link>
          <span className="post-time">{timeAgo(post.created_at)}</span>
        </div>
        {canDelete && (
          <button type="button" className="delete-btn" onClick={handleDeletePost} title="Hapus post">
            <Trash2 size={15} />
          </button>
        )}
      </div>

      <p className="post-content">{renderContent(post.content, post.gadgets)}</p>

      {post.image_url && (
        <img src={resolveImage(post.image_url)} alt="post" className="post-image" />
      )}

      {post.gadgets?.length > 0 && (
        <div className="post-tags">
          {post.gadgets.map(g => (
            <Link key={g.id} to={`/gadgets/${g.id}`} className="post-tag">
              {g.brand} {g.name}
            </Link>
          ))}
        </div>
      )}

      <div className="post-actions">
        {user ? (
          <button
            className={`post-action-btn${post.liked_by_me ? ' liked' : ''}`}
            onClick={() => onLike(post.id)}
            type="button"
          >
            <Heart size={15} fill={post.liked_by_me ? 'currentColor' : 'none'} />
            {post.like_count}
          </button>
        ) : (
          <span className="post-action-btn muted"><Heart size={15} />{post.like_count}</span>
        )}
        <button className="post-action-btn" onClick={toggleReplies} type="button">
          <MessageCircle size={15} />
          {post.reply_count} Balas {showReplies ? '▲' : '▼'}
        </button>
      </div>

      {showReplies && (
        <div className="replies-section">
          {replies.map(r => {
            const rAvatar = r.avatar_url ? resolveImage(r.avatar_url) : null;
            const canDeleteReply = user && (user.id === r.user_id || user.role === 'admin');
            return (
              <div className="reply-row" key={r.id}>
                <Avatar src={rAvatar} username={r.username} size={28} />
                <div style={{ flex: 1 }}>
                  <strong>{r.username}</strong>
                  <span className="post-time">{timeAgo(r.created_at)}</span>
                  <p style={{ margin: '4px 0 0', fontSize: '.9rem' }}>{r.content}</p>
                </div>
                {canDeleteReply && (
                  <button type="button" className="delete-btn sm" onClick={() => handleDeleteReply(r.id)} title="Hapus reply">
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            );
          })}
          {user ? (
            <form className="reply-form" onSubmit={submitReply}>
              <input
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                placeholder="Tulis balasan..."
                maxLength={300}
              />
              <button type="submit" className="reply-send-btn" disabled={!replyText.trim() || submittingReply}>
                <Send size={15} />
              </button>
            </form>
          ) : (
            <p className="muted" style={{ fontSize: '.85rem', padding: '8px 0' }}>
              <Link to="/auth" style={{ color: 'var(--brand)', fontWeight: 700 }}>Login</Link> untuk membalas.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function GadgetDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [gadget, setGadget] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);

  const [postText, setPostText] = useState('');
  const [postImage, setPostImage] = useState(null);
  const [postImagePreview, setPostImagePreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const postFileRef = useRef(null);

  useEffect(() => {
    api.get(`/gadgets/${id}`).then(({ data }) => setGadget(data));
    api.get(`/feed/gadget/${id}`)
      .then(({ data }) => setPosts(data.posts || []))
      .finally(() => setLoadingPosts(false));
  }, [id]);

  useEffect(() => {
    if (gadget && user) {
      const slug = gadget.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      setPostText(`#${slug} `);
    }
  }, [gadget, user]);

  const handleLike = async (postId) => {
    try {
      const { data } = await api.post(`/feed/posts/${postId}/like`);
      setPosts(prev => prev.map(p => p.id === postId ? {
        ...p,
        liked_by_me: data.status === 'liked',
        like_count: data.status === 'liked' ? p.like_count + 1 : p.like_count - 1,
      } : p));
    } catch {}
  };

  const handleReplyAdded = (postId) => {
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, reply_count: p.reply_count + 1 } : p));
  };

  const handleDelete = (postId) => {
    setPosts(prev => prev.filter(p => p.id !== postId));
  };

  const handleDeleteGadget = async () => {
    if (!window.confirm(`Hapus gadget "${gadget.name}"? Tindakan ini tidak bisa dibatalkan.`)) return;
    try {
      await api.delete(`/admin/gadgets/${id}`);
      navigate('/');
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal menghapus gadget.');
    }
  };

  const submitPost = async (e) => {
    e.preventDefault();
    if (!postText.trim() || submitting) return;
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('content', postText);
      if (postImage) formData.append('image', postImage);
      const { data } = await api.post('/feed/posts', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPosts(prev => [data, ...prev]);
      const slug = gadget.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      setPostText(`#${slug} `);
      setPostImage(null);
      setPostImagePreview(null);
      if (postFileRef.current) postFileRef.current.value = '';
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal posting.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!gadget) return <div className="page"><div className="empty">Memuat gadget...</div></div>;

  const gadgetSlug = gadget.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

  return (
    <div className="page">
      <div className="detail-layout">
        <section className="detail-main">
          {gadget.image_url && (
            <img className="detail-image" src={resolveImage(gadget.image_url)} alt={gadget.name} />
          )}
          <div className="eyebrow">{gadget.category}</div>
          <h1>{gadget.brand} {gadget.name}</h1>
          <p className="lead">{gadget.summary}</p>
          <div className="facts">
            <span>Views: {Number(gadget.view_count).toLocaleString('id-ID')}</span>
            {gadget.release_year && <span>Rilis: {gadget.release_year}</span>}
            {gadget.price && <span>Harga: Rp {Number(gadget.price).toLocaleString('id-ID')}</span>}
            {gadget.source_url && (
              <a href={gadget.source_url} target="_blank" rel="noreferrer">
                <ExternalLink size={14} />Sumber
              </a>
            )}
          </div>
          {user?.role === 'admin' && (
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <Link to="/admin" state={{ editGadgetId: gadget.id }} className="ghost-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: '1px solid var(--line)', fontWeight: 700, fontSize: '.9rem', textDecoration: 'none', color: 'var(--text)' }}>
                <Edit2 size={15} />Edit Gadget
              </Link>
              <button type="button" onClick={handleDeleteGadget} className="ghost-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: '1px solid var(--accent)', color: 'var(--accent)', fontWeight: 700, fontSize: '.9rem', background: 'transparent', cursor: 'pointer' }}>
                <Trash2 size={15} />Hapus Gadget
              </button>
            </div>
          )}
        </section>

        <aside className="detail-side">
          <h2>Spesifikasi</h2>
          <div className="spec-list">
            {gadget.specs?.length ? gadget.specs.map(spec => (
              <div className="spec-row" key={spec.id}>
                <span>{spec.spec_key}</span>
                <strong>{spec.spec_value}</strong>
              </div>
            )) : <p className="muted">Belum ada spesifikasi.</p>}
          </div>
          <h2 style={{ marginTop: 20 }}>Berita Terkait</h2>
          <div className="side-links">
            {gadget.articles?.length ? gadget.articles.map(article => (
              <Link key={article.id} to={`/articles/${article.slug}`}>{article.title}</Link>
            )) : <p className="muted">Belum ada berita terkait.</p>}
          </div>
        </aside>
      </div>

      <section className="section">
        <div className="section-head">
          <div>
            <h2>Diskusi — {gadget.brand} {gadget.name}</h2>
            <p>{posts.length} diskusi · tag <code style={{ background: 'var(--surface-2)', padding: '1px 6px', borderRadius: 4 }}>#{gadgetSlug}</code></p>
          </div>
        </div>

        {user ? (
          <div className="post-composer" style={{ marginBottom: 16 }}>
            <Avatar src={user.avatar_url ? resolveImage(user.avatar_url) : null} username={user.username} size={36} />
            <div className="composer-inner">
              <form onSubmit={submitPost}>
                <textarea
                  value={postText}
                  onChange={e => setPostText(e.target.value)}
                  placeholder={`Tulis pendapat kamu tentang #${gadgetSlug}...`}
                  maxLength={500}
                  rows={3}
                />
                {postImagePreview && (
                  <div className="composer-image-preview">
                    <img src={postImagePreview} alt="preview" />
                    <button type="button" className="upload-clear" onClick={() => {
                      setPostImage(null);
                      setPostImagePreview(null);
                      if (postFileRef.current) postFileRef.current.value = '';
                    }}><X size={14} /></button>
                  </div>
                )}
                <div className="composer-footer">
                  <button type="button" className="img-upload-btn" onClick={() => postFileRef.current?.click()} title="Lampirkan gambar">
                    <Image size={18} />
                  </button>
                  <input
                    ref={postFileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    style={{ display: 'none' }}
                    onChange={e => {
                      const file = e.target.files[0];
                      if (file) { setPostImage(file); setPostImagePreview(URL.createObjectURL(file)); }
                    }}
                  />
                  <span className="char-count">{postText.length}/500</span>
                  <button
                    type="submit"
                    className="primary-btn"
                    style={{ width: 'auto', padding: '8px 20px' }}
                    disabled={!postText.trim() || submitting}
                  >
                    {submitting ? 'Posting...' : 'Post'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : (
          <div className="login-nudge" style={{ marginBottom: 16 }}>
            <Link to="/auth">Login</Link> untuk ikut diskusi tentang gadget ini.
          </div>
        )}

        {loadingPosts ? (
          <div className="empty">Memuat diskusi...</div>
        ) : posts.length === 0 ? (
          <div className="empty">
            Belum ada diskusi.{user ? ' Jadilah yang pertama!' : <> <Link to="/auth" style={{ color: 'var(--brand)', fontWeight: 700 }}>Login</Link> untuk mulai diskusi.</>}
          </div>
        ) : (
          <div className="posts-list">
            {posts.map(post => (
              <PostCard
                key={post.id}
                post={post}
                onLike={handleLike}
                onReplyAdded={handleReplyAdded}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
