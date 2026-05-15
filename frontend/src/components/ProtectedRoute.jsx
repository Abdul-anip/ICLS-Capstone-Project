import React from 'react';
import { Navigate } from 'react-router-dom';

/**
 * ProtectedRoute — Melindungi halaman agar tidak bisa diakses tanpa login.
 * @param {React.ReactNode} children - Komponen halaman yang dilindungi.
 * @param {string[]} allowedRoles - Array role yang diperbolehkan mengakses halaman ini.
 *                                  Jika kosong/tidak diisi, semua role yang sudah login diperbolehkan.
 */
function ProtectedRoute({ children, allowedRoles = [] }) {
  const userRaw = localStorage.getItem('user');

  // Jika tidak ada data user di localStorage → arahkan ke login
  if (!userRaw) {
    return <Navigate to="/login" replace />;
  }

  const user = JSON.parse(userRaw);

  // Jika ada pembatasan role dan role user tidak cocok → arahkan ke halaman yang sesuai
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    if (user.role === 'siswa') return <Navigate to="/siswa/workspace" replace />;
    if (user.role === 'dosen') return <Navigate to="/dosen/dashboard" replace />;
    if (user.role === 'super_admin') return <Navigate to="/admin/dashboard" replace />;
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default ProtectedRoute;
