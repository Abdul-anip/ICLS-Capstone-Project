import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';

function WorkspaceSiswa() {
  const navigate = useNavigate();
  const [code, setCode] = useState('def is_even(num):\n    # Tulis kodemu disini\n    pass\n');
  const [output, setOutput] = useState('');
  const [bktProb, setBktProb] = useState(0.45);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    setIsLoading(true);
    setOutput('Mengkompilasi dan mencocokkan dengan test case...');
    
    try {
      // Panggilan API sebenarnya ke Backend FastAPI
      const response = await axios.post('http://localhost:8000/api/evaluasi/submit', {
        siswa_id: 1,
        soal_id: 1,
        source_code: code,
        language_id: 71 // Python
      });
      
      const { status_compile, is_correct, output: apiOutput, new_knowledge_state } = response.data;
      
      setOutput(`Status: ${status_compile}\nOutput:\n${apiOutput}`);
      setBktProb(new_knowledge_state);
      
    } catch (error) {
      setOutput('Error: Could not connect to compilation server.\n(Make sure FastAPI backend is running on port 8000)');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Navbar role="siswa" />
      <div className="editor-container" style={{ flex: 1 }}>
      {/* Sidebar: Task Description & Progress */}
      <div className="editor-sidebar">
        <div className="glass-panel" style={{ padding: '24px', flex: 1 }}>
          <div style={{ marginBottom: '20px' }}>
            <h2 style={{ fontSize: '1.2rem', color: 'var(--accent-color)' }}>Topik Latihan: Bilangan Genap</h2>
          </div>
          
          <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
            Tuliskan sebuah fungsi Python bernama `is_even(num)` yang mengembalikan nilai `True` jika angka yang diberikan adalah bilangan genap, dan `False` jika sebaliknya.
          </p>
          
          <div style={{ padding: '16px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', marginBottom: '20px' }}>
            <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Contoh:</h4>
            <code style={{ color: 'var(--accent-color)' }}>is_even(4) # Mengembalikan True</code><br />
            <code style={{ color: 'var(--accent-color)' }}>is_even(7) # Mengembalikan False</code>
          </div>

          <div style={{ marginTop: 'auto', paddingTop: '20px', borderTop: '1px solid var(--glass-border)' }}>
            <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '10px' }}>Tingkat Pemahaman (Knowledge State): P(Ln)</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: bktProb > 0.95 ? 'var(--success-color)' : 'var(--accent-color)' }}>
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
              <p style={{ color: 'var(--success-color)', fontSize: '0.85rem', marginTop: '10px', fontWeight: 'bold' }}>
                🎉 Konsep Dikuasai! Anda dapat melanjutkan ke topik berikutnya.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Main Area: Code Editor & Terminal */}
      <div className="editor-main">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
          <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>main.py</h3>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? 'Mengevaluasi...' : 'Jalankan & Submit Kode'}
          </button>
        </div>
        
        <textarea 
          className="code-area" 
          value={code}
          onChange={(e) => setCode(e.target.value)}
          spellCheck="false"
        />

        <div className="glass-panel" style={{ marginTop: '20px', height: '200px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--glass-border)', fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>
            Output Terminal
          </div>
          <div style={{ padding: '16px', flex: 1, overflowY: 'auto', fontFamily: 'monospace', fontSize: '0.9rem', color: output.includes('Error') ? 'var(--danger-color)' : 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
            {output || 'Output program akan muncul di sini setelah submit...'}
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}

export default WorkspaceSiswa;
