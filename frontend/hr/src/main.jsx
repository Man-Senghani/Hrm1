import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import axios from 'axios'
import App from './App';
import ErrorBoundary from '@shared/components/ErrorBoundary';
import { API_BASE_URL, getDynamicApiUrl } from '@shared/services/api';
import './index.css';

// 🛰️ DYNAMIC AXIOS BASE URL CONFIGURATION
axios.defaults.baseURL = API_BASE_URL;

// Configure global axios interceptor to automatically attach authorization header
axios.interceptors.request.use((config) => {
  const dynamicUrl = getDynamicApiUrl();
  if (dynamicUrl) {
    config.baseURL = dynamicUrl;
  }
  const token = sessionStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

// Redirect to login on 401
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      sessionStorage.clear();
      try {
        localStorage.removeItem('activeAccount');
        localStorage.removeItem('token');
      } catch (_) {}
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
