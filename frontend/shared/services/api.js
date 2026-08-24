import axios from 'axios';

// 🛰️ DYNAMIC ENDPOINT CONFIGURATION
export const API_BASE_URL = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' ? window.location.origin : '');

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to attach token
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

// Interceptor for session expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      sessionStorage.clear();
      const baseUrl = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
      window.location.href = `${baseUrl}/login`;
    }
    return Promise.reject(error);
  }
);

export const getImageUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('data:')) return path; // Base64 fallback
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  
  const normalized = path.replace(/\\/g, '/');
  const cleanPath = normalized.startsWith('/') ? normalized : `/${normalized}`;
  
  const base = API_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : '');
  return `${base}${cleanPath}`;
};

export default api;
