import React from 'react';
import { useNavigate } from 'react-router-dom';

function Navbar({ role, activePage }) {
  const navigate = useNavigate();

  // Ambil data user dari localStorage
  const userRaw = localStorage.getItem('user');
  const user = userRaw ? JSON.parse(userRaw) : null;

  const handleLogout = () => {
    localStorage.removeItem('user');  // Hapus sesi user
    navigate('/login');
  };

  return (
    <nav style={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      padding: '12px 30px', 
      background: 'var(--bg-card)', 
      borderBottom: 'var(--brutal-border)',
      position: 'sticky',
      top: 0,
      zIndex: 1000
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '30px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ 
            width: '32px', height: '32px', 
            background: 'var(--accent-color)', 
            border: '2px solid #000000',
            borderRadius: '4px', 
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '2px 2px 0px #000000'
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 18 22 12 16 6"></polyline>
              <polyline points="8 6 2 12 8 18"></polyline>
            </svg>
          </div>
          <h2 style={{ fontSize: '1.2rem', margin: 0, fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>ICLS</h2>
        </div>
        
        {/* Navigation Links */}
        <div style={{ display: 'flex', gap: '24px', marginLeft: '20px', fontSize: '0.9rem' }}>
          {role === 'dosen' ? (
            <>
              <span onClick={() => navigate('/dosen/dashboard')} style={{ color: activePage === 'dashboard' ? 'var(--accent-color)' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: '700', textTransform: 'uppercase', borderBottom: activePage === 'dashboard' ? '3px solid var(--accent-color)' : 'none', paddingBottom: '4px' }}>Dashboard</span>
              <span onClick={() => navigate('/dosen/soal')} style={{ color: activePage === 'soal' ? 'var(--accent-color)' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: '700', textTransform: 'uppercase', borderBottom: activePage === 'soal' ? '3px solid var(--accent-color)' : 'none', paddingBottom: '4px' }}>Bank Soal</span>
              <span onClick={() => navigate('/dosen/manajemen-akun')} style={{ color: activePage === 'manajemen' ? 'var(--accent-color)' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: '700', textTransform: 'uppercase', borderBottom: activePage === 'manajemen' ? '3px solid var(--accent-color)' : 'none', paddingBottom: '4px' }}>Manajemen Akun</span>
              <span onClick={() => navigate('/profil')} style={{ color: activePage === 'profil' ? 'var(--accent-color)' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: '700', textTransform: 'uppercase', borderBottom: activePage === 'profil' ? '3px solid var(--accent-color)' : 'none', paddingBottom: '4px' }}>Profil</span>
            </>
          ) : role === 'super_admin' ? (
            <>
              <span onClick={() => navigate('/admin/dashboard')} style={{ color: activePage === 'admin-dashboard' ? 'var(--accent-color)' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: '700', textTransform: 'uppercase', borderBottom: activePage === 'admin-dashboard' ? '3px solid var(--accent-color)' : 'none', paddingBottom: '4px' }}>Dashboard Admin</span>
              <span onClick={() => navigate('/profil')} style={{ color: activePage === 'profil' ? 'var(--accent-color)' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: '700', textTransform: 'uppercase', borderBottom: activePage === 'profil' ? '3px solid var(--accent-color)' : 'none', paddingBottom: '4px' }}>Profil</span>
            </>
          ) : (
            <>
              <span onClick={() => navigate('/siswa/workspace')} style={{ color: activePage === 'workspace' ? 'var(--accent-color)' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: '700', textTransform: 'uppercase', borderBottom: activePage === 'workspace' ? '3px solid var(--accent-color)' : 'none', paddingBottom: '4px' }}>Workspace Koding</span>
              <span onClick={() => navigate('/profil')} style={{ color: activePage === 'profil' ? 'var(--accent-color)' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: '700', textTransform: 'uppercase', borderBottom: activePage === 'profil' ? '3px solid var(--accent-color)' : 'none', paddingBottom: '4px' }}>Profil</span>
            </>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: '800', textTransform: 'uppercase' }}>
            {user?.nama_lengkap || (role === 'dosen' ? 'Instruktur' : role === 'super_admin' ? 'Admin' : 'Siswa')}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            {user?.nama_instansi || (role === 'dosen' ? 'Mode Dosen' : role === 'super_admin' ? 'Mode Admin' : 'Mode Siswa')}
          </div>
        </div>
        <button className="btn btn-secondary" onClick={handleLogout} style={{ padding: '6px 16px', fontSize: '0.85rem', textTransform: 'uppercase' }}>
          Keluar
        </button>
      </div>
    </nav>
  );
}

export default Navbar;
