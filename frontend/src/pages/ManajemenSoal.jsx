import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import axios from 'axios';

function ManajemenSoal() {
  const [soal, setSoal] = useState('');
  const [topikId, setTopikId] = useState(1);
  const [kesulitan, setKesulitan] = useState('Mudah');
  
  // Test Case state
  const [inputData, setInputData] = useState('');
  const [expectedOutput, setExpectedOutput] = useState('');
  
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('Menyimpan ke database...');
    
    try {
      const payload = {
        topik_id: parseInt(topikId),
        dosen_id: 1, // Hardcode berdasarkan seed.py dosen_budi
        deskripsi_soal: soal,
        tingkat_kesulitan: kesulitan,
        testcases: [
          {
            input_data: inputData,
            expected_output: expectedOutput
          }
        ]
      };

      const res = await axios.post('http://localhost:8000/api/soal', payload);
      setMessage(`Berhasil! Soal ID: ${res.data.soal_id} ditambahkan.`);
      
      // Reset form
      setSoal('');
      setInputData('');
      setExpectedOutput('');
    } catch (err) {
      setMessage('Error saat menyimpan soal. Pastikan Backend berjalan.');
      console.error(err);
    }
  };

  return (
    <div>
      <Navbar role="dosen" />
      <div style={{ padding: '30px', maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ marginBottom: '30px' }}>
          <h1 style={{ fontSize: '1.8rem', marginBottom: '4px' }}>Bank Soal & Test Case</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Tambahkan soal pemrograman baru ke dalam basis data ICLS</p>
        </div>

        <div className="glass-panel" style={{ padding: '30px' }}>
          {message && (
            <div style={{ padding: '12px', marginBottom: '20px', borderRadius: '8px', background: message.includes('Error') ? 'rgba(248, 81, 73, 0.2)' : 'rgba(63, 185, 80, 0.2)', color: message.includes('Error') ? 'var(--danger-color)' : 'var(--success-color)' }}>
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label className="input-label">Pilih Topik Materi</label>
              <select className="input-field" value={topikId} onChange={e => setTopikId(e.target.value)} style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
                <option value="1">1 - Fungsi & Bilangan Genap (Dari Seed)</option>
              </select>
            </div>

            <div className="input-group">
              <label className="input-label">Tingkat Kesulitan</label>
              <select className="input-field" value={kesulitan} onChange={e => setKesulitan(e.target.value)} style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
                <option value="Mudah">Mudah</option>
                <option value="Sedang">Sedang</option>
                <option value="Sulit">Sulit</option>
              </select>
            </div>

            <div className="input-group">
              <label className="input-label">Deskripsi Soal / Instruksi</label>
              <textarea 
                className="input-field" 
                rows="4" 
                value={soal} 
                onChange={e => setSoal(e.target.value)} 
                placeholder="Contoh: Buatlah fungsi fibonacci(n)..."
                required
              />
            </div>

            <h3 style={{ fontSize: '1.2rem', marginTop: '30px', marginBottom: '16px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '8px' }}>Test Case Utama</h3>

            <div className="input-group">
              <label className="input-label">Input Data (Opsional)</label>
              <textarea 
                className="input-field" 
                rows="2" 
                value={inputData} 
                onChange={e => setInputData(e.target.value)} 
                placeholder="Data yang akan dimasukkan ke stdin (jika ada)"
              />
            </div>

            <div className="input-group">
              <label className="input-label">Expected Output (Wajib)</label>
              <textarea 
                className="input-field" 
                rows="2" 
                value={expectedOutput} 
                onChange={e => setExpectedOutput(e.target.value)} 
                placeholder="Output ekspektasi yang menandakan jawaban benar"
                required
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '20px' }}>
              Simpan Soal ke Database
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ManajemenSoal;
