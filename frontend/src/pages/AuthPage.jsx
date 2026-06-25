import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';

export default function AuthPage() {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ username: '', email: '', login: '', password: '' });
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    try {
      if (mode === 'login') {
        await login({ login: form.login, password: form.password });
        navigate('/');
      } else {
        await register({ username: form.username, email: form.email, password: form.password });
        setSuccessMsg(`Akun berhasil dibuat! Selamat datang, ${form.username}.`);
        setForm({ username: '', email: '', login: '', password: '' });
        // Redirect ke home setelah 2 detik
        setTimeout(() => navigate('/'), 2000);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Gagal memproses akun');
    }
  };

  return (
    <div className="auth-layout">
      <form className="auth-panel" onSubmit={submit}>
        <div className="segmented">
          <button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => { setMode('login'); setError(''); setSuccessMsg(''); }}>Masuk</button>
          <button type="button" className={mode === 'register' ? 'active' : ''} onClick={() => { setMode('register'); setError(''); setSuccessMsg(''); }}>Daftar</button>
        </div>
        <h1>{mode === 'login' ? 'Masuk ke akun' : 'Buat akun baru'}</h1>
        {error && <div className="alert">{error}</div>}
        {successMsg && <div className="success">{successMsg}</div>}
        {mode === 'register' && (
          <>
            <label>Username<input value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} required /></label>
            <label>Email<input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required /></label>
          </>
        )}
        {mode === 'login' && (
          <label>Username atau Email<input value={form.login} onChange={e => setForm({ ...form, login: e.target.value })} required /></label>
        )}
        <label>Password<input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required minLength={6} /></label>
        <button className="primary-btn" type="submit" disabled={!!successMsg}>
          {mode === 'login' ? 'Masuk' : 'Daftar Sekarang'}
        </button>
      </form>
    </div>
  );
}
