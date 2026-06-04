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
        <div style={{ display: 'flex', gap: '15px', borderBottom: '1px solid var(--glass-border)' }}>
          <button 
            onClick={() => handleTabChange('editor')}
            style={{ 
              background: 'none', border: 'none', padding: '10px 20px', fontSize: '1rem', cursor: 'pointer', fontWeight: 'bold',
              color: activeTab === 'editor' ? 'var(--accent-color)' : 'var(--text-secondary)',
              borderBottom: activeTab === 'editor' ? '2px solid var(--accent-color)' : '2px solid transparent'
            }}
          >
            Ruang Koding
          </button>
          <button 
            onClick={() => handleTabChange('riwayat')}
            style={{ 
              background: 'none', border: 'none', padding: '10px 20px', fontSize: '1rem', cursor: 'pointer', fontWeight: 'bold',
              color: activeTab === 'riwayat' ? 'var(--accent-color)' : 'var(--text-secondary)',
              borderBottom: activeTab === 'riwayat' ? '2px solid var(--accent-color)' : '2px solid transparent'
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
            <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                      padding: '12px', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s',
                      background: activeSoalId === soal.soal_id ? 'rgba(31, 111, 235, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                      border: activeSoalId === soal.soal_id ? '1px solid var(--accent-color)' : '1px solid transparent'
                    }}
                  >
                    <div style={{ fontWeight: '600', fontSize: '0.9rem', color: activeSoalId === soal.soal_id ? 'var(--accent-color)' : 'white' }}>
                      {soal.judul_soal || soal.nama_topik}
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
                <h2 style={{ fontSize: '1.2rem', color: 'var(--accent-color)', marginBottom: '8px' }}>
                  {activeSoal.judul_soal || activeSoal.nama_topik}
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.06)', padding: '4px 10px', borderRadius: '4px' }}>
                    Topik: {activeSoal.nama_topik}
                  </span>
                  <div style={{ display: 'inline-block', background: 'rgba(255,255,255,0.1)', padding: '4px 10px', borderRadius: '4px', fontSize: '0.75rem' }}>
                    {activeSoal.tingkat_kesulitan}
                  </div>
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
                    Topik Dikuasai!
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
                {/* Font Size Controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '12px', borderLeft: '1px solid var(--glass-border)', paddingLeft: '12px' }}>
                  <button
                    onClick={() => setFontSize(prev => Math.max(10, prev - 1))}
                    title="Perkecil font"
                    style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '4px', color: 'var(--text-secondary)', width: '28px', height: '28px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', transition: 'all 0.2s' }}
                  >−</button>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', minWidth: '32px', textAlign: 'center', fontFamily: 'monospace' }}>{fontSize}px</span>
                  <button
                    onClick={() => setFontSize(prev => Math.min(28, prev + 1))}
                    title="Perbesar font"
                    style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '4px', color: 'var(--text-secondary)', width: '28px', height: '28px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', transition: 'all 0.2s' }}
                  >+</button>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', opacity: 0.7 }}>Ctrl+Enter untuk submit</span>
                <button id="btn-submit-code" className="btn btn-primary" onClick={handleSubmit} disabled={isLoading || !activeSoal}>
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

          <div className="glass-panel" style={{ height: '220px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '10px 20px', borderBottom: '1px solid var(--glass-border)', fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between' }}>
              <span>Terminal Output</span>
              {isLoading && <span style={{ color: 'var(--accent-color)', animation: 'pulse 1.5s infinite' }}>Loading...</span>}
            </div>
            <div style={{ 
              padding: '16px 20px', flex: 1, overflowY: 'auto', 
              fontFamily: "'Fira Code', monospace", fontSize: '0.85rem', 
              color: output.includes('PERINGATAN') ? '#f59e0b'
                : output.includes('Error') || output.includes('Tidak') ? '#f87171' 
                : '#a3e635', 
              whiteSpace: 'pre-wrap', background: 'rgba(0,0,0,0.4)' 
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
                  <span style={{ fontSize: '1.5rem' }}></span>
                  <div>
                    <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Rekomendasi Topik untuk Dikerjakan</h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', margin: '4px 0 0 0' }}>
                      Dipilih oleh sistem BKT berdasarkan celah penguasaan terbesar kamu saat ini.
                    </p>
                  </div>
                </div>
                <div style={{ borderBottom: '1px solid var(--glass-border)', margin: '16px 0 20px 0' }} />

                {rekomendasi.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '30px' }}>
                    Semua topik sudah dikuasai atau belum ada soal yang tersedia!
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                    {rekomendasi.map((item, index) => {
                      const urgencyColor = item.learned_prob < 0.3 ? 'var(--danger-color)'
                        : item.learned_prob < 0.6 ? '#f59e0b'
                        : 'var(--accent-color)';
                      const urgencyBg = item.learned_prob < 0.3 ? 'rgba(248, 81, 73, 0.12)'
                        : item.learned_prob < 0.6 ? 'rgba(245, 158, 11, 0.12)'
                        : 'rgba(31, 111, 235, 0.12)';
                      const urgencyLabel = item.learned_prob < 0.3 ? 'Prioritas Tinggi'
                        : item.learned_prob < 0.6 ? 'Perlu Latihan'
                        : 'Tingkatkan';
                      return (
                        <div key={item.topik_id} style={{
                          borderRadius: '12px', padding: '20px',
                          border: `1px solid ${urgencyColor}40`,
                          background: urgencyBg,
                          display: 'flex', flexDirection: 'column', gap: '12px',
                          transition: 'transform 0.2s, box-shadow 0.2s',
                        }}
                          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 8px 24px ${urgencyColor}30`; }}
                          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                        >
                          {/* Header kartu */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                              <div style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '4px' }}>{item.nama_topik}</div>
                              {item.judul_soal && (
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{item.judul_soal}</div>
                              )}
                            </div>
                            <span style={{
                              fontSize: '0.7rem', fontWeight: 'bold', padding: '3px 10px',
                              borderRadius: '20px', whiteSpace: 'nowrap',
                              background: `${urgencyColor}20`, color: urgencyColor, border: `1px solid ${urgencyColor}40`
                            }}>
                              {urgencyLabel}
                            </span>
                          </div>

                          {/* Progress bar P(L) */}
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                              <span>Penguasaan Saat Ini</span>
                              <span style={{ fontWeight: 'bold', color: urgencyColor }}>{(item.learned_prob * 100).toFixed(1)}%</span>
                            </div>
                            <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px' }}>
                              <div style={{
                                width: `${item.learned_prob * 100}%`, height: '100%',
                                borderRadius: '3px', background: urgencyColor, transition: 'width 0.8s ease'
                              }} />
                            </div>
                          </div>

                          {/* Estimasi submit */}
                          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span></span>
                            <span>
                              {item.estimasi_submit === 0
                                ? 'Hampir dikuasai!'
                                : `~${item.estimasi_submit} submit benar lagi untuk dikuasai`}
                            </span>
                          </div>

                          {/* Tombol Langsung Kerjakan */}
                          {item.soal_id && (
                            <button
                              onClick={() => handleRekomendasiClick(item.soal_id)}
                              style={{
                                marginTop: 'auto', padding: '9px 14px', borderRadius: '8px',
                                border: `1px solid ${urgencyColor}60`,
                                background: `${urgencyColor}15`, color: urgencyColor,
                                fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer',
                                transition: 'background 0.2s',
                              }}
                              onMouseEnter={e => e.currentTarget.style.background = `${urgencyColor}30`}
                              onMouseLeave={e => e.currentTarget.style.background = `${urgencyColor}15`}
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
                <h2 style={{ fontSize: '1.2rem', marginBottom: '8px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '12px' }}>
                  Tingkat Penguasaan Topik P(L)
                </h2>

                {bktStats.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '40px' }}>
                    Belum ada data topik. Kerjakan soal di Workspace untuk mulai membangun kurva BKT Anda!
                  </div>
                ) : (
                  <>
                    <div style={{ height: '300px', width: '100%', marginBottom: '28px' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={bktStats} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                          <XAxis dataKey="name" stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)' }} />
                          <YAxis stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)' }} domain={[0, 100]} unit="%" />
                          <Tooltip
                            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                            contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px' }}
                            itemStyle={{ color: '#a78bfa', fontWeight: 'bold' }}
                          />
                          <Bar dataKey="Penguasaan" fill="#a78bfa" radius={[4, 4, 0, 0]} barSize={50} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Tabel Prediksi Penguasaan per Topik */}
                    <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '20px' }}>
                      <h3 style={{ fontSize: '0.95rem', marginBottom: '14px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Prediksi Penguasaan per Topik
                      </h3>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                          <tr style={{ background: 'rgba(0,0,0,0.25)' }}>
                            {['Topik', 'P(L) Saat Ini', 'Status', 'Estimasi untuk Dikuasai'].map(h => (
                              <th key={h} style={{ padding: '10px 16px', color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {bktRawStats.map(stat => {
                            const rekItem = rekomendasi.find(r => r.topik_id === stat.topik_id);
                            const p = stat.learned_prob;
                            const isDone = p >= 0.95;
                            const statusColor = isDone ? 'var(--success-color)' : p >= 0.7 ? '#f59e0b' : p >= 0.4 ? 'var(--accent-color)' : 'var(--danger-color)';
                            const statusLabel = isDone ? 'Dikuasai' : p >= 0.7 ? 'Hampir' : p >= 0.4 ? 'Sedang Belajar' : 'Perlu Fokus';
                            return (
                              <tr key={stat.topik_id} style={{ borderBottom: '1px solid var(--glass-border)' }}
                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                              >
                                <td style={{ padding: '12px 16px', fontWeight: '600' }}>{stat.nama_topik}</td>
                                <td style={{ padding: '12px 16px', fontWeight: 'bold', color: statusColor }}>{(p * 100).toFixed(1)}%</td>
                                <td style={{ padding: '12px 16px' }}>
                                  <span style={{ fontSize: '0.82rem', color: statusColor }}>{statusLabel}</span>
                                </td>
                                <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                  {isDone
                                    ? <span style={{ color: 'var(--success-color)' }}>Sudah dikuasai!</span>
                                    : rekItem
                                      ? `~${rekItem.estimasi_submit} submit benar lagi`
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
                <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--glass-border)' }}>
                  <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Riwayat Submit Evaluasi</h2>
                </div>

                {history.length === 0 ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    Belum ada riwayat submisi kode.
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: 'rgba(0,0,0,0.3)' }}>
                        <th style={{ padding: '14px 24px', color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Tanggal</th>
                        <th style={{ padding: '14px 24px', color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Soal</th>
                        <th style={{ padding: '14px 24px', color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Status Compiler</th>
                        <th style={{ padding: '14px 24px', color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Hasil Akhir</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((h) => (
                        <tr key={h.evaluasi_id} style={{ borderBottom: '1px solid var(--glass-border)', transition: 'background 0.2s' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <td style={{ padding: '16px 24px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                            {new Date(h.timestamp).toLocaleString('id-ID')}
                          </td>
                          <td style={{ padding: '16px 24px' }}>{h.deskripsi_soal}</td>
                          <td style={{ padding: '16px 24px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                            {h.status_compile}
                          </td>
                          <td style={{ padding: '16px 24px' }}>
                            {h.binary_result === 1 ? (
                              <span style={{
                                background: 'rgba(63, 185, 80, 0.15)', borderRadius: '20px',
                                padding: '4px 12px', fontSize: '0.8rem', color: 'var(--success-color)', fontWeight: 'bold'
                              }}>Benar</span>
                            ) : (
                              <span style={{
                                background: 'rgba(220, 38, 38, 0.15)', borderRadius: '20px',
                                padding: '4px 12px', fontSize: '0.8rem', color: '#f87171', fontWeight: 'bold'
                              }}>Salah</span>
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
