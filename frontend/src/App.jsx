import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Register from './pages/Register'
import DashboardDosen from './pages/DashboardDosen'
import WorkspaceSiswa from './pages/WorkspaceSiswa'
import DashboardSiswa from './pages/DashboardSiswa'
import ManajemenSoal from './pages/ManajemenSoal'
import ManajemenAkun from './pages/ManajemenAkun'
import AdminDashboard from './pages/AdminDashboard'
import ProfilAkun from './pages/ProfilAkun'

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
        <Route
          path="/dosen/manajemen-akun"
          element={
            <ProtectedRoute allowedRoles={['dosen', 'super_admin']}>
              <ManajemenAkun />
            </ProtectedRoute>
          }
        />

        <Route
          path="/siswa/dashboard"
          element={
            <ProtectedRoute allowedRoles={['siswa']}>
              <DashboardSiswa />
            </ProtectedRoute>
          }
        />

        <Route
          path="/siswa/workspace/:soalId"
          element={
            <ProtectedRoute allowedRoles={['siswa']}>
              <WorkspaceSiswa />
            </ProtectedRoute>
          }
        />

        {/* Rute Profil (Umum) */}
        <Route
          path="/profil"
          element={
            <ProtectedRoute allowedRoles={['siswa', 'dosen', 'super_admin']}>
              <ProfilAkun />
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
