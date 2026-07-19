// frontend/src/pages/AlarmasPage.tsx
import { useState, useEffect } from 'react';
import { 
  Button, Badge, Spinner, Row, Col, Card, 
  Form, Alert 
} from 'react-bootstrap';
import PaginatedTable from '../components/ui/PaginatedTable';
import { alarmaService, Alarma, EstadisticasAlarmas } from '../services/alarma.service';
import { websocketService } from '../services/websocket.service';
import { showSuccess, showError, showConfirm, showWarning } from '../services/toast.service';
import { useAuth } from '../context/AuthContext';
import Breadcrumbs from '../components/ui/Breadcrumbs';

export default function AlarmasPage() {
  const [alarmas, setAlarmas] = useState<Alarma[]>([]);
  const [estadisticas, setEstadisticas] = useState<EstadisticasAlarmas | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ tipo: 'TODAS', estado: 'TODAS' });
  const [wsConnected, setWsConnected] = useState(false);
  const [newAlarmaCount, setNewAlarmaCount] = useState(0);
  
  const { user } = useAuth();
  const esSuperAdmin = user?.rol === 'SUPER_ADMIN';
  const esEmpresaAdmin = user?.rol === 'EMPRESA_ADMIN';
  const puedeConfirmar = esSuperAdmin || esEmpresaAdmin;
  const puedeEliminar = esSuperAdmin;

  useEffect(() => {
    cargarDatos();

    const token = localStorage.getItem('token');
    if (token) {
      websocketService.connect(token);
      setWsConnected(true);
      
      const unsubscribe = websocketService.onAlarma((nuevaAlarma) => {
        console.log('Nueva alarma recibida:', nuevaAlarma);
        setAlarmas(prev => [nuevaAlarma, ...prev]);
        setNewAlarmaCount(prev => prev + 1);
        actualizarEstadisticas(nuevaAlarma);
        showWarning(`Nueva alarma: ${nuevaAlarma.tipo} - ${nuevaAlarma.contaminante}`);
      });
      
      return () => {
        unsubscribe();
        websocketService.disconnect();
      };
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [filter]);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const [alarmasData, statsData] = await Promise.all([
        alarmaService.getAlarmas(),
        alarmaService.getEstadisticas()
      ]);
      
      let filtradas = alarmasData;
      if (filter.tipo !== 'TODAS') {
        filtradas = filtradas.filter(a => a.tipo === filter.tipo);
      }
      if (filter.estado === 'PENDIENTES') {
        filtradas = filtradas.filter(a => !a.confirmada_por);
      } else if (filter.estado === 'CONFIRMADAS') {
        filtradas = filtradas.filter(a => a.confirmada_por);
      }
      
      setAlarmas(filtradas);
      setEstadisticas(statsData);
    } catch (error) {
      showError('Error cargando datos');
    } finally {
      setLoading(false);
    }
  };

  const actualizarEstadisticas = (nuevaAlarma: Alarma) => {
    setEstadisticas(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        total: prev.total + 1,
        pendientes: prev.pendientes + 1,
        por_tipo: prev.por_tipo.map(t => 
          t.tipo === nuevaAlarma.tipo ? { ...t, total: t.total + 1 } : t
        ),
        por_contaminante: prev.por_contaminante.map(c => 
          c.contaminante === nuevaAlarma.contaminante ? { ...c, total: c.total + 1 } : c
        )
      };
    });
  };

  // Confirmar alarma individual
  const handleConfirmar = async (alarma: Alarma) => {
    if (!puedeConfirmar) {
      showError('No tienes permisos para confirmar alarmas');
      return;
    }

    const confirmado = await showConfirm(
      `¿Confirmar alarma de ${alarma.contaminante}?`,
      `Tipo: ${alarma.tipo} | Valor: ${alarma.valor}`
    );
    
    if (!confirmado) return;

    try {
      await alarmaService.confirmarAlarma(alarma.id);
      showSuccess('Alarma confirmada');
      cargarDatos();
    } catch (error) {
      showError('Error al confirmar');
    }
  };

  // Confirmar todas las alarmas pendientes
  const handleConfirmarTodas = async () => {
    if (!puedeConfirmar) {
      showError('No tienes permisos para confirmar alarmas');
      return;
    }

    // Obtener alarmas pendientes (no confirmadas)
    const alarmasPendientes = alarmas.filter(a => !a.confirmada_por);
    
    if (alarmasPendientes.length === 0) {
      showWarning('No hay alarmas pendientes para confirmar');
      return;
    }

    const confirmado = await showConfirm(
      `¿Confirmar TODAS las alarmas pendientes (${alarmasPendientes.length})?`,
      'Esta acción confirmará todas las alarmas pendientes del sistema'
    );
    
    if (!confirmado) return;

    try {
      // Confirmar una por una
      let confirmadas = 0;
      for (const alarma of alarmasPendientes) {
        try {
          await alarmaService.confirmarAlarma(alarma.id);
          confirmadas++;
        } catch (error) {
          console.error('Error confirmando alarma:', alarma.id, error);
        }
      }
      
      showSuccess(`Se confirmaron ${confirmadas} de ${alarmasPendientes.length} alarmas pendientes`);
      cargarDatos();
    } catch (error) {
      showError('Error al confirmar todas las alarmas');
    }
  };

  // Eliminar alarma (solo SUPER_ADMIN)
  const handleDelete = async (alarma: Alarma) => {
    if (!puedeEliminar) {
      showError('Solo SUPER_ADMIN puede eliminar alarmas');
      return;
    }

    const confirmado = await showConfirm(
      `¿Eliminar alarma de ${alarma.contaminante}?`,
      'Esta acción eliminará permanentemente la alarma'
    );
    
    if (!confirmado) return;

    try {
      await alarmaService.deleteAlarma(alarma.id);
      showSuccess('Alarma eliminada');
      cargarDatos();
    } catch (error) {
      showError('Error al eliminar');
    }
  };

  // Eliminar todas las alarmas (solo SUPER_ADMIN)
  const handleDeleteAll = async () => {
    if (!puedeEliminar) {
      showError('Solo SUPER_ADMIN puede eliminar todas las alarmas');
      return;
    }

    const confirmado = await showConfirm(
      '¿Eliminar TODAS las alarmas?',
      'Esta acción eliminará permanentemente todas las alarmas del sistema'
    );
    
    if (!confirmado) return;

    try {
      await alarmaService.deleteAllAlarmas();
      showSuccess('Todas las alarmas eliminadas');
      cargarDatos();
    } catch (error) {
      showError('Error al eliminar todas las alarmas');
    }
  };

  const handleRefresh = () => {
    cargarDatos();
    setNewAlarmaCount(0);
    showSuccess('Datos actualizados');
  };

  const getTipoBadge = (tipo: string) => {
    return tipo === 'CRITICO' 
      ? <Badge bg="danger"><i className="bi bi-exclamation-triangle-fill me-1"></i>CRÍTICO</Badge>
      : <Badge bg="warning"><i className="bi bi-bell-fill me-1"></i>ALERTA</Badge>;
  };

  const getContaminanteIcon = (contaminante: string) => {
    const icons: any = {
      'CO₂': 'bi-cloud-upload',
      'NOx': 'bi-exclamation-triangle',
      'SO₂': 'bi-droplet',
      'CO': 'bi-cloud',
      'NO': 'bi-cloud-haze',
      'NO2': 'bi-cloud-haze2',
      'Partículas': 'bi-dust'
    };
    return icons[contaminante] || 'bi-bar-chart';
  };

  // Columnas para la tabla
  const columns = [
    { 
      key: 'timestamp', 
      label: 'Fecha/Hora',
      sortable: true,
      render: (value: string) => new Date(value).toLocaleString()
    },
    { key: 'sensor_nombre', label: 'Sensor', sortable: true },
    { 
      key: 'tipo', 
      label: 'Tipo',
      render: (value: string) => getTipoBadge(value)
    },
    { 
      key: 'contaminante', 
      label: 'Contaminante',
      render: (value: string) => (
        <>
          <i className={`${getContaminanteIcon(value)} me-1`}></i>
          {value}
        </>
      )
    },
    { 
      key: 'valor', 
      label: 'Valor / Umbral',
      render: (_: any, item: Alarma) => (
        <span>
          <span className="fw-bold text-danger">{item.valor}</span>
          <span className="text-muted"> / {item.umbral}</span>
        </span>
      )
    },
    { key: 'mensaje', label: 'Mensaje' },
    { 
      key: 'confirmada_por', 
      label: 'Estado',
      render: (value: number, item: Alarma) => value ? (
        <span className="text-success">
          <i className="bi bi-check-circle-fill me-1"></i>
          Confirmada
        </span>
      ) : (
        <span className="text-warning">
          <i className="bi bi-clock-history me-1"></i>Pendiente
        </span>
      )
    },
  ];

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '400px' }}>
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  // Calcular alarmas pendientes
  const alarmasPendientes = alarmas.filter(a => !a.confirmada_por);

  return (
    <>
      <div className="mb-4">
        <Breadcrumbs />
        <div className="d-flex justify-content-between align-items-center flex-wrap">
          <div>
            <h3 className="fw-bold mb-1">
              <i className="bi bi-bell-fill me-2 text-warning"></i>
              Sistema de Alarmas
            </h3>
            <p className="text-muted">Monitorización y gestión de alertas en tiempo real</p>
          </div>

          <div className="text-end">
            <Badge bg={wsConnected ? 'success' : 'secondary'} className="me-2">
              <i className={`bi ${wsConnected ? 'bi-wifi' : 'bi-wifi-off'} me-1`}></i>
              {wsConnected ? 'Tiempo real' : 'Sin conexión'}
            </Badge>
            {newAlarmaCount > 0 && (
              <Button variant="danger" size="sm" className="me-2" onClick={handleRefresh}>
                <i className="bi bi-bell-fill me-1"></i>
                {newAlarmaCount} nuevas
              </Button>
            )}
            {/* Botón Confirmar todas - solo para administradores */}
            {puedeConfirmar && alarmasPendientes.length > 0 && (
              <Button variant="success" size="sm" className="me-2" onClick={handleConfirmarTodas}>
                <i className="bi bi-check-all me-1"></i>
                Confirmar todas ({alarmasPendientes.length})
              </Button>
            )}
            {/* Botón Eliminar todas - solo SUPER_ADMIN */}
            {puedeEliminar && (
              <Button variant="outline-danger" size="sm" onClick={handleDeleteAll}>
                <i className="bi bi-trash me-1"></i>
                Eliminar todas
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Estadisticas */}
      {estadisticas && (
        <Row className="g-4 mb-4">
          <Col md={3}>
            <Card className="border-0 shadow-sm bg-primary text-white">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <p className="mb-1 small opacity-75">Total Alarmas</p>
                    <h3 className="mb-0 fw-bold">{estadisticas.total}</h3>
                  </div>
                  <i className="bi bi-bell fs-1 opacity-50"></i>
                </div>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="border-0 shadow-sm bg-warning text-white">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <p className="mb-1 small opacity-75">Pendientes</p>
                    <h3 className="mb-0 fw-bold">{estadisticas.pendientes}</h3>
                  </div>
                  <i className="bi bi-clock-history fs-1 opacity-50"></i>
                </div>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="border-0 shadow-sm bg-success text-white">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <p className="mb-1 small opacity-75">Confirmadas</p>
                    <h3 className="mb-0 fw-bold">{estadisticas.confirmadas}</h3>
                  </div>
                  <i className="bi bi-check-circle fs-1 opacity-50"></i>
                </div>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="border-0 shadow-sm bg-danger text-white">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <p className="mb-1 small opacity-75">Críticas</p>
                    <h3 className="mb-0 fw-bold">
                      {estadisticas.por_tipo.find(t => t.tipo === 'CRITICO')?.total || 0}
                    </h3>
                  </div>
                  <i className="bi bi-exclamation-triangle fs-1 opacity-50"></i>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* Indicador de WebSocket simulado */}
      {websocketService.isMockMode() && (
        <Alert variant="info" className="mb-4">
          <i className="bi bi-info-circle-fill me-2"></i>
          <strong>Modo Demo:</strong> Las alarmas se generan automáticamente cada 30 segundos.
        </Alert>
      )}

      {/* Filtros */}
      <div className="bg-white rounded border mb-4 p-3">
        <Row className="align-items-center">
          <Col md={4}>
            <Form.Group>
              <Form.Label className="small text-muted mb-1">Tipo de Alarma</Form.Label>
              <Form.Select 
                value={filter.tipo} 
                onChange={(e) => setFilter({ ...filter, tipo: e.target.value })}
              >
                <option value="TODAS">Todas</option>
                <option value="ALERTA">Alertas</option>
                <option value="CRITICO">Críticas</option>
              </Form.Select>
            </Form.Group>
          </Col>
          <Col md={4}>
            <Form.Group>
              <Form.Label className="small text-muted mb-1">Estado</Form.Label>
              <Form.Select 
                value={filter.estado} 
                onChange={(e) => setFilter({ ...filter, estado: e.target.value })}
              >
                <option value="TODAS">Todas</option>
                <option value="PENDIENTES">Pendientes</option>
                <option value="CONFIRMADAS">Confirmadas</option>
              </Form.Select>
            </Form.Group>
          </Col>
          <Col md={4}>
            <Form.Group>
              <Form.Label className="small text-muted mb-1">&nbsp;</Form.Label>
              <Button variant="outline-secondary" onClick={handleRefresh} className="w-100">
                <i className="bi bi-arrow-repeat me-1"></i> Refrescar
              </Button>
            </Form.Group>
          </Col>
        </Row>
      </div>

      {/* Tabla con PaginatedTable */}
      <PaginatedTable
        title="Listado de Alarmas"
        columns={columns}
        data={alarmas}
        onEdit={puedeConfirmar ? handleConfirmar : undefined}
        onDelete={puedeEliminar ? handleDelete : undefined}
        addButtonText=""
        pageSize={10}
        searchable
        searchPlaceholder="Buscar por sensor, contaminante..."
        showActions={puedeConfirmar || puedeEliminar}
      />
    </>
  );
}