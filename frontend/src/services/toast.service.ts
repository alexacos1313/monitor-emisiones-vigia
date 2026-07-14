// frontend/src/services/toast.service.ts
import toast from 'react-hot-toast';
import { createElement } from 'react';

// Función helper para crear icono Bootstrap
const BootstrapIcon = (iconName: string, color: string = '') => {
  return createElement('i', { 
    className: `bi ${iconName}`,
    style: color ? { color } : {}
  });
};

export const showInfo = (message: string) => {
  toast(message, {
    icon: BootstrapIcon('bi-info-circle-fill', '#0d6efd'),
    duration: 3000,
  });
};

export const showWarning = (message: string) => {
  toast(message, {
    icon: BootstrapIcon('bi-exclamation-triangle-fill', '#ffc107'),
    duration: 4000,
  });
};

export const showSuccess = (message: string) => {
  toast.success(message, {
    icon: BootstrapIcon('bi-check-circle-fill', '#198754'),
  });
};

export const showError = (message: string) => {
  toast.error(message, {
    icon: BootstrapIcon('bi-x-circle-fill', '#dc3545'),
  });
};

export const showPending = (message: string) => {
  toast(message, {
    icon: BootstrapIcon('bi-tools', '#6c757d'),
    duration: 3000,
  });
};