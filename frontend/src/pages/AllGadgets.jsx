import React, { useEffect, useMemo, useState } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import api from '../api.js';
import GadgetCard from '../components/GadgetCard.jsx';

const CATEGORIES = ['Semua', 'smartphone', 'laptop', 'tablet', 'handheld', 'smartwatch', 'audio', 'kamera'];

export default function AllGadgets() {
  const [gadgets, setGadgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Semua');
  const [sort, setSort] = useState('terbaru');

  useEffect(() => {
    api.get('/gadgets')
      .then(({ data }) => setGadgets(data))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let result = gadgets;

    if (query) {
      const q = query.toLowerCase();
      result = result.filter(g =>
        [g.name, g.brand, g.category].join(' ').toLowerCase().includes(q)
      );
    }

    if (category !== 'Semua') {
      result = result.filter(g => g.category.toLowerCase() === category.toLowerCase());
    }

    if (sort === 'trending') {
      result = [...result].sort((a, b) => (b.trending_score ?? b.view_count) - (a.trending_score ?? a.view_count));
    } else if (sort === 'harga-asc') {
      result = [...result].sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
    } else if (sort === 'harga-desc') {
      result = [...result].sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
    } else if (sort === 'nama') {
      result = [...result].sort((a, b) => `${a.brand} ${a.name}`.localeCompare(`${b.brand} ${b.name}`));
    }
    // default: terbaru — urutan dari API (sudah DESC updated_at)

    return result;
  }, [gadgets, query, category, sort]);

  // Kumpulkan kategori unik dari data
  const existingCategories = useMemo(() => {
    const cats = [...new Set(gadgets.map(g => g.category.toLowerCase()))];
    return ['Semua', ...cats];
  }, [gadgets]);

  return (
    <div className="page">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ marginBottom: 4 }}>Semua Gadget</h1>
        <p className="muted">Temukan gadget impian Anda</p>
      </div>

      {/* Filter bar */}
      <div className="all-gadgets-toolbar">
        <div className="search-box" style={{ flex: 1, minWidth: 200 }}>
          <Search size={16} />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Cari nama, brand, kategori..."
          />
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <SlidersHorizontal size={16} color="var(--muted)" />
          <select value={sort} onChange={e => setSort(e.target.value)} className="filter-select">
            <option value="terbaru">Terbaru</option>
            <option value="trending">Trending</option>
            <option value="nama">Nama A-Z</option>
            <option value="harga-asc">Harga ↑</option>
            <option value="harga-desc">Harga ↓</option>
          </select>
        </div>
      </div>

      {/* Category chips */}
      <div className="category-chips">
        {existingCategories.map(cat => (
          <button
            key={cat}
            type="button"
            className={`category-chip${category === cat ? ' active' : ''}`}
            onClick={() => setCategory(cat)}
          >
            {cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="empty">Memuat gadget...</div>
      ) : filtered.length === 0 ? (
        <div className="empty">Tidak ada gadget yang cocok.</div>
      ) : (
        <>
          <p className="muted" style={{ marginBottom: 14, fontSize: '.9rem' }}>
            Menampilkan {filtered.length} gadget
          </p>
          <div className="grid cards-grid">
            {filtered.map(item => <GadgetCard key={item.id} gadget={item} />)}
          </div>
        </>
      )}
    </div>
  );
}
