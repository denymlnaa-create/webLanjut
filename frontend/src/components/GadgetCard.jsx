import React from 'react';
import { Link } from 'react-router-dom';
import { Eye, FileText, Gauge } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:4000';

function resolveImage(url) {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${API_BASE}${url}`;
}

export default function GadgetCard({ gadget, rank }) {
  return (
    <article className="gadget-card">
      <Link to={`/gadgets/${gadget.id}`} className="gadget-media">
        {rank && <span className="rank">#{rank}</span>}
        {gadget.image_url ? (
          <img
            src={resolveImage(gadget.image_url)}
            alt={gadget.name}
            onError={e => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.parentElement.querySelector('.image-placeholder').style.display = 'grid';
            }}
          />
        ) : null}
        <div className="image-placeholder" style={{ display: gadget.image_url ? 'none' : 'grid' }}>
          {gadget.brand?.slice(0, 2)}
        </div>
      </Link>
      <div className="gadget-body">
        <div className="eyebrow">{gadget.category}</div>
        <Link to={`/gadgets/${gadget.id}`} className="gadget-title">
          {gadget.brand} {gadget.name}
        </Link>
        <p>{gadget.summary || 'Belum ada ringkasan.'}</p>
        <div className="meta-row">
          <span><Eye size={14} />{Number(gadget.view_count || 0).toLocaleString('id-ID')}</span>
          <span><FileText size={14} />{gadget.news_count || 0}</span>
          {gadget.trending_score !== undefined && (
            <span><Gauge size={14} />{Math.round(gadget.trending_score)}</span>
          )}
        </div>
      </div>
    </article>
  );
}
