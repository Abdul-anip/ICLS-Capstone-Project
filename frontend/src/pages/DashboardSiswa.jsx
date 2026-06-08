import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';

const API = 'http://localhost:8000';

function getBktStatus(prob) {
  if (prob >= 0.95) return { label: 'Dikuasai', color: 'var(--success-color)', badgeClass: 'brutal-badge-success' };
  if (prob >= 0.7) return { label: 'Hampir', color: 'var(--accent-color)', badgeClass: 'brutal-badge-yellow' };
  if (prob >= 0.4) return { label: 'Belajar', color: 'var(--accent-blue)', badgeClass: 'brutal-badge-blue' };
  return { label: 'Fokus', color: 'var(--danger-color)', badgeClass: 'brutal-badge-danger' };
}

function DashboardSiswa() {
  const navigate = useNavigate();
  const userRaw = localStorage.getItem('user');
  const user = userRaw ? JSON.parse(userRaw) : null;

  const [soalList, setSoalList] = useState([]);
  const [bktStats, setBktStats] = useState([]);
  const [bktRawStats, setBktRawStats] = useState([]);
  const [history, setHistory] = useState([]);
  const [rekomendasi, setRekomendasi] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user || user.role !== 'siswa') {
      navigate('/login');
      return;
    }
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const [resSoal, resBkt, resHist, resRekom] = await Promise.all([
        axios.get(`${API}/api/soal/siswa/${user.user_id}`),
        axios.get(`${API}/api/soal/siswa/${user.user_id}/bkt-stats`),
        axios.get(`${API}/api/evaluasi/history/${user.user_id}`),
        axios.get(`${API}/api/soal/siswa/${user.user_id}/rekomendasi`)
      ]);

      setSoalList(resSoal.data);
      setBktRawStats(resBkt.data);

      const chartData = resBkt.data.map(item => ({
        name: item.nama_topik,
        Penguasaan: Math.round(item.learned_prob * 100)
      }));
      setBktStats(chartData);

      setHistory(resHist.data);
      setRekomendasi(resRekom.data);
    } catch (error) {
      console.error('Gagal mengambil data dashboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Group soal berdasarkan topik
  const groupedSoal = soalList.reduce((acc, soal) => {
    if (!acc[soal.nama_topik]) {
      acc[soal.nama_topik] = {
        topik_id: soal.topik_id,
        learned_prob: soal.learned_prob,
        list: []
      };
    }
    acc[soal.nama_topik].list.push(soal);
    return acc;
  }, {});

  // Hitung rata-rata BKT siswa
  const avgProgress = bktRawStats.length > 0
    ? (bktRawStats.reduce((sum, item) => sum + item.learned_prob, 0) / bktRawStats.length * 100).toFixed(1)
    : 0;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar role="siswa" activePage="dashboard" />

      {isLoading ? (
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--text-secondary)' }}>
          <div style={{ fontSize: '1.2rem', fontWeight: '700' }}>Memuat data pembelajaran Anda...</div>
        </div>
      ) : (
        <div style={{ flex: 1, padding: '30px', maxWidth: '1400px', margin: '0 auto', width: '100%' }} className="animate-fade-in">

          {/* ── Header Area ── */}
          <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
            <div>
              <h1 style={{ fontSize: '2.2rem', marginBottom: '4px', fontFamily: 'Outfit', fontWeight: '800', textTransform: 'uppercase' }}>Beranda Siswa</h1>
              <p style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>
                Selamat datang kembali, <strong style={{ color: 'var(--text-primary)' }}>{user?.nama_lengkap}</strong>! Pantau progres belajarmu di sini.
              </p>
            </div>
            <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '16px 24px', background: 'var(--bg-card)' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '800', textTransform: 'uppercase' }}>Rata-rata Pemahaman</div>
                <div style={{ fontSize: '1.8rem', fontWeight: '800', color: avgProgress >= 70 ? 'var(--success-color)' : 'var(--accent-color)' }}>
                  {avgProgress}%
                </div>
              </div>
              <div style={{ width: '80px', height: '8px', background: '#000000', border: '1.5px solid #000000', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ width: `${avgProgress}%`, height: '100%', background: avgProgress >= 70 ? 'var(--success-color)' : 'var(--accent-color)' }}></div>
              </div>
            </div>
          </div>

          {/* ── Dua Kolom Utama (Atas) ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '7fr 5fr', gap: '30px', marginBottom: '30px' }}>

            {/* Kolom Kiri: Kurva Pemahaman BKT */}
            <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ marginBottom: '16px' }}>
                <h2 style={{ fontSize: '1.2rem', textTransform: 'uppercase', fontFamily: 'Outfit', fontWeight: '800' }}>Grafik Pemahaman per Topik</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: '4px 0 0 0', fontWeight: '600' }}>
                  Kemajuan pemahaman (P(L)) untuk setiap topik materi yang tersedia.
                </p>
              </div>

              <div style={{ width: '100%', height: '240px', flex: 1 }}>
                {bktStats.length === 0 ? (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    Belum ada data pengerjaan soal. Mulailah latihan untuk melihat grafik.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={bktStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2D2D35" />
                      <XAxis dataKey="name" stroke="#A0AEC0" tick={{ fontSize: 10, fontWeight: 700 }} />
                      <YAxis stroke="#A0AEC0" domain={[0, 100]} tick={{ fontSize: 10, fontWeight: 700 }} />
                      <Tooltip
                        contentStyle={{ background: '#18181C', border: '2.5px solid #000000', borderRadius: '4px', color: '#FFF' }}
                        itemStyle={{ color: 'var(--accent-color)', fontWeight: '700' }}
                      />
                      <Bar dataKey="Penguasaan" fill="var(--accent-blue)">
                        {bktStats.map((entry, index) => {
                          const val = entry.Penguasaan;
                          const color = val >= 95 ? 'var(--success-color)' : val >= 70 ? 'var(--accent-color)' : 'var(--accent-blue)';
                          return <Cell key={`cell-${index}`} fill={color} stroke="#000000" strokeWidth={1.5} />;
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Kolom Kanan: Rekomendasi Topik */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <div style={{ marginBottom: '16px' }}>
                <h2 style={{ fontSize: '1.2rem', textTransform: 'uppercase', fontFamily: 'Outfit', fontWeight: '800' }}>💡 Rekomendasi Belajar</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: '4px 0 0 0', fontWeight: '600' }}>
                  Rekomendasi topik teratas untuk dikerjakan dari mesin cerdas BKT.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {rekomendasi.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    Tidak ada rekomendasi saat ini. Semua topik sudah Anda selesaikan dengan baik!
                  </div>
                ) : (
                  rekomendasi.map(item => {
                    const statusInfo = getBktStatus(item.learned_prob);
                    return (
                      <div
                        key={item.topik_id}
                        className="glass-panel"
                        style={{
                          padding: '16px', background: 'var(--bg-card-hover)',
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          border: '2px solid #000000', boxShadow: '2px 2px 0px #000000'
                        }}
                      >
                        <div style={{ flex: 1, marginRight: '16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                            <span style={{ fontWeight: '800', fontSize: '0.9rem', textTransform: 'uppercase' }}>
                              {item.nama_topik}
                            </span>
                            <span className={`brutal-badge ${statusInfo.badgeClass}`} style={{ fontSize: '0.65rem', padding: '2px 6px' }}>
                              {statusInfo.label}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                            Skor Urgensi: <strong style={{ color: 'var(--accent-blue)' }}>{item.skor_rekomendasi ? item.skor_rekomendasi.toFixed(2) : '0.00'}</strong> | Estimasi: <strong style={{ color: 'var(--success-color)' }}>{item.estimasi_submit} submit benar lagi</strong>
                          </div>
                        </div>
                        <button
                          className="btn btn-primary"
                          onClick={() => navigate(`/siswa/workspace/${item.soal_id}`)}
                          style={{ padding: '6px 12px', fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                        >
                          Mulai
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* ── Section: Jalur Latihan (Semua Soal Terkelompok Per Topik) ── */}
          <div className="glass-panel" style={{ padding: '24px', marginBottom: '30px' }}>
            <div style={{ marginBottom: '20px' }}>
              <h2 style={{ fontSize: '1.3rem', textTransform: 'uppercase', fontFamily: 'Outfit', fontWeight: '800' }}>Daftar Topik & Soal Latihan</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '4px 0 0 0', fontWeight: '600' }}>
                Pilihlah salah satu soal latihan di bawah ini untuk mulai menulis kode.
              </p>
            </div>

            {Object.keys(groupedSoal).length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                Belum ada soal latihan yang dirilis oleh dosen Anda.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {Object.entries(groupedSoal).map(([namaTopik, dataTopik]) => {
                  const statusInfo = getBktStatus(dataTopik.learned_prob);
                  return (
                    <div
                      key={namaTopik}
                      className="glass-panel"
                      style={{
                        padding: '20px', background: 'var(--bg-card)',
                        border: '2px solid #000000', boxShadow: '3px 3px 0px #000000'
                      }}
                    >
                      {/* Topic Title and BKT Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px dashed #000000', paddingBottom: '12px', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                        <div>
                          <h3 style={{ fontSize: '1.1rem', textTransform: 'uppercase', fontFamily: 'Outfit', fontWeight: '800' }}>
                            Topik: {namaTopik}
                          </h3>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '700' }}>
                            Tingkat Penguasaan:
                          </span>
                          <span className={`brutal-badge ${statusInfo.badgeClass}`} style={{ fontWeight: '800' }}>
                            {statusInfo.label} ({(dataTopik.learned_prob * 100).toFixed(0)}%)
                          </span>
                          <div style={{ width: '80px', height: '10px', background: '#000000', border: '1.5px solid #000000', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{ width: `${dataTopik.learned_prob * 100}%`, height: '100%', background: statusInfo.color }}></div>
                          </div>
                        </div>
                      </div>

                      {/* Question Roster under Topic */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {dataTopik.list.map(soal => (
                          <div
                            key={soal.soal_id}
                            style={{
                              background: '#08080A', padding: '14px 20px', borderRadius: '4px',
                              border: '1.5px solid #000000', display: 'flex', justifyContent: 'space-between',
                              alignItems: 'center', flexWrap: 'wrap', gap: '15px'
                            }}
                          >
                            <div style={{ flex: 1 }}>
                              <h4 style={{ fontSize: '0.95rem', fontWeight: '800', textTransform: 'uppercase', color: '#FFF' }}>
                                {soal.judul_soal || 'Soal Latihan'}
                              </h4>
                              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: '4px 0 0 0', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: '1', WebkitBoxOrient: 'vertical' }}>
                                {soal.deskripsi_soal}
                              </p>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
                              {/* Difficulty Badge */}
                              <span style={{
                                fontSize: '0.7rem',
                                color: soal.tingkat_kesulitan === 'Mudah' ? 'var(--success-color)' : soal.tingkat_kesulitan === 'Sedang' ? 'var(--accent-color)' : 'var(--danger-color)',
                                fontWeight: '800', border: '1px solid #000000', padding: '2px 8px', borderRadius: '2px', background: 'rgba(0,0,0,0.4)'
                              }}>
                                {soal.tingkat_kesulitan.toUpperCase()}
                              </span>

                              {/* Solved Status Badge */}
                              {soal.is_solved ? (
                                <span className="brutal-badge brutal-badge-success" style={{ fontSize: '0.65rem', padding: '2px 8px' }}>
                                  Selesai ✅
                                </span>
                              ) : (
                                <span className="brutal-badge brutal-badge-yellow" style={{ fontSize: '0.65rem', padding: '2px 8px' }}>
                                  Belum Dikerjakan 📝
                                </span>
                              )}

                              {/* Button */}
                              <button
                                className={`btn ${soal.is_solved ? 'btn-secondary' : 'btn-primary'}`}
                                onClick={() => navigate(`/siswa/workspace/${soal.soal_id}`)}
                                style={{ padding: '6px 16px', fontSize: '0.75rem' }}
                              >
                                {soal.is_solved ? 'Kerjakan Lagi' : 'Mulai Mengerjakan'}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Section: Riwayat Submit Kode Global ── */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ marginBottom: '16px' }}>
              <h2 style={{ fontSize: '1.2rem', textTransform: 'uppercase', fontFamily: 'Outfit', fontWeight: '800' }}>📜 Riwayat Pengerjaan Kode Global</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: '4px 0 0 0', fontWeight: '600' }}>
                Daftar lengkap semua submit koding yang pernah Anda lakukan.
              </p>
            </div>

            {history.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                Belum ada riwayat submit kode.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="brutal-table">
                  <thead>
                    <tr>
                      <th style={{ width: '20%' }}>Waktu Submit</th>
                      <th style={{ width: '45%' }}>Latihan / Soal</th>
                      <th style={{ width: '20%' }}>Status Compile</th>
                      <th style={{ width: '15%' }}>Hasil Pengujian</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map(item => (
                      <tr key={item.evaluasi_id}>
                        <td style={{ fontSize: '0.8rem', fontWeight: '600' }}>
                          {new Date(item.timestamp).toLocaleString('id-ID')}
                        </td>
                        <td style={{ fontWeight: '700', textTransform: 'uppercase', fontSize: '0.85rem' }}>
                          {item.deskripsi_soal}
                        </td>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                          {item.status_compile}
                        </td>
                        <td>
                          {item.binary_result === 1 ? (
                            <span className="brutal-badge brutal-badge-success" style={{ fontSize: '0.65rem' }}>Benar ✅</span>
                          ) : (
                            <span className="brutal-badge brutal-badge-danger" style={{ fontSize: '0.65rem' }}>Salah ❌</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}

export default DashboardSiswa;
