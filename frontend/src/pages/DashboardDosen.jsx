import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';

const API = 'http://127.0.0.1:8000';

// ── Helper: status label berdasarkan nilai BKT ────────────────────────────────
function getBktStatus(prob) {
  if (prob >= 0.95) return { label: 'Dikuasai', color: 'var(--success-color)', bg: 'rgba(63, 185, 80, 0.15)' };
  if (prob >= 0.7)  return { label: 'Hampir Dikuasai', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' };
  if (prob >= 0.4)  return { label: 'Sedang Belajar', color: 'var(--accent-color)', bg: 'rgba(31, 111, 235, 0.15)' };
  return { label: 'Perlu Perhatian', color: 'var(--danger-color)', bg: 'rgba(248, 81, 73, 0.15)' };
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

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    fetchStats();
    fetchSiswaProgress();
  }, []);

  const fetchStats = async () => {
    setIsLoadingStats(true);
    try {
      const res = await fetch(`${API}/api/users/dashboard-stats?requestor_id=${user.user_id}`);
      if (res.ok) setStats(await res.json());
    } catch (e) {
      console.error('Gagal mengambil statistik:', e);
    } finally {
      setIsLoadingStats(false);
    }
  };

  const fetchSiswaProgress = async () => {
    setIsLoadingSiswa(true);
    try {
      const res = await fetch(`${API}/api/users/siswa-progress?requestor_id=${user.user_id}`);
      if (res.ok) setSiswaProgress(await res.json());
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
      <Navbar role="dosen" />

      <div style={{ padding: '30px', maxWidth: '1200px', margin: '0 auto' }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '1.8rem', marginBottom: '4px' }}>Dashboard Instruktur</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            {user?.nama_instansi || 'Instansi'} — Pantau perkembangan siswa & analisis BKT secara real-time
          </p>
        </div>

        {/* ── Stat Cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '36px' }}>

          {/* Rata-rata BKT Kelas */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>
              Rata-rata P(L) Kelas
            </div>
            {isLoadingStats ? (
              <div style={{ fontSize: '2rem', color: 'var(--text-secondary)' }}>—</div>
            ) : (
              <>
                <div style={{ fontSize: '2.8rem', fontWeight: 'bold', color: avgBktDisplay >= 70 ? 'var(--success-color)' : 'var(--accent-color)' }}>
                  {avgBktDisplay}%
                </div>
                <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', marginTop: '14px' }}>
                  <div style={{ width: `${avgBktDisplay}%`, height: '100%', borderRadius: '3px', background: avgBktDisplay >= 70 ? 'var(--success-color)' : 'var(--accent-color)', transition: 'width 1s ease' }}></div>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '6px' }}>Probabilitas Penguasaan Rata-rata</div>
              </>
            )}
          </div>

          {/* Topik Tersulit */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>
              Topik Tersulit
            </div>
            {isLoadingStats ? (
              <div style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>Memuat...</div>
            ) : stats?.topik_tersulit ? (
              <>
                <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: 'var(--danger-color)', marginTop: '8px', lineHeight: 1.3 }}>
                  {stats.topik_tersulit.nama}
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
                  Rata-rata BKT: {(stats.topik_tersulit.avg_bkt * 100).toFixed(1)}%
                </p>
              </>
            ) : (
              <div style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginTop: '12px' }}>Belum ada data BKT</div>
            )}
          </div>

          {/* Total Siswa */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>
              Total Siswa
            </div>
            <div style={{ fontSize: '2.8rem', fontWeight: 'bold', color: 'var(--accent-color)' }}>
              {isLoadingStats ? '—' : stats?.total_siswa ?? 0}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '6px' }}>Terdaftar di instansi ini</div>
          </div>

          {/* Total Soal */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>
              Total Soal
            </div>
            <div style={{ fontSize: '2.8rem', fontWeight: 'bold', color: '#f59e0b' }}>
              {isLoadingStats ? '—' : stats?.total_soal ?? 0}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '6px' }}>Soal aktif di bank soal</div>
          </div>
        </div>

        {/* ── BKT Class Analytics Chart ── */}
        <div className="glass-panel" style={{ padding: '30px', marginBottom: '36px' }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>📈 Rata-rata P(L) Kelas per Topik</h2>
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
            padding: '20px 24px', borderBottom: '1px solid var(--glass-border)', flexWrap: 'wrap', gap: '12px'
          }}>
            <h2 style={{ margin: 0, fontSize: '1.1rem' }}>📊 Performa & Progress Siswa</h2>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                className="input-field"
                placeholder="🔍 Cari nama / username..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ width: '210px', padding: '8px 14px', fontSize: '0.875rem' }}
              />
              {kelasList.length > 0 && (
                <select
                  className="input-field"
                  value={filterKelas}
                  onChange={e => setFilterKelas(e.target.value)}
                  style={{ padding: '8px 14px', fontSize: '0.875rem', background: 'rgba(0,0,0,0.4)' }}
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
                🔄 Refresh
              </button>
            </div>
          </div>

          {/* Isi tabel */}
          {isLoadingSiswa ? (
            <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              Memuat data siswa...
            </div>
          ) : filteredSiswa.length === 0 ? (
            <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              {searchQuery || filterKelas
                ? 'Tidak ada siswa yang cocok dengan filter.'
                : 'Belum ada siswa terdaftar di instansi ini.'}
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'rgba(0,0,0,0.3)' }}>
                  {['#', 'Nama Siswa', 'Kelas', 'Topik Terakhir', 'Submit', 'P(L) Rata-rata', 'Status'].map(h => (
                    <th key={h} style={{ padding: '13px 20px', color: 'var(--text-secondary)', fontSize: '0.78rem', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredSiswa.map((siswa, i) => {
                  const bktStatus = getBktStatus(siswa.avg_bkt);
                  const bktPct = (siswa.avg_bkt * 100).toFixed(1);
                  return (
                    <tr
                      key={siswa.user_id}
                      style={{ borderBottom: '1px solid var(--glass-border)', transition: 'background 0.2s', cursor: 'default' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '16px 20px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{i + 1}</td>
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ fontWeight: '600' }}>{siswa.nama_lengkap}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>@{siswa.username}</div>
                      </td>
                      <td style={{ padding: '16px 20px', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                        {siswa.nama_kelas || <span style={{ color: 'rgba(255,255,255,0.2)' }}>—</span>}
                      </td>
                      <td style={{ padding: '16px 20px', fontSize: '0.875rem' }}>
                        {siswa.topik_terakhir
                          ? <span style={{ color: 'var(--accent-color)' }}>{siswa.topik_terakhir}</span>
                          : <span style={{ color: 'rgba(255,255,255,0.2)' }}>Belum ada</span>}
                      </td>
                      <td style={{ padding: '16px 20px', textAlign: 'center', fontWeight: 'bold' }}>
                        {siswa.jumlah_submit}
                      </td>
                      <td style={{ padding: '16px 20px', minWidth: '160px' }}>
                        {siswa.avg_bkt === 0 ? (
                          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem' }}>Belum ada data</span>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px' }}>
                              <div style={{
                                width: `${bktPct}%`, height: '100%', borderRadius: '3px',
                                background: bktStatus.color, transition: 'width 0.8s ease'
                              }}></div>
                            </div>
                            <span style={{ fontSize: '0.85rem', fontWeight: 'bold', minWidth: '40px' }}>{bktPct}%</span>
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '16px 20px' }}>
                        <span style={{
                          padding: '4px 12px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 'bold',
                          background: bktStatus.bg, color: bktStatus.color
                        }}>
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
            <div style={{ padding: '12px 24px', borderTop: '1px solid var(--glass-border)', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
              Menampilkan {filteredSiswa.length} dari {siswaProgress.length} siswa
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DashboardDosen;
