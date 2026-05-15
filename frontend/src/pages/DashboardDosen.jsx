import React from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';

function DashboardDosen() {
  const navigate = useNavigate();

  return (
    <div>
      <Navbar role="dosen" />
      <div style={{ padding: '30px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ marginBottom: '30px' }}>
          <h1 style={{ fontSize: '1.8rem', marginBottom: '4px' }}>Dashboard Instruktur</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Pantau performa kelas dan metrik BKT</p>
        </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '40px' }}>
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textTransform: 'uppercase' }}>Rata-rata Kelas</h3>
          <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--success-color)', marginTop: '10px' }}>82.4%</div>
          <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', marginTop: '16px' }}>
            <div style={{ width: '82.4%', height: '100%', background: 'var(--success-color)', borderRadius: '3px' }}></div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textTransform: 'uppercase' }}>Topik Tersulit</h3>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--danger-color)', marginTop: '10px' }}>Nested Loops</div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '8px' }}>Rata-rata Error: 45%</p>
        </div>

        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textTransform: 'uppercase' }}>Siswa Aktif</h3>
          <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--accent-color)', marginTop: '10px' }}>124</div>
        </div>
      </div>

      <h2>Daftar Performa Siswa</h2>
      <div className="glass-panel" style={{ marginTop: '20px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'rgba(0,0,0,0.3)' }}>
              <th style={{ padding: '16px', color: 'var(--text-secondary)' }}>Nama Siswa</th>
              <th style={{ padding: '16px', color: 'var(--text-secondary)' }}>Topik Terakhir</th>
              <th style={{ padding: '16px', color: 'var(--text-secondary)' }}>Pemahaman P(Ln)</th>
              <th style={{ padding: '16px', color: 'var(--text-secondary)' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {[
              { name: 'Ahmad Hanif', topic: 'Array 1D', prob: 0.96, status: 'Dikuasai' },
              { name: 'Budi Santoso', topic: 'Nested Loops', prob: 0.42, status: 'Masih Belajar' },
              { name: 'Siti Aminah', topic: 'Functions', prob: 0.88, status: 'Hampir Dikuasai' }
            ].map((student, i) => (
              <tr key={i} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                <td style={{ padding: '16px' }}>{student.name}</td>
                <td style={{ padding: '16px' }}>{student.topic}</td>
                <td style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px' }}>
                      <div style={{ 
                        width: `${student.prob * 100}%`, height: '100%', borderRadius: '3px',
                        background: student.prob > 0.95 ? 'var(--success-color)' : student.prob > 0.6 ? 'var(--accent-color)' : 'var(--danger-color)'
                      }}></div>
                    </div>
                    <span style={{ fontSize: '0.85rem' }}>{(student.prob * 100).toFixed(0)}%</span>
                  </div>
                </td>
                <td style={{ padding: '16px' }}>
                  <span style={{ 
                    padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold',
                    background: student.prob > 0.95 ? 'rgba(63, 185, 80, 0.2)' : 'rgba(248, 81, 73, 0.2)',
                    color: student.prob > 0.95 ? 'var(--success-color)' : 'var(--danger-color)'
                  }}>
                    {student.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
    </div>
  );
}

export default DashboardDosen;
