import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import axios from 'axios';
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

// Configure global axios interceptor to redirect to login on 401
axios.interceptors.response.use(
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

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </BrowserRouter>
  </React.StrictMode>
);
