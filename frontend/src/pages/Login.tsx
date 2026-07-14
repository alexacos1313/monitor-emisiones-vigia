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
      
      // Redirigir según rol
      if (userData.rol === 'SUPER_ADMIN') {
        navigate('/empresas');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
      toast.error(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  // Demo rápido (para pruebas sin backend)
  const handleDemoLogin = () => {
    const userData = { 
      id: 1,
      nombre: 'Demo Admin',
      email: 'admin@sistema.es',
      rol: 'SUPER_ADMIN',
      id_empresa: null
    };
    const token = 'demo-token-' + Date.now();
    login(token, userData);
    toast.success('Demo: Acceso como SUPER_ADMIN');
    navigate('/empresas');
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

                <div className="text-center mt-3">
                  <Button variant="link" size="sm" onClick={handleDemoLogin} className="text-muted">
                    <i className="bi bi-play-circle me-1"></i>
                    Demo sin backend
                  </Button>
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