import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

function Register() {
  const [formData, setFormData] = useState({
    nama_lengkap: '',
    username: '',
    password: '',
    konfirmasi_password: '',
    kode_instansi: '',
    nama_kelas: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validasi password konfirmasi
    if (formData.password !== formData.konfirmasi_password) {
      setError('Kata sandi dan konfirmasi kata sandi tidak cocok.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('http://127.0.0.1:8000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password,
          nama_lengkap: formData.nama_lengkap,
          kode_instansi: formData.kode_instansi,
          nama_kelas: formData.nama_kelas || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.detail || 'Registrasi gagal. Silakan coba lagi.');
        setIsLoading(false);
        return;
      }

      setSuccess(`Akun berhasil dibuat! Selamat datang, ${data.nama_lengkap}. Silakan login.`);
      setTimeout(() => navigate('/login'), 2500);

    } catch (err) {
      setError('Tidak dapat terhubung ke server. Pastikan backend sedang berjalan.');
      setIsLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '20px' }}>
      <div className="glass-panel animate-fade-in" style={{ maxWidth: '460px', width: '100%', padding: '40px' }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <h2 style={{ fontSize: '2rem', marginBottom: '8px', textTransform: 'uppercase' }}>Daftar Akun Siswa</h2>
          <p style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Buat akun untuk mulai belajar di ICLS Platform</p>
        </div>

        {error && (
          <div style={{
            backgroundColor: 'var(--danger-color)',
            color: '#000000',
            border: '2px solid #000000',
            boxShadow: '2px 2px 0px #000000',
            borderRadius: '4px',
            padding: '12px 16px',
            marginBottom: '20px',
            fontWeight: '700',
            fontSize: '0.875rem',
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{
            backgroundColor: 'var(--success-color)',
            color: '#000000',
            border: '2px solid #000000',
            boxShadow: '2px 2px 0px #000000',
            borderRadius: '4px',
            padding: '12px 16px',
            marginBottom: '20px',
            fontWeight: '700',
            fontSize: '0.875rem',
            textAlign: 'center'
          }}>
            {success}
          </div>
        )}

        <form onSubmit={handleRegister}>
          <div className="input-group">
            <label className="input-label">Nama Lengkap</label>
            <input
              type="text"
              name="nama_lengkap"
              id="reg-nama"
              className="input-field"
              placeholder="Nama lengkap Anda"
              value={formData.nama_lengkap}
              onChange={handleChange}
              required
              disabled={isLoading}
            />
          </div>

          <div className="input-group">
            <label className="input-label">Username</label>
            <input
              type="text"
              name="username"
              id="reg-username"
              className="input-field"
              placeholder="Buat username unik"
              value={formData.username}
              onChange={handleChange}
              required
              disabled={isLoading}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="input-group">
              <label className="input-label">Kata Sandi</label>
              <input
                type="password"
                name="password"
                id="reg-password"
                className="input-field"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                required
                disabled={isLoading}
              />
            </div>
            <div className="input-group">
              <label className="input-label">Konfirmasi Sandi</label>
              <input
                type="password"
                name="konfirmasi_password"
                id="reg-konfirmasi"
                className="input-field"
                placeholder="••••••••"
                value={formData.konfirmasi_password}
                onChange={handleChange}
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Kode Instansi</label>
            <input
              type="text"
              name="kode_instansi"
              id="reg-kode-instansi"
              className="input-field"
              placeholder="Contoh: SMAN1-BDG (minta ke guru Anda)"
              value={formData.kode_instansi}
              onChange={handleChange}
              required
              disabled={isLoading}
              style={{ textTransform: 'uppercase' }}
            />
            <small style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>
              Kode ini diberikan oleh guru/dosen instansi Anda.
            </small>
          </div>

          <div className="input-group">
            <label className="input-label">Nama Kelas <span style={{ color: 'var(--text-secondary)' }}>(Opsional)</span></label>
            <input
              type="text"
              name="nama_kelas"
              id="reg-kelas"
              className="input-field"
              placeholder="Contoh: XII RPL 1"
              value={formData.nama_kelas}
              onChange={handleChange}
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            id="reg-submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '8px', opacity: isLoading ? 0.7 : 1, cursor: isLoading ? 'not-allowed' : 'pointer' }}
            disabled={isLoading}
          >
            {isLoading ? 'Mendaftarkan...' : 'Buat Akun'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '25px', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          Sudah punya akun?{' '}
          <Link to="/login" style={{ color: 'var(--accent-color)', textDecoration: 'underline', fontWeight: '700' }}>
            Masuk di sini
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Register;
