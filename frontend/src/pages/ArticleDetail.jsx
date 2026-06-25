import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Edit2, Trash2 } from 'lucide-react';
import api from '../api.js';
import { useAuth } from '../auth.jsx';

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:4000';

function resolveImage(url) {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${API_BASE}${url}`;
}

export default function ArticleDetail() {
  const { slug } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [article, setArticle] = useState(null);

  useEffect(() => {
    api.get(`/articles/${slug}`).then(({ data }) => setArticle(data));
  }, [slug]);

  const handleDelete = async () => {
    if (!window.confirm(`Hapus berita "${article.title}"? Tindakan ini tidak bisa dibatalkan.`)) return;
    try {
      await api.delete(`/admin/articles/${article.id}`);
      navigate('/');
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal menghapus berita.');
    }
  };

  if (!article) return <div className="page"><div className="empty">Memuat berita...</div></div>;

  const coverSrc = resolveImage(article.cover_url);

  return (
    <article className="page article-page">
      {coverSrc && <img className="article-cover" src={coverSrc} alt={article.title} />}
      <div className="eyebrow">{article.category}</div>
      <h1>{article.title}</h1>

      {user?.role === 'admin' && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <Link
            to="/admin"
            state={{ editArticleId: article.id }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: '1px solid var(--line)', fontWeight: 700, fontSize: '.9rem', textDecoration: 'none', color: 'var(--text)', background: 'var(--surface)' }}
          >
            <Edit2 size={15} />Edit Berita
          </Link>
          <button
            type="button"
            onClick={handleDelete}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: '1px solid var(--accent)', color: 'var(--accent)', fontWeight: 700, fontSize: '.9rem', background: 'transparent', cursor: 'pointer' }}
          >
            <Trash2 size={15} />Hapus Berita
          </button>
        </div>
      )}

      <p className="lead">{article.excerpt}</p>
      <div className="article-content">{article.content}</div>

      {article.gadgets?.length > 0 && (
        <div className="related">
          <h2>Gadget Terkait</h2>
          {article.gadgets.map(gadget => (
            <Link key={gadget.id} to={`/gadgets/${gadget.id}`}>{gadget.brand} {gadget.name}</Link>
          ))}
        </div>
      )}
    </article>
  );
}
