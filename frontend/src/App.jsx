import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import DashboardDosen from './pages/DashboardDosen'
import WorkspaceSiswa from './pages/WorkspaceSiswa'
import ManajemenSoal from './pages/ManajemenSoal'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dosen/dashboard" element={<DashboardDosen />} />
        <Route path="/dosen/soal" element={<ManajemenSoal />} />
        <Route path="/siswa/workspace" element={<WorkspaceSiswa />} />
      </Routes>
    </Router>
  )
}

export default App
