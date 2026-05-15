import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API = 'http://127.0.0.1:8000';

// ── Komponen Modal Tambah Instansi ────────────────────────────────────────────
function ModalTambahInstansi({ onClose, onSuccess, adminId }) {
  const [form, setForm] = useState({ nama_instansi: '', kode_instansi: '', alamat: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const res = await fetch(`${API}/api/instansi/?super_admin_id=${adminId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.detail || 'Gagal menambahkan instansi.'); setIsLoading(false); return; }
      onSuccess(data);
    } catch {
      setError('Tidak dapat terhubung ke server.');
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
    }}>
      <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '480px', padding: '36px', margin: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '1.3rem', margin: 0 }}>➕ Tambah Instansi Baru</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '1.4rem', cursor: 'pointer' }}>✕</button>
        </div>

        {error && (
          <div style={{ background: 'rgba(220,38,38,0.15)', border: '1px solid rgba(220,38,38,0.4)', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', color: '#f87171', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label">Nama Instansi</label>
            <input className="input-field" placeholder="Contoh: SMAN 1 Bandung" value={form.nama_instansi}
              onChange={e => setForm({ ...form, nama_instansi: e.target.value })} required disabled={isLoading} />
          </div>
          <div className="input-group">
            <label className="input-label">Kode Instansi</label>
            <input className="input-field" placeholder="Contoh: SMAN1-BDG (unik, huruf besar)" value={form.kode_instansi}
              onChange={e => setForm({ ...form, kode_instansi: e.target.value.toUpperCase() })} required disabled={isLoading}
              style={{ textTransform: 'uppercase' }} />
            <small style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>
              Kode ini akan diberikan ke siswa untuk mendaftar.
            </small>
          </div>
          <div className="input-group">
            <label className="input-label">Alamat <span style={{ color: 'var(--text-secondary)' }}>(Opsional)</span></label>
            <input className="input-field" placeholder="Alamat instansi" value={form.alamat}
              onChange={e => setForm({ ...form, alamat: e.target.value })} disabled={isLoading} />
          </div>
          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary" style={{ flex: 1 }} disabled={isLoading}>Batal</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1, opacity: isLoading ? 0.7 : 1 }} disabled={isLoading}>
              {isLoading ? 'Menyimpan...' : 'Simpan Instansi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Komponen Modal Tambah Dosen Instansi ──────────────────────────────────────
function ModalTambahDosenInstansi({ onClose, onSuccess, adminId, instansi }) {
  const [form, setForm] = useState({ username: '', password: '', nama_lengkap: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const payload = { ...form, instansi_id: instansi.instansi_id };
      const res = await fetch(`${API}/api/users/admin-create-dosen?requestor_id=${adminId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.detail || 'Gagal mendaftarkan dosen.'); setIsLoading(false); return; }
      onSuccess(data);
    } catch {
      setError('Tidak dapat terhubung ke server.');
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
    }}>
      <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '480px', padding: '36px', margin: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '1.3rem', margin: 0 }}>👨‍🏫 Buat Dosen Pertama</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '1.4rem', cursor: 'pointer' }}>✕</button>
        </div>

        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '20px' }}>
          Penempatan: <strong style={{ color: 'white' }}>{instansi.nama_instansi}</strong>
        </p>

        {error && (
          <div style={{ background: 'rgba(220,38,38,0.15)', border: '1px solid rgba(220,38,38,0.4)', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', color: '#f87171', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label">Nama Lengkap</label>
            <input className="input-field" placeholder="Nama dosen..." value={form.nama_lengkap}
              onChange={e => setForm({ ...form, nama_lengkap: e.target.value })} required disabled={isLoading} />
          </div>
          <div className="input-group">
            <label className="input-label">Username</label>
            <input className="input-field" placeholder="Username untuk login" value={form.username}
              onChange={e => setForm({ ...form, username: e.target.value })} required disabled={isLoading} />
          </div>
          <div className="input-group">
            <label className="input-label">Password</label>
            <input type="password" className="input-field" placeholder="Kata sandi default" value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })} required disabled={isLoading} />
          </div>
          <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary" style={{ flex: 1 }} disabled={isLoading}>Batal</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1, opacity: isLoading ? 0.7 : 1 }} disabled={isLoading}>
              {isLoading ? 'Menyimpan...' : 'Simpan Dosen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Halaman Utama Admin Dashboard ─────────────────────────────────────────────
function AdminDashboard() {
  const navigate = useNavigate();
  const userRaw = localStorage.getItem('user');
  const user = userRaw ? JSON.parse(userRaw) : null;

  const [instansiList, setInstansiList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDosenModal, setShowDosenModal] = useState(false);
  const [targetInstansi, setTargetInstansi] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [notification, setNotification] = useState('');

  // Redirect jika bukan super_admin
  useEffect(() => {
    if (!user || user.role !== 'super_admin') {
      navigate('/login', { replace: true });
    }
  }, []);

  // Ambil daftar instansi
  const fetchInstansi = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API}/api/instansi/`);
      const data = await res.json();
      setInstansiList(data);
    } catch {
      console.error('Gagal mengambil data instansi');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchInstansi(); }, []);

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleInstansiAdded = (newInstansi) => {
    setInstansiList(prev => [...prev, newInstansi]);
    setShowModal(false);
    setNotification(`✅ Instansi "${newInstansi.nama_instansi}" berhasil ditambahkan!`);
    setTimeout(() => setNotification(''), 4000);
  };

  const handleDosenAdded = (newDosen) => {
    setShowDosenModal(false);
    setTargetInstansi(null);
    setNotification(`✅ Dosen "${newDosen.nama_lengkap}" berhasil ditambahkan ke instansi!`);
    setTimeout(() => setNotification(''), 4000);
  };

  const filteredInstansi = instansiList.filter(i =>
    i.nama_instansi.toLowerCase().includes(searchQuery.toLowerCase()) ||
    i.kode_instansi.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* Navbar Super Admin */}
      <nav style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '12px 30px', background: 'var(--bg-card)', backdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--glass-border)', position: 'sticky', top: 0, zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '8px',
            background: 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 10px rgba(139, 92, 246, 0.4)'
          }}>
            <span style={{ fontSize: '16px' }}>⚡</span>
          </div>
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '1rem' }}>ICLS Admin Panel</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Super Administrator</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>{user?.nama_lengkap}</div>
            <div style={{ fontSize: '0.72rem', color: '#a78bfa' }}>Super Admin</div>
          </div>
          <button className="btn btn-secondary" onClick={handleLogout} style={{ padding: '6px 16px', fontSize: '0.85rem' }}>
            Keluar
          </button>
        </div>
      </nav>

      <div style={{ padding: '30px', maxWidth: '1200px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '1.8rem', marginBottom: '4px' }}>⚡ Admin Dashboard</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Kelola seluruh instansi yang terdaftar di platform ICLS</p>
        </div>

        {/* Notifikasi sukses */}
        {notification && (
          <div style={{
            background: 'rgba(34, 197, 94, 0.15)', border: '1px solid rgba(34, 197, 94, 0.4)',
            borderRadius: '10px', padding: '14px 20px', marginBottom: '24px',
            color: '#4ade80', fontWeight: '500'
          }}>
            {notification}
          </div>
        )}

        {/* Stat Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '32px' }}>
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>Total Instansi</div>
            <div style={{ fontSize: '2.8rem', fontWeight: 'bold', color: '#a78bfa' }}>{instansiList.length}</div>
          </div>
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>Platform</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--accent-color)', marginTop: '8px' }}>Multi-Tenant</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Arsitektur Aktif</div>
          </div>
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>Status API</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--success-color)', boxShadow: '0 0 8px var(--success-color)' }}></div>
              <span style={{ fontWeight: 'bold', color: 'var(--success-color)' }}>Online</span>
            </div>
          </div>
        </div>

        {/* Tabel Instansi */}
        <div className="glass-panel" style={{ overflow: 'hidden' }}>
          {/* Header tabel */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '20px 24px', borderBottom: '1px solid var(--glass-border)'
          }}>
            <h2 style={{ margin: 0, fontSize: '1.1rem' }}>🏫 Daftar Instansi Terdaftar</h2>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <input
                className="input-field"
                placeholder="🔍 Cari instansi..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ width: '220px', padding: '8px 14px', fontSize: '0.875rem' }}
              />
              <button
                className="btn btn-primary"
                onClick={() => setShowModal(true)}
                style={{ whiteSpace: 'nowrap', padding: '8px 18px', fontSize: '0.875rem' }}
              >
                + Tambah Instansi
              </button>
            </div>
          </div>

          {/* Isi tabel */}
          {isLoading ? (
            <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              Memuat data instansi...
            </div>
          ) : filteredInstansi.length === 0 ? (
            <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              {searchQuery ? `Tidak ada instansi dengan kata kunci "${searchQuery}"` : 'Belum ada instansi terdaftar. Klik "+ Tambah Instansi" untuk memulai.'}
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'rgba(0,0,0,0.3)' }}>
                  <th style={{ padding: '14px 24px', color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase' }}>#</th>
                  <th style={{ padding: '14px 24px', color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Nama Instansi</th>
                  <th style={{ padding: '14px 24px', color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Kode Instansi</th>
                  <th style={{ padding: '14px 24px', color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Alamat</th>
                  <th style={{ padding: '14px 24px', color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Status</th>
                  <th style={{ padding: '14px 24px', color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredInstansi.map((inst, i) => (
                  <tr key={inst.instansi_id} style={{ borderBottom: '1px solid var(--glass-border)', transition: 'background 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '16px 24px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{i + 1}</td>
                    <td style={{ padding: '16px 24px', fontWeight: '600' }}>{inst.nama_instansi}</td>
                    <td style={{ padding: '16px 24px' }}>
                      <span style={{
                        background: 'rgba(139, 92, 246, 0.15)', border: '1px solid rgba(139, 92, 246, 0.3)',
                        borderRadius: '6px', padding: '4px 12px', fontSize: '0.85rem',
                        color: '#a78bfa', fontFamily: 'monospace', letterSpacing: '0.05em'
                      }}>
                        {inst.kode_instansi}
                      </span>
                    </td>
                    <td style={{ padding: '16px 24px', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                      {inst.alamat || <span style={{ color: 'rgba(255,255,255,0.2)' }}>—</span>}
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                        background: 'rgba(63, 185, 80, 0.15)', borderRadius: '20px',
                        padding: '4px 12px', fontSize: '0.8rem', color: 'var(--success-color)', fontWeight: 'bold'
                      }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--success-color)', display: 'inline-block' }}></span>
                        Aktif
                      </span>
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                      <button 
                        onClick={() => { setTargetInstansi(inst); setShowDosenModal(true); }}
                        className="btn btn-primary"
                        style={{ padding: '6px 12px', fontSize: '0.8rem', background: 'var(--accent-color)' }}
                      >
                        + Dosen
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal Instansi */}
      {showModal && (
        <ModalTambahInstansi
          adminId={user?.user_id}
          onClose={() => setShowModal(false)}
          onSuccess={handleInstansiAdded}
        />
      )}

      {/* Modal Dosen */}
      {showDosenModal && targetInstansi && (
        <ModalTambahDosenInstansi
          adminId={user?.user_id}
          instansi={targetInstansi}
          onClose={() => { setShowDosenModal(false); setTargetInstansi(null); }}
          onSuccess={handleDosenAdded}
        />
      )}
    </div>
  );
}

export default AdminDashboard;
