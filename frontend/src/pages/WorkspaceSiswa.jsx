import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';

const API = 'http://localhost:8000';

const LANGUAGES = {
  71: { name: 'Python 3', template: '# Tulis kodemu disini\n', ext: 'main.py' },
  54: { name: 'C++ (GCC)', template: '#include <iostream>\nusing namespace std;\n\nint main() {\n    // Tulis kodemu disini\n    return 0;\n}', ext: 'main.cpp' },
  62: { name: 'Java', template: 'public class Main {\n    public static void main(String[] args) {\n        // Tulis kodemu disini\n    }\n}', ext: 'Main.java' },
  63: { name: 'JavaScript', template: '// Tulis kodemu disini\n', ext: 'main.js' },
  68: { name: 'PHP', template: '<?php\n// Tulis kodemu disini\n\n?>', ext: 'main.php' }
};

function WorkspaceSiswa() {
  const navigate = useNavigate();
  const userRaw = localStorage.getItem('user');
  const user = userRaw ? JSON.parse(userRaw) : null;

  const [activeLang, setActiveLang] = useState(71); // Default Python 3
  const [code, setCode] = useState(LANGUAGES[71].template);
  const [output, setOutput] = useState('');
  const [bktProb, setBktProb] = useState(0.1);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSoal, setIsLoadingSoal] = useState(true);

  // Data Soal
  const [soalList, setSoalList] = useState([]);
  const [activeSoalId, setActiveSoalId] = useState(null);

  useEffect(() => {
    if (!user || user.role !== 'siswa') {
      navigate('/login');
      return;
    }
    fetchSoalSiswa();
  }, [navigate]);

  const fetchSoalSiswa = async () => {
    setIsLoadingSoal(true);
    try {
      const res = await axios.get(`${API}/api/soal/siswa/${user.user_id}`);
      const data = res.data;
      setSoalList(data);
      if (data.length > 0) {
        handleSelectSoal(data[0]);
      }
    } catch (error) {
      console.error('Gagal mengambil daftar soal:', error);
      setOutput('Error: Gagal mengambil daftar soal dari server.');
    } finally {
      setIsLoadingSoal(false);
    }
  };

  const handleSelectSoal = (soal) => {
    setActiveSoalId(soal.soal_id);
    setBktProb(soal.learned_prob);
    setCode(LANGUAGES[activeLang].template);
    setOutput('');
  };

  const handleLangChange = (e) => {
    const langId = parseInt(e.target.value);
    setActiveLang(langId);
    setCode(LANGUAGES[langId].template);
  };

  const activeSoal = soalList.find(s => s.soal_id === activeSoalId);

  const handleSubmit = async () => {
    if (!activeSoal) return;
    
    setIsLoading(true);
    setOutput('Mengkompilasi dan mencocokkan dengan test case...');
    
    try {
      const response = await axios.post(`${API}/api/evaluasi/submit`, {
        siswa_id: user.user_id,
        soal_id: activeSoal.soal_id,
        source_code: code,
        language_id: activeLang
      });
      
      const { status_compile, is_correct, output: apiOutput, new_knowledge_state } = response.data;
      
      let outText = `Status: ${status_compile}\n`;
      outText += `Benar?: ${is_correct ? 'Ya' : 'Tidak'}\n\n`;
      outText += `Output Program:\n${apiOutput || '(Tidak ada output)'}`;
      
      setOutput(outText);
      setBktProb(new_knowledge_state);
      
      // Update state learned_prob di list soal secara lokal
      setSoalList(prevList => prevList.map(s => 
        s.soal_id === activeSoal.soal_id ? { ...s, learned_prob: new_knowledge_state } : s
      ));
      
    } catch (error) {
      setOutput('Error: Could not connect to compilation server.\n(Pastikan backend FastAPI dan API pihak ketiga berjalan)');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Navbar role="siswa" activePage="workspace" />
      
      <div className="editor-container" style={{ flex: 1, padding: '20px', gap: '20px', display: 'flex', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
        
        {/* Sidebar Kiri: Daftar Soal & Topik */}
        <div style={{ width: '30%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div className="glass-panel" style={{ padding: '20px', flex: '0 0 auto' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              📚 Daftar Latihan
            </h3>
            
            {isLoadingSoal ? (
              <p style={{ color: 'var(--text-secondary)' }}>Memuat soal...</p>
            ) : soalList.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)' }}>Belum ada soal dari instruktur Anda.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '200px', overflowY: 'auto', paddingRight: '10px' }}>
                {soalList.map(soal => (
                  <div 
                    key={soal.soal_id}
                    onClick={() => handleSelectSoal(soal)}
                    style={{ 
                      padding: '12px', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s',
                      background: activeSoalId === soal.soal_id ? 'rgba(31, 111, 235, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                      border: activeSoalId === soal.soal_id ? '1px solid var(--accent-color)' : '1px solid transparent'
                    }}
                  >
                    <div style={{ fontWeight: '600', fontSize: '0.9rem', color: activeSoalId === soal.soal_id ? 'var(--accent-color)' : 'white' }}>
                      {soal.nama_topik}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      <span>Tingkat: {soal.tingkat_kesulitan}</span>
                      <span>P(L): {(soal.learned_prob * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {activeSoal && (
            <div className="glass-panel" style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ marginBottom: '16px' }}>
                <h2 style={{ fontSize: '1.2rem', color: 'var(--accent-color)', marginBottom: '8px' }}>{activeSoal.nama_topik}</h2>
                <div style={{ display: 'inline-block', background: 'rgba(255,255,255,0.1)', padding: '4px 10px', borderRadius: '4px', fontSize: '0.75rem' }}>
                  {activeSoal.tingkat_kesulitan}
                </div>
              </div>
              
              <div style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '0.9rem', lineHeight: '1.6', flex: 1 }}>
                {activeSoal.deskripsi_soal}
              </div>

              <div style={{ marginTop: 'auto', paddingTop: '20px', borderTop: '1px solid var(--glass-border)' }}>
                <h3 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '10px' }}>
                  Tingkat Pemahaman (Knowledge State)
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: bktProb > 0.95 ? 'var(--success-color)' : 'var(--accent-color)' }}>
                    {(bktProb * 100).toFixed(1)}%
                  </div>
                  <div style={{ flex: 1, height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px' }}>
                    <div style={{ 
                      width: `${bktProb * 100}%`, height: '100%', borderRadius: '4px', transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)',
                      background: bktProb > 0.95 ? 'var(--success-color)' : 'linear-gradient(90deg, #1F6FEB 0%, #58A6FF 100%)'
                    }}></div>
                  </div>
                </div>
                {bktProb > 0.95 && (
                  <p style={{ color: 'var(--success-color)', fontSize: '0.8rem', marginTop: '10px', fontWeight: 'bold' }}>
                    🎉 Topik Dikuasai!
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Main Area: Code Editor & Terminal */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', borderBottom: '1px solid var(--glass-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <select 
                  value={activeLang} 
                  onChange={handleLangChange}
                  style={{ background: 'rgba(0,0,0,0.5)', color: '#E3C15D', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px', padding: '4px 8px', fontWeight: 'bold', fontFamily: 'monospace', outline: 'none', cursor: 'pointer' }}
                >
                  {Object.entries(LANGUAGES).map(([id, lang]) => (
                    <option key={id} value={id}>{lang.name}</option>
                  ))}
                </select>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{LANGUAGES[activeLang].ext}</span>
              </div>
              <button className="btn btn-primary" onClick={handleSubmit} disabled={isLoading || !activeSoal}>
                {isLoading ? 'Mengevaluasi...' : 'Jalankan & Submit'}
              </button>
            </div>
            
            <textarea 
              className="code-area" 
              value={code}
              onChange={(e) => setCode(e.target.value)}
              spellCheck="false"
              style={{ flex: 1, padding: '20px', fontFamily: "'Fira Code', monospace", fontSize: '0.95rem', background: 'transparent', border: 'none', color: '#e6edf3', resize: 'none', outline: 'none' }}
              disabled={!activeSoal}
            />
          </div>

          <div className="glass-panel" style={{ height: '220px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '10px 20px', borderBottom: '1px solid var(--glass-border)', fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between' }}>
              <span>Terminal Output</span>
              {isLoading && <span style={{ color: 'var(--accent-color)', animation: 'pulse 1.5s infinite' }}>Loading...</span>}
            </div>
            <div style={{ padding: '16px 20px', flex: 1, overflowY: 'auto', fontFamily: "'Fira Code', monospace", fontSize: '0.85rem', color: output.includes('Error') || output.includes('Tidak') ? '#f87171' : '#a3e635', whiteSpace: 'pre-wrap', background: 'rgba(0,0,0,0.4)' }}>
              {output || 'Output program akan muncul di sini setelah submit...'}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default WorkspaceSiswa;
