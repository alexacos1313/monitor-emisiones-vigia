// App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import UsuariosPage from './pages/UsuariosPage';  
import Layout from './components/layout/Layout';
import PrivateRoute from './components/auth/PrivateRoute';
import AlarmasPage from './pages/AlarmasPage';
import MedicionesPage from './pages/MedicionesPage';
import MiEmpresaPage from './pages/MiEmpresaPage';
import EmpresasPage from './pages/EmpresasPage';
import SensoresPage from './pages/SensoresPage';
import ReportesPage from './pages/ReportesPage';
import PerfilPage from './pages/PerfilPage';
import MantenimientoPage from './pages/MantenimientoPage';
// import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import UmbralesNormativosPage from './pages/UmbralesNormativosPage';

function App() {
  return (
    // <ThemeProvider>
      <AuthProvider> 
        <BrowserRouter>
          <Toaster position="top-right" />
          <Routes>
            <Route path="/login" element={<Login />} />
            
            <Route element={<PrivateRoute />}>
              <Route element={<Layout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/mediciones" element={<MedicionesPage />} />
                <Route path="/alarmas" element={<AlarmasPage />} />
                <Route path="/reportes" element={<ReportesPage />} />
                <Route path="/empresas" element={<EmpresasPage />} />
                <Route path="/mi-empresa" element={<MiEmpresaPage />} />
                <Route path="/sensores" element={<SensoresPage />} />
                <Route path="/usuarios" element={<UsuariosPage />} />  
                <Route path="/perfil" element={<PerfilPage />} />
                <Route path="/mantenimiento" element={<MantenimientoPage />} />
                <Route path="/umbrales-normativos" element={<UmbralesNormativosPage />} />
              </Route>
            </Route>
            
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider> 
    // </ThemeProvider>
  );
}

export default App;