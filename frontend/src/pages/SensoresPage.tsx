// frontend/src/pages/SensoresPage.tsx
import { useState, useEffect } from 'react';
import { Badge, Spinner, Card, Tabs, Tab, Button } from 'react-bootstrap';
import PaginatedTable from '../components/ui/PaginatedTable';
import { sensorService, Sensor } from '../services/sensor.service';
import { empresaService, Planta } from '../services/empresa.service';
import { historialService } from '../services/historial.service';
import { showSuccess, showError } from '../services/toast.service';
import Breadcrumbs from '../components/ui/Breadcrumbs';
import { useAuth } from '../context/AuthContext';
import { useEmpresaId, useEmpresaNombre } from '../hooks/useEmpresaId';

import SensorDetalles from '../components/sensor/SensorDetalles';
import SensorUmbrales from '../components/sensor/SensorUmbrales';
import SensorCalibraciones from '../components/sensor/SensorCalibraciones';
import SensorHistorial from '../components/sensor/SensorHistorial';
import SensorModal from '../components/sensor/SensorModal';
import UmbralModal from '../components/sensor/UmbralModal';

type EstadoSensor = 'ACTIVO' | 'MANTENIMIENTO' | 'INACTIVO' | 'CALIBRACION';

export default function SensoresPage() {
  // Estados
  const [sensores, setSensores] = useState<Sensor[]>([]);
  const [plantas, setPlantas] = useState<Planta[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSensor, setSelectedSensor] = useState<Sensor | null>(null);
  const [activeTab, setActiveTab] = useState('detalles');
  const [umbrales, setUmbrales] = useState<any[]>([]);
  const [calibraciones, setCalibraciones] = useState<any[]>([]);
  const [historialUmbrales, setHistorialUmbrales] = useState<any[]>([]);
  
  // Modales
  const [showModal, setShowModal] = useState(false);
  const [showUmbralModal, setShowUmbralModal] = useState(false);
  const [editingSensor, setEditingSensor] = useState<Sensor | null>(null);
  const [loadingModal, setLoadingModal] = useState(false);
  
  // Obtener usuario y empresa seleccionada
  const { user } = useAuth();
  const empresaId = useEmpresaId();
  const empresaNombre = useEmpresaNombre();
  const esSuperAdmin = user?.rol === 'SUPER_ADMIN';
  
  // Formularios
  const [formData, setFormData] = useState<{
    nombre: string;
    tipo_analizador: string;
    modelo: string;
    fabricante: string;
    estado: EstadoSensor;
    id_planta: number;
    frecuencia_medicion: number;
    observaciones: string;
    contaminantes: string[];
  }>({
    nombre: '',
    tipo_analizador: '',
    modelo: '',
    fabricante: '',
    estado: 'ACTIVO',
    id_planta: 0,
    frecuencia_medicion: 60,
    observaciones: '',
    contaminantes: [],
  });
  
  const [umbralForm, setUmbralForm] = useState({
    contaminante: '',
    limite_alerta: 0,
    limite_critico: 0,
    unidad: 'mg/m³'
  });

  // Cargar datos al montar el componente
  useEffect(() => {
    cargarDatos();
  }, [empresaId]);

  // Función para cargar datos con filtro de empresa
  const cargarDatos = async () => {
    setLoading(true);
    try {
      let sensoresData: Sensor[];
      let plantasData: Planta[];
      
      // Cargar sensores con filtro de empresa
      if (esSuperAdmin) {
        if (empresaId) {
          // SUPER_ADMIN con empresa seleccionada
          sensoresData = await sensorService.getSensores(undefined, empresaId);
          plantasData = await empresaService.getPlantas(empresaId);
        } else {
          // SUPER_ADMIN sin empresa (todos los datos)
          sensoresData = await sensorService.getSensores();
          plantasData = await empresaService.getPlantas();
        }
      } else {
        // EMPRESA_ADMIN, TECNICO, CONSULTOR: usar su empresa
        const idEmpresa = user?.id_empresa;
        if (idEmpresa) {
          sensoresData = await sensorService.getSensores(undefined, idEmpresa);
          plantasData = await empresaService.getPlantas(idEmpresa);
        } else {
          sensoresData = await sensorService.getSensores();
          plantasData = await empresaService.getPlantas();
        }
      }
      
      setSensores(sensoresData);
      setPlantas(plantasData.filter(p => p.activo === 1));
      
      // Si hay sensores y no hay uno seleccionado, seleccionar el primero
      if (sensoresData.length > 0 && !selectedSensor) {
        const primerSensor = sensoresData[0];
        await cargarDetallesSensor(primerSensor);
      }
      
    } catch (error) {
      console.error('Error cargando datos:', error);
      showError('Error cargando datos');
    } finally {
      setLoading(false);
    }
  };

  // Cargar detalles de un sensor específico
  const cargarDetallesSensor = async (sensor: Sensor) => {
    setSelectedSensor(sensor);
    try {
      const [umbralesData, calibracionesData, historialData] = await Promise.all([
        sensorService.getUmbrales(sensor.id),
        sensorService.getCalibraciones(sensor.id),
        historialService.getHistorialUmbrales(sensor.id)
      ]);
      setUmbrales(umbralesData);
      setCalibraciones(calibracionesData);
      setHistorialUmbrales(historialData);
      setActiveTab('detalles');
    } catch (error) {
      console.error('Error cargando detalles:', error);
      showError('Error cargando detalles');
    }
  };

  // ============================================
  // CRUD SENSORES
  // ============================================
  
  // Abrir modal para crear o editar sensor
  const handleOpenModal = (sensor?: Sensor) => {
    if (sensor) {
      setEditingSensor(sensor);
      setFormData({
        nombre: sensor.nombre,
        tipo_analizador: sensor.tipo_analizador || '',
        modelo: sensor.modelo || '',
        fabricante: sensor.fabricante || '',
        estado: sensor.estado as EstadoSensor,
        id_planta: sensor.id_planta,
        frecuencia_medicion: sensor.frecuencia_medicion,
        observaciones: sensor.observaciones || '',
        contaminantes: sensor.contaminantes || [],
      });
    } else {
      setEditingSensor(null);
      setFormData({
        nombre: '',
        tipo_analizador: '',
        modelo: '',
        fabricante: '',
        estado: 'ACTIVO',
        id_planta: 0,
        frecuencia_medicion: 60,
        observaciones: '',
        contaminantes: [],
      });
    }
    setShowModal(true);
  };

  // Guardar sensor (crear o actualizar)
  const handleSave = async () => {
    if (!formData.id_planta) {
      showError('Seleccione una planta');
      return;
    }
    if (!formData.nombre) {
      showError('El nombre es requerido');
      return;
    }
    
    setLoadingModal(true);
    try {
      if (editingSensor) {
        await sensorService.updateSensor(editingSensor.id, formData);
        showSuccess('Sensor actualizado');
      } else {
        await sensorService.createSensor(formData);
        showSuccess('Sensor creado');
      }
      setShowModal(false);
      cargarDatos();
    } catch (error) {
      console.error('Error al guardar:', error);
      showError('Error al guardar');
    } finally {
      setLoadingModal(false);
    }
  };

  // Eliminar sensor
  const handleDelete = async (sensor: Sensor) => {
    if (window.confirm(`¿Eliminar el sensor "${sensor.nombre}"?`)) {
      try {
        await sensorService.deleteSensor(sensor.id);
        showSuccess('Sensor eliminado');
        if (selectedSensor?.id === sensor.id) setSelectedSensor(null);
        cargarDatos();
      } catch (error) {
        console.error('Error al eliminar:', error);
        showError('Error al eliminar');
      }
    }
  };

  // ============================================
  // UMBRALES
  // ============================================
  
  // Abrir modal para crear umbral
  const handleOpenUmbralModal = () => {
    setUmbralForm({ 
      contaminante: '', 
      limite_alerta: 0, 
      limite_critico: 0, 
      unidad: 'mg/m³' 
    });
    setShowUmbralModal(true);
  };

  // Guardar umbral
  const handleSaveUmbral = async () => {
    if (!selectedSensor) {
      showError('Seleccione un sensor');
      return;
    }
    if (!umbralForm.contaminante) {
      showError('Seleccione un contaminante');
      return;
    }
    
    setLoadingModal(true);
    try {
      await sensorService.createUmbral({
        ...umbralForm,
        id_sensor: selectedSensor.id
      });
      showSuccess('Umbral creado');
      setShowUmbralModal(false);
      const nuevosUmbrales = await sensorService.getUmbrales(selectedSensor.id);
      setUmbrales(nuevosUmbrales);
    } catch (error) {
      console.error('Error al guardar umbral:', error);
      showError('Error al guardar umbral');
    } finally {
      setLoadingModal(false);
    }
  };

  // Eliminar umbral
  const handleDeleteUmbral = async (id: number) => {
    if (window.confirm('¿Eliminar este umbral?')) {
      try {
        await sensorService.deleteUmbral(id);
        showSuccess('Umbral eliminado');
        if (selectedSensor) {
          const nuevosUmbrales = await sensorService.getUmbrales(selectedSensor.id);
          setUmbrales(nuevosUmbrales);
        }
      } catch (error) {
        console.error('Error al eliminar umbral:', error);
        showError('Error al eliminar');
      }
    }
  };

  // ============================================
  // FUNCIONES AUXILIARES
  // ============================================
  
  // Badge de estado
  const getEstadoBadge = (estado: string) => {
    const config: any = {
      'ACTIVO': { bg: 'success', icon: 'bi-check-circle-fill' },
      'MANTENIMIENTO': { bg: 'warning', icon: 'bi-tools' },
      'INACTIVO': { bg: 'secondary', icon: 'bi-x-circle-fill' },
      'CALIBRACION': { bg: 'info', icon: 'bi-arrow-repeat' }
    };
    const c = config[estado] || { bg: 'secondary', icon: 'bi-question-circle' };
    return (
      <Badge bg={c.bg}>
        <i className={`${c.icon} me-1`}></i>
        {estado}
      </Badge>
    );
  };

  // Obtener nombre de la planta
  const getPlantaNombre = (id: number) => {
    const planta = plantas.find(p => p.id === id);
    return planta ? (
      <>
        <i className="bi bi-building me-1"></i>
        {planta.nombre}
      </>
    ) : (
      `Planta #${id}`
    );
  };

  // Columnas de la tabla
  const columns = [
    { key: 'id', label: 'ID', width: '60px', sortable: true },
    { key: 'nombre', label: 'Nombre', sortable: true },
    { 
      key: 'id_planta', 
      label: 'Planta',
      sortable: true,
      render: (value: number) => getPlantaNombre(value)
    },
    { key: 'modelo', label: 'Modelo' },
    { 
      key: 'estado', 
      label: 'Estado',
      render: (value: string) => getEstadoBadge(value)
    },
    { 
      key: 'ultima_calibracion', 
      label: 'Última Calibración',
      render: (value: string) => value || <span className="text-muted"><i className="bi bi-calendar-x me-1"></i>Nunca</span>
    },
  ];

  // Mostrar spinner mientras se cargan los datos
  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '400px' }}>
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  return (
    <>
      {/* Cabecera de la página */}
      <div className="mb-4">
        <Breadcrumbs />
        <h3 className="fw-bold mb-1 mt-2">
          <i className="bi bi-cpu me-2 text-primary"></i>
          Gestión de Sensores
        </h3>
        <p className="text-muted">
          Administración de sensores, umbrales y calibraciones
          {empresaId && empresaNombre && (
            <span className="ms-2 text-info">
              <i className="bi bi-building me-1"></i>
              Empresa: {empresaNombre}
            </span>
          )}
          {esSuperAdmin && !empresaId && (
            <span className="ms-2 text-warning">
              <i className="bi bi-eye me-1"></i>
              Viendo todas las empresas
            </span>
          )}
        </p>
        {sensores.length === 0 && (
          <div className="alert alert-info mt-2">
            <i className="bi bi-info-circle me-2"></i>
            No hay sensores disponibles para tu empresa. Crea un nuevo sensor o selecciona otra empresa.
          </div>
        )}
      </div>

      {/* Tabla de sensores */}
      <PaginatedTable
        title="Lista de Sensores"
        columns={columns}
        data={sensores}
        onEdit={handleOpenModal}
        onDelete={handleDelete}
        addButtonText="Nuevo Sensor"
        onAdd={() => handleOpenModal()}
        pageSize={10}
        searchable
        searchPlaceholder="Buscar por nombre, modelo..."
        onRowClick={cargarDetallesSensor}
      />

      {/* Detalles del sensor seleccionado */}
      {selectedSensor && (
        <Card className="border-0 shadow-sm mt-4">
          <Card.Header className="bg-white border-0 pt-3">
            <div className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0">
                <i className="bi bi-info-circle me-2"></i>
                Detalles del Sensor: {selectedSensor.nombre}
              </h5>
              <div>
                <Badge bg="secondary" className="me-2">
                  <i className="bi bi-building me-1"></i>
                  {getPlantaNombre(selectedSensor.id_planta)}
                </Badge>
                {getEstadoBadge(selectedSensor.estado)}
                <Button 
                  size="sm" 
                  variant="outline-secondary" 
                  className="ms-2"
                  onClick={() => setSelectedSensor(null)}
                >
                  <i className="bi bi-x-lg"></i> Cerrar
                </Button>
              </div>
            </div>
          </Card.Header>
          <Card.Body>
            <Tabs
              activeKey={activeTab}
              onSelect={(k) => setActiveTab(k || 'detalles')}
              className="mb-3"
            >
              <Tab eventKey="detalles" title={<><i className="bi bi-info-circle me-1"></i>Detalles</>}>
                <SensorDetalles sensor={selectedSensor} />
              </Tab>
              <Tab eventKey="umbrales" title={<><i className="bi bi-exclamation-triangle me-1"></i>Umbrales</>}>
                <SensorUmbrales
                  umbrales={umbrales}
                  onAdd={handleOpenUmbralModal}
                  onDelete={handleDeleteUmbral}
                />
              </Tab>
              <Tab eventKey="calibraciones" title={<><i className="bi bi-tools me-1"></i>Calibraciones</>}>
                <SensorCalibraciones calibraciones={calibraciones} />
              </Tab>
              <Tab eventKey="historial" title={<><i className="bi bi-clock-history me-1"></i>Historial</>}>
                <SensorHistorial historial={historialUmbrales} />
              </Tab>
            </Tabs>
          </Card.Body>
        </Card>
      )}

      {/* Modal para crear/editar sensor */}
      <SensorModal
        show={showModal}
        onHide={() => setShowModal(false)}
        onSave={handleSave}
        editingSensor={editingSensor}
        formData={formData}
        setFormData={setFormData}
        plantas={plantas}
        loading={loadingModal}
      />

      {/* Modal para crear umbral */}
      <UmbralModal
        show={showUmbralModal}
        onHide={() => setShowUmbralModal(false)}
        onSave={handleSaveUmbral}
        formData={umbralForm}
        setFormData={setUmbralForm}
        loading={loadingModal}
      />
    </>
  );
}