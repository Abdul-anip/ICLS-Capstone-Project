import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

/**
 * apiClient — Instance Axios terpusat untuk seluruh aplikasi ICLS.
 *
 * Fitur:
 * - Otomatis menambahkan header Authorization: Bearer <token> pada setiap request.
 * - Jika backend mengembalikan 401 (token expired/invalid), otomatis redirect ke /login.
 */
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─── Request Interceptor ─────────────────────────────────────────────────────
// Otomatis sisipkan JWT token ke header setiap request yang membutuhkan autentikasi.
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response Interceptor ────────────────────────────────────────────────────
// Tangani error 401 secara global: hapus session dan redirect ke halaman login.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired atau tidak valid — bersihkan localStorage dan minta login ulang
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
export { API_BASE_URL };
