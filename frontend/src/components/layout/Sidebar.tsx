// frontend/src/components/layout/Sidebar.tsx
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
    //  SUPER_ADMIN sin empresa seleccionada → solo Empresas y Perfil
    if (user?.rol === 'SUPER_ADMIN' && !empresaId) {
      return [
        { path: '/empresas', name: 'Empresas', icon: 'bi-building' },
        { path: '/perfil', name: 'Mi Perfil', icon: 'bi-person-circle' },
      ];
    }

    //  SUPER_ADMIN con empresa seleccionada → ve todo
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
        { path: '/perfil', name: 'Mi Perfil', icon: 'bi-person-circle' },
      ];
    }

    //  EMPRESA_ADMIN (siempre tiene empresa) → ve todo
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
        { path: '/perfil', name: 'Mi Perfil', icon: 'bi-person-circle' },
      ];
    }

    //  TECNICO
    if (user?.rol === 'TECNICO') {
      return [
        { path: '/dashboard', name: 'Dashboard', icon: 'bi-speedometer2' },
        { path: '/mediciones', name: 'Mediciones', icon: 'bi-graph-up' },
        { path: '/alarmas', name: 'Alarmas', icon: 'bi-bell' },
        { path: '/sensores', name: 'Sensores', icon: 'bi-cpu' },
        { path: '/reportes', name: 'Reportes', icon: 'bi-file-text' },
        { path: '/mantenimiento', name: 'Mantenimiento', icon: 'bi-calendar-check' },
        { path: '/perfil', name: 'Mi Perfil', icon: 'bi-person-circle' },
      ];
    }

    //  Usuario básico (CONSULTOR)
    return [
      { path: '/dashboard', name: 'Dashboard', icon: 'bi-speedometer2' },
      { path: '/mediciones', name: 'Mediciones', icon: 'bi-graph-up' },
      { path: '/alarmas', name: 'Alarmas', icon: 'bi-bell' },
      { path: '/perfil', name: 'Mi Perfil', icon: 'bi-person-circle' },
    ];
  };

  const menuItems = getMenuItems();

  //  Determinar si mostrar el nombre de la empresa en el sidebar
  const mostrarNombreEmpresa = () => {
    if (empresaId) {
      const empresaNombre = localStorage.getItem('empresa_seleccionada');
      if (empresaNombre) {
        return isOpen ? empresaNombre : empresaNombre.substring(0, 2).toUpperCase();
      }
      return isOpen ? 'Empresa Seleccionada' : 'ES';
    }
    return null;
  };

  const nombreEmpresa = mostrarNombreEmpresa();

  return (
    <div className={`bg-dark text-white vh-100 d-flex flex-column`} style={{ width: isOpen ? '260px' : '70px', transition: 'width 0.3s' }}>
      {/* Logo y título */}
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

      {/*  Mostrar empresa seleccionada si hay */}
      {/* {nombreEmpresa && (
        <div className="px-3 py-2 border-bottom border-secondary">
          <div className="d-flex align-items-center">
            <i className="bi bi-building text-info me-2"></i>
            {isOpen ? (
              <span className="text-white-50 small text-truncate">{nombreEmpresa}</span>
            ) : (
              <span className="text-white-50 small" title={nombreEmpresa}>{nombreEmpresa}</span>
            )}
          </div>
        </div>
      )} */}

      {/*  Menú principal */}
      <div className="flex-grow-1 overflow-auto mt-2">
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
            onMouseEnter={(e) => {
              if (!isActive(item.path)) {
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
                e.currentTarget.style.color = 'white';
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive(item.path)) {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'rgba(255,255,255,0.5)';
              }
            }}
          >
            <i className={`${item.icon} fs-5`}></i>
            {isOpen && <span className="ms-3">{item.name}</span>}
          </Link>
        ))}
      </div>

      {/*  Cambiar Empresa - solo para SUPER_ADMIN con empresa seleccionada */}
      {user?.rol === 'SUPER_ADMIN' && empresaId && (
        <div className="px-2">
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
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
              e.currentTarget.style.color = 'white';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'rgba(255,255,255,0.5)';
            }}
          >
            <i className="bi bi-arrow-left-right fs-5"></i>
            {isOpen && <span className="ms-3">Cambiar Empresa</span>}
          </Link>
        </div>
      )}

      {/*  Botón Salir */}
      <div className="px-2 pb-3">
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