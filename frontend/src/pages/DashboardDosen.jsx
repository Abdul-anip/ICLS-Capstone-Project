import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import apiClient from '../api/apiClient';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';

// ── Helper: status label berdasarkan nilai BKT ────────────────────────────────
function getBktStatus(prob) {
  if (prob >= 0.8) return { label: 'Dikuasai', color: 'var(--success-color)', badgeClass: 'success' };
  if (prob >= 0.6)  return { label: 'Hampir', color: 'var(--accent-color)', badgeClass: 'yellow' };
  if (prob >= 0.3)  return { label: 'Belajar', color: 'var(--accent-blue)', badgeClass: 'blue' };
  return { label: 'Fokus', color: 'var(--danger-color)', badgeClass: 'danger' };
}

function DashboardDosen() {
  const navigate = useNavigate();
  const userRaw = localStorage.getItem('user');
  const user = userRaw ? JSON.parse(userRaw) : null;

  const [stats, setStats] = useState(null);
  const [siswaProgress, setSiswaProgress] = useState([]);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isLoadingSiswa, setIsLoadingSiswa] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterKelas, setFilterKelas] = useState('');

  const [allInstansiKelas, setAllInstansiKelas] = useState([]);
  const [myClasses, setMyClasses] = useState([]);
  const [isKelasModalOpen, setIsKelasModalOpen] = useState(false);
  const [tempSelectedClasses, setTempSelectedClasses] = useState([]);
  const [isSavingClasses, setIsSavingClasses] = useState(false);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    fetchStats();
    fetchSiswaProgress();
    fetchClassesData();
  }, []);

  const fetchClassesData = async () => {
    try {
      // Ambil kelas yang diampu dosen
      const resMy = await apiClient.get(`/api/kelas/my-classes?dosen_id=${user.user_id}`);
      setMyClasses(resMy.data);
      setTempSelectedClasses(resMy.data.map(k => k.kelas_id));
      
      // Ambil semua kelas di instansi
      if (user.instansi_id) {
        const resAll = await apiClient.get(`/api/kelas/instansi?instansi_id=${user.instansi_id}`);
        setAllInstansiKelas(resAll.data);
      }
    } catch (e) {
      console.error('Gagal mengambil data kelas:', e);
    }
  };

  const handleSaveClasses = async () => {
    setIsSavingClasses(true);
    try {
      await apiClient.post(`/api/kelas/my-classes`, {
        dosen_id: user.user_id,
        kelas_ids: tempSelectedClasses
      });
      setIsKelasModalOpen(false);
      await fetchStats();
      await fetchSiswaProgress();
      await fetchClassesData();
    } catch (e) {
      console.error('Gagal memperbarui kelas pantauan:', e);
      alert('Gagal memperbarui kelas pantauan.');
    } finally {
      setIsSavingClasses(false);
    }
  };

  const [namaKelasBaru, setNamaKelasBaru] = useState('');
  const [isAddingKelas, setIsAddingKelas] = useState(false);
  const [kelasError, setKelasError] = useState('');

  const handleTambahKelas = async () => {
    if (!namaKelasBaru.trim()) return;
    setIsAddingKelas(true);
    setKelasError('');
    try {
      const response = await apiClient.post(`/api/kelas`, {
        nama_kelas: namaKelasBaru.trim(),
        instansi_id: user.instansi_id
      });
      setNamaKelasBaru('');
      // Reload daftar kelas di instansi
      const resAll = await apiClient.get(`/api/kelas/instansi?instansi_id=${user.instansi_id}`);
      setAllInstansiKelas(resAll.data);
      // Otomatis centang kelas yang baru dibuat
      setTempSelectedClasses([...tempSelectedClasses, response.data.kelas_id]);
    } catch (e) {
      console.error('Gagal menambahkan kelas:', e);
      setKelasError(e.response?.data?.detail || 'Tidak dapat terhubung ke server.');
    } finally {
      setIsAddingKelas(false);
    }
  };

  const fetchStats = async () => {
    setIsLoadingStats(true);
    try {
      const res = await apiClient.get(`/api/users/dashboard-stats?requestor_id=${user.user_id}`);
      setStats(res.data);
    } catch (e) {
      console.error('Gagal mengambil statistik:', e);
    } finally {
      setIsLoadingStats(false);
    }
  };

  const fetchSiswaProgress = async () => {
    setIsLoadingSiswa(true);
    try {
      const res = await apiClient.get(`/api/users/siswa-progress?requestor_id=${user.user_id}`);
      setSiswaProgress(res.data);
    } catch (e) {
      console.error('Gagal mengambil progress siswa:', e);
    } finally {
      setIsLoadingSiswa(false);
    }
  };

  // Daftar kelas unik dari daftar siswa (untuk filter dropdown)
  const kelasList = [...new Set(siswaProgress.map(s => s.nama_kelas).filter(Boolean))];

  // Filter siswa berdasarkan pencarian & kelas
  const filteredSiswa = siswaProgress.filter(s => {
    const matchSearch = s.nama_lengkap.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.username.toLowerCase().includes(searchQuery.toLowerCase());
    const matchKelas = filterKelas ? s.nama_kelas === filterKelas : true;
    return matchSearch && matchKelas;
  });

  // Rata-rata BKT untuk progress bar
  const avgBktDisplay = stats ? (stats.avg_bkt_kelas * 100).toFixed(1) : 0;

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar role="dosen" activePage="dashboard" />

      <div style={{ padding: '30px', maxWidth: '1200px', margin: '0 auto' }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '2.2rem', marginBottom: '4px', fontFamily: 'Outfit', fontWeight: '800', textTransform: 'uppercase' }}>Dashboard Instruktur</h1>
            <p style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>
              {user?.nama_instansi || 'Instansi'} — Pantau perkembangan siswa & analisis BKT secara real-time
            </p>
          </div>
          <button 
            onClick={() => setIsKelasModalOpen(true)} 
            className="btn btn-primary"
            style={{ padding: '10px 20px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase' }}
          >
            Kelola Kelas Saya ({myClasses.length})
          </button>
        </div>

        {stats?.is_scoped_empty ? (
          <div className="glass-panel" style={{ padding: '60px 40px', textAlign: 'center', border: '2.5px solid #000000', boxShadow: 'var(--brutal-shadow)', background: 'var(--bg-card)', marginTop: '20px' }}>
            <h2 style={{ fontSize: '1.6rem', marginBottom: '12px', fontFamily: 'Outfit', fontWeight: '800', textTransform: 'uppercase', color: 'var(--accent-color)' }}>
              Kelas Pantauan Belum Terpilih
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', fontWeight: '600', maxWidth: '600px', margin: '0 auto 24px auto', lineHeight: 1.6 }}>
              Anda belum memilih kelas yang ingin dipantau. Dashboard Anda saat ini masih kosong. Silakan klik tombol di bawah untuk memilih kelas-kelas yang Anda ampu di instansi ini.
            </p>
            <button 
              onClick={() => setIsKelasModalOpen(true)} 
              className="btn btn-primary" 
              style={{ padding: '12px 30px', textTransform: 'uppercase' }}
            >
              Pilih Kelas Sekarang
            </button>
          </div>
        ) : (
          <>
            {/* ── Stat Cards ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '36px' }}>

              {/* Rata-rata BKT Kelas */}
              <div className="glass-panel" style={{ padding: '24px' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px', fontWeight: '800' }}>
                  Rata-rata P(L) Kelas
                </div>
                {isLoadingStats ? (
                  <div style={{ fontSize: '2rem', color: 'var(--text-secondary)' }}>—</div>
                ) : (
                  <>
                    <div style={{ fontSize: '2.8rem', fontWeight: '800', color: avgBktDisplay >= 70 ? 'var(--success-color)' : 'var(--accent-color)' }}>
                      {avgBktDisplay}%
                    </div>
                    <div style={{ width: '100%', height: '12px', background: '#000000', border: '1.5px solid #000000', borderRadius: '3px', marginTop: '14px', overflow: 'hidden' }}>
                      <div style={{ width: `${avgBktDisplay}%`, height: '100%', background: avgBktDisplay >= 70 ? 'var(--success-color)' : 'var(--accent-color)', transition: 'width 1s ease' }}></div>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '8px', fontWeight: '600' }}>Probabilitas Penguasaan Rata-rata</div>
                  </>
                )}
              </div>

              {/* Topik Tersulit */}
              <div className="glass-panel" style={{ padding: '24px' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px', fontWeight: '800' }}>
                  Topik Tersulit
                </div>
                {isLoadingStats ? (
                  <div style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>Memuat...</div>
                ) : stats?.topik_tersulit ? (
                  <>
                    <div style={{ fontSize: '1.3rem', fontWeight: '800', color: 'var(--danger-color)', marginTop: '8px', lineHeight: 1.3, textTransform: 'uppercase' }}>
                      {stats.topik_tersulit.nama}
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '8px', fontWeight: '600' }}>
                      Rata-rata BKT: {(stats.topik_tersulit.avg_bkt * 100).toFixed(1)}%
                    </p>
                  </>
                ) : (
                  <div style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginTop: '12px', fontWeight: '700' }}>Belum ada data BKT</div>
                )}
              </div>

              {/* Total Siswa */}
              <div className="glass-panel" style={{ padding: '24px' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px', fontWeight: '800' }}>
                  Total Siswa
                </div>
                <div style={{ fontSize: '2.8rem', fontWeight: '800', color: 'var(--accent-color)' }}>
                  {isLoadingStats ? '—' : stats?.total_siswa ?? 0}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '6px', fontWeight: '600' }}>Dari kelas yang Anda pantau</div>
              </div>

              {/* Total Soal */}
              <div className="glass-panel" style={{ padding: '24px' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px', fontWeight: '800' }}>
                  Total Soal
                </div>
                <div style={{ fontSize: '2.8rem', fontWeight: '800', color: 'var(--accent-blue)' }}>
                  {isLoadingStats ? '—' : stats?.total_soal ?? 0}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '6px', fontWeight: '600' }}>Soal aktif di bank soal</div>
              </div>
            </div>

            {/* ── Rekomendasi Tindakan Dosen ── */}
            {(() => {
              const siswaPerhatian = siswaProgress.filter(s => s.perlu_perhatian);
              if (siswaPerhatian.length === 0) return null;
              return (
                <div className="glass-panel" style={{ padding: '28px', marginBottom: '36px', border: '2.5px solid #000000', borderLeft: '8px solid var(--danger-color)', boxShadow: 'var(--brutal-shadow)', background: 'var(--bg-card)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    <div>
                      <h2 style={{ fontSize: '1.2rem', margin: 0, color: 'var(--danger-color)', fontFamily: 'Outfit', fontWeight: '800', textTransform: 'uppercase' }}>
                        Rekomendasi Tindakan — {siswaPerhatian.length} Siswa Perlu Bimbingan
                      </h2>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', margin: '4px 0 0 0', fontWeight: '600' }}>
                        Siswa berikut memiliki setidaknya 1 topik dengan tingkat penguasaan P(L) di bawah 40%.
                        Pertimbangkan untuk memberikan sesi remedial atau materi tambahan.
                      </p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                    {siswaPerhatian.map(s => (
                      <div key={s.user_id} style={{
                        padding: '10px 16px', borderRadius: '4px',
                        background: 'var(--bg-card-hover)', border: '2px solid #000000',
                        display: 'flex', alignItems: 'center', gap: '10px',
                        boxShadow: '2px 2px 0px #000000'
                      }}>
                        <div>
                          <div style={{ fontWeight: '800', fontSize: '0.9rem', textTransform: 'uppercase' }}>{s.nama_lengkap}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '600' }}>
                            {s.nama_kelas || 'Tanpa Kelas'} • P(L) rata-rata: {(s.avg_bkt * 100).toFixed(1)}%
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* ── BKT Class Analytics Chart ── */}
            <div className="glass-panel" style={{ padding: '30px', marginBottom: '36px' }}>
              <h2 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>Rata-rata P(L) Kelas per Topik</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '24px' }}>
                Analisis tingkat pemahaman agregat seluruh siswa berdasarkan topik. Fokuskan materi pada topik dengan persentase rendah (merah/kuning).
              </p>

              {isLoadingStats ? (
                <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                  Memuat grafik analitik...
                </div>
              ) : !stats?.topik_chart_data || stats.topik_chart_data.length === 0 ? (
                <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                  Belum ada data evaluasi siswa untuk dianalisis.
                </div>
              ) : (
                <div style={{ height: '350px', width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.topik_chart_data.map(d => ({ name: d.nama, value: Math.round(d.avg_bkt * 100) }))} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis dataKey="name" stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} angle={-25} textAnchor="end" />
                      <YAxis stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)' }} domain={[0, 100]} unit="%" />
                      <Tooltip
                        cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                        contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                        itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                        formatter={(value) => [`${value}%`, 'Rata-rata P(L)']}
                      />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={40}>
                        {
                          stats.topik_chart_data.map((entry, index) => {
                            const val = Math.round(entry.avg_bkt * 100);
                            let fill = 'var(--accent-color)'; // default / sedang
                            if (val >= 70) fill = 'var(--success-color)'; // baik
                            else if (val < 40) fill = 'var(--danger-color)'; // kurang
                            return <Cell key={`cell-${index}`} fill={fill} />;
                          })
                        }
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* ── Tabel Progress Siswa ── */}
            <div className="glass-panel" style={{ overflow: 'hidden' }}>
              {/* Header tabel */}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '20px 24px', borderBottom: '2.5px solid #000000', flexWrap: 'wrap', gap: '12px', background: 'var(--bg-card-hover)'
              }}>
                <h2 style={{ margin: 0, fontSize: '1.2rem', fontFamily: 'Outfit', fontWeight: '800', textTransform: 'uppercase' }}>Performa & Progress Siswa</h2>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <input
                    className="input-field"
                    placeholder="Cari nama / username..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    style={{ width: '210px', padding: '8px 14px', fontSize: '0.875rem' }}
                  />
                  {kelasList.length > 0 && (
                    <select
                      className="input-field"
                      value={filterKelas}
                      onChange={e => setFilterKelas(e.target.value)}
                      style={{ padding: '8px 14px', fontSize: '0.875rem', background: '#000000', border: '2px solid #000000', color: '#ffffff' }}
                    >
                      <option value="">Semua Kelas</option>
                      {kelasList.map(k => <option key={k} value={k}>{k}</option>)}
                    </select>
                  )}
                  <button
                    className="btn btn-secondary"
                    onClick={() => { fetchStats(); fetchSiswaProgress(); }}
                    style={{ padding: '8px 16px', fontSize: '0.875rem' }}
                  >
                    Refresh
                  </button>
                </div>
              </div>

              {/* Isi tabel */}
              {isLoadingSiswa ? (
                <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)', fontWeight: '700' }}>
                  Memuat data siswa...
                </div>
              ) : filteredSiswa.length === 0 ? (
                <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)', fontWeight: '700' }}>
                  {searchQuery || filterKelas
                    ? 'Tidak ada siswa yang cocok dengan filter.'
                    : 'Belum ada siswa terdaftar di kelas pantauan Anda.'}
                </div>
              ) : (
                <table className="brutal-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Nama Siswa</th>
                      <th>Kelas</th>
                      <th>Topik Terakhir</th>
                      <th>Submit</th>
                      <th>P(L) Rata-rata</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSiswa.map((siswa, i) => {
                      const bktStatus = getBktStatus(siswa.avg_bkt);
                      const bktPct = (siswa.avg_bkt * 100).toFixed(1);
                      return (
                        <tr key={siswa.user_id}>
                          <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: '600' }}>{i + 1}</td>
                          <td>
                            <div style={{ fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {siswa.perlu_perhatian && (
                                <span className="brutal-badge brutal-badge-danger" title="Siswa ini memiliki topik dengan P(L) di bawah 40% — perlu bimbingan ekstra" style={{
                                  fontSize: '0.65rem', fontWeight: '800', padding: '2px 6px',
                                  cursor: 'help', whiteSpace: 'nowrap', textTransform: 'uppercase', boxShadow: '1px 1px 0px #000000'
                                }}>Perhatian</span>
                              )}
                              {siswa.nama_lengkap}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '600' }}>@{siswa.username}</div>
                          </td>
                          <td style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: '600' }}>
                            {siswa.nama_kelas || <span style={{ color: 'rgba(255,255,255,0.2)' }}>—</span>}
                          </td>
                          <td style={{ fontSize: '0.875rem', fontWeight: '800', textTransform: 'uppercase', color: 'var(--accent-blue)' }}>
                            {siswa.topik_terakhir || <span style={{ color: 'rgba(255,255,255,0.2)', fontWeight: '600' }}>Belum ada</span>}
                          </td>
                          <td style={{ textAlign: 'center', fontWeight: '800' }}>
                            {siswa.jumlah_submit}
                          </td>
                          <td style={{ minWidth: '160px' }}>
                            {siswa.avg_bkt === 0 ? (
                              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem', fontWeight: '600' }}>Belum ada data</span>
                            ) : (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ flex: 1, height: '10px', background: '#000000', border: '1.5px solid #000000', borderRadius: '2px', overflow: 'hidden' }}>
                                  <div style={{
                                    width: `${bktPct}%`, height: '100%',
                                    background: bktStatus.color, transition: 'width 0.8s ease'
                                  }}></div>
                                </div>
                                <span style={{ fontSize: '0.85rem', fontWeight: '800', minWidth: '40px' }}>{bktPct}%</span>
                              </div>
                            )}
                          </td>
                          <td>
                            <span className={`brutal-badge brutal-badge-${siswa.avg_bkt === 0 ? 'secondary' : bktStatus.badgeClass}`}>
                              {siswa.avg_bkt === 0 ? 'Belum Mulai' : bktStatus.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}

              {/* Footer tabel */}
              {filteredSiswa.length > 0 && (
                <div style={{ padding: '12px 24px', borderTop: '2.5px solid #000000', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: '600' }}>
                  Menampilkan {filteredSiswa.length} dari {siswaProgress.length} siswa
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Modal: Kelola Kelas Saya ── */}
      {isKelasModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: 'rgba(0,0,0,0.8)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: '4px', border: '2.5px solid #000000', boxShadow: 'var(--brutal-shadow-hover)', background: 'var(--bg-card)' }}>
            
            {/* Header */}
            <div style={{ padding: '20px 30px', borderBottom: '2.5px solid #000000', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-card-hover)' }}>
              <h2 style={{ fontSize: '1.3rem', margin: 0, fontFamily: 'Outfit', fontWeight: '800', textTransform: 'uppercase' }}>Kelola Kelas Saya</h2>
              <button onClick={() => setIsKelasModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '1.5rem', cursor: 'pointer', lineHeight: 1, fontWeight: '800' }}>
                ✕
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '24px 30px', overflowY: 'auto', flex: 1 }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '20px', fontWeight: '600', lineHeight: '1.5' }}>
                Pilih kelas-kelas yang Anda ampu di <strong>{user?.nama_instansi}</strong>. Dashboard Anda hanya akan menampilkan perkembangan siswa dari kelas terpilih.
              </p>

              {/* Form Tambah Kelas Baru */}
              <div style={{ 
                marginBottom: '24px', 
                padding: '16px', 
                background: 'var(--bg-card-hover)', 
                border: '2px solid #000000', 
                borderRadius: '4px',
                boxShadow: '2px 2px 0px #000000'
              }}>
                <label className="input-label" style={{ marginBottom: '6px', fontSize: '0.75rem' }}>Tambah Kelas Baru</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Contoh: XII RPL 3"
                    value={namaKelasBaru}
                    onChange={(e) => setNamaKelasBaru(e.target.value)}
                    style={{ padding: '8px 12px', fontSize: '0.9rem', flex: 1 }}
                    disabled={isAddingKelas}
                  />
                  <button
                    onClick={handleTambahKelas}
                    className="btn btn-primary"
                    style={{ padding: '8px 16px', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
                    disabled={isAddingKelas || !namaKelasBaru.trim()}
                  >
                    {isAddingKelas ? 'Menambahkan...' : '+ Tambah'}
                  </button>
                </div>
                {kelasError && (
                  <div style={{ color: 'var(--danger-color)', fontSize: '0.75rem', marginTop: '6px', fontWeight: 'bold' }}>
                    {kelasError}
                  </div>
                )}
              </div>

              {allInstansiKelas.length === 0 ? (
                <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: '600' }}>
                  Belum ada kelas terdaftar di instansi ini. Hubungi administrator sekolah Anda untuk mendaftarkan kelas.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {allInstansiKelas.map(k => {
                    const isChecked = tempSelectedClasses.includes(k.kelas_id);
                    return (
                      <label 
                        key={k.kelas_id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '12px 16px',
                          borderRadius: '4px',
                          background: isChecked ? 'rgba(255, 230, 0, 0.05)' : 'var(--bg-card-hover)',
                          border: isChecked ? '2px solid var(--accent-color)' : '2px solid #000000',
                          boxShadow: isChecked ? '2px 2px 0px #000000' : 'none',
                          cursor: 'pointer',
                          userSelect: 'none',
                          transition: 'all 0.1s'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setTempSelectedClasses([...tempSelectedClasses, k.kelas_id]);
                            } else {
                              setTempSelectedClasses(tempSelectedClasses.filter(id => id !== k.kelas_id));
                            }
                          }}
                          style={{
                            width: '18px',
                            height: '18px',
                            cursor: 'pointer',
                            accentColor: 'var(--accent-color)'
                          }}
                        />
                        <span style={{ fontWeight: '700', fontSize: '1rem', color: isChecked ? 'var(--accent-color)' : '#ffffff' }}>
                          {k.nama_kelas}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: '20px 30px', borderTop: '2.5px solid #000000', backgroundColor: 'var(--bg-card-hover)', display: 'flex', gap: '12px' }}>
              <button 
                onClick={() => setIsKelasModalOpen(false)} 
                className="btn btn-secondary" 
                style={{ flex: 1 }}
                disabled={isSavingClasses}
              >
                Batal
              </button>
              <button 
                onClick={handleSaveClasses} 
                className="btn btn-primary" 
                style={{ flex: 2 }}
                disabled={isSavingClasses}
              >
                {isSavingClasses ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

export default DashboardDosen;
