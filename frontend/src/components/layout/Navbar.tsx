// components/layout/Navbar.tsx

import { Dropdown, Badge, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useEmpresaId, useEmpresaNombre } from '../../hooks/useEmpresaId';

export default function Navbar({ onMenuClick }: { onMenuClick: () => void }) {
  const { user, logout } = useAuth();
  const empresaId = useEmpresaId();
  const empresaNombre = useEmpresaNombre();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('empresa_seleccionada_id');
    localStorage.removeItem('empresa_seleccionada');
    logout();
    navigate('/login');
  };

  const handleCambiarEmpresa = () => {
    localStorage.removeItem('empresa_seleccionada_id');
    localStorage.removeItem('empresa_seleccionada');
    navigate('/empresas');
  };

  const getRolLabel = (rol: string) => {
    switch (rol) {
      case 'SUPER_ADMIN': return 'Super Administrador';
      case 'ADMIN': return 'Administrador';
      case 'EMPRESA_ADMIN': return 'Admin. Empresa';
      case 'TECNICO': return 'Técnico';
      default: return rol || 'Usuario';
    }
  };

  const getInitials = (nombre: string) => {
    if (!nombre) return '?';
    const partes = nombre.split(' ');
    if (partes.length >= 2) {
      return (partes[0][0] + partes[1][0]).toUpperCase();
    }
    return nombre.substring(0, 2).toUpperCase();
  };

  return (
    <header className="bg-white shadow-sm px-3 py-2 d-flex align-items-center justify-content-between" style={{ height: '60px' }}>
      <button
        onClick={onMenuClick}
        className="btn btn-light rounded-circle p-2 d-flex align-items-center justify-content-center"
        style={{ width: '40px', height: '40px' }}
      >
        <i className="bi bi-list fs-4"></i>
      </button>

      <div className="d-flex align-items-center gap-3">
        {/* Botón Empresas - solo para SUPER_ADMIN */}
        {user?.rol === 'SUPER_ADMIN' && (
          <Button
            variant="outline-primary"
            size="sm"
            onClick={handleCambiarEmpresa}
            className="d-flex align-items-center gap-1"
            title="Volver al listado de empresas"
          >
            <i className="bi bi-building"></i>
            Empresas
          </Button>
        )}

        {/* Badge de empresa seleccionada - solo para SUPER_ADMIN */}
        {user?.rol === 'SUPER_ADMIN' && empresaNombre && (
          <Badge bg="info" className="d-flex align-items-center gap-1 px-3 py-2">
            <i className="bi bi-building"></i>
            {empresaNombre}
          </Badge>
        )}

        {/* Badge de empresa para EMPRESA_ADMIN */}
        {user?.rol === 'EMPRESA_ADMIN' && user?.id_empresa && (
          <Badge bg="info" className="d-flex align-items-center gap-1 px-3 py-2">
            <i className="bi bi-building"></i>
            Mi Empresa
          </Badge>
        )}

        <Dropdown>
          <Dropdown.Toggle 
            variant="light"
            id="dropdown-user"
            className="d-flex align-items-center gap-2"
            style={{ 
              borderRadius: '50px',
              padding: '4px 12px 4px 4px',
              border: '1px solid #dee2e6'
            }}
          >
            {user?.nombre ? (
              <>
                <div 
                  className="rounded-circle d-flex align-items-center justify-content-center text-white"
                  style={{ 
                    width: '32px', 
                    height: '32px', 
                    backgroundColor: '#6c63ff',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}
                >
                  {getInitials(user.nombre)}
                </div>
                <span className="text-dark" style={{ fontSize: '14px' }}>
                  {user.nombre}
                </span>
              </>
            ) : (
              <>
                <i className="bi bi-person-circle fs-4 text-secondary"></i>
                <span className="text-muted">Usuario</span>
              </>
            )}
          </Dropdown.Toggle>

          <Dropdown.Menu align="end" className="shadow-sm" style={{ minWidth: '220px' }}>
            {/* Mi Perfil - solo para usuarios que NO son SUPER_ADMIN */}
            {user?.rol !== 'SUPER_ADMIN' && (
              <>
                <Dropdown.Item className="py-2" onClick={() => navigate('/perfil')}>
                  <div className="d-flex align-items-start">
                    <div 
                      className="rounded-circle d-flex align-items-center justify-content-center text-white me-2"
                      style={{ 
                        width: '36px', 
                        height: '36px', 
                        backgroundColor: '#6c63ff',
                        fontSize: '12px',
                        flexShrink: 0
                      }}
                    >
                      {user?.nombre ? getInitials(user.nombre) : '?'}
                    </div>
                    <div>
                      <strong>{user?.nombre || 'Usuario'}</strong>
                      <br />
                      <small className="text-muted">{user?.email || ''}</small>
                    </div>
                  </div>
                </Dropdown.Item>

                <Dropdown.Divider />

                <Dropdown.Item className="py-2" onClick={() => navigate('/perfil')}>
                  <i className="bi bi-person me-2 text-info"></i>
                  Mi Perfil
                </Dropdown.Item>
              </>
            )}

            {user?.rol && (
              <Dropdown.Item className="py-2" disabled>
                <i className="bi bi-shield-check me-2 text-primary"></i>
                {getRolLabel(user.rol)}
              </Dropdown.Item>
            )}

            {user?.rol === 'SUPER_ADMIN' && empresaNombre && (
              <Dropdown.Item className="py-2" disabled>
                <i className="bi bi-building me-2 text-info"></i>
                {empresaNombre}
              </Dropdown.Item>
            )}

            {/* Enlace a Empresas desde el dropdown - solo SUPER_ADMIN */}
            {user?.rol === 'SUPER_ADMIN' && (
              <>
                <Dropdown.Divider />
                <Dropdown.Item className="py-2" onClick={handleCambiarEmpresa}>
                  <i className="bi bi-building me-2 text-primary"></i>
                  Cambiar Empresa
                </Dropdown.Item>
              </>
            )}

            <Dropdown.Divider />

            <Dropdown.Item className="py-2 text-danger" onClick={handleLogout}>
              <i className="bi bi-box-arrow-right me-2 text-danger"></i>
              Cerrar Sesión
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown>
      </div>
    </header>
  );
}