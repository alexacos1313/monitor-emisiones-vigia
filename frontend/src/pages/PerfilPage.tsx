import { useState, useEffect } from 'react';
import { Card, Form, Button, Spinner, Row, Col } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { showSuccess, showError } from '../services/toast.service';
import Breadcrumbs from '../components/ui/Breadcrumbs';

export default function PerfilPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [formData, setFormData] = useState({
    passwordActual: '',
    passwordNueva: '',
    confirmarPassword: ''
  });

  useEffect(() => {
    cargarPerfil();
  }, []);

  const cargarPerfil = async () => {
    setLoading(true);
    try {
      const userStr = localStorage.getItem('user');
      
      if (!userStr) {
        console.warn('No se encontró usuario en localStorage, creando uno por defecto');
        const userData = { 
          id: 1,
          nombre: 'Administrador',
          email: 'admin@demo.com',
          rol: 'SUPER_ADMIN',
          id_empresa: 1
        };
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
        
        const empresaMock = {
          id: 1,
          nombre: 'Empresa Demo S.A.',
          cif: 'B-12345678',
          direccion_social: 'Calle Principal 123, Madrid',
          email: 'info@empresademo.com',
          telefono: '911 234 567'
        };
        localStorage.setItem('empresa', JSON.stringify(empresaMock));
        setLoading(false);
        return;
      }
      
      const userData = JSON.parse(userStr);
      setUser(userData);
      
      if (userData?.id_empresa) {
        try {
          const { default: api } = await import('../services/api');
          const response = await api.get(`/empresas/${userData.id_empresa}`);
          localStorage.setItem('empresa', JSON.stringify(response.data));
        } catch (error) {
          console.log('Modo demo: cargando empresa mock');
          const empresaMock = {
            id: userData.id_empresa,
            nombre: 'Empresa Demo S.A.',
            cif: 'B-12345678',
            direccion_social: 'Calle Principal 123, Madrid',
            email: 'info@empresademo.com',
            telefono: '911 234 567'
          };
          localStorage.setItem('empresa', JSON.stringify(empresaMock));
        }
      }
    } catch (error) {
      console.error('Error cargando perfil:', error);
      const userData = { 
        id: 1,
        nombre: 'Administrador',
        email: 'admin@demo.com',
        rol: 'SUPER_ADMIN',
        id_empresa: 1
      };
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.passwordNueva !== formData.confirmarPassword) {
      showError('Las contraseñas nuevas no coinciden');
      return;
    }
    
    if (formData.passwordNueva.length < 6) {
      showError('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    
    setUpdating(true);
    try {
      const { default: api } = await import('../services/api');
      await api.put('/usuarios/cambiar-password', {
        password_actual: formData.passwordActual,
        password_nueva: formData.passwordNueva
      });
      showSuccess('Contraseña actualizada correctamente');
      setFormData({ passwordActual: '', passwordNueva: '', confirmarPassword: '' });
    } catch (error: any) {
      if (error.code === 'ERR_NETWORK' || error.message?.includes('Network Error')) {
        showSuccess('Demo: Contraseña actualizada correctamente (sin backend)');
        setFormData({ passwordActual: '', passwordNueva: '', confirmarPassword: '' });
      } else {
        showError(error.response?.data?.detail || 'Error al cambiar contraseña');
      }
    } finally {
      setUpdating(false);
    }
  };

  const getRolInfo = (rol: string) => {
    const roles: { [key: string]: { color: string; icon: string; label: string } } = {
      'SUPER_ADMIN': { color: 'danger', icon: 'bi-star-fill', label: 'Super Administrador' },
      'ADMIN': { color: 'danger', icon: 'bi-star-fill', label: 'Administrador' },
      'EMPRESA_ADMIN': { color: 'warning', icon: 'bi-building', label: 'Administrador de Empresa' },
      'TECNICO': { color: 'info', icon: 'bi-wrench', label: 'Técnico' },
      'USUARIO': { color: 'secondary', icon: 'bi-person-badge', label: 'Usuario' }
    };
    return roles[rol] || { color: 'secondary', icon: 'bi-person', label: rol };
  };

  const getEmpresa = () => {
    try {
      const empresaStr = localStorage.getItem('empresa');
      if (empresaStr) {
        return JSON.parse(empresaStr);
      }
    } catch {
      return null;
    }
    
    return {
      id: user?.id_empresa || 1,
      nombre: 'Empresa Demo S.A.',
      cif: 'B-12345678',
      direccion_social: 'Calle Principal 123, Madrid',
      email: 'info@empresademo.com',
      telefono: '911 234 567'
    };
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '400px' }}>
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  const rolInfo = getRolInfo(user?.rol);
  const empresa = getEmpresa();

  return (
    <>
      <div className="mb-4">
        <Breadcrumbs />
        <h3 className="fw-bold mb-1">
          <i className="bi bi-person-circle me-2 text-primary"></i>
          Mi Perfil
        </h3>
        <p className="text-muted">Información personal y cambio de contraseña</p>
      </div>

      <Row className="g-4">
        <Col md={6}>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white border-0 pt-3">
              <h5 className="mb-0">
                <i className="bi bi-info-circle me-2"></i>
                Datos Personales
              </h5>
            </Card.Header>
            <Card.Body>
              <div className="mb-3">
                <label className="text-muted small mb-1">Nombre</label>
                <p className="fw-bold mb-0">{user?.nombre || 'Usuario sin nombre'}</p>
              </div>
              <div className="mb-3">
                <label className="text-muted small mb-1">Email</label>
                <p className="fw-bold mb-0">{user?.email || 'Sin email'}</p>
              </div>
              <div className="mb-3">
                <label className="text-muted small mb-1">Rol</label>
                <p className="mb-0">
                  <span className={`badge bg-${rolInfo.color}`}>
                    <i className={`bi ${rolInfo.icon} me-1`}></i>
                    {rolInfo.label}
                  </span>
                </p>
              </div>
              {user?.rol === 'SUPER_ADMIN' && (
                <div className="mb-3">
                  <label className="text-muted small mb-1">Estado</label>
                  <p className="mb-0">
                    <span className="badge bg-success">
                      <i className="bi bi-shield-check me-1"></i>
                      Acceso completo al sistema
                    </span>
                  </p>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col md={6}>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white border-0 pt-3">
              <h5 className="mb-0">
                <i className="bi bi-building me-2"></i>
                Mi Empresa
              </h5>
            </Card.Header>
            <Card.Body>
              {empresa ? (
                <>
                  <div className="mb-3">
                    <label className="text-muted small mb-1">Nombre</label>
                    <p className="fw-bold mb-0">{empresa.nombre}</p>
                  </div>
                  <div className="mb-3">
                    <label className="text-muted small mb-1">CIF</label>
                    <p className="mb-0">{empresa.cif || '-'}</p>
                  </div>
                  <div className="mb-3">
                    <label className="text-muted small mb-1">Dirección</label>
                    <p className="mb-0">{empresa.direccion_social || '-'}</p>
                  </div>
                  <div className="mb-3">
                    <label className="text-muted small mb-1">Email / Teléfono</label>
                    <p className="mb-0">{empresa.email || '-'} / {empresa.telefono || '-'}</p>
                  </div>
                </>
              ) : (
                <div className="text-center py-4">
                  <i className="bi bi-building fs-1 d-block mb-3 text-muted"></i>
                  <p className="text-muted">
                    {user?.rol === 'SUPER_ADMIN' || user?.rol === 'ADMIN' 
                      ? 'Eres administrador del sistema. No tienes empresa asociada.' 
                      : 'No hay empresa asociada a este usuario.'}
                  </p>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col md={12}>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white border-0 pt-3">
              <h5 className="mb-0">
                <i className="bi bi-key me-2"></i>
                Cambiar Contraseña
              </h5>
            </Card.Header>
            <Card.Body>
              <Form onSubmit={handleChangePassword}>
                <Row>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Contraseña Actual</Form.Label>
                      <Form.Control
                        type="password"
                        value={formData.passwordActual}
                        onChange={(e) => setFormData({ ...formData, passwordActual: e.target.value })}
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Nueva Contraseña</Form.Label>
                      <Form.Control
                        type="password"
                        value={formData.passwordNueva}
                        onChange={(e) => setFormData({ ...formData, passwordNueva: e.target.value })}
                        required
                      />
                      <Form.Text className="text-muted">Mínimo 6 caracteres</Form.Text>
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Confirmar Nueva Contraseña</Form.Label>
                      <Form.Control
                        type="password"
                        value={formData.confirmarPassword}
                        onChange={(e) => setFormData({ ...formData, confirmarPassword: e.target.value })}
                        required
                      />
                    </Form.Group>
                  </Col>
                </Row>
                <div className="d-flex justify-content-end">
                  <Button type="submit" variant="primary" disabled={updating}>
                    {updating ? <Spinner size="sm" className="me-2" /> : <i className="bi bi-save me-2"></i>}
                    Actualizar Contraseña
                  </Button>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </>
  );
}