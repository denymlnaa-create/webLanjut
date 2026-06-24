import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Search } from 'lucide-react';
import api from '../api.js';
import GadgetCard from '../components/GadgetCard.jsx';

export default function Home() {
  const [gadgets, setGadgets] = useState([]);
  const [trending, setTrending] = useState([]);
  const [articles, setArticles] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/gadgets'),
      api.get('/gadgets/trending?limit=3'),
      api.get('/articles'),
    ])
      .then(([gadgetRes, trendingRes, articleRes]) => {
        setGadgets(gadgetRes.data);
        setTrending(trendingRes.data);
        setArticles(articleRes.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return gadgets.filter(item =>
      [item.name, item.brand, item.category].join(' ').toLowerCase().includes(q)
    );
  }, [gadgets, query]);

  const displayedGadgets = query ? filtered : filtered.slice(0, 6);

  return (
    <div className="page">
      <section className="hero-band">
        <div>
          <h1>BoysGadget Stream</h1>
          <p>Database gadget, spesifikasi, berita, dan trending yang dihitung dari aktivitas data aplikasi.</p>
        </div>
        <div className="search-box">
          <Search size={18} />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Cari gadget, brand, kategori" />
        </div>
      </section>

      {/* Trending — max 3 */}
      <section className="section">
        <div className="section-head">
          <div>
            <h2>Trending Gadget</h2>
            <p>Daftar gadget terpopuler yang paling banyak dicari.</p>
          </div>
        </div>
        {loading ? <div className="empty">Memuat data...</div> : (
          <div className="grid cards-grid">
            {trending.map((item, idx) => <GadgetCard key={item.id} gadget={item} rank={idx + 1} />)}
          </div>
        )}
      </section>

      {/* Semua Gadget — max 6 + tombol Lihat Semua */}
      <section className="section">
        <div className="section-head">
          <div>
            <h2>{query ? `Hasil pencarian "${query}"` : 'Semua Gadget'}</h2>
            <p>{query ? `${filtered.length} gadget ditemukan` : 'Temukan gadget impianmu'}</p>
          </div>
          {!query && gadgets.length > 6 && (
            <Link to="/gadgets" className="see-all-btn">
              Lihat Semua <ChevronRight size={16} />
            </Link>
          )}
        </div>
        <div className="grid cards-grid">
          {displayedGadgets.length ? displayedGadgets.map(item => <GadgetCard key={item.id} gadget={item} />) : (
            <div className="empty" style={{ gridColumn: '1/-1' }}>Tidak ada gadget yang cocok.</div>
          )}
        </div>
      </section>

      {/* Berita */}
      <section className="section">
        <div className="section-head">
          <div>
            <h2>Berita Terbaru</h2>
            <p>Artikel yang ditambahkan admin dan bisa dikaitkan ke gadget.</p>
          </div>
        </div>
        <div className="news-list">
          {articles.map(article => (
            <Link to={`/articles/${article.slug}`} className="news-row" key={article.id}>
              <span>{article.category}</span>
              <strong>{article.title}</strong>
              <small>{article.gadgets || 'Umum'}</small>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
