import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import axios from 'axios';

const API = 'http://localhost:8000';

function ManajemenSoal() {
  const [soalList, setSoalList] = useState([]);
  const [topikList, setTopikList] = useState([]);
  
  // State form
  const [soal, setSoal] = useState('');
  const [topikId, setTopikId] = useState('');
  const [kesulitan, setKesulitan] = useState('Mudah');
  const [inputData, setInputData] = useState('');
  const [expectedOutput, setExpectedOutput] = useState('');
  
  // State kontrol
  const [message, setMessage] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);

  // Ambil user dari localStorage (asumsi login dosen)
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
      // Set default topik pertama jika belum ada yang dipilih
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
      const dataSoal = res.data; 
      setSoalList(dataSoal);
    } catch (err) {
      console.error('Gagal mengambil daftar soal:', err);
    }
  };

  const openAddModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const closeAddModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setSoal('');
    setTopikId(topikList.length > 0 ? topikList[0].topik_id : '');
    setKesulitan('Mudah');
    setInputData('');
    setExpectedOutput('');
    setIsEditing(false);
    setEditId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('Menyimpan ke database...');
    
    const payload = {
      topik_id: parseInt(topikId),
      dosen_id: user.user_id,
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
      // Bisa gunakan komponen Toast/Alert terpisah, tapi untuk kesederhanaan kita abaikan message sukses di background list
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

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <Navbar role="dosen" />
      
      <div style={{ padding: '30px', maxWidth: '1200px', margin: '0 auto', width: '100%', flex: 1, display: 'flex', flexDirection: 'column' }}>
        
        {/* Header & Main Area: Tabel Daftar Soal */}
        <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '1.8rem', marginBottom: '4px' }}>Bank Soal & Test Case</h1>
            <p style={{ color: 'var(--text-secondary)' }}>Manajemen soal pemrograman ICLS</p>
          </div>
          <button onClick={openAddModal} className="btn btn-primary" style={{ padding: '10px 20px', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>➕</span> Tambah Soal Baru
          </button>
        </div>

        <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0, fontSize: '1.2rem' }}>📚 Daftar Soal Anda</h2>
            <span style={{ background: 'rgba(255,255,255,0.1)', padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem' }}>
              Total: {soalList.length} Soal
            </span>
          </div>
          
          <div style={{ flex: 1, overflowY: 'auto', padding: '0', maxHeight: '700px' }}>
            {soalList.length === 0 ? (
              <div style={{ padding: '50px', textAlign: 'center', color: 'var(--text-secondary)' }}>Belum ada soal terdaftar. Silakan klik "Tambah Soal Baru" untuk memulai.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {soalList.map((s) => (
                  <div 
                    key={s.soal_id} 
                    style={{ 
                      padding: '24px', 
                      borderBottom: '1px solid var(--glass-border)',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                      <div>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '4px' }}>
                          <span style={{ fontWeight: 'bold', color: 'var(--accent-color)' }}>ID: {s.soal_id}</span>
                          <span style={{ background: 'rgba(255,255,255,0.1)', fontSize: '0.75rem', padding: '4px 10px', borderRadius: '4px' }}>Topik {s.topik_id}</span>
                          <span style={{ 
                            fontSize: '0.75rem', padding: '4px 10px', borderRadius: '4px',
                            background: s.tingkat_kesulitan === 'Mudah' ? 'rgba(63, 185, 80, 0.2)' : s.tingkat_kesulitan === 'Sedang' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(248, 81, 73, 0.2)',
                            color: s.tingkat_kesulitan === 'Mudah' ? 'var(--success-color)' : s.tingkat_kesulitan === 'Sedang' ? '#f59e0b' : 'var(--danger-color)',
                            fontWeight: 'bold'
                          }}>
                            {s.tingkat_kesulitan}
                          </span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                          onClick={() => handleEditClick(s)}
                          style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', padding: '6px 14px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}
                          title="Edit Soal"
                        >
                          ✏️ Edit
                        </button>
                        <button 
                          onClick={() => handleDeleteClick(s.soal_id)}
                          style={{ background: 'rgba(248, 81, 73, 0.15)', border: 'none', color: 'var(--danger-color)', padding: '6px 14px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold' }}
                          title="Hapus Soal"
                        >
                          🗑️ Hapus
                        </button>
                      </div>
                    </div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                      {s.deskripsi_soal}
                    </div>
                    
                    {s.testcases && s.testcases.length > 0 && (
                      <div style={{ marginTop: '16px', padding: '12px 16px', background: 'rgba(0,0,0,0.3)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', fontWeight: 'bold' }}>Expected Output (Terminal):</div>
                        <code style={{ fontSize: '0.9rem', color: '#a3e635' }}>{s.testcases[0].expected_output}</code>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ── Modal Popup (Form Tambah / Edit) ── */}
      {isModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '650px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '20px 30px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)' }}>
              <h2 style={{ fontSize: '1.25rem', margin: 0, color: isEditing ? 'var(--accent-color)' : 'white' }}>
                {isEditing ? `✏️ Perbarui Soal #${editId}` : '📝 Buat Soal Baru'}
              </h2>
              <button onClick={closeAddModal} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '1.5rem', cursor: 'pointer', lineHeight: 1 }}>
                &times;
              </button>
            </div>
            
            <div style={{ padding: '30px', overflowY: 'auto', flex: 1 }}>
              {message && (
                <div style={{ padding: '12px', marginBottom: '20px', borderRadius: '8px', background: message.includes('Error') ? 'rgba(248, 81, 73, 0.2)' : 'rgba(63, 185, 80, 0.2)', color: message.includes('Error') ? 'var(--danger-color)' : 'var(--success-color)' }}>
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
                  <label className="input-label">Deskripsi Soal / Instruksi</label>
                  <textarea 
                    className="input-field" 
                    rows="5" 
                    value={soal} 
                    onChange={e => setSoal(e.target.value)} 
                    placeholder="Contoh: Buatlah program untuk mencari luas lingkaran..."
                    required
                  />
                </div>

                <div style={{ marginTop: '25px', marginBottom: '16px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '1.2rem' }}>🛠️</span> 
                  <h3 style={{ fontSize: '1rem', margin: 0 }}>Konfigurasi Test Case</h3>
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
                  <button type="button" onClick={closeAddModal} className="btn" style={{ flex: 1, background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid var(--glass-border)' }}>
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

    </div>
  );
}

export default ManajemenSoal;
