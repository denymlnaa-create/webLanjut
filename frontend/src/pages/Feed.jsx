import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Heart, Image, MessageCircle, Send, Trash2, X } from 'lucide-react';
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
      width: size,
      height: size,
      minWidth: size,
      minHeight: size,
      maxWidth: size,
      maxHeight: size,
      borderRadius: '50%',
      overflow: 'hidden',
      background: 'var(--brand)',
      color: '#fff',
      display: 'grid',
      placeItems: 'center',
      fontWeight: 800,
      fontSize: size < 32 ? '.8rem' : '1rem',
      flexShrink: 0,
      flexGrow: 0,
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
  const slugMap = {};
  for (const g of gadgets) {
    const slug = g.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    slugMap[slug] = g;
  }
  const parts = content.split(/(#[a-z0-9][a-z0-9-]*)/gi);
  return parts.map((part, i) => {
    const match = part.match(/^#([a-z0-9][a-z0-9-]*)$/i);
    if (match) {
      const slug = match[1].toLowerCase();
      const gadget = slugMap[slug];
      if (gadget) return <Link key={i} to={`/gadgets/${gadget.id}`} className="tag-link">#{match[1]}</Link>;
    }
    return part;
  });
}

function PostCard({ post, onLike, onReply, onDelete }) {
  const { user } = useAuth();
  const [showReplies, setShowReplies] = useState(false);
  const [replies, setReplies] = useState([]);
  const [replyText, setReplyText] = useState('');
  const [loadingReplies, setLoadingReplies] = useState(false);
  const canDelete = user && (user.id === post.user_id || user.role === 'admin');
  const avatarSrc = post.avatar_url ? resolveImage(post.avatar_url) : null;

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

  const toggleReplies = () => { if (!showReplies) loadReplies(); else setShowReplies(false); };

  const submitReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    try {
      const { data } = await api.post(`/feed/posts/${post.id}/replies`, { content: replyText });
      setReplies(r => [...r, data]);
      setReplyText('');
      onReply(post.id);
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal mengirim reply.');
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
      onReply(post.id, -1);
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal menghapus reply.');
    }
  };

  return (
    <div className="post-card" id={`post-${post.id}`}>
      <div className="post-header">
        <Avatar src={avatarSrc} username={post.username} size={36} />
        <div style={{ flex: 1 }}>
          <Link to={`/user/${post.username}`} style={{ fontWeight: 700, color: 'var(--text)' }}>{post.username}</Link>
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
            <Link key={g.id} to={`/gadgets/${g.id}`} className="post-tag">{g.brand} {g.name}</Link>
          ))}
        </div>
      )}

      <div className="post-actions">
        {user ? (
          <button className={`post-action-btn${post.liked_by_me ? ' liked' : ''}`} onClick={() => onLike(post.id)} type="button">
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
          {loadingReplies && <p className="muted" style={{ fontSize: '.85rem' }}>Memuat...</p>}
          {replies.map(r => {
            const rAvatar = r.avatar_url ? resolveImage(r.avatar_url) : null;
            const canDeleteReply = user && (user.id === r.user_id || user.role === 'admin');
            return (
              <div className="reply-row" key={r.id}>
                <Avatar src={rAvatar} username={r.username} size={28} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Link to={`/user/${r.username}`} style={{ fontWeight: 700, color: 'var(--text)' }}>{r.username}</Link>
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
              <input value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Tulis balasan..." maxLength={300} />
              <button type="submit" className="reply-send-btn" disabled={!replyText.trim()}>
                <Send size={15} />
              </button>
            </form>
          ) : (
            <p className="muted" style={{ fontSize: '.85rem', padding: '8px 0' }}>
              <Link to="/auth">Login</Link> untuk berpartisipasi.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function Feed() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const targetPostId = searchParams.get('post');
  const [posts, setPosts] = useState([]);
  const [postText, setPostText] = useState('');
  const [postImage, setPostImage] = useState(null);
  const [postImagePreview, setPostImagePreview] = useState(null);
  const postFileRef = useRef(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const loaderRef = useRef(null);
  const [gadgets, setGadgets] = useState([]);
  const [tagSuggestions, setTagSuggestions] = useState([]);
  const [caretPos, setCaretPos] = useState(null);

  useEffect(() => { api.get('/gadgets').then(({ data }) => setGadgets(data)); }, []);

  const loadPosts = useCallback(async (pg = 1) => {
    if (loading) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/feed/posts?page=${pg}&limit=20`);
      if (pg === 1) setPosts(data.posts);
      else setPosts(prev => [...prev, ...data.posts]);
      setHasMore(data.posts.length === 20);
    } finally {
      setLoading(false);
    }
  }, [loading]);

  useEffect(() => { loadPosts(1); }, []);

  useEffect(() => {
    if (!targetPostId || !posts.length) return;
    const el = document.getElementById(`post-${targetPostId}`);
    if (el) {
      setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
      el.style.outline = '2px solid var(--brand)';
      el.style.borderRadius = '8px';
      setTimeout(() => { el.style.outline = ''; }, 2500);
    }
  }, [targetPostId, posts]);

  useEffect(() => {
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loading) {
        const next = page + 1;
        setPage(next);
        loadPosts(next);
      }
    }, { threshold: 0.1 });
    if (loaderRef.current) obs.observe(loaderRef.current);
    return () => obs.disconnect();
  }, [hasMore, loading, page, loadPosts]);

  const handlePostInput = (e) => {
    const val = e.target.value;
    setPostText(val);
    const cursor = e.target.selectionStart;
    const textBefore = val.slice(0, cursor);
    const match = textBefore.match(/#([a-z0-9-]*)$/i);
    if (match) {
      const query = match[1].toLowerCase();
      setTagSuggestions(gadgets.filter(g => g.name.toLowerCase().includes(query) || g.brand.toLowerCase().includes(query)).slice(0, 5));
      setCaretPos(cursor);
    } else {
      setTagSuggestions([]);
    }
  };

  const insertTag = (gadget) => {
    const slug = gadget.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    const textBefore = postText.slice(0, caretPos);
    const textAfter = postText.slice(caretPos);
    setPostText(textBefore.replace(/#([a-z0-9-]*)$/i, `#${slug}`) + ' ' + textAfter);
    setTagSuggestions([]);
  };

  const submitPost = async (e) => {
    e.preventDefault();
    if (!postText.trim()) return;
    try {
      const formData = new FormData();
      formData.append('content', postText);
      if (postImage) formData.append('image', postImage);
      const { data } = await api.post('/feed/posts', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setPosts(prev => [data, ...prev]);
      setPostText('');
      setPostImage(null);
      setPostImagePreview(null);
      if (postFileRef.current) postFileRef.current.value = '';
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal posting.');
    }
  };

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

  const handleReply = (postId, delta = 1) => {
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, reply_count: Math.max(0, p.reply_count + delta) } : p));
  };

  const handleDelete = (postId) => {
    setPosts(prev => prev.filter(p => p.id !== postId));
  };

  return (
    <div className="page feed-layout">
      <div className="feed-main">
        <h1 style={{ marginBottom: 18 }}>Feed Diskusi</h1>

        {user ? (
          <div className="post-composer">
            <Avatar src={user.avatar_url ? resolveImage(user.avatar_url) : null} username={user.username} size={36} />
            <div className="composer-inner">
              <form onSubmit={submitPost}>
                <textarea
                  value={postText}
                  onChange={handlePostInput}
                  placeholder="Apa yang kamu pikirkan? Gunakan #nama-gadget untuk tag produk."
                  maxLength={500}
                  rows={3}
                />
                {tagSuggestions.length > 0 && (
                  <div className="tag-suggestions">
                    {tagSuggestions.map(g => (
                      <button key={g.id} type="button" className="tag-suggest-item" onClick={() => insertTag(g)}>
                        <strong>{g.brand}</strong> {g.name}
                      </button>
                    ))}
                  </div>
                )}
                {postImagePreview && (
                  <div className="composer-image-preview">
                    <img src={postImagePreview} alt="preview" />
                    <button type="button" className="upload-clear" onClick={() => {
                      setPostImage(null); setPostImagePreview(null);
                      if (postFileRef.current) postFileRef.current.value = '';
                    }}><X size={14} /></button>
                  </div>
                )}
                <div className="composer-footer">
                  <button type="button" className="img-upload-btn" onClick={() => postFileRef.current?.click()} title="Upload gambar">
                    <Image size={18} />
                  </button>
                  <input ref={postFileRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }}
                    onChange={e => { const f = e.target.files[0]; if (f) { setPostImage(f); setPostImagePreview(URL.createObjectURL(f)); } }}
                  />
                  <span className="char-count">{postText.length}/500</span>
                  <button type="submit" className="primary-btn" style={{ width: 'auto', padding: '8px 20px' }} disabled={!postText.trim()}>Post</button>
                </div>
              </form>
            </div>
          </div>
        ) : (
          <div className="login-nudge">
            <Link to="/auth">Login</Link> untuk ikut diskusi dan tag gadget favoritmu.
          </div>
        )}

        <div className="posts-list">
          {posts.map(post => (
            <PostCard key={post.id} post={post} onLike={handleLike} onReply={handleReply} onDelete={handleDelete} />
          ))}
          {loading && <div className="empty">Memuat...</div>}
          {!hasMore && posts.length > 0 && <div className="empty" style={{ fontSize: '.85rem' }}>Semua post sudah dimuat.</div>}
          <div ref={loaderRef} style={{ height: 1 }} />
        </div>
      </div>

      <aside className="feed-aside">
        <h3>Cara tag gadget</h3>
        <p className="muted" style={{ fontSize: '.9rem', lineHeight: 1.6 }}>
          Ketik <code>#</code> diikuti nama gadget. Contoh: <code>#galaxy-s25-ultra</code>
        </p>
        <h3 style={{ marginTop: 18 }}>Gadget populer</h3>
        <div className="aside-gadgets">
          {gadgets.slice(0, 5).map(g => (
            <Link key={g.id} to={`/gadgets/${g.id}`} className="aside-gadget-row">
              <strong>{g.brand} {g.name}</strong>
              <span className="eyebrow">{g.category}</span>
            </Link>
          ))}
        </div>
      </aside>
    </div>
  );
}
