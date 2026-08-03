// frontend/src/services/api.ts
import axios from 'axios';

const baseURL = window.location.hostname === 'localhost' 
  ? 'http://localhost:8000' 
  : '';

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  
  // LOG PARA DEPURAR
  console.log('=== PETICIÓN API ===');
  console.log('URL:', config.url);
  console.log('Método:', config.method);
  console.log('Token existe:', !!token);
  if (token) {
    console.log('Token (primeros 20 chars):', token.substring(0, 20) + '...');
    config.headers.Authorization = `Bearer ${token}`;
  } else {
    console.warn(' No hay token en localStorage');
  }
  
  return config;
});

api.interceptors.response.use(
  (response) => {
    console.log(' Respuesta exitosa:', response.status, response.config.url);
    return response;
  },
  (error) => {
    console.error(' Error en petición:', error.config?.url, error.response?.status);
    console.error('Detalles:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;