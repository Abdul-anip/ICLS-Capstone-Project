import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';

const API = 'http://127.0.0.1:8000';

// ── Modal Tambah Dosen ────────────────────────────────────────────────────────
function ModalTambahDosen({ onClose, onSuccess, requestorId }) {
  const [form, setForm] = useState({ nama_lengkap: '', username: '', password: '', konfirmasi: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.konfirmasi) {
      setError('Kata sandi dan konfirmasi tidak cocok.');
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(`${API}/api/users/dosen?requestor_id=${requestorId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nama_lengkap: form.nama_lengkap, username: form.username, password: form.password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.detail || 'Gagal menambahkan dosen.'); setIsLoading(false); return; }
      onSuccess(data);
    } catch {
      setError('Tidak dapat terhubung ke server.');
      setIsLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '460px', padding: '36px', margin: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '1.3rem', margin: 0 }}>Tambah Akun Dosen</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '1.4rem', cursor: 'pointer' }}>✕</button>
        </div>

        {error && (
          <div style={{ background: 'rgba(220,38,38,0.15)', border: '1px solid rgba(220,38,38,0.4)', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', color: '#f87171', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label">Nama Lengkap</label>
            <input className="input-field" placeholder="Nama dosen baru" value={form.nama_lengkap}
              onChange={e => setForm({ ...form, nama_lengkap: e.target.value })} required disabled={isLoading} />
          </div>
          <div className="input-group">
            <label className="input-label">Username</label>
            <input className="input-field" placeholder="Username unik untuk login" value={form.username}
              onChange={e => setForm({ ...form, username: e.target.value })} required disabled={isLoading} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="input-group">
              <label className="input-label">Kata Sandi</label>
              <input type="password" className="input-field" placeholder="••••••••" value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })} required disabled={isLoading} />
            </div>
            <div className="input-group">
              <label className="input-label">Konfirmasi Sandi</label>
              <input type="password" className="input-field" placeholder="••••••••" value={form.konfirmasi}
                onChange={e => setForm({ ...form, konfirmasi: e.target.value })} required disabled={isLoading} />
            </div>
          </div>
          <div style={{ background: 'rgba(31,111,235,0.1)', border: '1px solid rgba(31,111,235,0.3)', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', fontSize: '0.8rem', color: 'var(--accent-color)' }}>
            Akun dosen baru akan otomatis terdaftar di instansi <strong>{JSON.parse(localStorage.getItem('user') || '{}')?.nama_instansi}</strong>.
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary" style={{ flex: 1 }} disabled={isLoading}>Batal</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1, opacity: isLoading ? 0.7 : 1 }} disabled={isLoading}>
              {isLoading ? 'Menyimpan...' : 'Buat Akun Dosen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Halaman Utama Manajemen Akun ──────────────────────────────────────────────
function ManajemenAkun() {
  const navigate = useNavigate();
  const userRaw = localStorage.getItem('user');
  const user = userRaw ? JSON.parse(userRaw) : null;

  const [activeTab, setActiveTab] = useState('siswa'); // 'siswa' | 'dosen'
  const [siswaList, setSiswaList] = useState([]);
  const [dosenList, setDosenList] = useState([]);
  const [isLoadingSiswa, setIsLoadingSiswa] = useState(true);
  const [isLoadingDosen, setIsLoadingDosen] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchSiswa, setSearchSiswa] = useState('');
  const [filterKelas, setFilterKelas] = useState('');
  const [notification, setNotification] = useState('');

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    fetchSiswa();
    fetchDosen();
  }, []);

  const fetchSiswa = async () => {
    setIsLoadingSiswa(true);
    try {
      const res = await fetch(`${API}/api/users/siswa?requestor_id=${user.user_id}`);
      if (res.ok) setSiswaList(await res.json());
    } catch (e) { console.error(e); }
    finally { setIsLoadingSiswa(false); }
  };

  const fetchDosen = async () => {
    setIsLoadingDosen(true);
    try {
      // Ambil semua user, lalu filter dosen (endpoint baru di bawah)
      const res = await fetch(`${API}/api/users/dosen-list?requestor_id=${user.user_id}`);
      if (res.ok) setDosenList(await res.json());
    } catch (e) { console.error(e); }
    finally { setIsLoadingDosen(false); }
  };

  const handleDosenAdded = (newDosen) => {
    setDosenList(prev => [...prev, newDosen]);
    setShowModal(false);
    setNotification(`Akun dosen "${newDosen.nama_lengkap}" berhasil dibuat!`);
    setTimeout(() => setNotification(''), 4000);
  };

  const kelasList = [...new Set(siswaList.map(s => s.nama_kelas).filter(Boolean))];
  const filteredSiswa = siswaList.filter(s => {
    const matchSearch = s.nama_lengkap.toLowerCase().includes(searchSiswa.toLowerCase()) ||
      (s.username || '').toLowerCase().includes(searchSiswa.toLowerCase());
    const matchKelas = filterKelas ? s.nama_kelas === filterKelas : true;
    return matchSearch && matchKelas;
  });

  const tabStyle = (tab) => ({
    padding: '10px 24px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '600',
    borderBottom: activeTab === tab ? '2px solid var(--accent-color)' : '2px solid transparent',
    color: activeTab === tab ? 'var(--accent-color)' : 'var(--text-secondary)',
    transition: 'all 0.2s', background: 'none', border: 'none',
    borderBottom: activeTab === tab ? '2px solid var(--accent-color)' : '2px solid transparent',
  });

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar role="dosen" activePage="manajemen" />

      <div style={{ padding: '30px', maxWidth: '1200px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontSize: '1.8rem', marginBottom: '4px' }}>Manajemen Akun</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Kelola akun siswa dan dosen di <strong>{user?.nama_instansi}</strong>
          </p>
        </div>

        {/* Notifikasi */}
        {notification && (
          <div style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.4)', borderRadius: '10px', padding: '14px 20px', marginBottom: '24px', color: '#4ade80', fontWeight: '500' }}>
            {notification}
          </div>
        )}

        {/* Tab */}
        <div className="glass-panel" style={{ overflow: 'hidden' }}>

          {/* Tab Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--glass-border)', padding: '0 8px' }}>
            <div style={{ display: 'flex' }}>
              <button style={tabStyle('siswa')} onClick={() => setActiveTab('siswa')}>
                Daftar Siswa ({siswaList.length})
              </button>
              <button style={tabStyle('dosen')} onClick={() => setActiveTab('dosen')}>
                Daftar Dosen ({dosenList.length})
              </button>
            </div>

            {/* Tombol aksi */}
            {activeTab === 'dosen' && (
              <button className="btn btn-primary" onClick={() => setShowModal(true)} style={{ margin: '8px 16px', padding: '8px 18px', fontSize: '0.875rem' }}>
                + Tambah Dosen
              </button>
            )}
          </div>

          {/* ── Tab Siswa ── */}
          {activeTab === 'siswa' && (
            <>
              {/* Filter bar */}
              <div style={{ display: 'flex', gap: '10px', padding: '16px 20px', borderBottom: '1px solid var(--glass-border)', flexWrap: 'wrap' }}>
                <input
                  className="input-field"
                  placeholder="Cari nama / username..."
                  value={searchSiswa}
                  onChange={e => setSearchSiswa(e.target.value)}
                  style={{ flex: 1, minWidth: '200px', padding: '8px 14px', fontSize: '0.875rem' }}
                />
                {kelasList.length > 0 && (
                  <select className="input-field" value={filterKelas} onChange={e => setFilterKelas(e.target.value)}
                    style={{ padding: '8px 14px', fontSize: '0.875rem', background: 'rgba(0,0,0,0.4)' }}>
                    <option value="">Semua Kelas</option>
                    {kelasList.map(k => <option key={k} value={k}>{k}</option>)}
                  </select>
                )}
                <button className="btn btn-secondary" onClick={fetchSiswa} style={{ padding: '8px 16px', fontSize: '0.875rem' }}>Refresh</button>
              </div>

              {isLoadingSiswa ? (
                <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>Memuat data siswa...</div>
              ) : filteredSiswa.length === 0 ? (
                <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  {searchSiswa || filterKelas ? 'Tidak ada siswa yang cocok dengan filter.' : 'Belum ada siswa terdaftar di instansi ini.'}
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: 'rgba(0,0,0,0.3)' }}>
                      {['#', 'Nama Lengkap', 'Username', 'Kelas', 'Status'].map(h => (
                        <th key={h} style={{ padding: '13px 20px', color: 'var(--text-secondary)', fontSize: '0.78rem', textTransform: 'uppercase' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSiswa.map((siswa, i) => (
                      <tr key={siswa.user_id} style={{ borderBottom: '1px solid var(--glass-border)', transition: 'background 0.2s' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <td style={{ padding: '14px 20px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{i + 1}</td>
                        <td style={{ padding: '14px 20px', fontWeight: '600' }}>{siswa.nama_lengkap}</td>
                        <td style={{ padding: '14px 20px', color: 'var(--text-secondary)', fontFamily: 'monospace', fontSize: '0.875rem' }}>@{siswa.username}</td>
                        <td style={{ padding: '14px 20px', fontSize: '0.875rem' }}>
                          {siswa.nama_kelas
                            ? <span style={{ background: 'rgba(31,111,235,0.15)', border: '1px solid rgba(31,111,235,0.3)', borderRadius: '6px', padding: '3px 10px', color: 'var(--accent-color)', fontSize: '0.82rem' }}>{siswa.nama_kelas}</span>
                            : <span style={{ color: 'rgba(255,255,255,0.2)' }}>—</span>}
                        </td>
                        <td style={{ padding: '14px 20px' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(63,185,80,0.15)', borderRadius: '20px', padding: '3px 12px', fontSize: '0.78rem', color: 'var(--success-color)', fontWeight: 'bold' }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--success-color)', display: 'inline-block' }}></span>
                            Aktif
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* Footer */}
              {filteredSiswa.length > 0 && (
                <div style={{ padding: '12px 20px', borderTop: '1px solid var(--glass-border)', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                  Menampilkan {filteredSiswa.length} dari {siswaList.length} siswa terdaftar
                </div>
              )}
            </>
          )}

          {/* ── Tab Dosen ── */}
          {activeTab === 'dosen' && (
            <>
              {isLoadingDosen ? (
                <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>Memuat data dosen...</div>
              ) : dosenList.length === 0 ? (
                <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  Belum ada dosen lain. Klik "+ Tambah Dosen" untuk menambahkan.
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: 'rgba(0,0,0,0.3)' }}>
                      {['#', 'Nama Lengkap', 'Username', 'Role', 'Status'].map(h => (
                        <th key={h} style={{ padding: '13px 20px', color: 'var(--text-secondary)', fontSize: '0.78rem', textTransform: 'uppercase' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {dosenList.map((dosen, i) => (
                      <tr key={dosen.user_id} style={{ borderBottom: '1px solid var(--glass-border)', transition: 'background 0.2s' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <td style={{ padding: '14px 20px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{i + 1}</td>
                        <td style={{ padding: '14px 20px', fontWeight: '600' }}>
                          {dosen.nama_lengkap}
                          {dosen.user_id === user?.user_id && (
                            <span style={{ marginLeft: '8px', fontSize: '0.75rem', color: 'var(--accent-color)', background: 'rgba(31,111,235,0.15)', padding: '2px 8px', borderRadius: '10px' }}>Anda</span>
                          )}
                        </td>
                        <td style={{ padding: '14px 20px', color: 'var(--text-secondary)', fontFamily: 'monospace', fontSize: '0.875rem' }}>@{dosen.username}</td>
                        <td style={{ padding: '14px 20px' }}>
                          <span style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '6px', padding: '3px 10px', color: '#f59e0b', fontSize: '0.82rem', fontWeight: '600' }}>
                            Dosen
                          </span>
                        </td>
                        <td style={{ padding: '14px 20px' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(63,185,80,0.15)', borderRadius: '20px', padding: '3px 12px', fontSize: '0.78rem', color: 'var(--success-color)', fontWeight: 'bold' }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--success-color)', display: 'inline-block' }}></span>
                            Aktif
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}

        </div>
      </div>

      {/* Modal Tambah Dosen */}
      {showModal && (
        <ModalTambahDosen
          requestorId={user?.user_id}
          onClose={() => setShowModal(false)}
          onSuccess={handleDosenAdded}
        />
      )}
    </div>
  );
}

export default ManajemenAkun;
