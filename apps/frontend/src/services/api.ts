import axios from 'axios';

const getBaseURL = () => {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    return host === 'localhost' ? 'http://localhost:8080/api/v1' : `http://${host}:8080/api/v1`;
  }
  return 'http://localhost:8080/api/v1';
};

const API_URL = getBaseURL();

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to add JWT token to requests
api.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor to handle 401 Unauthorized (token expired)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  }
);
