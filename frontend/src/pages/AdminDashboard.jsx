import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/apiClient';

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
      const res = await apiClient.post(`/api/instansi/?super_admin_id=${adminId}`, form);
      onSuccess(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Gagal menambahkan instansi.');
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
    }}>
      <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '480px', padding: '36px', margin: '20px', borderRadius: '4px', border: '2.5px solid #000000', boxShadow: 'var(--brutal-shadow-hover)', background: 'var(--bg-card)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '1.4rem', margin: 0, fontFamily: 'Outfit', fontWeight: '800', textTransform: 'uppercase' }}>Tambah Instansi Baru</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '1.4rem', cursor: 'pointer', fontWeight: '800' }}>✕</button>
        </div>

        {error && (
          <div style={{ background: 'var(--danger-color)', border: '2px solid #000000', borderRadius: '4px', padding: '10px 14px', marginBottom: '16px', color: '#000000', fontWeight: '700', fontSize: '0.875rem', boxShadow: '2px 2px 0px #000000' }}>
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
      const res = await apiClient.post(`/api/users/admin-create-dosen?requestor_id=${adminId}`, payload);
      onSuccess(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Gagal mendaftarkan dosen.');
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
    }}>
      <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '480px', padding: '36px', margin: '20px', borderRadius: '4px', border: '2.5px solid #000000', boxShadow: 'var(--brutal-shadow-hover)', background: 'var(--bg-card)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '1.4rem', margin: 0, fontFamily: 'Outfit', fontWeight: '800', textTransform: 'uppercase' }}>Buat Dosen Pertama</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '1.4rem', cursor: 'pointer', fontWeight: '800' }}>✕</button>
        </div>

        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '20px', fontWeight: '600' }}>
          Penempatan: <strong style={{ color: 'white', textTransform: 'uppercase' }}>{instansi.nama_instansi}</strong>
        </p>

        {error && (
          <div style={{ background: 'var(--danger-color)', border: '2px solid #000000', borderRadius: '4px', padding: '10px 14px', marginBottom: '16px', color: '#000000', fontWeight: '700', fontSize: '0.875rem', boxShadow: '2px 2px 0px #000000' }}>
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
      const res = await apiClient.get(`/api/instansi/`);
      setInstansiList(res.data);
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
    setNotification(`Instansi "${newInstansi.nama_instansi}" berhasil ditambahkan!`);
    setTimeout(() => setNotification(''), 4000);
  };

  const handleDosenAdded = (newDosen) => {
    setShowDosenModal(false);
    setTargetInstansi(null);
    setNotification(`Dosen "${newDosen.nama_lengkap}" berhasil ditambahkan ke instansi!`);
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
        padding: '12px 30px', background: 'var(--bg-card)',
        borderBottom: 'var(--brutal-border)', position: 'sticky', top: 0, zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '4px',
            background: 'var(--accent-blue)',
            border: '2px solid #000000',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '2px 2px 0px #000000'
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="9" y1="3" x2="9" y2="21"></line>
            </svg>
          </div>
          <div>
            <div style={{ fontWeight: '800', fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>ICLS Admin Panel</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase' }}>Super Administrator</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: '800', textTransform: 'uppercase' }}>{user?.nama_lengkap}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--accent-blue)', fontWeight: '700' }}>Super Admin</div>
          </div>
          <button className="btn btn-secondary" onClick={handleLogout} style={{ padding: '6px 16px', fontSize: '0.85rem', textTransform: 'uppercase' }}>
            Keluar
          </button>
        </div>
      </nav>

      <div style={{ padding: '30px', maxWidth: '1200px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '2.2rem', marginBottom: '4px', fontFamily: 'Outfit', fontWeight: '800', textTransform: 'uppercase' }}>Admin Dashboard</h1>
          <p style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Kelola seluruh instansi yang terdaftar di platform ICLS</p>
        </div>

        {/* Notifikasi sukses */}
        {notification && (
          <div style={{
            background: 'var(--success-color)', border: '2.5px solid #000000',
            borderRadius: '4px', padding: '14px 20px', marginBottom: '24px',
            color: '#000000', fontWeight: '800', boxShadow: 'var(--brutal-shadow)',
            textTransform: 'uppercase', fontSize: '0.9rem'
          }}>
            {notification}
          </div>
        )}

        {/* Stat Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '32px' }}>
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px', fontWeight: '800' }}>Total Instansi</div>
            <div style={{ fontSize: '2.8rem', fontWeight: '800', color: 'var(--accent-blue)' }}>{instansiList.length}</div>
          </div>
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px', fontWeight: '800' }}>Platform</div>
            <div style={{ fontSize: '1.3rem', fontWeight: '800', color: 'var(--accent-color)', marginTop: '8px', textTransform: 'uppercase' }}>Multi-Tenant</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px', fontWeight: '600' }}>Arsitektur Aktif</div>
          </div>
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px', fontWeight: '800' }}>Status API</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--success-color)', border: '1.5px solid #000000' }}></div>
              <span style={{ fontWeight: '800', color: 'var(--success-color)', textTransform: 'uppercase', fontSize: '0.9rem' }}>Online</span>
            </div>
          </div>
        </div>

        {/* Tabel Instansi */}
        <div className="glass-panel" style={{ overflow: 'hidden' }}>
          {/* Header tabel */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '20px 24px', borderBottom: '2.5px solid #000000', background: 'var(--bg-card-hover)'
          }}>
            <h2 style={{ margin: 0, fontSize: '1.2rem', fontFamily: 'Outfit', fontWeight: '800', textTransform: 'uppercase' }}>Daftar Instansi Terdaftar</h2>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <input
                className="input-field"
                placeholder="Cari instansi..."
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
            <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)', fontWeight: '700' }}>
              Memuat data instansi...
            </div>
          ) : filteredInstansi.length === 0 ? (
            <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)', fontWeight: '700' }}>
              {searchQuery ? `Tidak ada instansi dengan kata kunci "${searchQuery}"` : 'Belum ada instansi terdaftar. Klik "+ Tambah Instansi" untuk memulai.'}
            </div>
          ) : (
            <table className="brutal-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Nama Instansi</th>
                  <th>Kode Instansi</th>
                  <th>Alamat</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredInstansi.map((inst, i) => (
                  <tr key={inst.instansi_id}>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: '600' }}>{i + 1}</td>
                    <td style={{ fontWeight: '800', textTransform: 'uppercase' }}>{inst.nama_instansi}</td>
                    <td>
                      <span className="brutal-badge brutal-badge-blue">
                        {inst.kode_instansi}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: '600' }}>
                      {inst.alamat || <span style={{ color: 'rgba(255,255,255,0.2)' }}>—</span>}
                    </td>
                    <td>
                      <span className="brutal-badge brutal-badge-success">
                        Aktif
                      </span>
                    </td>
                    <td>
                      <button 
                        onClick={() => { setTargetInstansi(inst); setShowDosenModal(true); }}
                        className="btn btn-primary"
                        style={{ padding: '6px 12px', fontSize: '0.8rem', background: 'var(--accent-color)', color: '#000000' }}
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
