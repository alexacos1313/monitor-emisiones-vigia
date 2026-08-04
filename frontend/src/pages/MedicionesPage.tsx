// frontend/src/pages/MedicionesPage.tsx
import { useState, useEffect, useCallback } from 'react';
import { Row, Col, Card, Form, Button, Badge, Spinner, Alert, Modal } from 'react-bootstrap';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import PaginatedTable from '../components/ui/PaginatedTable';
import { medicionService, Medicion, FiltrosMedicion } from '../services/medicion.service';
import { sensorService, Sensor } from '../services/sensor.service';
import { contaminanteService, Contaminante } from '../services/contaminante.service';
import { showSuccess, showError } from '../services/toast.service';
import Breadcrumbs from '../components/ui/Breadcrumbs';
import { getContaminanteColor, getContaminanteLabel } from '../services/colors.service';
import { useAuth } from '../context/AuthContext';
import { useEmpresaId, useEmpresaNombre } from '../hooks/useEmpresaId';

export default function MedicionesPage() {
  const [mediciones, setMediciones] = useState<Medicion[]>([]);
  const [sensores, setSensores] = useState<Sensor[]>([]);
  const [contaminantes, setContaminantes] = useState<Contaminante[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estado para los filtros aplicados
  const [filtros, setFiltros] = useState<FiltrosMedicion>({
    sensor_id: undefined,
    fecha_inicio: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    fecha_fin: new Date().toISOString().split('T')[0],
  });
  
  // Estado para los filtros actuales (los que se están usando)
  const [filtrosActuales, setFiltrosActuales] = useState<FiltrosMedicion>({
    sensor_id: undefined,
    fecha_inicio: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    fecha_fin: new Date().toISOString().split('T')[0],
  });
  
  const [sensorSeleccionado, setSensorSeleccionado] = useState<Sensor | null>(null);
  const [contaminantesDelSensor, setContaminantesDelSensor] = useState<string[]>([]);
  const [contaminanteSeleccionado, setContaminanteSeleccionado] = useState<string>('');
  const [chartData, setChartData] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState<any>(null);

  const { user } = useAuth();
  const empresaId = useEmpresaId();
  const empresaNombre = useEmpresaNombre();
  const esSuperAdmin = user?.rol === 'SUPER_ADMIN';

  // Cargar datos iniciales
  useEffect(() => {
    cargarDatosIniciales();
  }, [empresaId]);

  // Cuando cambia el sensor, cargar mediciones y contaminantes
  useEffect(() => {
    if (filtrosActuales.sensor_id !== undefined && filtrosActuales.sensor_id !== null) {
      cargarMedicionesYContaminantes();
    }
  }, [filtrosActuales.sensor_id]);

  // Cuando cambia el contaminante, recalcular el gráfico
  useEffect(() => {
    if (mediciones.length > 0 && contaminanteSeleccionado) {
      prepararDatosGrafico(mediciones);
    }
  }, [contaminanteSeleccionado]);

  const cargarDatosIniciales = async () => {
    setLoading(true);
    try {
      let sensoresData: Sensor[];
      
      if (esSuperAdmin) {
        if (empresaId) {
          sensoresData = await sensorService.getSensores(undefined, empresaId);
        } else {
          sensoresData = await sensorService.getSensores();
        }
      } else {
        sensoresData = await sensorService.getSensores(undefined, user?.id_empresa);
      }
      
      const contaminantesData = await contaminanteService.getContaminantes();
      
      setSensores(sensoresData);
      setContaminantes(contaminantesData);
      
      if (sensoresData.length > 0) {
        const primerSensor = sensoresData[0];
        const nuevosFiltros = { 
          ...filtros, 
          sensor_id: primerSensor.id,
          fecha_inicio: filtros.fecha_inicio,
          fecha_fin: filtros.fecha_fin
        };
        setFiltros(nuevosFiltros);
        setFiltrosActuales(nuevosFiltros);
        setSensorSeleccionado(primerSensor);
      }
    } catch (error) {
      console.error('Error cargando datos iniciales:', error);
      showError('Error cargando datos iniciales');
    } finally {
      setLoading(false);
    }
  };

  const cargarMedicionesYContaminantes = async () => {
    setLoading(true);
    try {
      // Cargar mediciones con los filtros actuales
      const data = await medicionService.getMediciones(filtrosActuales);
      console.log('Mediciones cargadas:', data.length);
      console.log('Filtros aplicados:', filtrosActuales);
      setMediciones(data);
      
      const sensor = sensores.find(s => s.id === filtrosActuales.sensor_id);
      setSensorSeleccionado(sensor || null);
      
      if (sensor) {
        let contaminantesSensor: string[] = [];
        
        try {
          const contaminantesFromData = await medicionService.getContaminantesBySensor(sensor.id);
          if (contaminantesFromData.length > 0) {
            contaminantesSensor = contaminantesFromData.map(c => c.toUpperCase());
          } else if (sensor.contaminantes && sensor.contaminantes.length > 0) {
            contaminantesSensor = sensor.contaminantes;
          } else {
            contaminantesSensor = ['CO', 'NO', 'NO2', 'NOX'];
          }
        } catch (error) {
          console.error('Error obteniendo contaminantes:', error);
          contaminantesSensor = ['CO', 'NO', 'NO2', 'NOX'];
        }
        
        setContaminantesDelSensor(contaminantesSensor);
        
        const primerContaminante = contaminantesSensor.length > 0 ? contaminantesSensor[0] : 'CO';
        setContaminanteSeleccionado(primerContaminante);
        
        // Preparar datos del gráfico con el primer contaminante
        prepararDatosGraficoConContaminante(data, primerContaminante);
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
      showError('Error cargando datos');
    } finally {
      setLoading(false);
    }
  };

  const prepararDatosGraficoConContaminante = (datos: Medicion[], contaminante: string) => {
    if (!contaminante || datos.length === 0) {
      setChartData([]);
      return;
    }

    const contaminanteLower = contaminante.toLowerCase();
    const agrupado: { [key: string]: { max: number; fecha: string; mediciones: number; dia: string; valores: number[]; promedio: number } } = {};
    
    datos.forEach(m => {
      const fecha = new Date(m.timestamp);
      const diaKey = fecha.toISOString().slice(0, 10);
      
      const contaminanteData = m.contaminantes?.find(
        c => c.contaminante.toLowerCase() === contaminanteLower
      );
      const valor = contaminanteData?.valor || 0;
      
      if (!agrupado[diaKey]) {
        agrupado[diaKey] = { 
          max: 0, 
          fecha: fecha.toLocaleDateString('es-ES', { 
            day: '2-digit', 
            month: '2-digit',
            year: 'numeric'
          }),
          mediciones: 0,
          dia: diaKey,
          valores: [],
          promedio: 0
        };
      }
      
      agrupado[diaKey].valores.push(valor);
      if (valor > agrupado[diaKey].max) {
        agrupado[diaKey].max = valor;
      }
      agrupado[diaKey].mediciones += 1;
    });
    
    const datosAgrupados = Object.entries(agrupado)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, value]) => {
        const promedio = value.valores.length > 0 
          ? value.valores.reduce((a, b) => a + b, 0) / value.valores.length 
          : 0;
        return {
          fecha: value.fecha,
          valor: parseFloat(value.max.toFixed(2)),
          mediciones: value.mediciones,
          dia: key,
          valores: value.valores,
          promedio: parseFloat(promedio.toFixed(2))
        };
      });
    
    console.log('Datos del gráfico:', datosAgrupados);
    setChartData(datosAgrupados);
  };

  const prepararDatosGrafico = (datos: Medicion[]) => {
    prepararDatosGraficoConContaminante(datos, contaminanteSeleccionado);
  };

  // Función para buscar con los filtros actuales
  const cargarMediciones = async () => {
    setLoading(true);
    try {
      // Actualizar filtros actuales con los valores del formulario
      setFiltrosActuales({ ...filtros });
      
      const data = await medicionService.getMediciones(filtros);
      console.log('Búsqueda manual - Mediciones:', data.length);
      setMediciones(data);
      prepararDatosGrafico(data);
    } catch (error) {
      console.error('Error cargando mediciones:', error);
      showError('Error cargando mediciones');
    } finally {
      setLoading(false);
    }
  };

  const handleChartClick = (data: any) => {
    if (data && data.activePayload) {
      const punto = data.activePayload[0].payload;
      
      const medicionesDelDia = mediciones.filter(m => {
        const fecha = new Date(m.timestamp);
        const diaKey = fecha.toISOString().slice(0, 10);
        return diaKey === punto.dia;
      });
      
      const contaminanteLower = contaminanteSeleccionado.toLowerCase();
      const valores = medicionesDelDia
        .map(m => {
          const contaminanteData = m.contaminantes?.find(
            c => c.contaminante.toLowerCase() === contaminanteLower
          );
          return contaminanteData?.valor || 0;
        })
        .filter(v => v > 0);
      
      const promedio = valores.length > 0 
        ? valores.reduce((a, b) => a + b, 0) / valores.length 
        : punto.valor;
      
      const maximo = Math.max(...valores, punto.valor);
      
      setModalData({
        fecha: punto.fecha,
        contaminante: contaminanteSeleccionado,
        promedio: parseFloat(promedio.toFixed(2)),
        pico: parseFloat(maximo.toFixed(2)),
        mediciones: valores.length,
        sensor: sensorSeleccionado?.nombre || 'Sensor no especificado'
      });
      setShowModal(true);
    }
  };

  const handleFilterChange = (key: keyof FiltrosMedicion, value: any) => {
    setFiltros({ ...filtros, [key]: value });
  };

  const getColumns = () => {
    const baseColumns = [
      { 
        key: 'timestamp', 
        label: 'Fecha/Hora',
        sortable: true,
        render: (value: string) => new Date(value).toLocaleString()
      },
      { key: 'sensor_nombre', label: 'Sensor', sortable: true },
    ];

    const contaminanteColumns = contaminantesDelSensor.map(c => {
      const key = c.toLowerCase();
      return {
        key: c,
        label: getContaminanteLabel(c),
        render: (_: any, item: Medicion) => {
          const contaminanteData = item.contaminantes?.find(
            (cont) => cont.contaminante.toLowerCase() === key
          );
          const valor = contaminanteData?.valor;
          return valor !== null && valor !== undefined ? valor.toFixed(2) : '-';
        }
      };
    });

    const estadoColumn = [
      { 
        key: 'estado', 
        label: 'Estado',
        render: (value: string) => <Badge bg="success">{value}</Badge>
      }
    ];

    return [...baseColumns, ...contaminanteColumns, ...estadoColumn];
  };

  const getContaminantesGrafico = () => {
    return contaminantesDelSensor.map(c => ({
      value: c,
      label: getContaminanteLabel(c),
      color: getContaminanteColor(c)
    }));
  };

  const handleExportCSV = () => {
    const contaminantesLabels = contaminantesDelSensor.map(c => getContaminanteLabel(c));
    const headers = ['ID', 'Fecha', 'Sensor', ...contaminantesLabels, 'Estado'];
    const rows = mediciones.map(m => [
      m.id,
      new Date(m.timestamp).toLocaleString(),
      m.sensor_nombre,
      ...contaminantesDelSensor.map(c => {
        const key = c.toLowerCase();
        const contaminanteData = m.contaminantes?.find(
          (cont) => cont.contaminante.toLowerCase() === key
        );
        return contaminanteData?.valor || '-';
      }),
      m.estado
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mediciones_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showSuccess('Exportado a CSV');
  };

  const columns = getColumns();
  const contaminantesGrafico = getContaminantesGrafico();

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '400px' }}>
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  const tieneDatosGrafico = chartData.length > 0;
  const tieneMediciones = mediciones.length > 0;
  const tieneContaminantes = contaminantesDelSensor.length > 0;

  return (
    <>
      <div className="mb-4">
        <Breadcrumbs />
        <h3 className="fw-bold mb-1">
          <i className="bi bi-graph-up me-2 text-primary"></i>
          Historico y Busqueda
        </h3>
        <p className="text-muted">Consulta y analiza datos historicos de emisiones</p>
        
        {empresaId && empresaNombre && (
          <Badge bg="info" className="mt-2">
            <i className="bi bi-building me-1"></i>
            Empresa: {empresaNombre}
          </Badge>
        )}
        {esSuperAdmin && !empresaId && (
          <Badge bg="warning" className="mt-2">
            <i className="bi bi-eye me-1"></i>
            Viendo todas las empresas
          </Badge>
        )}
        
        {sensorSeleccionado && (
          <div className="mt-2">
            <Badge bg="secondary" className="me-2">
              <i className="bi bi-cpu me-1"></i>
              {sensorSeleccionado.nombre}
            </Badge>
            <Badge bg="info" className="me-2">
              <i className="bi bi-building me-1"></i>
              {sensorSeleccionado.planta_nombre || 'Sin planta'}
            </Badge>
            {contaminantesDelSensor.map(c => (
              <Badge key={c} bg="primary" className="me-1">
                {getContaminanteLabel(c)}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {sensores.length === 0 && (
        <Alert variant="warning" className="mb-3">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          No hay sensores disponibles para tu empresa. Selecciona otra empresa o crea un sensor.
        </Alert>
      )}

      <Card className="border-0 shadow-sm mb-3">
        <Card.Body>
          <Row className="g-3">
            <Col md={4}>
              <Form.Group>
                <Form.Label className="small text-muted">
                  <i className="bi bi-cpu me-1"></i>Sensor
                </Form.Label>
                <Form.Select
                  value={filtros.sensor_id || ''}
                  onChange={(e) => handleFilterChange('sensor_id', e.target.value ? Number(e.target.value) : undefined)}
                  disabled={sensores.length === 0}
                >
                  {sensores.length === 0 ? (
                    <option value="">No hay sensores disponibles</option>
                  ) : (
                    sensores.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.nombre} - {s.planta_nombre || 'Sin planta'}
                      </option>
                    ))
                  )}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label className="small text-muted">
                  <i className="bi bi-calendar me-1"></i>Fecha Inicio
                </Form.Label>
                <Form.Control
                  type="date"
                  value={filtros.fecha_inicio}
                  onChange={(e) => handleFilterChange('fecha_inicio', e.target.value)}
                />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label className="small text-muted">
                  <i className="bi bi-calendar me-1"></i>Fecha Fin
                </Form.Label>
                <Form.Control
                  type="date"
                  value={filtros.fecha_fin}
                  onChange={(e) => handleFilterChange('fecha_fin', e.target.value)}
                />
              </Form.Group>
            </Col>
            <Col md={2}>
              <Form.Group>
                <Form.Label className="small text-muted">&nbsp;</Form.Label>
                <div className="d-flex gap-2">
                  <Button 
                    variant="primary" 
                    onClick={cargarMediciones} 
                    className="w-100"
                    disabled={sensores.length === 0}
                  >
                    <i className="bi bi-search me-1"></i>Buscar
                  </Button>
                  <Button 
                    variant="success" 
                    onClick={handleExportCSV}
                    disabled={mediciones.length === 0}
                  >
                    <i className="bi bi-file-earmark-spreadsheet"></i>
                  </Button>
                </div>
              </Form.Group>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Seccion del grafico */}
      {tieneContaminantes && (
        <>
          {tieneDatosGrafico ? (
            <Card className="border-0 shadow-sm mb-4">
              <Card.Header className="bg-white border-0 pt-3">
                <div className="d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">
                    <i className="bi bi-graph-up me-2 text-success"></i>
                    Evolucion Diaria - {getContaminanteLabel(contaminanteSeleccionado)}
                    <small className="text-muted ms-2">
                      {sensorSeleccionado?.nombre || ''}
                    </small>
                  </h5>
                  {contaminantesGrafico.length > 1 && (
                    <Form.Select
                      value={contaminanteSeleccionado}
                      onChange={(e) => {
                        setContaminanteSeleccionado(e.target.value);
                      }}
                      style={{ width: '150px' }}
                    >
                      {contaminantesGrafico.map(c => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </Form.Select>
                  )}
                </div>
                <div className="mt-2">
                  <small className="text-muted">
                    Periodo: {filtrosActuales.fecha_inicio || 'N/A'} - {filtrosActuales.fecha_fin || 'N/A'} | 
                    Total mediciones: {mediciones.length}
                  </small>
                </div>
              </Card.Header>
              <Card.Body>
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart 
                    data={chartData} 
                    onClick={handleChartClick}
                    style={{ cursor: 'pointer' }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="fecha" />
                    <YAxis label={{ value: 'mg/m³', angle: -90, position: 'insideLeft' }} />
                    <Tooltip 
                      labelFormatter={(label) => `${label}`}
                      formatter={(value: any) => [`${value} mg/m³`, 'Pico maximo']}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="valor"
                      stroke={getContaminanteColor(contaminanteSeleccionado)}
                      name={`Pico ${getContaminanteLabel(contaminanteSeleccionado)}`}
                      strokeWidth={3}
                      dot={{ r: 5, strokeWidth: 2, fill: '#fff' }}
                      activeDot={{ r: 8 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
                <div className="text-muted small mt-2">
                  <i className="bi bi-info-circle me-1"></i>
                  Haz clic en cualquier punto del grafico para ver mas detalles
                </div>
              </Card.Body>
            </Card>
          ) : (
            <Alert variant="info" className="mb-4">
              <i className="bi bi-info-circle me-2"></i>
              No hay datos de {getContaminanteLabel(contaminanteSeleccionado)} para mostrar el grafico en el periodo seleccionado.
              {tieneMediciones && ' Hay mediciones pero no contienen datos de este contaminante.'}
              {!tieneMediciones && ' No hay mediciones registradas para este sensor en el periodo seleccionado.'}
            </Alert>
          )}
        </>
      )}

      <PaginatedTable
        title="Resultados"
        columns={columns}
        data={mediciones}
        pageSize={15}
        searchable
        searchPlaceholder="Buscar por sensor..."
        showActions={false}
      />

      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-info-circle me-2 text-primary"></i>
            Detalle del Pico Maximo
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {modalData && (
            <div>
              <div className="text-center mb-4">
                <h5 className="mb-1">{modalData.fecha}</h5>
                <small className="text-muted">
                  Sensor: {modalData.sensor} | {modalData.mediciones} mediciones ese dia
                </small>
              </div>
              <Row className="g-3">
                <Col xs={6}>
                  <Card className="bg-light border-0 text-center p-3">
                    <small className="text-muted">Promedio Diario</small>
                    <h3 className="mb-0 text-primary">{modalData.promedio} <small>mg/m³</small></h3>
                  </Card>
                </Col>
                <Col xs={6}>
                  <Card className="bg-light border-0 text-center p-3">
                    <small className="text-muted">Pico Maximo</small>
                    <h3 className="mb-0 text-danger">{modalData.pico} <small>mg/m³</small></h3>
                  </Card>
                </Col>
              </Row>
              <div className="mt-3 text-center">
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