// frontend/src/pages/UmbralesNormativosPage.tsx
import { useState, useEffect } from 'react';
import {
  Card, Badge, Spinner, Button,
  Modal, Form, Row, Col
} from 'react-bootstrap';
import PaginatedTable from '../components/ui/PaginatedTable';
import { umbralNormativoService, UmbralNormativo } from '../services/umbralNormativo.service';
import { zonaNormativaService, ZonaNormativa } from '../services/zonaNormativa.service';
import { showError, showSuccess, showConfirm } from '../services/toast.service';
import { useAuth } from '../context/AuthContext';
import Breadcrumbs from '../components/ui/Breadcrumbs';

export default function UmbralesNormativosPage() {
  const [umbrales, setUmbrales] = useState<UmbralNormativo[]>([]);
  const [zonas, setZonas] = useState<ZonaNormativa[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  
  const [showModal, setShowModal] = useState(false);
  const [editingUmbral, setEditingUmbral] = useState<UmbralNormativo | null>(null);
  
  const [formData, setFormData] = useState({
    zona_normativa_id: '',
    contaminante: '',
    limite_alerta: '',
    limite_critico: '',
    unidad: 'mg/m³',
    referencia_legal: '',
    fecha_aprobacion: ''
  });

  //  SOLO SUPER_ADMIN puede gestionar umbrales (crear, editar, eliminar)
  const puedeGestionar = user?.rol === 'SUPER_ADMIN';

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const [umbralesData, zonasData] = await Promise.all([
        umbralNormativoService.getUmbralesNormativos(),
        zonaNormativaService.getZonasNormativas()
      ]);
      setUmbrales(umbralesData);
      setZonas(zonasData);
    } catch (error) {
      showError('Error cargando datos');
    } finally {
      setLoading(false);
    }
  };

  const abrirReferenciaLegal = (referencia: string) => {
    const url = `https://www.google.com/search?q=${encodeURIComponent(referencia + ' normativa emisiones')}`;
    window.open(url, '_blank');
  };

  const getZonaNombre = (zonaId: number) => {
    const zona = zonas.find(z => z.id === zonaId);
    return zona ? zona.nombre : `Zona ${zonaId}`;
  };

  //  Función para eliminar umbral (solo SUPER_ADMIN)
  const handleDelete = async (umbral: UmbralNormativo) => {
    if (!puedeGestionar) {
      showError('No tienes permisos para eliminar umbrales normativos');
      return;
    }

    const confirmado = await showConfirm(
      `¿Estás seguro de eliminar el umbral para ${umbral.contaminante}?`,
      'Esta acción no se puede deshacer'
    );

    if (!confirmado) return;

    try {
      await umbralNormativoService.deleteUmbral(umbral.id);
      showSuccess(`Umbral de ${umbral.contaminante} eliminado correctamente`);
      cargarDatos();
    } catch (error) {
      console.error('Error:', error);
      showError('Error al eliminar el umbral');
    }
  };

  const handleOpenModal = (umbral?: UmbralNormativo) => {
    if (!puedeGestionar) {
      showError('No tienes permisos para gestionar umbrales normativos');
      return;
    }

    if (umbral) {
      setEditingUmbral(umbral);
      setFormData({
        zona_normativa_id: umbral.zona_normativa_id ? String(umbral.zona_normativa_id) : '',
        contaminante: umbral.contaminante || '',
        limite_alerta: umbral.limite_alerta ? String(umbral.limite_alerta) : '',
        limite_critico: umbral.limite_critico ? String(umbral.limite_critico) : '',
        unidad: umbral.unidad || 'mg/m³',
        referencia_legal: umbral.referencia_legal || '',
        fecha_aprobacion: umbral.fecha_aprobacion || ''
      });
    } else {
      setEditingUmbral(null);
      setFormData({
        zona_normativa_id: '',
        contaminante: '',
        limite_alerta: '',
        limite_critico: '',
        unidad: 'mg/m³',
        referencia_legal: '',
        fecha_aprobacion: ''
      });
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.contaminante || !formData.limite_alerta || !formData.limite_critico) {
      showError('Contaminante y límites son obligatorios');
      return;
    }

    if (!formData.zona_normativa_id) {
      showError('Debes seleccionar una zona normativa');
      return;
    }

    try {
      const data = {
        zona_normativa_id: parseInt(formData.zona_normativa_id),
        contaminante: formData.contaminante,
        limite_alerta: parseFloat(formData.limite_alerta),
        limite_critico: parseFloat(formData.limite_critico),
        unidad: formData.unidad,
        referencia_legal: formData.referencia_legal || 'Normativa vigente',
        fecha_aprobacion: formData.fecha_aprobacion || new Date().toISOString().split('T')[0]
      };

      if (editingUmbral) {
        await umbralNormativoService.updateUmbral(editingUmbral.id, data);
        showSuccess('Umbral actualizado');
      } else {
        await umbralNormativoService.createUmbral(data);
        showSuccess('Umbral creado');
      }
      setShowModal(false);
      cargarDatos();
    } catch (error) {
      console.error('Error:', error);
      showError('Error al guardar');
    }
  };

  const columns = [
    { key: 'id', label: 'ID', width: '60px', sortable: true },
    { 
      key: 'zona_normativa_id', 
      label: 'Zona Normativa', 
      sortable: true,
      render: (value: number) => getZonaNombre(value)
    },
    { key: 'contaminante', label: 'Contaminante', sortable: true },
    { 
      key: 'limite_alerta', 
      label: 'Límite Alerta',
      render: (value: number) => <span className="text-warning fw-bold">{value}</span>
    },
    { 
      key: 'limite_critico', 
      label: 'Límite Crítico',
      render: (value: number) => <span className="text-danger fw-bold">{value}</span>
    },
    { key: 'unidad', label: 'Unidad' },
    { 
      key: 'fecha_aprobacion', 
      label: 'Fecha Aprobación',
      render: (value: string) => new Date(value).toLocaleDateString()
    },
    { 
      key: 'referencia_legal', 
      label: 'Referencia Legal',
      render: (value: string) => (
        <Button 
          size="sm" 
          variant="link" 
          className="p-0 text-primary"
          onClick={() => abrirReferenciaLegal(value)}
          title="Buscar referencia legal"
        >
          <i className="bi bi-link-45deg me-1"></i>
          {value}
          <i className="bi bi-box-arrow-up-right ms-1 small"></i>
        </Button>
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

  return (
    <>
      <div className="mb-4">
        <Breadcrumbs />
        <h3 className="fw-bold mb-1 mt-2">
          <i className="bi bi-book me-2 text-primary"></i>
          Umbrales Normativos
        </h3>
        <p className="text-muted">
          Límites legales de emisiones por contaminante
          {puedeGestionar && (
            <span className="ms-2 text-success">
              <i className="bi bi-shield-lock me-1"></i>
              SUPER_ADMIN - Gestión completa (Crear/Editar/Eliminar)
            </span>
          )}
          {!puedeGestionar && (
            <span className="ms-2 text-secondary">
              <i className="bi bi-eye me-1"></i>
              Solo lectura
            </span>
          )}
        </p>
      </div>

      <Card className="border-0 shadow-sm">
        <PaginatedTable
          title="Referencias Normativas"
          columns={columns}
          data={umbrales}
          onEdit={puedeGestionar ? handleOpenModal : undefined}
          onDelete={puedeGestionar ? handleDelete : undefined}  
          addButtonText={puedeGestionar ? "Nuevo Umbral" : undefined}
          onAdd={puedeGestionar ? () => handleOpenModal() : undefined}
          pageSize={10}
          searchable
          searchPlaceholder="Buscar por contaminante, zona, referencia legal..."
          showActions={puedeGestionar}  
        />
      </Card>

      <Card className="border-0 shadow-sm mt-4">
        <Card.Body>
          <div className="d-flex align-items-center gap-3 flex-wrap">
            <div>
              <Badge bg="warning" className="me-2">
                <i className="bi bi-exclamation-triangle me-1"></i>Alerta
              </Badge>
              <span className="small text-muted">Superación del límite de alerta</span>
            </div>
            <div>
              <Badge bg="danger" className="me-2">
                <i className="bi bi-exclamation-octagon me-1"></i>Crítico
              </Badge>
              <span className="small text-muted">Superación del límite crítico</span>
            </div>
            <div>
              <Badge bg="info" className="me-2">
                <i className="bi bi-link-45deg me-1"></i>Enlace
              </Badge>
              <span className="small text-muted">Haz clic en la referencia legal para buscar</span>
            </div>
            {puedeGestionar && (
              <div>
                <Badge bg="primary" className="me-2">
                  <i className="bi bi-shield-lock me-1"></i>Super Admin
                </Badge>
                <span className="small text-muted">Puedes crear, editar y eliminar umbrales</span>
              </div>
            )}
            {!puedeGestionar && (
              <div>
                <Badge bg="secondary" className="me-2">
                  <i className="bi bi-eye me-1"></i>Lectura
                </Badge>
                <span className="small text-muted">Solo puedes visualizar los umbrales</span>
              </div>
            )}
          </div>
        </Card.Body>
      </Card>

      {/* Modal Crear/Editar - SOLO SUPER_ADMIN */}
      {puedeGestionar && (
        <Modal show={showModal} onHide={() => setShowModal(false)} centered>
          <Modal.Header closeButton>
            <Modal.Title>
              <i className="bi bi-book me-2"></i>
              {editingUmbral ? 'Editar Umbral' : 'Nuevo Umbral'}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form>
              <Form.Group className="mb-3">
                <Form.Label>Contaminante *</Form.Label>
                <Form.Control
                  type="text"
                  value={formData.contaminante}
                  onChange={(e) => setFormData({ ...formData, contaminante: e.target.value })}
                  placeholder="Ej: CO, NO, NO2, NOX"
                />
              </Form.Group>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Límite Alerta *</Form.Label>
                    <Form.Control
                      type="number"
                      value={formData.limite_alerta}
                      onChange={(e) => setFormData({ ...formData, limite_alerta: e.target.value })}
                      placeholder="Valor de alerta"
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Límite Crítico *</Form.Label>
                    <Form.Control
                      type="number"
                      value={formData.limite_critico}
                      onChange={(e) => setFormData({ ...formData, limite_critico: e.target.value })}
                      placeholder="Valor crítico"
                    />
                  </Form.Group>
                </Col>
              </Row>
              <Form.Group className="mb-3">
                <Form.Label>Unidad</Form.Label>
                <Form.Select
                  value={formData.unidad}
                  onChange={(e) => setFormData({ ...formData, unidad: e.target.value })}
                >
                  <option value="mg/m³">mg/m³</option>
                  <option value="µg/m³">µg/m³</option>
                  <option value="ppm">ppm</option>
                </Form.Select>
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Referencia Legal</Form.Label>
                <Form.Control
                  type="text"
                  value={formData.referencia_legal}
                  onChange={(e) => setFormData({ ...formData, referencia_legal: e.target.value })}
                  placeholder="Ej: Real Decreto 102/2011"
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Fecha Aprobación</Form.Label>
                <Form.Control
                  type="date"
                  value={formData.fecha_aprobacion}
                  onChange={(e) => setFormData({ ...formData, fecha_aprobacion: e.target.value })}
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Zona Normativa *</Form.Label>
                <Form.Select
                  value={formData.zona_normativa_id}
                  onChange={(e) => setFormData({ ...formData, zona_normativa_id: e.target.value })}
                  required
                >
                  <option value="">Seleccionar zona normativa...</option>
                  {zonas.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.nombre} - {z.provincia} ({z.comunidad_autonoma})
                    </option>
                  ))}
                </Form.Select>
                <Form.Text className="text-muted">
                  Las zonas son gestionadas por el SUPER_ADMIN
                </Form.Text>
              </Form.Group>
            </Form>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button variant="primary" onClick={handleSave}>
              {editingUmbral ? 'Actualizar' : 'Crear'}
            </Button>
          </Modal.Footer>
        </Modal>
      )}
    </>
  );
}