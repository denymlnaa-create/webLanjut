import React, { useEffect, useRef, useState } from 'react';
import { Edit2, Plus, RefreshCw, Save, Trash2, Upload, X } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import api from '../api.js';

const emptyGadget = {
  name: '',
  brand: '',
  category: 'smartphone',
  price: '',
  release_year: '',
  image_url: '',
  source_url: '',
  summary: '',
  specs: [{ key: '', value: '' }],
};

const emptyArticle = {
  title: '',
  category: 'news',
  excerpt: '',
  content: '',
  cover_url: '',
  source_url: '',
  gadget_ids: [],
};

export default function AdminPanel() {
  const [summary, setSummary] = useState(null);
  const [gadgets, setGadgets] = useState([]);
  const [articles, setArticles] = useState([]);
  const [gadgetForm, setGadgetForm] = useState(emptyGadget);
  const [articleForm, setArticleForm] = useState(emptyArticle);
  const [message, setMessage] = useState('');
  const [imagePreview, setImagePreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const coverInputRef = useRef(null);
  const [editingGadgetId, setEditingGadgetId] = useState(null);
  const [editingArticleId, setEditingArticleId] = useState(null);
  const gadgetFormRef = useRef(null);
  const articleFormRef = useRef(null);
  const location = useLocation();

  const load = async () => {
    const [summaryRes, gadgetsRes, articlesRes] = await Promise.all([
      api.get('/admin/summary'),
      api.get('/admin/gadgets'),
      api.get('/admin/articles'),
    ]);
    setSummary(summaryRes.data);
    setGadgets(gadgetsRes.data);
    setArticles(articlesRes.data);
  };

  useEffect(() => { load(); }, []);

  // Auto-trigger edit dari halaman detail via navigation state
  useEffect(() => {
    if (!location.state) return;
    const { editGadgetId, editArticleId } = location.state;
    if (editGadgetId) {
      load().then(() => {
        startEditGadget({ id: editGadgetId });
      });
    }
    if (editArticleId) {
      // Cari artikel dari daftar setelah load
      load().then(async () => {
        const { data } = await api.get('/admin/articles');
        const art = data.find(a => a.id === editArticleId);
        if (art) startEditArticle(art);
      });
    }
  }, [location.state]);

  // ── Gadget edit ──────────────────────────────────────────────
  const startEditGadget = async (gadget) => {
    try {
      const { data } = await api.get(`/gadgets/${gadget.id}`);
      const specs = Array.isArray(data.specs) && data.specs.length > 0
        ? data.specs.map(s => ({ key: s.spec_key, value: s.spec_value }))
        : [{ key: '', value: '' }];
      setGadgetForm({
        name: data.name ?? '', brand: data.brand ?? '',
        category: data.category ?? 'smartphone',
        price: data.price ?? '', release_year: data.release_year ?? '',
        image_url: data.image_url ?? '', source_url: data.source_url ?? '',
        summary: data.summary ?? '', specs,
      });
      setImagePreview(data.image_url || null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setEditingGadgetId(gadget.id);
      gadgetFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal memuat data gadget.');
    }
  };

  const cancelEditGadget = () => {
    setEditingGadgetId(null);
    setGadgetForm(emptyGadget);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Article edit ─────────────────────────────────────────────
  const startEditArticle = async (article) => {
    try {
      const { data } = await api.get(`/articles/${article.slug}`);
      const gadget_ids = Array.isArray(data.gadgets) ? data.gadgets.map(g => g.id) : [];
      setArticleForm({
        title: data.title ?? '', category: data.category ?? 'news',
        excerpt: data.excerpt ?? '', content: data.content ?? '',
        cover_url: data.cover_url ?? '', source_url: data.source_url ?? '',
        gadget_ids,
      });
      setCoverPreview(data.cover_url || null);
      if (coverInputRef.current) coverInputRef.current.value = '';
      setEditingArticleId(article.id);
      articleFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal memuat data berita.');
    }
  };

  const cancelEditArticle = () => {
    setEditingArticleId(null);
    setArticleForm(emptyArticle);
    setCoverPreview(null);
    if (coverInputRef.current) coverInputRef.current.value = '';
  };

  // ── Spec helpers ─────────────────────────────────────────────
  const addSpec = () => setGadgetForm(f => ({ ...f, specs: [...f.specs, { key: '', value: '' }] }));
  const updateSpec = (i, field, val) => setGadgetForm(f => ({ ...f, specs: f.specs.map((s, idx) => idx === i ? { ...s, [field]: val } : s) }));
  const removeSpec = (i) => setGadgetForm(f => ({ ...f, specs: f.specs.filter((_, idx) => idx !== i) }));

  // ── Image upload helpers ─────────────────────────────────────
  const handleImageFile = async (file) => {
    if (!file) return;
    setImagePreview(URL.createObjectURL(file));
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const { data } = await api.post('/upload/image', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setGadgetForm(f => ({ ...f, image_url: data.image_url }));
    } catch (err) {
      alert(err.response?.data?.error || 'Upload gambar gagal.');
      setImagePreview(null);
    } finally { setUploading(false); }
  };

  const clearImage = () => {
    setImagePreview(null);
    setGadgetForm(f => ({ ...f, image_url: '' }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCoverFile = async (file) => {
    if (!file) return;
    setCoverPreview(URL.createObjectURL(file));
    setUploadingCover(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const { data } = await api.post('/upload/image', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setArticleForm(f => ({ ...f, cover_url: data.image_url }));
    } catch (err) {
      alert(err.response?.data?.error || 'Upload cover gagal.');
      setCoverPreview(null);
    } finally { setUploadingCover(false); }
  };

  const clearCover = () => {
    setCoverPreview(null);
    setArticleForm(f => ({ ...f, cover_url: '' }));
    if (coverInputRef.current) coverInputRef.current.value = '';
  };

  // ── Submit handlers ──────────────────────────────────────────
  const submitGadget = async (e) => {
    e.preventDefault();
    const payload = { ...gadgetForm, specs: gadgetForm.specs.filter(s => s.key && s.value) };
    try {
      const { data } = editingGadgetId
        ? await api.put(`/admin/gadgets/${editingGadgetId}`, payload)
        : await api.post('/admin/gadgets', payload);
      setMessage(data.message);
      cancelEditGadget();
      await load();
    } catch (err) { alert(err.response?.data?.error || 'Gagal menyimpan gadget.'); }
  };

  const submitArticle = async (e) => {
    e.preventDefault();
    try {
      const { data } = editingArticleId
        ? await api.put(`/admin/articles/${editingArticleId}`, articleForm)
        : await api.post('/admin/articles', articleForm);
      setMessage(data.message);
      cancelEditArticle();
      await load();
    } catch (err) { alert(err.response?.data?.error || 'Gagal menyimpan berita.'); }
  };

  const deleteGadget = async (id) => {
    if (!window.confirm('Hapus gadget ini?')) return;
    await api.delete(`/admin/gadgets/${id}`);
    if (editingGadgetId === id) cancelEditGadget();
    await load();
  };

  const deleteArticle = async (id) => {
    if (!window.confirm('Hapus berita ini?')) return;
    await api.delete(`/admin/articles/${id}`);
    if (editingArticleId === id) cancelEditArticle();
    await load();
  };

  return (
    <div className="page admin-page">
      <section className="admin-header">
        <div>
          <h1>Admin Dashboard</h1>
          <p>Kelola data gadget, spesifikasi, dan berita.</p>
        </div>
        <button type="button" className="ghost-btn" onClick={load}><RefreshCw size={16} />Refresh</button>
      </section>

      {message && <div className="success">{message}</div>}

      <section className="stats">
        <div><span>Gadget</span><strong>{summary?.gadgets ?? 0}</strong></div>
        <div><span>Berita</span><strong>{summary?.articles ?? 0}</strong></div>
        <div><span>Total Views</span><strong>{Number(summary?.views ?? 0).toLocaleString('id-ID')}</strong></div>
      </section>

      <section className="admin-grid">
        {/* ── Gadget Form ── */}
        <form className="tool-panel" onSubmit={submitGadget} ref={gadgetFormRef}>
          <h2>{editingGadgetId ? 'Edit Gadget' : 'Tambah Gadget'}</h2>
          <div className="two-col">
            <label>Nama Gadget<input value={gadgetForm.name} onChange={e => setGadgetForm({ ...gadgetForm, name: e.target.value })} required /></label>
            <label>Brand<input value={gadgetForm.brand} onChange={e => setGadgetForm({ ...gadgetForm, brand: e.target.value })} required /></label>
          </div>
          <div className="two-col">
            <label>Kategori<input value={gadgetForm.category} onChange={e => setGadgetForm({ ...gadgetForm, category: e.target.value })} required /></label>
            <label>Tahun Rilis<input type="number" value={gadgetForm.release_year} onChange={e => setGadgetForm({ ...gadgetForm, release_year: e.target.value })} /></label>
          </div>
          <label>Harga<input type="number" value={gadgetForm.price} onChange={e => setGadgetForm({ ...gadgetForm, price: e.target.value })} /></label>

          <label>Foto Gadget
            <div className="upload-area">
              {imagePreview ? (
                <div className="upload-preview">
                  <img src={imagePreview} alt="preview" />
                  <button type="button" className="upload-clear" onClick={clearImage} aria-label="Hapus foto"><X size={16} /></button>
                </div>
              ) : (
                <button type="button" className="upload-trigger" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                  <Upload size={18} />{uploading ? 'Mengupload...' : 'Upload foto dari komputer'}
                </button>
              )}
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={e => handleImageFile(e.target.files[0])} />
            </div>
          </label>
          <label style={{ color: 'var(--muted)', fontSize: '.85rem' }}>
            Atau masukkan URL gambar
            <input value={imagePreview ? '' : gadgetForm.image_url} onChange={e => { setGadgetForm({ ...gadgetForm, image_url: e.target.value }); setImagePreview(null); }} placeholder="https://..." disabled={!!imagePreview} />
          </label>
          <label>URL Sumber<input value={gadgetForm.source_url} onChange={e => setGadgetForm({ ...gadgetForm, source_url: e.target.value })} /></label>
          <label>Ringkasan<textarea value={gadgetForm.summary} onChange={e => setGadgetForm({ ...gadgetForm, summary: e.target.value })} rows={3} /></label>

          <div className="form-subhead">
            <h3>Spesifikasi</h3>
            <button type="button" className="mini-btn" onClick={addSpec}><Plus size={14} />Tambah</button>
          </div>
          {gadgetForm.specs.map((spec, index) => (
            <div className="spec-editor" key={index}>
              <input placeholder="Contoh: Chipset" value={spec.key} onChange={e => updateSpec(index, 'key', e.target.value)} />
              <input placeholder="Contoh: Snapdragon 8 Elite" value={spec.value} onChange={e => updateSpec(index, 'value', e.target.value)} />
              <button type="button" onClick={() => removeSpec(index)} aria-label="Hapus spesifikasi"><Trash2 size={16} /></button>
            </div>
          ))}

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="primary-btn" type="submit" style={{ flex: 1 }}>
              <Save size={16} />{editingGadgetId ? 'Update Gadget' : 'Simpan Gadget'}
            </button>
            {editingGadgetId && (
              <button type="button" className="ghost-btn" onClick={cancelEditGadget}>
                <X size={16} />Batal
              </button>
            )}
          </div>
        </form>

        {/* ── Article Form ── */}
        <form className="tool-panel" onSubmit={submitArticle} ref={articleFormRef}>
          <h2>{editingArticleId ? 'Edit Berita' : 'Tambah Berita'}</h2>
          <label>Judul<input value={articleForm.title} onChange={e => setArticleForm({ ...articleForm, title: e.target.value })} required /></label>
          <label>Kategori<input value={articleForm.category} onChange={e => setArticleForm({ ...articleForm, category: e.target.value })} required /></label>
          <label>Excerpt<textarea value={articleForm.excerpt} onChange={e => setArticleForm({ ...articleForm, excerpt: e.target.value })} rows={2} /></label>
          <label>Isi Berita<textarea value={articleForm.content} onChange={e => setArticleForm({ ...articleForm, content: e.target.value })} rows={8} required /></label>

          <label>Cover Berita
            <div className="upload-area">
              {coverPreview ? (
                <div className="upload-preview">
                  <img src={coverPreview} alt="cover preview" />
                  <button type="button" className="upload-clear" onClick={clearCover} aria-label="Hapus cover"><X size={16} /></button>
                </div>
              ) : (
                <button type="button" className="upload-trigger" onClick={() => coverInputRef.current?.click()} disabled={uploadingCover}>
                  <Upload size={18} />{uploadingCover ? 'Mengupload...' : 'Upload cover dari komputer'}
                </button>
              )}
              <input ref={coverInputRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={e => handleCoverFile(e.target.files[0])} />
            </div>
          </label>
          <label style={{ color: 'var(--muted)', fontSize: '.85rem' }}>
            Atau masukkan URL cover
            <input value={coverPreview ? '' : articleForm.cover_url} onChange={e => { setArticleForm({ ...articleForm, cover_url: e.target.value }); setCoverPreview(null); }} placeholder="https://..." disabled={!!coverPreview} />
          </label>
          <label>URL Sumber<input value={articleForm.source_url} onChange={e => setArticleForm({ ...articleForm, source_url: e.target.value })} /></label>
          <label>Hubungkan ke Gadget
            <select multiple value={articleForm.gadget_ids}
              onChange={e => setArticleForm({ ...articleForm, gadget_ids: Array.from(e.target.selectedOptions).map(o => Number(o.value)) })}>
              {gadgets.map(g => <option value={g.id} key={g.id}>{g.brand} {g.name}</option>)}
            </select>
          </label>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="primary-btn" type="submit" style={{ flex: 1 }}>
              <Save size={16} />{editingArticleId ? 'Update Berita' : 'Simpan Berita'}
            </button>
            {editingArticleId && (
              <button type="button" className="ghost-btn" onClick={cancelEditArticle}>
                <X size={16} />Batal
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="section">
        <div className="section-head"><h2>Data Saat Ini</h2></div>
        <div className="admin-lists">
          <div className="data-list">
            <h3>Gadget</h3>
            {gadgets.map(gadget => (
              <div className="data-row" key={gadget.id}>
                <span>{gadget.brand} {gadget.name}</span>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button type="button" onClick={() => startEditGadget(gadget)} title="Edit"><Edit2 size={15} /></button>
                  <button type="button" onClick={() => deleteGadget(gadget.id)} title="Hapus"><Trash2 size={15} /></button>
                </div>
              </div>
            ))}
          </div>
          <div className="data-list">
            <h3>Berita</h3>
            {articles.map(article => (
              <div className="data-row" key={article.id}>
                <span>{article.title}</span>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button type="button" onClick={() => startEditArticle(article)} title="Edit"><Edit2 size={15} /></button>
                  <button type="button" onClick={() => deleteArticle(article.id)} title="Hapus"><Trash2 size={15} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
