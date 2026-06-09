import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import axios from 'axios';

const API = 'http://localhost:8000';

function ManajemenSoal() {
  const [soalList, setSoalList] = useState([]);
  const [topikList, setTopikList] = useState([]);
  
  // State form soal
  const [judul, setJudul] = useState('');
  const [soal, setSoal] = useState('');
  const [topikId, setTopikId] = useState('');
  const [kesulitan, setKesulitan] = useState('Mudah');
  const [inputData, setInputData] = useState('');
  const [expectedOutput, setExpectedOutput] = useState('');
  
  // State kontrol soal
  const [message, setMessage] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // State kontrol topik
  const [isTopikModalOpen, setIsTopikModalOpen] = useState(false);
  const [namaTopikBaru, setNamaTopikBaru] = useState('');
  const [deskripsiTopikBaru, setDeskripsiTopikBaru] = useState('');
  const [topikMessage, setTopikMessage] = useState('');
  const [topikMessageType, setTopikMessageType] = useState('success'); // 'success' | 'error'
  const [expandedTopics, setExpandedTopics] = useState({});

  const toggleTopic = (topikId) => {
    setExpandedTopics(prev => ({
      ...prev,
      [topikId]: !prev[topikId]
    }));
  };

  // Ambil user dari localStorage
  const userRaw = localStorage.getItem('user');
  const user = userRaw ? JSON.parse(userRaw) : { user_id: 1, role: 'dosen' };

  useEffect(() => {
    fetchDaftarSoal();
    fetchTopikList();
  }, []);

  const fetchTopikList = async () => {
    try {
      const res = await axios.get(`${API}/api/soal/topik`);
      setTopikList(res.data);
      if (res.data.length > 0) {
        setTopikId(res.data[0].topik_id);
      }
    } catch (err) {
      console.error('Gagal mengambil daftar topik:', err);
    }
  };

  const fetchDaftarSoal = async () => {
    try {
      const res = await axios.get(`${API}/api/soal/`);
      setSoalList(res.data);
    } catch (err) {
      console.error('Gagal mengambil daftar soal:', err);
    }
  };

  // ── Handlers Modal Soal ──
  const openAddModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const closeAddModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setJudul('');
    setSoal('');
    setTopikId(topikList.length > 0 ? topikList[0].topik_id : '');
    setKesulitan('Mudah');
    setInputData('');
    setExpectedOutput('');
    setIsEditing(false);
    setEditId(null);
    setMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('Menyimpan ke database...');
    
    const payload = {
      topik_id: parseInt(topikId),
      dosen_id: user.user_id,
      judul_soal: judul,
      deskripsi_soal: soal,
      tingkat_kesulitan: kesulitan,
      testcases: [
        {
          input_data: inputData,
          expected_output: expectedOutput
        }
      ]
    };

    try {
      if (isEditing) {
        await axios.put(`${API}/api/soal/${editId}`, payload);
      } else {
        await axios.post(`${API}/api/soal/`, payload);
      }
      
      fetchDaftarSoal();
      closeAddModal();
    } catch (err) {
      setMessage('Error saat menyimpan soal. Pastikan Backend berjalan.');
      console.error(err);
    }
  };

  const handleEditClick = (s) => {
    setIsEditing(true);
    setEditId(s.soal_id);
    setTopikId(s.topik_id);
    setKesulitan(s.tingkat_kesulitan);
    setJudul(s.judul_soal || '');
    setSoal(s.deskripsi_soal);
    
    if (s.testcases && s.testcases.length > 0) {
      setInputData(s.testcases[0].input_data || '');
      setExpectedOutput(s.testcases[0].expected_output || '');
    } else {
      setInputData('');
      setExpectedOutput('');
    }
    
    setIsModalOpen(true);
  };

  const handleDeleteClick = async (soal_id) => {
    if (!window.confirm('Yakin ingin menghapus soal ini? Tindakan ini tidak dapat dibatalkan.')) return;
    
    try {
      await axios.delete(`${API}/api/soal/${soal_id}`);
      fetchDaftarSoal();
    } catch (err) {
      alert('Gagal menghapus soal.');
      console.error(err);
    }
  };

  // ── Handlers Modal Topik ──
  const openTopikModal = () => {
    setIsTopikModalOpen(true);
    setNamaTopikBaru('');
    setDeskripsiTopikBaru('');
    setTopikMessage('');
  };

  const closeTopikModal = () => {
    setIsTopikModalOpen(false);
    setNamaTopikBaru('');
    setDeskripsiTopikBaru('');
    setTopikMessage('');
  };

  const handleTambahTopik = async (e) => {
    e.preventDefault();
    if (!namaTopikBaru.trim()) {
      setTopikMessage('Nama topik tidak boleh kosong.');
      setTopikMessageType('error');
      return;
    }

    try {
      await axios.post(`${API}/api/soal/topik`, {
        nama_topik: namaTopikBaru.trim(),
        deskripsi: deskripsiTopikBaru.trim() || null
      });
      setTopikMessage(`Topik "${namaTopikBaru.trim()}" berhasil ditambahkan!`);
      setTopikMessageType('success');
      setNamaTopikBaru('');
      setDeskripsiTopikBaru('');
      fetchTopikList(); // Refresh dropdown di form soal juga
    } catch (err) {
      const detail = err.response?.data?.detail || 'Gagal menambahkan topik.';
      setTopikMessage(detail);
      setTopikMessageType('error');
    }
  };

  const handleHapusTopik = async (topik_id, nama_topik) => {
    if (!window.confirm(`Yakin ingin menghapus topik "${nama_topik}"?\n\nTopik hanya bisa dihapus jika tidak ada soal yang menggunakannya.`)) return;
    
    try {
      await axios.delete(`${API}/api/soal/topik/${topik_id}`);
      setTopikMessage(`Topik "${nama_topik}" berhasil dihapus.`);
      setTopikMessageType('success');
      fetchTopikList();
    } catch (err) {
      const detail = err.response?.data?.detail || 'Gagal menghapus topik.';
      setTopikMessage(detail);
      setTopikMessageType('error');
    }
  };

  // Hitung jumlah soal per topik untuk badge
  const getSoalCountForTopik = (topik_id) => {
    return soalList.filter(s => s.topik_id === topik_id).length;
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <Navbar role="dosen" activePage="soal" />
      
      <div style={{ padding: '30px', maxWidth: '1200px', margin: '0 auto', width: '100%', flex: 1, display: 'flex', flexDirection: 'column' }}>
        
        {/* Header */}
        <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '2.2rem', marginBottom: '4px', fontFamily: 'Outfit', fontWeight: '800', textTransform: 'uppercase' }}>Bank Soal & Test Case</h1>
            <p style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Manajemen soal pemrograman ICLS</p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={openTopikModal} className="btn btn-secondary" style={{ padding: '10px 20px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase' }}>
              Kelola Topik
            </button>
            <button onClick={openAddModal} className="btn btn-primary" style={{ padding: '10px 20px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase' }}>
              Tambah Soal Baru
            </button>
          </div>
        </div>

        <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '2.5px solid #000000', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card-hover)' }}>
            <h2 style={{ margin: 0, fontSize: '1.2rem', fontFamily: 'Outfit', fontWeight: '800', textTransform: 'uppercase' }}>Daftar Soal Anda</h2>
            <span className="brutal-badge brutal-badge-blue">
              Total: {soalList.length} Soal
            </span>
          </div>
          
          <div style={{ flex: 1, overflowY: 'auto', padding: '0', maxHeight: '700px' }}>
            {topikList.length === 0 ? (
              <div style={{ padding: '50px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                Belum ada topik terdaftar. Silakan klik "Kelola Topik" untuk menambahkan topik terlebih dahulu.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {topikList.map((t) => {
                  const questionsInTopik = soalList.filter(s => s.topik_id === t.topik_id);
                  const isExpanded = !!expandedTopics[t.topik_id];
                  const count = questionsInTopik.length;

                  return (
                    <div key={t.topik_id} style={{ borderBottom: '2.5px solid #000000' }}>
                      {/* Accordion Header */}
                      <div 
                        onClick={() => toggleTopic(t.topik_id)}
                        style={{
                          padding: '18px 24px',
                          background: 'var(--bg-card-hover)',
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          userSelect: 'none',
                          borderBottom: isExpanded ? '2.5px solid #000000' : 'none',
                          transition: 'background-color 0.15s ease'
                        }}
                      >
                        <div style={{ flex: 1, marginRight: '16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                            <h3 style={{ fontSize: '1.05rem', fontWeight: '800', textTransform: 'uppercase', color: 'white', margin: 0, fontFamily: 'Outfit' }}>
                              {t.nama_topik}
                            </h3>
                            <span className="brutal-badge brutal-badge-blue" style={{ fontSize: '0.65rem', padding: '1px 6px' }}>
                              ID: {t.topik_id}
                            </span>
                          </div>
                          {t.deskripsi && (
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: '4px 0 0 0', fontWeight: '600' }}>
                              {t.deskripsi}
                            </p>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                          <span className="brutal-badge brutal-badge-yellow" style={{ fontSize: '0.68rem', padding: '2px 8px' }}>
                            {count} Soal
                          </span>
                          <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: '800' }}>
                            {isExpanded ? '▲' : '▼'}
                          </span>
                        </div>
                      </div>

                      {/* Accordion Content (List of Questions in Topic) */}
                      {isExpanded && (
                        <div style={{ background: '#0D0D11' }}>
                          {count === 0 ? (
                            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: '600' }}>
                              Belum ada soal terdaftar untuk topik ini. Silakan klik "Tambah Soal Baru" untuk mengisi.
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              {questionsInTopik.map((s, index) => {
                                const diffBadgeClass = s.tingkat_kesulitan === 'Mudah' ? 'success' : s.tingkat_kesulitan === 'Sedang' ? 'yellow' : 'danger';
                                return (
                                  <div 
                                    key={s.soal_id} 
                                    style={{ 
                                      padding: '24px 30px', 
                                      borderBottom: index === count - 1 ? 'none' : '1.5px solid #2D2D35',
                                      background: '#08080A'
                                    }}
                                  >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px', flexWrap: 'wrap', gap: '15px' }}>
                                      <div>
                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap' }}>
                                          <span className="brutal-badge brutal-badge-yellow" style={{ fontSize: '0.65rem', padding: '1px 5px' }}>ID: {s.soal_id}</span>
                                          <span className={`brutal-badge brutal-badge-${diffBadgeClass}`} style={{ fontSize: '0.65rem', padding: '1px 5px' }}>
                                            {s.tingkat_kesulitan}
                                          </span>
                                        </div>
                                        <h4 style={{ fontSize: '1.1rem', fontWeight: '800', margin: '8px 0 0 0', color: 'white', fontFamily: 'Outfit', textTransform: 'uppercase' }}>
                                          {s.judul_soal || 'Tanpa Judul'}
                                        </h4>
                                      </div>
                                      <div style={{ display: 'flex', gap: '8px' }}>
                                        <button 
                                          onClick={() => handleEditClick(s)}
                                          className="btn btn-secondary"
                                          style={{ padding: '5px 12px', fontSize: '0.75rem', boxShadow: '1.5px 1.5px 0px #000000' }}
                                          title="Edit Soal"
                                        >
                                          Edit
                                        </button>
                                        <button 
                                          onClick={() => handleDeleteClick(s.soal_id)}
                                          className="btn btn-danger"
                                          style={{ padding: '5px 12px', fontSize: '0.75rem', boxShadow: '1.5px 1.5px 0px #000000' }}
                                          title="Hapus Soal"
                                        >
                                          Hapus
                                        </button>
                                      </div>
                                    </div>
                                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: '1.6', whiteSpace: 'pre-wrap', fontWeight: '500' }}>
                                      {s.deskripsi_soal}
                                    </div>
                                    
                                    {s.testcases && s.testcases.length > 0 && (
                                      <div style={{ marginTop: '14px', padding: '10px 14px', background: '#000000', borderRadius: '4px', border: '1.5px solid #1F1F24', display: 'inline-block', boxShadow: '1.5px 1.5px 0px #000000' }}>
                                        <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px', textTransform: 'uppercase', fontWeight: '800' }}>Expected Output:</span>
                                        <code style={{ fontSize: '0.85rem', color: 'var(--success-color)', fontWeight: '700' }}>{s.testcases[0].expected_output}</code>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ══════════════════════════════════════════════ */}
      {/* ── Modal: Tambah / Edit Soal ──               */}
      {/* ══════════════════════════════════════════════ */}
      {isModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: 'rgba(0,0,0,0.8)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '650px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: '4px', border: '2.5px solid #000000', boxShadow: 'var(--brutal-shadow-hover)', background: 'var(--bg-card)' }}>
            <div style={{ padding: '20px 30px', borderBottom: '2.5px solid #000000', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-card-hover)' }}>
              <h2 style={{ fontSize: '1.3rem', margin: 0, color: isEditing ? 'var(--accent-color)' : 'white', fontFamily: 'Outfit', fontWeight: '800', textTransform: 'uppercase' }}>
                {isEditing ? `Perbarui Soal #${editId}` : 'Buat Soal Baru'}
              </h2>
              <button onClick={closeAddModal} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '1.5rem', cursor: 'pointer', lineHeight: 1, fontWeight: '800' }}>
                ✕
              </button>
            </div>
            
            <div style={{ padding: '30px', overflowY: 'auto', flex: 1 }}>
              {message && (
                <div style={{ padding: '12px', marginBottom: '20px', borderRadius: '4px', border: '2px solid #000000', background: message.includes('Error') ? 'var(--danger-color)' : 'var(--success-color)', color: '#000000', fontWeight: '800', fontSize: '0.9rem', boxShadow: '2px 2px 0px #000000', textTransform: 'uppercase' }}>
                  {message}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div style={{ display: 'flex', gap: '20px' }}>
                  <div className="input-group" style={{ flex: 1 }}>
                    <label className="input-label">Topik Materi</label>
                    <select className="input-field" value={topikId} onChange={e => setTopikId(e.target.value)} style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
                      {topikList.length === 0 ? (
                        <option value="">Memuat topik...</option>
                      ) : (
                        topikList.map(t => (
                          <option key={t.topik_id} value={t.topik_id}>{t.topik_id} - {t.nama_topik}</option>
                        ))
                      )}
                    </select>
                  </div>

                  <div className="input-group" style={{ flex: 1 }}>
                    <label className="input-label">Tingkat Kesulitan</label>
                    <select className="input-field" value={kesulitan} onChange={e => setKesulitan(e.target.value)} style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
                      <option value="Mudah">Mudah</option>
                      <option value="Sedang">Sedang</option>
                      <option value="Sulit">Sulit</option>
                    </select>
                  </div>
                </div>

                <div className="input-group">
                  <label className="input-label">Judul Soal <span style={{ color: 'var(--danger-color)' }}>*</span></label>
                  <input 
                    className="input-field" 
                    type="text"
                    value={judul} 
                    onChange={e => setJudul(e.target.value)} 
                    placeholder="Contoh: Fungsi Pengecek Bilangan Genap"
                    required
                    style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">Deskripsi Soal / Instruksi <span style={{ color: 'var(--danger-color)' }}>*</span></label>
                  <textarea 
                    className="input-field" 
                    rows="5" 
                    value={soal} 
                    onChange={e => setSoal(e.target.value)} 
                    placeholder="Contoh: Buatlah program untuk mencari luas lingkaran..."
                    required
                  />
                </div>

                <div style={{ marginTop: '25px', marginBottom: '16px', borderBottom: '2px solid #000000', paddingBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h3 style={{ fontSize: '1rem', margin: 0, fontFamily: 'Outfit', fontWeight: '800', textTransform: 'uppercase' }}>Konfigurasi Test Case</h3>
                </div>

                <div className="input-group">
                  <label className="input-label">Input Data (Opsional)</label>
                  <textarea 
                    className="input-field" 
                    rows="2" 
                    value={inputData} 
                    onChange={e => setInputData(e.target.value)} 
                    placeholder="Data stdin untuk JDoodle... (Kosongkan jika tidak butuh input)"
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">Expected Output (Wajib)</label>
                  <textarea 
                    className="input-field" 
                    rows="2" 
                    value={expectedOutput} 
                    onChange={e => setExpectedOutput(e.target.value)} 
                    placeholder="Output persis yang diharap dari layar terminal..."
                    required
                  />
                </div>

                <div style={{ display: 'flex', gap: '15px', marginTop: '30px' }}>
                  <button type="button" onClick={closeAddModal} className="btn btn-secondary" style={{ flex: 1 }}>
                    Batal
                  </button>
                  <button type="submit" className={isEditing ? "btn btn-secondary" : "btn btn-primary"} style={{ flex: 2 }}>
                    {isEditing ? 'Simpan Perubahan' : 'Tambahkan Soal'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════ */}
      {/* ── Modal: Kelola Topik Materi ──              */}
      {/* ══════════════════════════════════════════════ */}
      {isTopikModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: 'rgba(0,0,0,0.8)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '600px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: '4px', border: '2.5px solid #000000', boxShadow: 'var(--brutal-shadow-hover)', background: 'var(--bg-card)' }}>
            
            {/* Header */}
            <div style={{ padding: '20px 30px', borderBottom: '2.5px solid #000000', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-card-hover)' }}>
              <h2 style={{ fontSize: '1.3rem', margin: 0, fontFamily: 'Outfit', fontWeight: '800', textTransform: 'uppercase' }}>Kelola Topik Materi</h2>
              <button onClick={closeTopikModal} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '1.5rem', cursor: 'pointer', lineHeight: 1, fontWeight: '800' }}>
                ✕
              </button>
            </div>

            <div style={{ padding: '24px 30px', overflowY: 'auto', flex: 1 }}>

              {/* Pesan feedback */}
              {topikMessage && (
                <div style={{ 
                  padding: '12px 16px', marginBottom: '20px', borderRadius: '4px', fontSize: '0.9rem', fontWeight: '800',
                  background: topikMessageType === 'error' ? 'var(--danger-color)' : 'var(--success-color)', 
                  color: '#000000', border: '2px solid #000000', boxShadow: '2px 2px 0px #000000', textTransform: 'uppercase'
                }}>
                  {topikMessage}
                </div>
              )}

              {/* Form Tambah Topik Baru */}
              <form onSubmit={handleTambahTopik} style={{ marginBottom: '28px' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '16px', color: 'var(--accent-color)' }}>Tambah Topik Baru</h3>
                <div className="input-group" style={{ marginBottom: '12px' }}>
                  <label className="input-label">Nama Topik <span style={{ color: 'var(--danger-color)' }}>*</span></label>
                  <input 
                    className="input-field" 
                    type="text"
                    value={namaTopikBaru} 
                    onChange={e => setNamaTopikBaru(e.target.value)} 
                    placeholder="Contoh: Percabangan, Perulangan, Fungsi..."
                    required
                  />
                </div>
                <div className="input-group" style={{ marginBottom: '16px' }}>
                  <label className="input-label">Deskripsi (Opsional)</label>
                  <textarea 
                    className="input-field" 
                    rows="2" 
                    value={deskripsiTopikBaru} 
                    onChange={e => setDeskripsiTopikBaru(e.target.value)} 
                    placeholder="Penjelasan singkat tentang topik materi ini..."
                  />
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '10px' }}>
                  Simpan Topik Baru
                </button>
              </form>

              {/* Divider */}
              <div style={{ borderBottom: '2.5px solid #000000', marginBottom: '24px' }} />
 
              {/* Daftar Topik */}
              <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', fontFamily: 'Outfit', fontWeight: '800', textTransform: 'uppercase' }}>Daftar Topik Terdaftar ({topikList.length})</h3>
              
              {topikList.length === 0 ? (
                <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: '600' }}>
                  Belum ada topik materi. Silakan tambahkan topik baru di atas.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {topikList.map(t => {
                    const soalCount = getSoalCountForTopik(t.topik_id);
                    return (
                      <div 
                        key={t.topik_id} 
                        style={{ 
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '14px 16px', borderRadius: '4px', 
                          background: 'var(--bg-card-hover)', border: '2px solid #000000',
                          boxShadow: '2px 2px 0px #000000',
                          transition: 'all 0.1s'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'translate(-1px, -1px)'; e.currentTarget.style.boxShadow = '3px 3px 0px #000000'; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '2px 2px 0px #000000'; }}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                            <span className="brutal-badge brutal-badge-blue" style={{ fontSize: '0.75rem', padding: '2px 8px' }}>
                              ID: {t.topik_id}
                            </span>
                            <span style={{ fontWeight: '800', fontSize: '0.95rem', color: '#ffffff' }}>{t.nama_topik}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px', flexWrap: 'wrap' }}>
                            {t.deskripsi && (
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '600' }}>{t.deskripsi}</span>
                            )}
                            <span className="brutal-badge brutal-badge-yellow" style={{ fontSize: '0.7rem', padding: '2px 8px' }}>
                              {soalCount} Soal
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleHapusTopik(t.topik_id, t.nama_topik)}
                          title={soalCount > 0 ? `Tidak bisa dihapus (${soalCount} soal terkait)` : 'Hapus topik ini'}
                          disabled={soalCount > 0}
                          className="btn btn-danger"
                          style={{ 
                            padding: '6px 12px', fontSize: '0.75rem',
                            opacity: soalCount > 0 ? 0.4 : 1,
                            cursor: soalCount > 0 ? 'not-allowed' : 'pointer'
                          }}
                        >
                          Hapus
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
 
            {/* Footer */}
            <div style={{ padding: '16px 30px', borderTop: '2.5px solid #000000', backgroundColor: 'var(--bg-card-hover)' }}>
              <button onClick={closeTopikModal} className="btn btn-secondary" style={{ width: '100%', padding: '10px' }}>
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default ManajemenSoal;
