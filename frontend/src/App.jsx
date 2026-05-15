import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Register from './pages/Register'
import DashboardDosen from './pages/DashboardDosen'
import WorkspaceSiswa from './pages/WorkspaceSiswa'
import ManajemenSoal from './pages/ManajemenSoal'
import AdminDashboard from './pages/AdminDashboard'

function App() {
  return (
    <Router>
      <Routes>
        {/* Rute Publik */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Rute Dosen */}
        <Route
          path="/dosen/dashboard"
          element={
            <ProtectedRoute allowedRoles={['dosen', 'super_admin']}>
              <DashboardDosen />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dosen/soal"
          element={
            <ProtectedRoute allowedRoles={['dosen', 'super_admin']}>
              <ManajemenSoal />
            </ProtectedRoute>
          }
        />

        {/* Rute Siswa */}
        <Route
          path="/siswa/workspace"
          element={
            <ProtectedRoute allowedRoles={['siswa']}>
              <WorkspaceSiswa />
            </ProtectedRoute>
          }
        />

        {/* Rute Super Admin */}
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute allowedRoles={['super_admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  )
}

export default App
