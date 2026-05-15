import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function Login() {
  const [role, setRole] = useState('siswa');
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    if (role === 'siswa') {
      navigate('/siswa/workspace');
    } else {
      navigate('/dosen/dashboard');
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '20px' }}>
      <div className="glass-panel animate-fade-in" style={{ maxWidth: '400px', width: '100%', padding: '40px' }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          
          <h2 style={{ fontSize: '1.8rem', marginBottom: '8px' }}>ICLS Platform</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Intelligent Coding Learning System</p>
        </div>

        <form onSubmit={handleLogin}>
          <div className="input-group">
            <label className="input-label">Username / Email</label>
            <input type="text" className="input-field" placeholder="Masukkan kredensial Anda" required />
          </div>
          
          <div className="input-group">
            <label className="input-label">Kata Sandi</label>
            <input type="password" className="input-field" placeholder="••••••••" required />
          </div>

          <div className="input-group">
            <label className="input-label">Masuk Sebagai</label>
            <select 
              className="input-field" 
              value={role} 
              onChange={(e) => setRole(e.target.value)}
              style={{ appearance: 'none', backgroundColor: 'rgba(0,0,0,0.4)' }}
            >
              <option value="siswa">Siswa</option>
              <option value="dosen">Dosen / Instruktur</option>
            </select>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }}>
            Masuk ke Sistem
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;
