// components/layout/Sidebar.tsx
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useEmpresaId } from '../../hooks/useEmpresaId';
import logo from '/logo.png'; 

export default function Sidebar({ isOpen }: { isOpen: boolean }) {
  const location = useLocation();
  const { user } = useAuth();
  const empresaId = useEmpresaId();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('empresa_seleccionada_id');
    localStorage.removeItem('empresa_seleccionada');
    window.location.href = '/login';
  };

  const isActive = (path: string) => location.pathname === path;

  const getMenuItems = () => {
    // Si es SUPER_ADMIN y NO tiene empresa seleccionada → solo Empresas
    if (user?.rol === 'SUPER_ADMIN' && !empresaId) {
      return [
        { path: '/empresas', name: 'Empresas', icon: 'bi-building' },
      ];
    }

    // SUPER_ADMIN con empresa seleccionada → ve todo como un admin de empresa
    if (user?.rol === 'SUPER_ADMIN' && empresaId) {
      return [
        { path: '/dashboard', name: 'Dashboard', icon: 'bi-speedometer2' },
        { path: '/mi-empresa', name: 'Mi Empresa', icon: 'bi-building' },
        { path: '/mediciones', name: 'Mediciones', icon: 'bi-graph-up' },
        { path: '/alarmas', name: 'Alarmas', icon: 'bi-bell' },
        { path: '/sensores', name: 'Sensores', icon: 'bi-cpu' },
        { path: '/usuarios', name: 'Usuarios', icon: 'bi-people' },
        { path: '/reportes', name: 'Reportes', icon: 'bi-file-text' },
        { path: '/mantenimiento', name: 'Mantenimiento', icon: 'bi-calendar-check' },
        { path: '/umbrales-normativos', name: 'Umbrales Normativos', icon: 'bi-book' },
      ];
    }

    // EMPRESA_ADMIN (siempre tiene empresa) → ve todo
    if (user?.rol === 'EMPRESA_ADMIN') {
      return [
        { path: '/dashboard', name: 'Dashboard', icon: 'bi-speedometer2' },
        { path: '/mi-empresa', name: 'Mi Empresa', icon: 'bi-building' },
        { path: '/mediciones', name: 'Mediciones', icon: 'bi-graph-up' },
        { path: '/alarmas', name: 'Alarmas', icon: 'bi-bell' },
        { path: '/sensores', name: 'Sensores', icon: 'bi-cpu' },
        { path: '/usuarios', name: 'Usuarios', icon: 'bi-people' },
        { path: '/reportes', name: 'Reportes', icon: 'bi-file-text' },
        { path: '/mantenimiento', name: 'Mantenimiento', icon: 'bi-calendar-check' },
      ];
    }

    // TECNICO
    if (user?.rol === 'TECNICO') {
      return [
        { path: '/dashboard', name: 'Dashboard', icon: 'bi-speedometer2' },
        { path: '/mediciones', name: 'Mediciones', icon: 'bi-graph-up' },
        { path: '/alarmas', name: 'Alarmas', icon: 'bi-bell' },
        { path: '/sensores', name: 'Sensores', icon: 'bi-cpu' },
        { path: '/reportes', name: 'Reportes', icon: 'bi-file-text' },
        { path: '/mantenimiento', name: 'Mantenimiento', icon: 'bi-calendar-check' },
      ];
    }

    // Usuario básico
    return [
      { path: '/dashboard', name: 'Dashboard', icon: 'bi-speedometer2' },
      { path: '/mediciones', name: 'Mediciones', icon: 'bi-graph-up' },
      { path: '/alarmas', name: 'Alarmas', icon: 'bi-bell' },
    ];
  };

  const menuItems = getMenuItems();

  return (
    <div className={`bg-dark text-white vh-100`} style={{ width: isOpen ? '260px' : '70px', transition: 'width 0.3s' }}>
      <div className="p-3 border-bottom border-secondary text-center">
        <img 
          src={logo} 
          alt="Logo" 
          style={{ 
            width: isOpen ? '80px' : '40px', 
            height: isOpen ? '80px' : '40px',
            transition: 'all 0.3s',
            display: 'block',
            margin: '0 auto',
          }} 
        />
        {isOpen && (
          <>
            <h5 className="mt-2 mb-0 text-white">Monitor de Emisiones</h5>
            <small className="text-white-50">Sistema de Control</small>
          </>
        )}
        {!isOpen && (
          <span className="fs-5 text-white d-block mt-1">ME</span>
        )}
      </div>

      <div className="mt-3">
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '8px 16px',
              margin: '4px 8px',
              borderRadius: '8px',
              textDecoration: 'none',
              transition: 'all 0.2s',
              backgroundColor: isActive(item.path) ? '#0d6efd' : 'transparent',
              color: isActive(item.path) ? 'white' : 'rgba(255,255,255,0.5)'
            }}
          >
            <i className={`${item.icon} fs-5`}></i>
            {isOpen && <span className="ms-3">{item.name}</span>}
          </Link>
        ))}

        <hr className="mx-3 my-3" />

        {/* Sección Cuenta - solo para usuarios que NO son SUPER_ADMIN */}
        {user?.rol !== 'SUPER_ADMIN' && (
          <>
            <div className="px-3 mb-2">
              {isOpen && (
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Cuenta
                </p>
              )}
            </div>

            <Link
              to="/perfil"
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '8px 16px',
                margin: '4px 8px',
                borderRadius: '8px',
                textDecoration: 'none',
                transition: 'all 0.2s',
                backgroundColor: isActive('/perfil') ? '#0d6efd' : 'transparent',
                color: isActive('/perfil') ? 'white' : 'rgba(255,255,255,0.5)'
              }}
            >
              <i className="bi bi-person-circle fs-5"></i>
              {isOpen && <span className="ms-3">Mi Perfil</span>}
            </Link>
          </>
        )}

        {/* Cambiar Empresa - solo para SUPER_ADMIN con empresa seleccionada */}
        {user?.rol === 'SUPER_ADMIN' && empresaId && (
          <Link
            to="/empresas"
            onClick={() => {
              localStorage.removeItem('empresa_seleccionada_id');
              localStorage.removeItem('empresa_seleccionada');
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '8px 16px',
              margin: '4px 8px',
              borderRadius: '8px',
              textDecoration: 'none',
              transition: 'all 0.2s',
              color: 'rgba(255,255,255,0.5)'
            }}
          >
            <i className="bi bi-arrow-left-right fs-5"></i>
            {isOpen && <span className="ms-3">Cambiar Empresa</span>}
          </Link>
        )}

        <div
          onClick={handleLogout}
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '8px 16px',
            margin: '4px 8px',
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'all 0.2s',
            color: 'rgba(255,255,255,0.5)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#dc3545';
            e.currentTarget.style.color = 'white';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = 'rgba(255,255,255,0.5)';
          }}
        >
          <i className="bi-box-arrow-right fs-5"></i>
          {isOpen && <span className="ms-3">Salir</span>}
        </div>
      </div>
    </div>
  );
}