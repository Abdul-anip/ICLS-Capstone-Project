import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import apiClient from '../api/apiClient';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await apiClient.post('/api/auth/login', { username, password });
      const data = response.data;

      // Simpan JWT token dan data user secara terpisah
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('user', JSON.stringify({
        user_id: data.user_id,
        username: data.username,
        nama_lengkap: data.nama_lengkap,
        role: data.role,
        kelas_id: data.kelas_id,
        nama_kelas: data.nama_kelas,
        instansi_id: data.instansi_id,
        nama_instansi: data.nama_instansi,
      }));

      // Arahkan sesuai role
      if (data.role === 'super_admin') {
        navigate('/admin/dashboard');
      } else if (data.role === 'dosen') {
        navigate('/dosen/dashboard');
      } else {
        navigate('/siswa/dashboard');
      }

    } catch (err) {
      if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else {
        setError('Tidak dapat terhubung ke server. Pastikan backend sedang berjalan.');
      }
      setIsLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '20px' }}>
      <div className="glass-panel animate-fade-in" style={{ maxWidth: '400px', width: '100%', padding: '40px' }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h2 style={{ fontSize: '2rem', marginBottom: '8px', textTransform: 'uppercase' }}>ICLS Platform</h2>
          <p style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Intelligent Coding Learning System</p>
        </div>

        {/* Tampilkan pesan error jika ada */}
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

        <form onSubmit={handleLogin}>
          <div className="input-group">
            <label className="input-label">Username</label>
            <input
              type="text"
              id="login-username"
              className="input-field"
              placeholder="Masukkan username Anda"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <div className="input-group">
            <label className="input-label">Kata Sandi</label>
            <input
              type="password"
              id="login-password"
              className="input-field"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            id="login-submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '10px', opacity: isLoading ? 0.7 : 1, cursor: isLoading ? 'not-allowed' : 'pointer' }}
            disabled={isLoading}
          >
            {isLoading ? 'Sedang Masuk...' : 'Masuk ke Sistem'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '25px', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          Belum punya akun?{' '}
          <Link to="/register" style={{ color: 'var(--accent-color)', textDecoration: 'underline', fontWeight: '700' }}>
            Daftar sebagai Siswa
          </Link>
        </p>

        <p style={{ textAlign: 'center', marginTop: '12px', color: 'var(--text-secondary)', fontSize: '0.78rem', border: '1.5px dashed var(--text-secondary)', padding: '6px', borderRadius: '4px' }}>
          Demo: gunakan <strong>siswa_hanif</strong> / <strong>dosen_budi</strong> dengan sandi <strong>123</strong>
        </p>
      </div>
    </div>
  );
}

export default Login;
