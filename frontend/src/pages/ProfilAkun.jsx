import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';

const API = 'http://127.0.0.1:8000';

function ProfilAkun() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // State untuk Update Profil
  const [formProfil, setFormProfil] = useState({ nama_lengkap: '', nama_kelas: '' });
  const [statusProfil, setStatusProfil] = useState({ type: '', msg: '' }); // type: 'success' | 'error'
  const [isUpdatingProfil, setIsUpdatingProfil] = useState(false);

  // State untuk Ubah Sandi
  const [formSandi, setFormSandi] = useState({ password_lama: '', password_baru: '', konfirmasi: '' });
  const [statusSandi, setStatusSandi] = useState({ type: '', msg: '' });
  const [isUpdatingSandi, setIsUpdatingSandi] = useState(false);

  useEffect(() => {
    const rawUser = localStorage.getItem('user');
    if (!rawUser) {
      navigate('/login');
      return;
    }
    const parsedUser = JSON.parse(rawUser);
    setUser(parsedUser);
    setFormProfil({
      nama_lengkap: parsedUser.nama_lengkap || '',
      nama_kelas: parsedUser.nama_kelas || ''
    });
    setIsLoading(false);
  }, [navigate]);

  const handleUpdateProfil = async (e) => {
    e.preventDefault();
    setStatusProfil({ type: '', msg: '' });
    setIsUpdatingProfil(true);

    try {
      const res = await fetch(`${API}/api/users/me/${user.user_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nama_lengkap: formProfil.nama_lengkap,
          nama_kelas: user.role === 'siswa' ? formProfil.nama_kelas : null
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setStatusProfil({ type: 'error', msg: data.detail || 'Gagal memperbarui profil.' });
      } else {
        setStatusProfil({ type: 'success', msg: 'Profil berhasil diperbarui!' });
        // Update local storage
        localStorage.setItem('user', JSON.stringify(data));
        setUser(data);
        setTimeout(() => setStatusProfil({ type: '', msg: '' }), 4000);
      }
    } catch (e) {
      setStatusProfil({ type: 'error', msg: 'Tidak dapat terhubung ke server.' });
    } finally {
      setIsUpdatingProfil(false);
    }
  };

  const handleUpdateSandi = async (e) => {
    e.preventDefault();
    setStatusSandi({ type: '', msg: '' });

    if (formSandi.password_baru !== formSandi.konfirmasi) {
      setStatusSandi({ type: 'error', msg: 'Kata sandi baru dan konfirmasi tidak cocok.' });
      return;
    }

    if (formSandi.password_baru.length < 6) {
      setStatusSandi({ type: 'error', msg: 'Kata sandi baru minimal 6 karakter.' });
      return;
    }

    setIsUpdatingSandi(true);

    try {
      const res = await fetch(`${API}/api/users/me/${user.user_id}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password_lama: formSandi.password_lama,
          password_baru: formSandi.password_baru
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setStatusSandi({ type: 'error', msg: data.detail || 'Gagal mengubah kata sandi.' });
      } else {
        setStatusSandi({ type: 'success', msg: 'Kata sandi berhasil diubah!' });
        setFormSandi({ password_lama: '', password_baru: '', konfirmasi: '' });
        setTimeout(() => setStatusSandi({ type: '', msg: '' }), 4000);
      }
    } catch (e) {
      setStatusSandi({ type: 'error', msg: 'Tidak dapat terhubung ke server.' });
    } finally {
      setIsUpdatingSandi(false);
    }
  };

  if (isLoading || !user) return null;

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar role={user.role} activePage="profil" />

      <div style={{ padding: '30px', maxWidth: '1000px', margin: '0 auto' }}>
        
        {/* Header Profil */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '36px' }}>
          <div style={{
            width: '80px', height: '80px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #1F6FEB 0%, #58A6FF 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '2rem', fontWeight: 'bold', color: 'white',
            boxShadow: '0 0 20px rgba(88, 166, 255, 0.4)'
          }}>
            {user.nama_lengkap.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 style={{ fontSize: '1.8rem', marginBottom: '4px' }}>Profil Akun</h1>
            <p style={{ color: 'var(--text-secondary)' }}>
              Kelola informasi pribadi dan keamanan akun Anda di {user.nama_instansi}
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px' }}>
          
          {/* Card: Informasi Profil */}
          <div className="glass-panel" style={{ padding: '28px' }}>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              Informasi Dasar
            </h2>
            
            {statusProfil.msg && (
              <div style={{ 
                background: statusProfil.type === 'success' ? 'rgba(34,197,94,0.15)' : 'rgba(220,38,38,0.15)', 
                border: `1px solid ${statusProfil.type === 'success' ? 'rgba(34,197,94,0.4)' : 'rgba(220,38,38,0.4)'}`, 
                borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', 
                color: statusProfil.type === 'success' ? '#4ade80' : '#f87171', fontSize: '0.875rem' 
              }}>
                {statusProfil.msg}
              </div>
            )}

            <form onSubmit={handleUpdateProfil}>
              <div className="input-group">
                <label className="input-label">Username (Tidak bisa diubah)</label>
                <input className="input-field" value={user.username} disabled style={{ opacity: 0.6, cursor: 'not-allowed' }} />
              </div>
              
              <div className="input-group">
                <label className="input-label">Instansi</label>
                <input className="input-field" value={user.nama_instansi} disabled style={{ opacity: 0.6, cursor: 'not-allowed' }} />
              </div>

              <div className="input-group">
                <label className="input-label">Nama Lengkap</label>
                <input className="input-field" value={formProfil.nama_lengkap} 
                  onChange={e => setFormProfil({ ...formProfil, nama_lengkap: e.target.value })} 
                  required disabled={isUpdatingProfil} />
              </div>

              {user.role === 'siswa' && (
                <div className="input-group">
                  <label className="input-label">Nama Kelas <span style={{ color: 'var(--text-secondary)' }}>(Opsional)</span></label>
                  <input className="input-field" value={formProfil.nama_kelas} 
                    onChange={e => setFormProfil({ ...formProfil, nama_kelas: e.target.value })} 
                    disabled={isUpdatingProfil} />
                </div>
              )}

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '8px', opacity: isUpdatingProfil ? 0.7 : 1 }} disabled={isUpdatingProfil}>
                {isUpdatingProfil ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </form>
          </div>

          {/* Card: Ubah Kata Sandi */}
          <div className="glass-panel" style={{ padding: '28px' }}>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              Keamanan Akun
            </h2>

            {statusSandi.msg && (
              <div style={{ 
                background: statusSandi.type === 'success' ? 'rgba(34,197,94,0.15)' : 'rgba(220,38,38,0.15)', 
                border: `1px solid ${statusSandi.type === 'success' ? 'rgba(34,197,94,0.4)' : 'rgba(220,38,38,0.4)'}`, 
                borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', 
                color: statusSandi.type === 'success' ? '#4ade80' : '#f87171', fontSize: '0.875rem' 
              }}>
                {statusSandi.msg}
              </div>
            )}

            <form onSubmit={handleUpdateSandi}>
              <div className="input-group">
                <label className="input-label">Kata Sandi Lama</label>
                <input type="password" className="input-field" placeholder="••••••••" 
                  value={formSandi.password_lama} 
                  onChange={e => setFormSandi({ ...formSandi, password_lama: e.target.value })} 
                  required disabled={isUpdatingSandi} />
              </div>
              
              <div className="input-group">
                <label className="input-label">Kata Sandi Baru</label>
                <input type="password" className="input-field" placeholder="Minimal 6 karakter" 
                  value={formSandi.password_baru} 
                  onChange={e => setFormSandi({ ...formSandi, password_baru: e.target.value })} 
                  required disabled={isUpdatingSandi} />
              </div>

              <div className="input-group">
                <label className="input-label">Konfirmasi Sandi Baru</label>
                <input type="password" className="input-field" placeholder="Ulangi kata sandi baru" 
                  value={formSandi.konfirmasi} 
                  onChange={e => setFormSandi({ ...formSandi, konfirmasi: e.target.value })} 
                  required disabled={isUpdatingSandi} />
              </div>

              <button type="submit" className="btn btn-secondary" style={{ width: '100%', marginTop: '8px', opacity: isUpdatingSandi ? 0.7 : 1 }} disabled={isUpdatingSandi}>
                {isUpdatingSandi ? 'Mengubah...' : 'Ubah Kata Sandi'}
              </button>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
}

export default ProfilAkun;
