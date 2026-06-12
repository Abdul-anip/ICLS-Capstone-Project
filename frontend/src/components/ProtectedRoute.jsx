import React from 'react';
import { Navigate } from 'react-router-dom';

/**
 * Decode payload dari JWT token tanpa library tambahan (parse base64).
 * Mengembalikan payload object atau null jika token tidak valid.
 */
function decodeJwtPayload(token) {
  try {
    const base64Payload = token.split('.')[1];
    const jsonPayload = atob(base64Payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

/**
 * ProtectedRoute — Melindungi halaman agar tidak bisa diakses tanpa login.
 * Memvalidasi keberadaan JWT token dan memastikan token belum expired.
 * @param {React.ReactNode} children - Komponen halaman yang dilindungi.
 * @param {string[]} allowedRoles - Array role yang diperbolehkan mengakses halaman ini.
 */
function ProtectedRoute({ children, allowedRoles = [] }) {
  const token = localStorage.getItem('access_token');
  const userRaw = localStorage.getItem('user');

  // Jika tidak ada token → arahkan ke login
  if (!token || !userRaw) {
    return <Navigate to="/login" replace />;
  }

  // Decode dan validasi expiry token
  const payload = decodeJwtPayload(token);
  if (!payload) {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    return <Navigate to="/login" replace />;
  }

  // Cek apakah token sudah expired (exp dalam detik Unix)
  const isExpired = payload.exp && (payload.exp * 1000) < Date.now();
  if (isExpired) {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    return <Navigate to="/login" replace />;
  }

  const user = JSON.parse(userRaw);

  // Jika ada pembatasan role dan role user tidak cocok → arahkan ke halaman yang sesuai
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    if (user.role === 'siswa') return <Navigate to="/siswa/dashboard" replace />;
    if (user.role === 'dosen') return <Navigate to="/dosen/dashboard" replace />;
    if (user.role === 'super_admin') return <Navigate to="/admin/dashboard" replace />;
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default ProtectedRoute;
