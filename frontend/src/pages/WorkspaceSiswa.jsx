import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Editor from '@monaco-editor/react';
import Navbar from '../components/Navbar';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const API = 'http://localhost:8000';

const LANGUAGES = {
  71: { name: 'Python 3', template: '# Tulis kodemu disini\n', ext: 'main.py', monacoLang: 'python' },
  54: { name: 'C++ (GCC)', template: '#include <iostream>\nusing namespace std;\n\nint main() {\n    // Tulis kodemu disini\n    return 0;\n}', ext: 'main.cpp', monacoLang: 'cpp' },
  62: { name: 'Java', template: 'public class Main {\n    public static void main(String[] args) {\n        // Tulis kodemu disini\n    }\n}', ext: 'Main.java', monacoLang: 'java' },
  63: { name: 'JavaScript', template: '// Tulis kodemu disini\n', ext: 'main.js', monacoLang: 'javascript' },
  68: { name: 'PHP', template: '<?php\n// Tulis kodemu disini\n\n?>', ext: 'main.php', monacoLang: 'php' }
};

function WorkspaceSiswa() {
  const navigate = useNavigate();
  const userRaw = localStorage.getItem('user');
  const user = userRaw ? JSON.parse(userRaw) : null;

  const [activeLang, setActiveLang] = useState(71); // Default Python 3
  const [code, setCode] = useState(LANGUAGES[71].template);
  const [output, setOutput] = useState('');
  const [fontSize, setFontSize] = useState(14);
  const editorRef = useRef(null);
  const [bktProb, setBktProb] = useState(0.1);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSoal, setIsLoadingSoal] = useState(true);

  // Tab State
  const [activeTab, setActiveTab] = useState('editor'); // 'editor' | 'riwayat'
  const [bktStats, setBktStats] = useState([]);
  const [bktRawStats, setBktRawStats] = useState([]);
  const [history, setHistory] = useState([]);
  const [rekomendasi, setRekomendasi] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

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

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'riwayat') {
      fetchHistoryData();
    }
  };

  const fetchHistoryData = async () => {
    setIsLoadingHistory(true);
    try {
      const [resBkt, resHist, resRekom] = await Promise.all([
        axios.get(`${API}/api/soal/siswa/${user.user_id}/bkt-stats`),
        axios.get(`${API}/api/evaluasi/history/${user.user_id}`),
        axios.get(`${API}/api/soal/siswa/${user.user_id}/rekomendasi`)
      ]);

      const rawStats = resBkt.data;
      setBktRawStats(rawStats);
      const chartData = rawStats.map(item => ({
        name: item.nama_topik,
        Penguasaan: Math.round(item.learned_prob * 100)
      }));
      setBktStats(chartData);

      setHistory(resHist.data);
      setRekomendasi(resRekom.data);
    } catch (error) {
      console.error('Gagal mengambil data riwayat', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Handle tombol "Langsung Kerjakan" dari kartu rekomendasi
  const handleRekomendasiClick = (soalId) => {
    const targetSoal = soalList.find(s => s.soal_id === soalId);
    if (targetSoal) {
      handleSelectSoal(targetSoal);
      setActiveTab('editor');
    }
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
      
      const { status_compile, is_correct, output: apiOutput, new_knowledge_state, is_duplicate } = response.data;

      let outText = '';

      if (is_duplicate) {
        // Tampilkan peringatan khusus — kode sama, BKT tidak diupdate
        outText += `PERINGATAN: Kode identik dengan submit sebelumnya!\n`;
        outText += `─────────────────────────────────────────────\n`;
        outText += `Tingkat Pemahaman (BKT) tidak diperbarui.\n`;
        outText += `Ubah kode Anda untuk mendapatkan penilaian baru.\n\n`;
        outText += `Hasil submit sebelumnya:\n`;
        outText += `Status: ${status_compile}\n`;
        outText += `Benar?: ${is_correct ? 'Ya' : 'Tidak'}`;
      } else {
        outText = `Status: ${status_compile}\n`;
        outText += `Benar?: ${is_correct ? 'Ya' : 'Tidak'}\n\n`;
        outText += `Output Program:\n${apiOutput || '(Tidak ada output)'}`;
      }
      
      setOutput(outText);
      setBktProb(new_knowledge_state);
      
      // Hanya update list soal jika bukan duplikat
      if (!is_duplicate) {
        setSoalList(prevList => prevList.map(s => 
          s.soal_id === activeSoal.soal_id ? { ...s, learned_prob: new_knowledge_state } : s
        ));
      }
      
    } catch (error) {
      setOutput('Error: Could not connect to compilation server.\n(Pastikan backend FastAPI dan API pihak ketiga berjalan)');
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Navbar role="siswa" activePage="workspace" />

      {/* Tab Navigation Area */}
      <div style={{ padding: '0 20px', maxWidth: '1400px', margin: '20px auto 0 auto', width: '100%' }}>
        <div style={{ display: 'flex', gap: '8px', borderBottom: '2.5px solid #000000' }}>
          <button 
            onClick={() => handleTabChange('editor')}
            style={{ 
              background: activeTab === 'editor' ? 'var(--accent-color)' : 'var(--bg-card)',
              color: activeTab === 'editor' ? '#000000' : 'var(--text-primary)',
              border: '2.5px solid #000000',
              borderBottom: activeTab === 'editor' ? 'none' : '2.5px solid #000000',
              borderRadius: '4px 4px 0 0',
              padding: '10px 20px', 
              fontSize: '0.9rem', 
              cursor: 'pointer', 
              fontWeight: '800',
              textTransform: 'uppercase',
              position: 'relative',
              bottom: activeTab === 'editor' ? '-2.5px' : '0',
              zIndex: activeTab === 'editor' ? 2 : 1
            }}
          >
            Ruang Koding
          </button>
          <button 
            onClick={() => handleTabChange('riwayat')}
            style={{ 
              background: activeTab === 'riwayat' ? 'var(--accent-color)' : 'var(--bg-card)',
              color: activeTab === 'riwayat' ? '#000000' : 'var(--text-primary)',
              border: '2.5px solid #000000',
              borderBottom: activeTab === 'riwayat' ? 'none' : '2.5px solid #000000',
              borderRadius: '4px 4px 0 0',
              padding: '10px 20px', 
              fontSize: '0.9rem', 
              cursor: 'pointer', 
              fontWeight: '800',
              textTransform: 'uppercase',
              position: 'relative',
              bottom: activeTab === 'riwayat' ? '-2.5px' : '0',
              zIndex: activeTab === 'riwayat' ? 2 : 1
            }}
          >
            Analisis & Riwayat Latihan
          </button>
        </div>
      </div>
      
      {activeTab === 'editor' ? (
        <div className="editor-container" style={{ flex: 1, padding: '20px', gap: '20px', display: 'flex', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
        
        {/* Sidebar Kiri: Daftar Soal & Topik */}
        <div style={{ width: '30%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div className="glass-panel" style={{ padding: '20px', flex: '0 0 auto' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'Outfit', fontWeight: '800', textTransform: 'uppercase' }}>
              Daftar Latihan
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
                      padding: '12px', borderRadius: '4px', cursor: 'pointer', transition: 'all 0.1s',
                      background: activeSoalId === soal.soal_id ? 'var(--accent-color)' : '#08080A',
                      color: activeSoalId === soal.soal_id ? '#000000' : 'white',
                      border: '2px solid #000000',
                      boxShadow: activeSoalId === soal.soal_id ? '2px 2px 0px #000000' : 'none'
                    }}
                  >
                    <div style={{ fontWeight: '800', fontSize: '0.9rem', textTransform: 'uppercase', color: activeSoalId === soal.soal_id ? '#000000' : 'white' }}>
                      {soal.judul_soal || soal.nama_topik}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '0.75rem', color: activeSoalId === soal.soal_id ? '#202020' : 'var(--text-secondary)', fontWeight: '700' }}>
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
                <h2 style={{ fontSize: '1.3rem', color: '#FFFFFF', marginBottom: '8px', fontFamily: 'Outfit', fontWeight: '800', textTransform: 'uppercase' }}>
                  {activeSoal.judul_soal || activeSoal.nama_topik}
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.8rem', color: '#000000', background: 'var(--accent-blue)', padding: '4px 10px', borderRadius: '4px', border: '1.5px solid #000000', fontWeight: '700', boxShadow: '1.5px 1.5px 0px #000000' }}>
                    Topik: {activeSoal.nama_topik}
                  </span>
                  <div style={{ display: 'inline-block', background: 'var(--bg-card-hover)', padding: '4px 10px', borderRadius: '4px', fontSize: '0.75rem', border: '1.5px solid #000000', fontWeight: '700', boxShadow: '1.5px 1.5px 0px #000000', color: '#FFFFFF' }}>
                    {activeSoal.tingkat_kesulitan}
                  </div>
                </div>
              </div>
              
              <div style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '0.9rem', lineHeight: '1.6', flex: 1 }}>
                {activeSoal.deskripsi_soal}
              </div>

              <div style={{ marginTop: 'auto', paddingTop: '20px', borderTop: '2px solid #000000' }}>
                <h3 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase', marginBottom: '10px' }}>
                  Tingkat Pemahaman (Knowledge State)
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <div style={{ fontSize: '1.8rem', fontWeight: '800', color: bktProb > 0.95 ? 'var(--success-color)' : 'var(--accent-color)' }}>
                    {(bktProb * 100).toFixed(1)}%
                  </div>
                  <div style={{ flex: 1, height: '14px', background: '#000000', border: '2px solid #000000', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ 
                      width: `${bktProb * 100}%`, height: '100%', transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)',
                      background: bktProb > 0.95 ? 'var(--success-color)' : 'var(--accent-blue)',
                      borderRight: bktProb > 0 ? '2px solid #000000' : 'none'
                    }}></div>
                  </div>
                </div>
                {bktProb > 0.95 && (
                  <div style={{ 
                    color: '#000000', 
                    background: 'var(--success-color)',
                    border: '2px solid #000000',
                    boxShadow: '2px 2px 0px #000000',
                    borderRadius: '4px',
                    fontSize: '0.85rem', 
                    marginTop: '15px', 
                    fontWeight: '800',
                    textAlign: 'center',
                    padding: '6px',
                    textTransform: 'uppercase'
                  }}>
                    Topik Dikuasai!
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Main Area: Code Editor & Terminal */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', borderBottom: '2.5px solid #000000' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <select 
                  value={activeLang} 
                  onChange={handleLangChange}
                  style={{ background: '#000000', color: 'var(--accent-color)', border: '2px solid #000000', borderRadius: '4px', padding: '6px 12px', fontWeight: '800', fontFamily: 'monospace', outline: 'none', cursor: 'pointer', boxShadow: '2px 2px 0px #000000' }}
                >
                  {Object.entries(LANGUAGES).map(([id, lang]) => (
                    <option key={id} value={id} style={{ background: '#18181C', color: '#FFFFFF' }}>{lang.name}</option>
                  ))}
                </select>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: '700', marginLeft: '6px' }}>{LANGUAGES[activeLang].ext}</span>
                {/* Font Size Controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '12px', borderLeft: '2px solid #000000', paddingLeft: '12px' }}>
                  <button
                    onClick={() => setFontSize(prev => Math.max(10, prev - 1))}
                    title="Perkecil font"
                    style={{ background: 'var(--bg-card)', border: '2px solid #000000', borderRadius: '4px', color: 'var(--text-primary)', width: '28px', height: '28px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: '800', boxShadow: '1px 1px 0px #000000' }}
                  >−</button>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', minWidth: '32px', textAlign: 'center', fontFamily: 'monospace', fontWeight: '700' }}>{fontSize}px</span>
                  <button
                    onClick={() => setFontSize(prev => Math.min(28, prev + 1))}
                    title="Perbesar font"
                    style={{ background: 'var(--bg-card)', border: '2px solid #000000', borderRadius: '4px', color: 'var(--text-primary)', width: '28px', height: '28px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: '800', boxShadow: '1px 1px 0px #000000' }}
                  >+</button>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Ctrl+Enter untuk submit</span>
                <button id="btn-submit-code" className="btn btn-primary" onClick={handleSubmit} disabled={isLoading || !activeSoal} style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
                  {isLoading ? 'Mengevaluasi...' : 'Jalankan & Submit'}
                </button>
              </div>
            </div>
            
            <div style={{ flex: 1 }}>
              <Editor
                height="100%"
                language={LANGUAGES[activeLang].monacoLang}
                value={code}
                onChange={(value) => setCode(value || '')}
                theme="vs-dark"
                onMount={(editor, monaco) => {
                  editorRef.current = editor;
                  // Shortcut Ctrl+Enter untuk submit
                  editor.addAction({
                    id: 'submit-code',
                    label: 'Jalankan & Submit',
                    keybindings: [
                      monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter
                    ],
                    run: () => {
                      document.getElementById('btn-submit-code')?.click();
                    }
                  });
                }}
                options={{
                  fontSize: fontSize,
                  fontFamily: "'Fira Code', 'Cascadia Code', 'JetBrains Mono', Consolas, monospace",
                  fontLigatures: true,
                  minimap: { enabled: true },
                  scrollBeyondLastLine: false,
                  wordWrap: 'on',
                  automaticLayout: true,
                  padding: { top: 16, bottom: 16 },
                  lineNumbers: 'on',
                  renderLineHighlight: 'all',
                  bracketPairColorization: { enabled: true },
                  autoClosingBrackets: 'always',
                  autoClosingQuotes: 'always',
                  suggestOnTriggerCharacters: true,
                  tabSize: 4,
                  cursorBlinking: 'smooth',
                  cursorSmoothCaretAnimation: 'on',
                  smoothScrolling: true,
                  readOnly: !activeSoal,
                }}
                loading={
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)' }}>
                    Memuat editor...
                  </div>
                }
              />
            </div>
          </div>

          <div className="glass-panel" style={{ height: '220px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '10px 20px', borderBottom: '2.5px solid #000000', fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '800', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between', background: 'var(--bg-card-hover)' }}>
              <span>Terminal Output</span>
              {isLoading && <span style={{ color: 'var(--accent-color)' }}>Loading...</span>}
            </div>
            <div style={{ 
              padding: '16px 20px', flex: 1, overflowY: 'auto', 
              fontFamily: "'Fira Code', monospace", fontSize: '0.85rem', 
              color: output.includes('PERINGATAN') ? 'var(--accent-color)'
                : output.includes('Error') || output.includes('Tidak') ? 'var(--danger-color)' 
                : 'var(--success-color)', 
              whiteSpace: 'pre-wrap', background: '#08080A' 
            }}>
              {output || 'Output program akan muncul di sini setelah submit...'}
            </div>
          </div>
        </div>
      </div>
      ) : (
        <div style={{ flex: 1, padding: '20px', maxWidth: '1400px', margin: '0 auto', width: '100%', overflowY: 'auto' }}>
          {isLoadingHistory ? (
            <div style={{ textAlign: 'center', padding: '50px', color: 'var(--text-secondary)' }}>Memuat data statistik...</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>

              {/* ── Section: Rekomendasi Topik BKT ── */}
              <div className="glass-panel" style={{ padding: '30px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <div>
                    <h2 style={{ fontSize: '1.4rem', margin: 0, fontFamily: 'Outfit', fontWeight: '800', textTransform: 'uppercase' }}>Rekomendasi Topik untuk Dikerjakan</h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', margin: '4px 0 0 0', fontWeight: '600' }}>
                      Dipilih oleh sistem BKT berdasarkan celah penguasaan terbesar kamu saat ini.
                    </p>
                  </div>
                </div>
                <div style={{ borderBottom: '2.5px solid #000000', margin: '16px 0 20px 0' }} />

                {rekomendasi.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '30px', fontWeight: '700' }}>
                    Semua topik sudah dikuasai atau belum ada soal yang tersedia!
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                    {rekomendasi.map((item, index) => {
                      const urgencyColor = item.learned_prob < 0.3 ? 'var(--danger-color)'
                        : item.learned_prob < 0.6 ? 'var(--accent-color)'
                        : 'var(--accent-blue)';
                      const urgencyLabel = item.learned_prob < 0.3 ? 'Prioritas Tinggi'
                        : item.learned_prob < 0.6 ? 'Perlu Latihan'
                        : 'Tingkatkan';
                      return (
                        <div key={item.topik_id} style={{
                          borderRadius: '4px', padding: '20px',
                          border: '2.5px solid #000000',
                          background: 'var(--bg-card)',
                          boxShadow: `4px 4px 0px ${urgencyColor}`,
                          display: 'flex', flexDirection: 'column', gap: '12px',
                          transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                        }}
                          onMouseEnter={e => { e.currentTarget.style.transform = 'translate(-2px, -2px)'; e.currentTarget.style.boxShadow = `6px 6px 0px ${urgencyColor}`; }}
                          onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = `4px 4px 0px ${urgencyColor}`; }}
                        >
                          {/* Header kartu */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                            <div>
                              <div style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '4px', textTransform: 'uppercase' }}>{item.nama_topik}</div>
                              {item.judul_soal && (
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '600' }}>{item.judul_soal}</div>
                              )}
                            </div>
                            <span className="brutal-badge" style={{
                              fontSize: '0.7rem', fontWeight: '800', padding: '3px 8px',
                              whiteSpace: 'nowrap',
                              background: urgencyColor, color: '#000000', border: '1.5px solid #000000',
                              boxShadow: '1px 1px 0px #000000'
                            }}>
                              {urgencyLabel}
                            </span>
                          </div>

                          {/* Progress bar P(L) */}
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: '700' }}>
                              <span>Penguasaan Saat Ini</span>
                              <span style={{ fontWeight: '800', color: urgencyColor }}>{(item.learned_prob * 100).toFixed(1)}%</span>
                            </div>
                            <div style={{ height: '10px', background: '#000000', border: '1.5px solid #000000', borderRadius: '2px', overflow: 'hidden' }}>
                              <div style={{
                                width: `${item.learned_prob * 100}%`, height: '100%',
                                background: urgencyColor, transition: 'width 0.8s ease'
                              }} />
                            </div>
                          </div>

                          {/* Estimasi submit */}
                          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600' }}>
                            <span>
                              {item.estimasi_submit === 0
                                ? 'Hampir dikuasai!'
                                : `${item.estimasi_submit} submit benar lagi untuk dikuasai`}
                            </span>
                          </div>

                          {/* Tombol Langsung Kerjakan */}
                          {item.soal_id && (
                            <button
                              className="btn"
                              onClick={() => handleRekomendasiClick(item.soal_id)}
                              style={{
                                marginTop: 'auto', padding: '8px 12px', fontSize: '0.85rem',
                                background: urgencyColor, color: '#000000'
                              }}
                            >
                              Langsung Kerjakan
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ── Section: BKT Chart + Tabel Prediksi ── */}
              <div className="glass-panel" style={{ padding: '30px' }}>
                <h2 style={{ fontSize: '1.4rem', marginBottom: '8px', borderBottom: '2.5px solid #000000', paddingBottom: '12px', fontFamily: 'Outfit', fontWeight: '800', textTransform: 'uppercase' }}>
                  Tingkat Penguasaan Topik P(L)
                </h2>

                {bktStats.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '40px', fontWeight: '700' }}>
                    Belum ada data topik. Kerjakan soal di Workspace untuk mulai membangun kurva BKT Anda!
                  </div>
                ) : (
                  <>
                    <div style={{ height: '300px', width: '100%', marginBottom: '28px' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={bktStats} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                          <XAxis dataKey="name" stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)', fontWeight: '700' }} />
                          <YAxis stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)', fontWeight: '700' }} domain={[0, 100]} unit="%" />
                          <Tooltip
                            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                            contentStyle={{ backgroundColor: '#18181C', border: '2px solid #000000', borderRadius: '4px', boxShadow: '3px 3px 0px #000000' }}
                            itemStyle={{ color: 'var(--accent-color)', fontWeight: '800' }}
                          />
                          <Bar dataKey="Penguasaan" fill="var(--accent-blue)" stroke="#000000" strokeWidth={2} radius={[4, 4, 0, 0]} barSize={50} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Tabel Prediksi Penguasaan per Topik */}
                    <div style={{ borderTop: '2.5px solid #000000', paddingTop: '20px' }}>
                      <h3 style={{ fontSize: '0.95rem', marginBottom: '14px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '700' }}>
                        Prediksi Penguasaan per Topik
                      </h3>
                      <table className="brutal-table">
                        <thead>
                          <tr>
                            <th>Topik</th>
                            <th>P(L) Saat Ini</th>
                            <th>Status</th>
                            <th>Estimasi untuk Dikuasai</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bktRawStats.map(stat => {
                            const rekItem = rekomendasi.find(r => r.topik_id === stat.topik_id);
                            const p = stat.learned_prob;
                            const isDone = p >= 0.95;
                            const statusColor = isDone ? 'var(--success-color)' : p >= 0.7 ? 'var(--accent-color)' : p >= 0.4 ? 'var(--accent-blue)' : 'var(--danger-color)';
                            const statusLabel = isDone ? 'Dikuasai' : p >= 0.7 ? 'Hampir' : p >= 0.4 ? 'Belajar' : 'Fokus';
                            const badgeClass = isDone ? 'success' : p >= 0.7 ? 'yellow' : p >= 0.4 ? 'blue' : 'danger';
                            return (
                              <tr key={stat.topik_id}>
                                <td style={{ fontWeight: '800', textTransform: 'uppercase' }}>{stat.nama_topik}</td>
                                <td style={{ fontWeight: '800', color: statusColor }}>{(p * 100).toFixed(1)}%</td>
                                <td>
                                  <span className={`brutal-badge brutal-badge-${badgeClass}`}>{statusLabel}</span>
                                </td>
                                <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: '600' }}>
                                  {isDone
                                    ? <span style={{ color: 'var(--success-color)', fontWeight: '700' }}>Sudah dikuasai!</span>
                                    : rekItem
                                      ? `${rekItem.estimasi_submit} submit benar`
                                      : '—'
                                  }
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>

              {/* Section: Riwayat Submit */}
              <div className="glass-panel" style={{ overflow: 'hidden' }}>
                <div style={{ padding: '20px 24px', borderBottom: '2.5px solid #000000', background: 'var(--bg-card-hover)' }}>
                  <h2 style={{ margin: 0, fontSize: '1.2rem', fontFamily: 'Outfit', fontWeight: '800', textTransform: 'uppercase' }}>Riwayat Submit Evaluasi</h2>
                </div>

                {history.length === 0 ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)', fontWeight: '700' }}>
                    Belum ada riwayat submisi kode.
                  </div>
                ) : (
                  <table className="brutal-table">
                    <thead>
                      <tr>
                        <th>Tanggal</th>
                        <th>Soal</th>
                        <th>Status Compiler</th>
                        <th>Hasil Akhir</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((h) => (
                        <tr key={h.evaluasi_id}>
                          <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: '600' }}>
                            {new Date(h.timestamp).toLocaleString('id-ID')}
                          </td>
                          <td style={{ fontWeight: '800' }}>{h.deskripsi_soal}</td>
                          <td style={{ fontSize: '0.85rem', fontWeight: '600' }}>
                            {h.status_compile}
                          </td>
                          <td>
                            {h.binary_result === 1 ? (
                              <span className="brutal-badge brutal-badge-success">Benar</span>
                            ) : (
                              <span className="brutal-badge brutal-badge-danger">Salah</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default WorkspaceSiswa;
