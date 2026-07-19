// frontend/src/pages/Login.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Form, Button, Spinner, Alert } from 'react-bootstrap';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/auth.service';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await authService.login({ email, password });
      
      const userData = {
        id: response.usuario_id,
        nombre: response.nombre,
        email: email,
        rol: response.rol,
        id_empresa: response.id_empresa
      };
      
      login(response.access_token, userData);
      
      toast.success(`Bienvenido, ${userData.nombre}`);
      
      //  REDIRECCIÓN MEJORADA
      if (userData.rol === 'SUPER_ADMIN') {
        // Verificar si tiene empresa seleccionada en localStorage
        const empresaId = localStorage.getItem('empresa_seleccionada_id');
        const empresaNombre = localStorage.getItem('empresa_seleccionada');
        
        console.log(' SUPER_ADMIN - Verificando empresa guardada:');
        console.log('  - empresa_seleccionada_id:', empresaId);
        console.log('  - empresa_seleccionada:', empresaNombre);
        
        if (empresaId && empresaNombre) {
          //  Si tiene empresa guardada, ir al dashboard
          console.log(' SUPER_ADMIN con empresa guardada → Dashboard');
          navigate('/dashboard');
        } else {
          //  Si no tiene empresa, ir a seleccionar
          console.log(' SUPER_ADMIN sin empresa → Empresas');
          navigate('/empresas');
        }
      } else {
        // Para otros roles, ir al dashboard
        console.log(' Usuario normal → Dashboard');
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
      toast.error(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  //  Demo para SUPER_ADMIN (con empresa guardada)
  const handleDemoLoginSuperAdmin = () => {
    const userData = { 
      id: 1,
      nombre: 'Super Admin',
      email: 'admin@sistema.es',
      rol: 'SUPER_ADMIN',
      id_empresa: null
    };
    const token = 'demo-token-' + Date.now();
    login(token, userData);
    toast.success('Demo: Acceso como SUPER_ADMIN');
    
    //  Guardar una empresa de ejemplo para que redirija al dashboard
    const empresaDemo = {
      id: 1,
      nombre: 'Empresa Demo S.A.',
      cif: 'B-12345678',
      activo: 1
    };
    localStorage.setItem('empresa_seleccionada_id', String(empresaDemo.id));
    localStorage.setItem('empresa_seleccionada', JSON.stringify(empresaDemo));
    
    navigate('/dashboard');
  };

  //  Demo para SUPER_ADMIN sin empresa
  const handleDemoLoginSinEmpresa = () => {
    // Limpiar empresa seleccionada
    localStorage.removeItem('empresa_seleccionada_id');
    localStorage.removeItem('empresa_seleccionada');
    
    const userData = { 
      id: 1,
      nombre: 'Super Admin',
      email: 'admin@sistema.es',
      rol: 'SUPER_ADMIN',
      id_empresa: null
    };
    const token = 'demo-token-' + Date.now();
    login(token, userData);
    toast.success('Demo: SUPER_ADMIN sin empresa');
    navigate('/empresas');
  };

  //  Demo para EMPRESA_ADMIN
  const handleDemoEmpresaAdmin = () => {
    const userData = { 
      id: 2,
      nombre: 'Empresa Admin',
      email: 'empresa@demo.com',
      rol: 'EMPRESA_ADMIN',
      id_empresa: 1
    };
    const token = 'demo-token-' + Date.now();
    login(token, userData);
    toast.success('Demo: Acceso como EMPRESA_ADMIN');
    navigate('/dashboard');
  };

  return (
    <div className="vh-100 d-flex align-items-center justify-content-center" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <Container>
        <Row className="justify-content-center">
          <Col md={5}>
            <Card className="shadow-lg border-0 rounded-4">
              <Card.Body className="p-5">
                <div className="text-center mb-4">
                  <div className="bg-primary rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3" style={{ width: 60, height: 60 }}>
                    <i className="bi bi-shield-check fs-1 text-white"></i>
                  </div>
                  <h2 className="fw-bold">VIGIA</h2>
                  <p className="text-muted">Monitor de Emisiones Industriales</p>
                </div>

                {error && <Alert variant="danger">{error}</Alert>}

                <Form onSubmit={handleSubmit}>
                  <Form.Group className="mb-3">
                    <Form.Label>Email</Form.Label>
                    <Form.Control
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@sistema.es"
                      required
                    />
                  </Form.Group>

                  <Form.Group className="mb-4">
                    <Form.Label>Contraseña</Form.Label>
                    <Form.Control
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••"
                      required
                    />
                  </Form.Group>

                  <Button type="submit" variant="primary" size="lg" className="w-100" disabled={loading}>
                    {loading ? (
                      <>
                        <Spinner size="sm" className="me-2" />
                        Ingresando...
                      </>
                    ) : (
                      'Iniciar Sesión'
                    )}
                  </Button>
                </Form>

                {/*  Demos Rápidos */}
                <div className="mt-3">
                  <div className="d-flex flex-column gap-2">
                    <Button 
                      variant="outline-primary" 
                      size="sm" 
                      onClick={handleDemoLoginSuperAdmin}
                      className="w-100"
                    >
                      <i className="bi bi-star-fill me-1 text-warning"></i>
                      Demo SUPER_ADMIN (con empresa)
                    </Button>
                    <Button 
                      variant="outline-secondary" 
                      size="sm" 
                      onClick={handleDemoLoginSinEmpresa}
                      className="w-100"
                    >
                      <i className="bi bi-building me-1"></i>
                      Demo SUPER_ADMIN (sin empresa)
                    </Button>
                    <Button 
                      variant="outline-info" 
                      size="sm" 
                      onClick={handleDemoEmpresaAdmin}
                      className="w-100"
                    >
                      <i className="bi bi-building me-1"></i>
                      Demo EMPRESA_ADMIN
                    </Button>
                  </div>
                </div>

                <div className="text-center mt-3">
                  <small className="text-muted">
                    Credenciales: admin@sistema.es / admin123
                  </small>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
}