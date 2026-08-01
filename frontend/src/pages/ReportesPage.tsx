import { useState, useEffect } from 'react';
import {
  Card, Form, Button, Row, Col, Spinner, Alert
} from 'react-bootstrap';
import { reporteService, FiltrosReporte } from '../services/reporte.service';
import { empresaService, Empresa } from '../services/empresa.service';
import toast from 'react-hot-toast';
import Breadcrumbs from '../components/ui/Breadcrumbs';

export default function ReportesPage() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [descargando, setDescargando] = useState(false);
  const [userRol, setUserRol] = useState<string>('');
  
  const [filtros, setFiltros] = useState<FiltrosReporte>({
    fecha_inicio: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    fecha_fin: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      setUserRol(user.rol);
    }
    cargarEmpresas();
  }, []);

  const cargarEmpresas = async () => {
    setLoading(true);
    try {
      const empresasData = await empresaService.getEmpresas(true);
      setEmpresas(empresasData);
    } catch (error) {
      toast.error('Error cargando empresas');
    } finally {
      setLoading(false);
    }
  };

  const descargarReporte = async () => {
    if (!filtros.fecha_inicio || !filtros.fecha_fin) {
      toast.error('Seleccione un rango de fechas');
      return;
    }
    
    if (userRol === 'SUPER_ADMIN' && !filtros.empresa_id) {
      toast.error('Debe seleccionar una empresa');
      return;
    }
    
    setDescargando(true);
    try {
      const blob = await reporteService.descargarReportePDF(filtros);
      
      // Crear enlace de descarga
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      const empresa = empresas.find(e => e.id === filtros.empresa_id);
      const nombreEmpresa = empresa?.nombre || 'todas';
      a.download = `reporte_${nombreEmpresa}_${filtros.fecha_inicio}_${filtros.fecha_fin}.pdf`;
      
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast.success('Reporte descargado');
    } catch (error) {
      toast.error('Error al descargar el reporte');
      console.error(error);
    } finally {
      setDescargando(false);
    }
  };

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
        <h3 className="fw-bold mb-1">
          <i className="bi bi-file-text me-2 text-primary"></i>
          Reportes de Emisiones
        </h3>
        <p className="text-muted">Genere informes PDF de emisiones industriales</p>
      </div>


      <Row className="justify-content-center">
        <Col lg={6}>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white border-0 pt-4">
              <h5 className="mb-0">
                <i className="bi bi-funnel me-2"></i>
                Filtros del Reporte
              </h5>
            </Card.Header>
            <Card.Body>
              <Form>
                {userRol === 'SUPER_ADMIN' && (
                  <Form.Group className="mb-3">
                    <Form.Label>
                      <i className="bi bi-building me-1"></i>Empresa *
                    </Form.Label>
                    <Form.Select
                      value={filtros.empresa_id || ''}
                      onChange={(e) => setFiltros({ ...filtros, empresa_id: e.target.value ? Number(e.target.value) : undefined })}
                    >
                      <option value="">Seleccione una empresa</option>
                      {empresas.map(e => (
                        <option key={e.id} value={e.id}>{e.nombre}</option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                )}

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>
                        <i className="bi bi-calendar me-1"></i>Fecha Inicio
                      </Form.Label>
                      <Form.Control
                        type="date"
                        value={filtros.fecha_inicio}
                        onChange={(e) => setFiltros({ ...filtros, fecha_inicio: e.target.value })}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>
                        <i className="bi bi-calendar me-1"></i>Fecha Fin
                      </Form.Label>
                      <Form.Control
                        type="date"
                        value={filtros.fecha_fin}
                        onChange={(e) => setFiltros({ ...filtros, fecha_fin: e.target.value })}
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Alert variant="info" className="mb-3">
                  <i className="bi bi-info-circle me-2"></i>
                  El reporte incluirá: resumen de mediciones, promedios por contaminante, 
                  alarmas registradas y gráficos de tendencias.
                </Alert>

                <div className="d-grid">
                  <Button 
                    variant="primary" 
                    size="lg"
                    onClick={descargarReporte}
                    disabled={descargando}
                  >
                    {descargando ? (
                      <>
                        <Spinner size="sm" className="me-2" />
                        Generando PDF...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-file-pdf me-2"></i>
                        Generar y Descargar PDF
                      </>
                    )}
                  </Button>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="mt-4">
        <Col lg={12}>
          <Card className="border-0 shadow-sm">
            <Card.Body className="text-center py-4">
              <i className="bi bi-file-earmark-text fs-1 text-primary"></i>
              <h6 className="mt-2">Información del Reporte</h6>
              <p className="text-muted small mb-0">
                Los reportes se generan en formato PDF e incluyen:<br />
                • Datos de la empresa<br />
                • Periodo seleccionado<br />
                • Resumen de mediciones<br />
                • Promedios por contaminante<br />
                • Alarmas registradas<br />
                • Tablas y gráficos
              </p>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </>
  );
}