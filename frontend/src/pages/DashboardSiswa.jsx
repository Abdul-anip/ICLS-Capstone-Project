import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/apiClient';
import Navbar from '../components/Navbar';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';

function getBktStatus(prob) {
  if (prob >= 0.8) return { label: 'Dikuasai', color: 'var(--success-color)', badgeClass: 'brutal-badge-success' };
  if (prob >= 0.6) return { label: 'Hampir', color: 'var(--accent-color)', badgeClass: 'brutal-badge-yellow' };
  if (prob >= 0.3) return { label: 'Belajar', color: 'var(--accent-blue)', badgeClass: 'brutal-badge-blue' };
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
  const [selectedTopic, setSelectedTopic] = useState('Semua');
  const [showAllHistory, setShowAllHistory] = useState(false);
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
        apiClient.get(`/api/soal/siswa/${user.user_id}`),
        apiClient.get(`/api/soal/siswa/${user.user_id}/bkt-stats`),
        apiClient.get(`/api/evaluasi/history/${user.user_id}`),
        apiClient.get(`/api/soal/siswa/${user.user_id}/rekomendasi`)
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

  // Ambil daftar soal yang terfilter berdasarkan topik terpilih
  const filteredQuestions = selectedTopic === 'Semua'
    ? soalList
    : (groupedSoal[selectedTopic]?.list || []);

  // Filter riwayat yang akan ditampilkan (tampilkan 5 terakhir secara default)
  const displayedHistory = showAllHistory ? history : history.slice(0, 5);

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
          {!user?.kelas_id && (
            <div style={{ padding: '16px', marginBottom: '20px', borderRadius: '4px', border: '2.5px solid #000000', backgroundColor: 'var(--danger-color)', color: '#000', fontWeight: '800', boxShadow: '3px 3px 0px #000000', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '1.2rem' }}>⚠️</span>
              <div>
                <div style={{ textTransform: 'uppercase', marginBottom: '2px' }}>Peringatan: Belum Terdaftar di Kelas</div>
                <div style={{ fontSize: '0.9rem', fontWeight: '600' }}>Anda belum ditugaskan ke kelas manapun. Beberapa soal mungkin tidak akan muncul sampai Anda masuk kelas. Silakan hubungi dosen Anda.</div>
              </div>
            </div>
          )}
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
                          const color = val >= 80 ? 'var(--success-color)' : val >= 60 ? 'var(--accent-color)' : 'var(--accent-blue)';
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
                <h2 style={{ fontSize: '1.2rem', textTransform: 'uppercase', fontFamily: 'Outfit', fontWeight: '800' }}>Rekomendasi Belajar</h2>
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
                Klik pada kartu topik untuk memfilter daftar soal latihan yang ingin Anda kerjakan.
              </p>
            </div>

            {Object.keys(groupedSoal).length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                Belum ada soal latihan yang dirilis oleh dosen Anda.
              </div>
            ) : (
              <div>
                {/* Grid Kartu Topik */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px', marginBottom: '24px' }}>
                  {/* Kartu Semua Topik */}
                  <div
                    onClick={() => setSelectedTopic('Semua')}
                    style={{
                      padding: '20px',
                      cursor: 'pointer',
                      borderRadius: '6px',
                      background: selectedTopic === 'Semua' ? 'var(--bg-card-hover)' : 'var(--bg-card)',
                      border: '2.5px solid #000000',
                      transform: selectedTopic === 'Semua' ? 'translate(2px, 2px)' : 'none',
                      boxShadow: selectedTopic === 'Semua' ? '2px 2px 0px #000000' : 'var(--brutal-shadow)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      minHeight: '130px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div>
                      <h3 style={{ fontSize: '1.05rem', textTransform: 'uppercase', fontFamily: 'Outfit', fontWeight: '800', color: selectedTopic === 'Semua' ? 'var(--accent-color)' : '#FFF' }}>
                        Semua Topik
                      </h3>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', marginTop: '6px', lineHeight: '1.4' }}>
                        Tampilkan seluruh daftar soal latihan dari semua topik
                      </p>
                    </div>
                    <div style={{ fontSize: '0.8rem', fontWeight: '700', marginTop: '12px', color: 'var(--text-secondary)' }}>
                      Total Soal: <strong style={{ color: '#FFF' }}>{soalList.length} Soal</strong>
                    </div>
                  </div>

                  {/* Kartu Topik Individu */}
                  {Object.entries(groupedSoal).map(([namaTopik, dataTopik]) => {
                    const isSelected = selectedTopic === namaTopik;
                    const statusInfo = getBktStatus(dataTopik.learned_prob);
                    const solvedCount = dataTopik.list.filter(s => s.is_solved).length;
                    const totalCount = dataTopik.list.length;

                    return (
                      <div
                        key={namaTopik}
                        onClick={() => setSelectedTopic(namaTopik)}
                        style={{
                          padding: '20px',
                          cursor: 'pointer',
                          borderRadius: '6px',
                          background: isSelected ? 'var(--bg-card-hover)' : 'var(--bg-card)',
                          border: '2.5px solid #000000',
                          transform: isSelected ? 'translate(2px, 2px)' : 'none',
                          boxShadow: isSelected ? '2px 2px 0px #000000' : 'var(--brutal-shadow)',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          minHeight: '130px',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                            <h3 style={{
                              fontSize: '1.02rem',
                              textTransform: 'uppercase',
                              fontFamily: 'Outfit',
                              fontWeight: '800',
                              color: isSelected ? 'var(--accent-color)' : '#FFF',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              display: '-webkit-box',
                              WebkitLineClamp: '2',
                              WebkitBoxOrient: 'vertical',
                              lineHeight: '1.3'
                            }}>
                              {namaTopik}
                            </h3>
                            <span className={`brutal-badge ${statusInfo.badgeClass}`} style={{ fontSize: '0.6rem', padding: '1px 5px', flexShrink: 0 }}>
                              {statusInfo.label}
                            </span>
                          </div>

                          {/* Progress bar */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px' }}>
                            <div style={{ flex: 1, height: '6px', background: '#000000', border: '1.5px solid #000000', borderRadius: '1px', overflow: 'hidden' }}>
                              <div style={{ width: `${dataTopik.learned_prob * 100}%`, height: '100%', background: statusInfo.color }}></div>
                            </div>
                            <span style={{ fontSize: '0.72rem', fontWeight: '800', color: 'var(--text-secondary)', minWidth: '28px', textAlign: 'right' }}>
                              {(dataTopik.learned_prob * 100).toFixed(0)}%
                            </span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                          <span>Progress:</span>
                          <strong style={{ color: '#FFF' }}>{solvedCount} / {totalCount} Selesai</strong>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Sub-Header Soal Terfilter */}
                <div style={{ background: '#08080A', padding: '12px 18px', border: '2.5px solid #000000', borderRadius: '4px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <span style={{ fontWeight: '800', textTransform: 'uppercase', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    Topik Terpilih: <strong style={{ color: 'var(--accent-color)' }}>{selectedTopic === 'Semua' ? 'Semua Topik' : selectedTopic}</strong>
                  </span>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: '700' }}>
                    Menampilkan <strong style={{ color: '#FFF' }}>{filteredQuestions.length}</strong> Soal
                  </span>
                </div>

                {/* Roster Soal */}
                {filteredQuestions.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    Tidak ada soal latihan untuk topik ini.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {filteredQuestions.map(soal => {
                      const isLocked = soal.is_locked;
                      return (
                        <div
                          key={soal.soal_id}
                          style={{
                            background: isLocked ? 'rgba(30, 30, 35, 0.3)' : '#08080A',
                            padding: '14px 20px',
                            borderRadius: '4px',
                            border: '1.5px solid #000000',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: '15px',
                            boxShadow: isLocked ? 'none' : '2px 2px 0px #000000',
                            opacity: isLocked ? 0.65 : 1,
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{ flex: 1, minWidth: '250px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                              <h4 style={{ fontSize: '0.95rem', fontWeight: '800', textTransform: 'uppercase', color: isLocked ? 'var(--text-secondary)' : '#FFF' }}>
                                {isLocked ? '🔒 ' : ''}{soal.judul_soal || 'Soal Latihan'}
                              </h4>
                              {selectedTopic === 'Semua' && (
                                <span style={{ fontSize: '0.65rem', background: 'var(--bg-card)', padding: '1px 6px', border: '1.5px solid #000000', borderRadius: '2px', color: 'var(--text-secondary)', fontWeight: '700' }}>
                                  {soal.nama_topik}
                                </span>
                              )}
                            </div>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: '4px 0 0 0', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: '1', WebkitBoxOrient: 'vertical' }}>
                              {isLocked ? 'Selesaikan tingkat kesulitan sebelumnya pada topik ini untuk membuka soal.' : soal.deskripsi_soal}
                            </p>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
                            {/* Difficulty Badge */}
                            <span style={{
                              fontSize: '0.7rem',
                              color: isLocked ? 'var(--text-secondary)' : soal.tingkat_kesulitan === 'Mudah' ? 'var(--success-color)' : soal.tingkat_kesulitan === 'Sedang' ? 'var(--accent-color)' : 'var(--danger-color)',
                              fontWeight: '800', border: '1px solid #000000', padding: '2px 8px', borderRadius: '2px', background: 'rgba(0,0,0,0.4)'
                            }}>
                              {soal.tingkat_kesulitan.toUpperCase()}
                            </span>

                            {/* Solved Status Badge */}
                            {isLocked ? (
                              <span className="brutal-badge brutal-badge-danger" style={{ fontSize: '0.65rem', padding: '2px 8px' }}>
                                Terkunci
                              </span>
                            ) : soal.is_solved ? (
                              <span className="brutal-badge brutal-badge-success" style={{ fontSize: '0.65rem', padding: '2px 8px' }}>
                                Selesai
                              </span>
                            ) : (
                              <span className="brutal-badge brutal-badge-yellow" style={{ fontSize: '0.65rem', padding: '2px 8px' }}>
                                Belum Dikerjakan
                              </span>
                            )}

                            {/* Button */}
                            <button
                              className={`btn ${isLocked || soal.is_solved ? 'btn-secondary' : 'btn-primary'}`}
                              onClick={() => !isLocked && navigate(`/siswa/workspace/${soal.soal_id}`)}
                              disabled={isLocked}
                              style={{
                                padding: '6px 16px',
                                fontSize: '0.75rem',
                                cursor: isLocked ? 'not-allowed' : 'pointer',
                                boxShadow: isLocked ? 'none' : undefined
                              }}
                            >
                              {isLocked ? 'Terkunci' : soal.is_solved ? 'Kerjakan Lagi' : 'Mulai Mengerjakan'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Section: Riwayat Submit Kode Global (Aktivitas Terbaru) ── */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h2 style={{ fontSize: '1.2rem', textTransform: 'uppercase', fontFamily: 'Outfit', fontWeight: '800' }}>Aktivitas Terbaru</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: '4px 0 0 0', fontWeight: '600' }}>
                  Riwayat pengerjaan soal dan status submit terakhir Anda.
                </p>
              </div>
              {history.length > 5 && (
                <button
                  onClick={() => setShowAllHistory(!showAllHistory)}
                  className="btn btn-secondary"
                  style={{ padding: '6px 14px', fontSize: '0.75rem', textTransform: 'uppercase' }}
                >
                  {showAllHistory ? 'Sembunyikan' : `Lihat Semua (${history.length})`}
                </button>
              )}
            </div>

            {history.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                Belum ada riwayat aktivitas pengerjaan soal.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {displayedHistory.map(item => {
                  const isSuccess = item.binary_result === 1;
                  return (
                    <div
                      key={item.evaluasi_id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 20px',
                        background: '#08080A',
                        border: '1.5px solid #000000',
                        borderRadius: '4px',
                        flexWrap: 'wrap',
                        gap: '15px',
                        boxShadow: '1.5px 1.5px 0px #000000'
                      }}
                    >
                      {/* Left side: Icon + Info */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '200px' }}>
                        {/* Status Icon */}
                        <div
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            border: '1.5px solid #000000',
                            background: isSuccess ? 'var(--success-color)' : 'var(--danger-color)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.85rem',
                            color: '#000000',
                            fontWeight: '800',
                            flexShrink: 0
                          }}
                        >
                          {isSuccess ? '✓' : '✗'}
                        </div>

                        <div>
                          <span style={{ fontSize: '0.88rem', fontWeight: '800', color: '#FFF', textTransform: 'uppercase' }}>
                            {item.deskripsi_soal}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '600' }}>
                              {new Date(item.timestamp).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                            </span>
                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>•</span>
                            <span style={{
                              fontFamily: 'monospace',
                              fontSize: '0.72rem',
                              color: isSuccess ? 'var(--success-color)' : 'var(--danger-color)',
                              background: 'rgba(0,0,0,0.3)',
                              padding: '1px 6px',
                              borderRadius: '2px',
                              border: '1px solid #000000'
                            }}>
                              {item.status_compile}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right side: Badge status */}
                      <span className={`brutal-badge ${isSuccess ? 'brutal-badge-success' : 'brutal-badge-danger'}`} style={{ fontSize: '0.62rem', padding: '2px 8px' }}>
                        {isSuccess ? 'BERHASIL' : 'GAGAL'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}

export default DashboardSiswa;
