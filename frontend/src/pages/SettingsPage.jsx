import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, LogOut, Save } from 'lucide-react';
import { useAuth } from '../auth.jsx';

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:4000';

function resolveImage(url) {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${API_BASE}${url}`;
}

export default function SettingsPage() {
  const { user, updateProfile, uploadAvatar, logout } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef(null);

  const [username, setUsername] = useState(user?.username || '');
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  if (!user) { navigate('/auth'); return null; }

  const currentAvatar = avatarPreview || resolveImage(user.avatar_url);

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAvatarPreview(URL.createObjectURL(file));
    setUploadingAvatar(true);
    setError(''); setMessage('');
    try {
      await uploadAvatar(file);
      setMessage('Foto profil berhasil diperbarui.');
    } catch (err) {
      setError(err.response?.data?.error || 'Gagal upload foto.');
      setAvatarPreview(null);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true); setError(''); setMessage('');
    try {
      await updateProfile(username);
      setMessage('Username berhasil diperbarui.');
    } catch (err) {
      setError(err.response?.data?.error || 'Gagal menyimpan.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page" style={{ maxWidth: 520 }}>
      <h1 style={{ marginBottom: 24 }}>Pengaturan Akun</h1>

      {message && <div className="success">{message}</div>}
      {error && <div className="alert">{error}</div>}

      {/* Foto Profil */}
      <div className="profile-form" style={{ marginBottom: 16 }}>
        <h3 style={{ margin: '0 0 16px' }}>Foto Profil</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div className="profile-avatar-wrap">
            {currentAvatar
              ? <img src={currentAvatar} alt="avatar" className="profile-avatar-img" />
              : <div className="profile-avatar-placeholder">{user.username?.[0]?.toUpperCase()}</div>
            }
            <button type="button" className="avatar-edit-btn"
              onClick={() => fileRef.current?.click()} disabled={uploadingAvatar} title="Ganti foto profil">
              <Camera size={16} />
            </button>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp"
              style={{ display: 'none' }} onChange={handleAvatarChange} />
          </div>
          <div>
            <button type="button" className="ghost-btn"
              onClick={() => fileRef.current?.click()} disabled={uploadingAvatar}
              style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Camera size={15} />
              {uploadingAvatar ? 'Mengupload...' : 'Ganti Foto'}
            </button>
            <p className="muted" style={{ margin: '8px 0 0', fontSize: '.82rem' }}>JPEG, PNG, atau WebP · maks 2 MB</p>
          </div>
        </div>
      </div>

      {/* Username */}
      <form onSubmit={handleSave} className="profile-form" style={{ marginBottom: 16 }}>
        <h3 style={{ margin: '0 0 16px' }}>Ubah Username</h3>
        <label>
          Username
          <input
            value={username}
            onChange={e => setUsername(e.target.value)}
            maxLength={40} required
            pattern="[a-zA-Z0-9_]+"
            title="Hanya huruf, angka, dan underscore"
          />
        </label>
        <label>
          Email
          <span className="muted" style={{ fontSize: '.8rem', marginLeft: 8 }}>(tidak bisa diubah)</span>
          <input value={user.email} disabled style={{ opacity: .6 }} />
        </label>
        <button type="submit" className="primary-btn"
          disabled={saving || username.trim() === user.username}>
          <Save size={16} />
          {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
        </button>
      </form>

      {/* Logout */}
      <div className="profile-form">
        <h3 style={{ margin: '0 0 16px' }}>Akun</h3>
        <button
          type="button"
          className="ghost-btn"
          style={{ color: 'var(--accent)', borderColor: 'var(--accent)', width: '100%', padding: '11px', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 8 }}
          onClick={() => { logout(); navigate('/'); }}
        >
          <LogOut size={16} />
          Keluar dari Akun
        </button>
      </div>
    </div>
  );
}
