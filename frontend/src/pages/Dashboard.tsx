// frontend/src/pages/Dashboard.tsx
import { useEffect, useState, useCallback } from 'react';
import { Row, Col, Card, ProgressBar, Spinner, ButtonGroup, Button, Modal, Form, Badge } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { dashboardService, DashboardResumen, Tendencia } from '../services/dashboard.service';
import { alarmaService } from '../services/alarma.service';
import { sensorService, Sensor } from '../services/sensor.service';
import { contaminanteService, Contaminante } from '../services/contaminante.service';
import { getContaminanteColor, getContaminanteLabel, PIE_COLORS } from '../services/colors.service';
import { websocketService } from '../services/websocket.service';
import Breadcrumbs from '../components/ui/Breadcrumbs';
import { useEmpresaId, useEmpresaNombre } from '../hooks/useEmpresaId';
import { useAuth } from '../context/AuthContext';

type PeriodoType = 7 | 15 | 30 | 90;

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [loadingTendencias, setLoadingTendencias] = useState(false);
  const [resumen, setResumen] = useState<DashboardResumen | null>(null);
  const [tendencias, setTendencias] = useState<Tendencia[]>([]);
  const [periodo, setPeriodo] = useState<PeriodoType>(7);
  
  const [sensores, setSensores] = useState<Sensor[]>([]);
  const [sensorSeleccionado, setSensorSeleccionado] = useState<number | null>(null);
  const [contaminantesDisponibles, setContaminantesDisponibles] = useState<Contaminante[]>([]);
  const [contaminanteSeleccionado, setContaminanteSeleccionado] = useState<string>('');
  
  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState<any>(null);
  const [alarmasPorTipo, setAlarmasPorTipo] = useState<any[]>([]);
  const [isFirstLoad, setIsFirstLoad] = useState(true);

  const navigate = useNavigate();
  const { user } = useAuth();
  const empresaId = useEmpresaId();
  const empresaNombre = useEmpresaNombre();

  // Redirigir si no hay empresa
  useEffect(() => {
    if (!empresaId) {
      navigate('/empresas');
    }
  }, [empresaId, navigate, user]);

  useEffect(() => {
    if (empresaId) {
      cargarDatosIniciales();
    }
  }, [empresaId]);

  // Cuando cambia el sensor, cargar contaminantes y tendencias
  useEffect(() => {
    if (sensorSeleccionado && !isFirstLoad) {
      cargarContaminantesDelSensor(sensorSeleccionado);
    }
  }, [sensorSeleccionado, isFirstLoad]);

  // Cuando cambia el contaminante o el periodo, recargar tendencias
  useEffect(() => {
    if (!isFirstLoad && sensorSeleccionado && contaminanteSeleccionado) {
      cargarTendenciasConDebounce();
    }
  }, [periodo, contaminanteSeleccionado, sensorSeleccionado]);

  // Recargar resumen cuando cambia el sensor
  useEffect(() => {
    if (sensorSeleccionado && !isFirstLoad) {
      recargarResumen(sensorSeleccionado);
    }
  }, [sensorSeleccionado]);

  // Recargar estadisticas de alarmas cuando cambia el sensor
  useEffect(() => {
    if (sensorSeleccionado && !isFirstLoad) {
      recargarEstadisticas(sensorSeleccionado);
    }
  }, [sensorSeleccionado]);

  // Conectar WebSocket
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      console.log('Conectando WebSocket desde Dashboard...');
      websocketService.connect(token);
    }
    
    return () => {
      console.log('Desconectando WebSocket desde Dashboard...');
      websocketService.disconnect();
    };
  }, []);

  // Escuchar alarmas en tiempo real
  useEffect(() => {
    const unsubscribe = websocketService.onAlarma((alarma) => {
      console.log(' Alarma en tiempo real:', alarma);
      if (sensorSeleccionado) {
        recargarEstadisticas(sensorSeleccionado);
        recargarResumen(sensorSeleccionado);
      }
    });
    
    return () => unsubscribe();
  }, [sensorSeleccionado]);

  //  Escuchar nuevas mediciones en tiempo real
  useEffect(() => {
    const unsubscribe = websocketService.onMedicion((medicion) => {
      console.log(' Nueva medición en tiempo real:', medicion);
      if (sensorSeleccionado && medicion.id_sensor === sensorSeleccionado) {
        recargarResumen(sensorSeleccionado);
        recargarTendencias();
      }
    });
    
    return () => unsubscribe();
  }, [sensorSeleccionado]);

  //  Recarga periódica cada 30 segundos (respaldo)
  useEffect(() => {
    if (!sensorSeleccionado || isFirstLoad) return;
    
    const interval = setInterval(() => {
      console.log(' Actualización automática (30s)');
      recargarResumen(sensorSeleccionado);
      recargarEstadisticas(sensorSeleccionado);
    }, 30000);
    
    return () => clearInterval(interval);
  }, [sensorSeleccionado]);

  const recargarResumen = async (sensorId: number) => {
    try {
      console.log('Recargando resumen para sensor:', sensorId);
      const resumenData = await dashboardService.getResumen(empresaId, sensorId);
      setResumen(resumenData);
    } catch (error) {
      console.error('Error recargando resumen:', error);
    }
  };

  const recargarEstadisticas = async (sensorId: number) => {
    try {
      console.log('Recargando estadisticas para sensor:', sensorId);
      const estadisticas = await alarmaService.getEstadisticas(sensorId);
      if (estadisticas) {
        setAlarmasPorTipo(estadisticas.por_tipo || []);
      }
    } catch (error) {
      console.error('Error recargando estadisticas:', error);
    }
  };

  const recargarTendencias = useCallback(() => {
    if (sensorSeleccionado && contaminanteSeleccionado) {
      cargarTendenciasConDebounce();
    }
  }, [sensorSeleccionado, contaminanteSeleccionado]);

  const cargarDatosIniciales = async () => {
    if (!empresaId) return;
    
    setLoading(true);
    try {
      const sensoresData = await sensorService.getSensores(undefined, empresaId);
      setSensores(sensoresData);
      
      const primerSensor = sensoresData.length > 0 ? sensoresData[0] : null;
      
      const [resumenData, estadisticasData] = await Promise.all([
        dashboardService.getResumen(empresaId, primerSensor?.id),
        alarmaService.getEstadisticas(primerSensor?.id)
      ]);
      setResumen(resumenData);
      
      if (estadisticasData) {
        setAlarmasPorTipo(estadisticasData.por_tipo || []);
      }
      
      if (sensoresData.length > 0) {
        const primerSensor = sensoresData[0];
        setSensorSeleccionado(primerSensor.id);
        await cargarContaminantesDelSensor(primerSensor.id);
      }
      
      setIsFirstLoad(false);
    } catch (error) {
      console.error('Error cargando datos:', error);
      // Datos mock...
      setSensores([
        { 
          id: 1, 
          nombre: 'Sensor Demo 1', 
          tipo_analizador: 'Laser',
          modelo: 'LASER-2000',
          fabricante: 'Siemens',
          estado: 'ACTIVO',
          id_planta: 1,
          planta_nombre: 'Planta Demo',
          fecha_instalacion: '2024-01-01',
          frecuencia_medicion: 60,
          contaminantes: ['CO', 'NO', 'NO2', 'NOX']
        },
        { 
          id: 2, 
          nombre: 'Sensor Demo 2', 
          tipo_analizador: 'Quimico',
          modelo: 'CHEM-X',
          fabricante: 'ABB',
          estado: 'ACTIVO',
          id_planta: 1,
          planta_nombre: 'Planta Demo',
          fecha_instalacion: '2024-02-01',
          frecuencia_medicion: 30,
          contaminantes: ['NO', 'NO2']
        },
      ]);
      
      setResumen({
        total_mediciones: 2847,
        sensores_activos: 2,
        alarmas_pendientes: 3,
        alarmas_totales: 15,
        promedios: {
          co: 2.4,
          no: 15.6,
          no2: 8.2,
          nox: 23.8
        }
      });
      
      setAlarmasPorTipo([
        { tipo: 'ALERTA', total: 10 },
        { tipo: 'CRITICO', total: 5 }
      ]);
      
      setSensorSeleccionado(1);
      setContaminantesDisponibles([
        { id: 1, nombre: 'CO', unidad: 'mg/m', formula: 'CO' },
        { id: 2, nombre: 'NO2', unidad: 'mg/m', formula: 'NO' }
      ]);
      setContaminanteSeleccionado('CO');
      setIsFirstLoad(false);
    } finally {
      setLoading(false);
    }
  };

  const cargarContaminantesDelSensor = async (sensorId: number) => {
    try {
      const contaminantes = await contaminanteService.getContaminantesPorSensor(sensorId);
      setContaminantesDisponibles(contaminantes);
      
      if (contaminantes.length > 0) {
        setContaminanteSeleccionado(contaminantes[0].nombre);
      } else {
        setContaminanteSeleccionado('');
        setTendencias([]);
      }
    } catch (error) {
      console.error('Error cargando contaminantes:', error);
      setContaminantesDisponibles([]);
      setContaminanteSeleccionado('');
      setTendencias([]);
    }
  };

  const cargarTendenciasConDebounce = useCallback(() => {
    if (loadingTendencias) return;
    
    setLoadingTendencias(true);
    const timer = setTimeout(() => {
      cargarTendencias();
    }, 300);
    
    return () => clearTimeout(timer);
  }, [sensorSeleccionado, contaminanteSeleccionado, periodo]);

  const cargarTendencias = async () => {
    try {
      if (!sensorSeleccionado || !contaminanteSeleccionado) {
        setTendencias([]);
        return;
      }
      
      const data = await dashboardService.getTendencias(
        contaminanteSeleccionado.toLowerCase(), 
        periodo, 
        sensorSeleccionado,
        empresaId
      );
      setTendencias(data || []);
    } catch (error) {
      console.error('Error cargando tendencias:', error);
      setTendencias([]);
    } finally {
      setLoadingTendencias(false);
    }
  };

  const handleSensorChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = Number(e.target.value);
    setSensorSeleccionado(id);
  };

  const handleChartClick = (data: any) => {
    if (data && data.activePayload) {
      const punto = data.activePayload[0].payload;
      setModalData({
        fecha: punto.fecha,
        valor: punto.promedio,
        maximo: punto.maximo, 
        contaminante: contaminanteSeleccionado,
        mediciones: punto.mediciones || 0
      });
      setShowModal(true);
    }
  };

  const sensorActual = sensores.find(s => s.id === sensorSeleccionado);
  const contaminanteInfo = contaminantesDisponibles.find(c => c.nombre === contaminanteSeleccionado);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '70vh' }}>
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  const tarjetas = [
    { titulo: 'Mediciones', valor: resumen?.total_mediciones || 0, icono: 'bi-graph-up', color: 'primary', fondo: '#eef2ff' },
    { titulo: 'Sensores Activos', valor: resumen?.sensores_activos || 0, icono: 'bi-cpu', color: 'success', fondo: '#e8f5e9' },
    { titulo: 'Alarmas Pendientes', valor: resumen?.alarmas_pendientes || 0, icono: 'bi-bell', color: 'warning', fondo: '#fff3e0' },
    { titulo: 'Alarmas Totales', valor: resumen?.alarmas_totales || 0, icono: 'bi-exclamation-triangle', color: 'danger', fondo: '#ffebee' },
  ];

  const promediosDisponibles = resumen?.promedios ? 
    Object.entries(resumen.promedios)
      .filter(([key]) => contaminantesDisponibles.some(c => c.nombre.toLowerCase() === key))
      .map(([key, value]) => ({
        key,
        value: typeof value === 'number' ? Number(value.toFixed(2)) : value,
        info: contaminantesDisponibles.find(c => c.nombre.toLowerCase() === key)
      })) : [];

  return (
    <>
      <div className="mb-4">
        <Breadcrumbs />
        <h3 className="fw-bold mb-1 mt-2">
          <i className="bi bi-speedometer2 me-2 text-primary"></i>
          Dashboard
        </h3>
        <p className="text-muted">Monitor de emisiones industriales en tiempo real</p>
        {empresaNombre && (
          <Badge bg="info" className="mt-2">
            <i className="bi bi-building me-1"></i>
            {empresaNombre}
          </Badge>
        )}
      </div>

      <Row className="g-4 mb-4">
        {tarjetas.map((tarjeta, idx) => (
          <Col xl={3} sm={6} key={idx}>
            <Card className="border-0 shadow-sm h-100">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <p className="text-muted small text-uppercase mb-1">{tarjeta.titulo}</p>
                    <h3 className="fw-bold mb-0">{tarjeta.valor.toLocaleString()}</h3>
                  </div>
                  <div className="rounded p-3" style={{ backgroundColor: tarjeta.fondo }}>
                    <i className={`${tarjeta.icono} fs-2 text-${tarjeta.color}`}></i>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      <Card className="border-0 shadow-sm mb-4">
        <Card.Body>
          <Row className="align-items-end">
            <Col md={6}>
              <Form.Label className="fw-bold">
                <i className="bi bi-cpu me-2"></i>
                Seleccionar Sensor
              </Form.Label>
              <Form.Select
                value={sensorSeleccionado || ''}
                onChange={handleSensorChange}
              >
                {sensores.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.nombre} - {s.planta_nombre || 'Sin planta'}
                  </option>
                ))}
              </Form.Select>
            </Col>
            <Col md={6}>
              {sensorActual && (
                <div className="mt-3 mt-md-0">
                  <Badge bg="secondary" className="me-2">
                    <i className="bi bi-building me-1"></i>
                    {sensorActual.planta_nombre || 'Sin planta'}
                  </Badge>
                  <Badge bg={sensorActual.estado === 'ACTIVO' ? 'success' : 'warning'} className="me-2">
                    {sensorActual.estado}
                  </Badge>
                  {contaminantesDisponibles.map(c => (
                    <Badge key={c.nombre} bg="primary" className="me-1">
                      {c.nombre}
                    </Badge>
                  ))}
                </div>
              )}
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {contaminantesDisponibles.length > 0 && (
        <Card className="border-0 shadow-sm mb-4">
          <Card.Body>
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
              <div>
                <h5 className="mb-0">
                  <i className="bi bi-graph-up me-2 text-success"></i>
                  Evolucion Temporal - {sensorActual?.nombre}
                </h5>
                <small className="text-muted">Haz clic en cualquier punto del grafico para ver detalles</small>
              </div>
              <div className="d-flex gap-3 flex-wrap">
                <div>
                  <label className="small text-muted me-2">Contaminante:</label>
                  <ButtonGroup size="sm">
                    {contaminantesDisponibles.map(c => (
                      <Button
                        key={c.nombre}
                        variant={contaminanteSeleccionado === c.nombre ? 'primary' : 'outline-secondary'}
                        onClick={() => setContaminanteSeleccionado(c.nombre)}
                      >
                        <span 
                          style={{
                            display: 'inline-block',
                            width: '10px',
                            height: '10px',
                            borderRadius: '50%',
                            backgroundColor: getContaminanteColor(c.nombre) || '#888',
                            marginRight: '4px'
                          }}
                        />
                        {c.nombre}
                      </Button>
                    ))}
                  </ButtonGroup>
                </div>
                <div>
                  <label className="small text-muted me-2">Periodo:</label>
                  <ButtonGroup size="sm">
                    {[7, 15, 30, 90].map(p => (
                      <Button
                        key={p}
                        variant={periodo === p ? 'primary' : 'outline-secondary'}
                        onClick={() => setPeriodo(p as PeriodoType)}
                      >
                        {p} dias
                      </Button>
                    ))}
                  </ButtonGroup>
                </div>
              </div>
            </div>
          </Card.Body>
        </Card>
      )}

      {contaminantesDisponibles.length > 0 && contaminanteInfo ? (
        <Row className="g-4 mb-4">
          <Col lg={8}>
            <Card className="border-0 shadow-sm">
              <Card.Body>
                {loadingTendencias ? (
                  <div className="d-flex justify-content-center align-items-center" style={{ height: '400px' }}>
                    <Spinner animation="border" variant="primary" />
                    <span className="ms-2">Cargando datos...</span>
                  </div>
                ) : tendencias.length > 0 ? (
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart 
                      data={tendencias} 
                      onClick={handleChartClick}
                      style={{ cursor: 'pointer' }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                      <XAxis dataKey="fecha" stroke="#737373" />
                      <YAxis 
                        stroke="#737373"
                        label={{ value: contaminanteInfo.unidad, angle: -90, position: 'insideLeft' }}
                      />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '8px' }}
                        labelStyle={{ fontWeight: 'bold' }}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="promedio"
                        name={contaminanteInfo.nombre}
                        stroke={getContaminanteColor(contaminanteInfo.nombre)}
                        strokeWidth={3}
                        dot={{ r: 5, strokeWidth: 2, fill: '#fff' }}
                        activeDot={{ r: 8 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-5 text-muted">
                    <i className="bi bi-bar-chart fs-1 d-block mb-2"></i>
                    No hay datos disponibles para este contaminante
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>

          <Col lg={4}>
            <Card className="border-0 shadow-sm h-100">
              <Card.Header className="bg-white border-0 pt-3">
                <h5 className="mb-0">
                  <i className="bi bi-pie-chart me-2 text-info"></i>
                  Alarmas por Tipo
                </h5>
              </Card.Header>
              <Card.Body>
                {alarmasPorTipo.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={alarmasPorTipo}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="total"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {alarmasPorTipo.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-5 text-muted">
                    <i className="bi bi-pie-chart fs-1 d-block mb-2"></i>
                    No hay alarmas registradas
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      ) : (
        <Card className="border-0 shadow-sm mb-4">
          <Card.Body className="text-center py-5 text-muted">
            <i className="bi bi-cpu fs-1 d-block mb-3"></i>
            <h5>Selecciona un sensor para ver los datos</h5>
            <p>Elige un sensor del desplegable superior</p>
          </Card.Body>
        </Card>
      )}

      {promediosDisponibles.length > 0 && (
        <Row className="g-4">
          <Col lg={6}>
            <Card className="border-0 shadow-sm">
              <Card.Header className="bg-white border-0 pt-3">
                <h5 className="mb-0">
                  <i className="bi bi-bar-chart-steps me-2 text-primary"></i>
                  Promedios por Contaminante
                </h5>
              </Card.Header>
              <Card.Body>
                {promediosDisponibles.map(({ key, value, info }) => {
                  const maxValue = 200;
                  const valorNumerico = typeof value === 'number' ? value : 0;
                  const porcentaje = Math.min((valorNumerico / maxValue) * 100, 100);
                  const color = info ? getContaminanteColor(info.nombre) : '#888';
                  
                  return (
                    <div key={key} className="mb-3">
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <span>
                          <span 
                            style={{
                              display: 'inline-block',
                              width: '12px',
                              height: '12px',
                              borderRadius: '50%',
                              backgroundColor: color,
                              marginRight: '8px'
                            }}
                          />
                          {info?.nombre || key.toUpperCase()}
                        </span>
                        <span className="fw-bold">{value.toFixed(2)} {info?.unidad || 'mg/m'}</span>
                      </div>
                      <ProgressBar
                        now={porcentaje}
                        variant={color === '#43A047' ? 'success' : 
                                color === '#FF9800' ? 'warning' :
                                color === '#F44336' ? 'danger' : 'info'}
                        className="rounded-pill"
                        style={{ height: '8px' }}
                      />
                    </div>
                  );
                })}
              </Card.Body>
            </Card>
          </Col>

          <Col lg={6}>
            <Card className="border-0 shadow-sm">
              <Card.Header className="bg-white border-0 pt-3">
                <h5 className="mb-0">
                  <i className="bi bi-bar-chart me-2 text-success"></i>
                  Maximos Registrados
                </h5>
              </Card.Header>
              <Card.Body>
                {tendencias.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={tendencias.slice(-7)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="fecha" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="maximo" fill="#F44336" name="Maximo" />
                      <Bar dataKey="promedio" fill="#43A047" name="Promedio" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-5 text-muted">
                    <i className="bi bi-bar-chart fs-1 d-block mb-2"></i>
                    No hay datos de maximos disponibles
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-info-circle me-2 text-primary"></i>
            Detalle de Medicion
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {modalData && (
            <div className="text-center">
              <div className="mb-3">
                <i className="bi bi-calendar fs-1 text-primary"></i>
                <h4 className="mt-2">{modalData.fecha}</h4>
              </div>
              <div className="row g-3">
                <div className="col-6">
                  <div className="bg-light rounded p-3">
                    <small className="text-muted">Promedio Diario</small>
                    <h3 className="mb-0 text-primary">
                      {typeof modalData.valor === 'number' ? modalData.valor.toFixed(2) : modalData.valor} 
                      <small> mg/m</small>
                    </h3>
                  </div>
                </div>
                <div className="col-6">
                  <div className="bg-light rounded p-3">
                    <small className="text-muted">Pico Maximo</small>
                    <h3 className="mb-0 text-danger">
                      {typeof modalData.maximo === 'number' ? modalData.maximo.toFixed(2) : modalData.maximo} 
                      <small> mg/m</small>
                    </h3>
                  </div>
                </div>
              </div>
              <div className="mt-3">
                <Badge bg="secondary">
                  <i className="bi bi-droplet me-1"></i>
                  {modalData.contaminante}
                </Badge>
                <span className="text-muted small ms-2">
                  <i className="bi bi-database me-1"></i>
                  {modalData.mediciones} mediciones
                </span>
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>Cerrar</Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}