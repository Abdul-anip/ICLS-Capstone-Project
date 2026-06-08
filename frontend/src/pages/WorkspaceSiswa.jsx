import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import Editor from '@monaco-editor/react';
import Navbar from '../components/Navbar';

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
  const { soalId } = useParams();
  const userRaw = localStorage.getItem('user');
  const user = userRaw ? JSON.parse(userRaw) : null;

  const [activeLang, setActiveLang] = useState(71); // Default Python 3
  const [code, setCode] = useState(LANGUAGES[71].template);
  const [output, setOutput] = useState('');
  const [fontSize, setFontSize] = useState(14);
  const editorRef = useRef(null);
  
  const [activeSoal, setActiveSoal] = useState(null);
  const [bktProb, setBktProb] = useState(0.1);
  const [attempts, setAttempts] = useState([]);
  const [isLoadingSoal, setIsLoadingSoal] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!user || user.role !== 'siswa') {
      navigate('/login');
      return;
    }
    if (!soalId) {
      navigate('/siswa/dashboard');
      return;
    }
    fetchSoalDetail();
  }, [soalId]);

  const fetchSoalDetail = async () => {
    setIsLoadingSoal(true);
    try {
      const res = await axios.get(`${API}/api/soal/siswa/${user.user_id}/soal/${soalId}`);
      const data = res.data;
      setActiveSoal(data);
      setBktProb(data.learned_prob);
      setAttempts(data.attempts || []);
      setCode(LANGUAGES[activeLang].template);
      setOutput('');
    } catch (error) {
      console.error('Gagal mengambil detail soal:', error);
      setOutput('Error: Gagal mengambil detail soal dari server.');
    } finally {
      setIsLoadingSoal(false);
    }
  };

  const handleLangChange = (e) => {
    const langId = parseInt(e.target.value);
    setActiveLang(langId);
    setCode(LANGUAGES[langId].template);
  };

  // Muat kembali kode lama dari riwayat pengerjaan siswa
  const loadPreviousCode = (savedCode) => {
    if (savedCode) {
      setCode(savedCode);
      setOutput('Info: Kode dari riwayat percobaan berhasil dimuat ke editor.');
    }
  };

  const handleSubmit = async () => {
    if (!activeSoal) return;
    
    const template = LANGUAGES[activeLang]?.template || '';
    const strippedCode = code.trim();
    const strippedTemplate = template.trim();

    if (!strippedCode) {
      setOutput('PERINGATAN: Silakan tulis kode solusi Anda terlebih dahulu sebelum melakukan submit!');
      return;
    }

    if (strippedCode === strippedTemplate) {
      setOutput('PERINGATAN: Kode Anda masih berupa template bawaan. Silakan tulis kode solusi Anda terlebih dahulu!');
      return;
    }
    
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

        // Tambahkan ke riwayat lokal jika bukan duplikat
        const newAttempt = {
          evaluasi_id: Date.now(),
          status_compile: status_compile,
          binary_result: is_correct ? 1 : 0,
          timestamp: new Date().toISOString(),
          source_code: code
        };
        setAttempts(prev => [newAttempt, ...prev]);
      }
      
      setOutput(outText);
      setBktProb(new_knowledge_state);
      
    } catch (error) {
      if (error.response?.data?.detail) {
        setOutput(`PERINGATAN: ${error.response.data.detail}`);
      } else {
        setOutput('Error: Could not connect to compilation server.\n(Pastikan backend FastAPI dan API pihak ketiga berjalan)');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Navbar role="siswa" activePage="workspace" />

      {isLoadingSoal ? (
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--text-secondary)' }}>
          <div style={{ fontSize: '1.2rem', fontWeight: '700' }}>Memuat Ruang Koding...</div>
        </div>
      ) : !activeSoal ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '20px' }}>
          <div style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--danger-color)' }}>Soal tidak ditemukan atau gagal dimuat.</div>
          <button className="btn btn-secondary" onClick={() => navigate('/siswa/dashboard')}>
            Kembali ke Dashboard
          </button>
        </div>
      ) : (
        <div className="editor-container" style={{ flex: 1, padding: '20px', gap: '20px', display: 'flex', maxWidth: '1400px', margin: '0 auto', width: '100%', overflow: 'hidden' }}>
          
          {/* Kolom Kiri: Detail Soal & Statistik Khusus Soal Ini (35% Lebar) */}
          <div style={{ width: '35%', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto', paddingRight: '5px' }}>
            
            {/* Tombol Navigasi Kembali */}
            <button 
              className="btn btn-secondary" 
              onClick={() => navigate('/siswa/dashboard')}
              style={{ padding: '8px 16px', fontSize: '0.85rem', alignSelf: 'flex-start', boxShadow: '2px 2px 0px #000000' }}
            >
              ⬅️ KEMBALI KE BERANDA
            </button>

            {/* Panel Detail Soal */}
            <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
              <div style={{ marginBottom: '16px' }}>
                <h2 style={{ fontSize: '1.3rem', color: '#FFFFFF', marginBottom: '8px', fontFamily: 'Outfit', fontWeight: '800', textTransform: 'uppercase' }}>
                  {activeSoal.judul_soal || activeSoal.nama_topik}
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.75rem', color: '#000000', background: 'var(--accent-blue)', padding: '2px 8px', borderRadius: '4px', border: '1.5px solid #000000', fontWeight: '800', boxShadow: '1.5px 1.5px 0px #000000' }}>
                    Topik: {activeSoal.nama_topik}
                  </span>
                  <div style={{ display: 'inline-block', background: 'var(--bg-card-hover)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', border: '1.5px solid #000000', fontWeight: '800', boxShadow: '1.5px 1.5px 0px #000000', color: '#FFFFFF' }}>
                    KESULITAN: {activeSoal.tingkat_kesulitan.toUpperCase()}
                  </div>
                </div>
              </div>
              
              <div style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '0.88rem', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                {activeSoal.deskripsi_soal}
              </div>

              {/* Status BKT Topik Ini */}
              <div style={{ paddingTop: '16px', borderTop: '2px dashed #000000' }}>
                <h3 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '800', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Penguasaan Topik Ini (BKT)
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <div style={{ fontSize: '1.6rem', fontWeight: '800', color: bktProb > 0.95 ? 'var(--success-color)' : 'var(--accent-color)' }}>
                    {(bktProb * 100).toFixed(1)}%
                  </div>
                  <div style={{ flex: 1, height: '12px', background: '#000000', border: '1.5px solid #000000', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ 
                      width: `${bktProb * 100}%`, height: '100%', transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)',
                      background: bktProb > 0.95 ? 'var(--success-color)' : 'var(--accent-blue)',
                      borderRight: bktProb > 0 ? '1.5px solid #000000' : 'none'
                    }}></div>
                  </div>
                </div>
                {bktProb > 0.95 && (
                  <div style={{ 
                    color: '#000000', background: 'var(--success-color)', border: '1.5px solid #000000',
                    boxShadow: '1.5px 1.5px 0px #000000', borderRadius: '4px', fontSize: '0.8rem', 
                    marginTop: '10px', fontWeight: '800', textAlign: 'center', padding: '4px', textTransform: 'uppercase'
                  }}>
                    Topik Dikuasai! 🎉
                  </div>
                )}
              </div>
            </div>

            {/* Panel Riwayat Percobaan Soal Ini */}
            <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', flex: 1, minHeight: '200px' }}>
              <h3 style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: '800', textTransform: 'uppercase', marginBottom: '12px', borderBottom: '2px solid #000000', paddingBottom: '6px' }}>
                Riwayat Submit Soal Ini
              </h3>
              
              {attempts.length === 0 ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: '0.8rem', textAlign: 'center' }}>
                  Belum ada percobaan untuk soal ini. Tulis kodemu di editor sebelah kanan dan jalankan submit!
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', flex: 1, paddingRight: '5px' }}>
                  {attempts.map((att, i) => (
                    <div 
                      key={att.evaluasi_id || i}
                      style={{ 
                        background: '#08080A', padding: '10px 14px', borderRadius: '4px',
                        border: '1.5px solid #000000', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          {att.binary_result === 1 ? (
                            <span className="brutal-badge brutal-badge-success" style={{ fontSize: '0.55rem', padding: '1px 5px' }}>Benar</span>
                          ) : (
                            <span className="brutal-badge brutal-badge-danger" style={{ fontSize: '0.55rem', padding: '1px 5px' }}>Salah</span>
                          )}
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: '600' }}>
                            {new Date(att.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                          Status: {att.status_compile}
                        </div>
                      </div>
                      <button 
                        className="btn btn-secondary"
                        onClick={() => loadPreviousCode(att.source_code)}
                        title="Muat kode ini ke editor"
                        style={{ padding: '4px 8px', fontSize: '0.68rem', textTransform: 'capitalize', boxShadow: '1px 1px 0px #000000' }}
                      >
                        Muat Kode
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Kolom Kanan: Editor Monaco & Terminal Output (65% Lebar) */}
          <div style={{ width: '65%', display: 'flex', flexDirection: 'column', gap: '20px', height: '100%' }}>
            
            {/* Editor Container */}
            <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              
              {/* Toolbar Editor */}
              <div style={{ padding: '8px 16px', background: 'var(--bg-card-hover)', borderBottom: '2.5px solid #000000', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <select 
                    className="input-field" 
                    value={activeLang} 
                    onChange={handleLangChange} 
                    style={{ padding: '6px 12px', fontSize: '0.85rem', width: 'auto', background: 'var(--bg-card)', border: '2.5px solid #000000', borderRadius: '4px', cursor: 'pointer', fontWeight: '800' }}
                  >
                    {Object.entries(LANGUAGES).map(([id, lang]) => (
                      <option key={id} value={id}>{lang.name}</option>
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
                  <button id="btn-submit-code" className="btn btn-primary" onClick={handleSubmit} disabled={isLoading} style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
                    {isLoading ? 'Mengevaluasi...' : 'Jalankan & Submit'}
                  </button>
                </div>
              </div>

              {/* Monaco Code Editor */}
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
                  }}
                  loading={
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)' }}>
                      Memuat editor...
                    </div>
                  }
                />
              </div>

            </div>

            {/* Terminal Output */}
            <div className="glass-panel" style={{ height: '220px', display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0 }}>
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
      )}
    </div>
  );
}

export default WorkspaceSiswa;
