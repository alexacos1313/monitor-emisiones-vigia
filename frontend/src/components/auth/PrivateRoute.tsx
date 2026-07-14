// components/auth/PrivateRoute.tsx
import { Navigate, Outlet } from 'react-router-dom';

export default function PrivateRoute() {
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');
  
  console.log(' PrivateRoute - Verificando autenticación...');
  console.log(' PrivateRoute - Token:', token);
  console.log(' PrivateRoute - User:', user);
  
  // Si no hay token, redirigir al login
  if (!token) {
    console.log(' PrivateRoute - No hay token, redirigiendo a login');
    return <Navigate to="/login" replace />;
  }
  
  // Si no hay usuario pero hay token, recrear usuario (solo demo)
  if (!user) {
    console.log(' PrivateRoute - No hay usuario, creando uno por defecto');
    const userData = { 
      id: 1,
      nombre: 'Administrador',
      email: 'admin@demo.com',
      rol: 'SUPER_ADMIN',
      id_empresa: 1
    };
    localStorage.setItem('user', JSON.stringify(userData));
  }
  
  console.log(' PrivateRoute - Acceso permitido');
  return <Outlet />;
}