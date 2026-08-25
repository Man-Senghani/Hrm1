// 🛰️ DYNAMIC ENDPOINT CONFIGURATION
const getDynamicApiUrl = () => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host.includes('hrm-staging.aupanishad.tech')) {
      return 'https://hrm1-wljp.onrender.com';
    }
    if (host.includes('aupanishad.tech')) {
      return 'https://hrm1-1-zli1.onrender.com';
    }
    return window.location.origin;
  }
  return '';
};

export const API_BASE_URL = getDynamicApiUrl();

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

export const formatDate = (dateInput) => {
  if (!dateInput || dateInput === 'N/A' || dateInput === '--') return 'N/A';
  try {
    if (typeof dateInput === 'string' && dateInput.includes(' - ')) {
      return dateInput.split(' - ').map(d => formatDate(d.trim())).join(' - ');
    }
    if (typeof dateInput === 'string' && dateInput.match(/^\d{4}-\d{2}-\d{2}/)) {
      const parts = dateInput.split('T')[0].split('-');
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    if (typeof dateInput === 'string' && dateInput.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
      const parts = dateInput.split('/');
      const p0 = parts[0].padStart(2, '0');
      const p1 = parts[1].padStart(2, '0');
      const p2 = parts[2];
      if (parseInt(p0, 10) > 12) return `${p0}/${p1}/${p2}`;
      if (parseInt(p1, 10) > 12) return `${p1}/${p0}/${p2}`;
      return `${p1}/${p0}/${p2}`;
    }
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch (e) {
    return String(dateInput);
  }
};

export const formatDateDDMMYYYY = formatDate;

export default api;
