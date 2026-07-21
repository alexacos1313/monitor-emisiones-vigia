import { useState, useEffect } from 'react';
import { Card, Badge, Button, Spinner, Alert, Modal, Form } from 'react-bootstrap';
import PaginatedTable from '../components/ui/PaginatedTable';
import { mantenimientoService, Mantenimiento, MantenimientoProgramado } from '../services/mantenimiento.service';
import { sensorService, Sensor } from '../services/sensor.service';
import { showSuccess, showError, showWarning, showInfo } from '../services/toast.service';
import Breadcrumbs from '../components/ui/Breadcrumbs';
import { useAuth } from '../context/AuthContext';
import { useEmpresaId } from '../hooks/useEmpresaId';

// Definición de tipos para prioridad y tipo de mantenimiento
type PrioridadType = 'ALTA' | 'MEDIA' | 'BAJA';
type TipoMantenimientoType = 'PREVENTIVO' | 'CORRECTIVO' | 'CALIBRACION';

export default function MantenimientoPage() {
  // Estados del componente
  const [mantenimientos, setMantenimientos] = useState<Mantenimiento[]>([]);
  const [programados, setProgramados] = useState<MantenimientoProgramado[]>([]);
  const [vencidos, setVencidos] = useState<MantenimientoProgramado[]>([]);
  const [sensores, setSensores] = useState<Sensor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingMantenimiento, setEditingMantenimiento] = useState<MantenimientoProgramado | null>(null);
  
  // Obtener usuario y empresa seleccionada
  const { user } = useAuth();
  const empresaId = useEmpresaId();
  const esSuperAdmin = user?.rol === 'SUPER_ADMIN';

  // Datos del formulario para crear/editar mantenimientos
  const [formData, setFormData] = useState<{
    id_sensor: number;
    fecha_programada: string;
    tipo: TipoMantenimientoType;
    descripcion: string;
    prioridad: PrioridadType;
  }>({
    id_sensor: 0,
    fecha_programada: '',
    tipo: 'PREVENTIVO',
    descripcion: '',
    prioridad: 'MEDIA'
  });

  // Cargar datos al montar el componente
  useEffect(() => {
    cargarDatos();
  }, []);

  // Verificar mantenimientos pendientes y mostrar notificaciones
  useEffect(() => {
    if (!loading && programados.length > 0) {
      const hoy = new Date().toISOString().split('T')[0];
      const vencidosList = programados.filter(p => p.fecha_programada < hoy && p.estado === 'PENDIENTE');
      const hoyMantenimientos = programados.filter(p => p.fecha_programada === hoy && p.estado === 'PENDIENTE');
      const proximos = programados.filter(p => {
        const diff = Math.ceil((new Date(p.fecha_programada).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
        return diff > 0 && diff <= 3 && p.estado === 'PENDIENTE';
      });
      
      // Mostrar notificaciones según el estado
      if (vencidosList.length > 0) {
        showError(`${vencidosList.length} mantenimiento(s) VENCIDO(S) requieren atención`);
      }
      if (hoyMantenimientos.length > 0) {
        showWarning(`${hoyMantenimientos.length} mantenimiento(s) programados para HOY`);
      }
      if (proximos.length > 0 && !vencidosList.length && !hoyMantenimientos.length) {
        showInfo(`${proximos.length} mantenimiento(s) programados en los próximos días`);
      }
    }
  }, [loading, programados]);

  // Función para cargar todos los datos desde el servidor
  const cargarDatos = async () => {
    setLoading(true);
    try {
      // Cargar sensores con filtro de empresa
      let sensoresData;

      console.log(' [MANTENIMIENTO] empresaId:', empresaId);
      console.log(' [MANTENIMIENTO] esSuperAdmin:', esSuperAdmin);
      console.log(' [MANTENIMIENTO] user:', user);
      
      if (esSuperAdmin) {
        // SUPER_ADMIN: usar empresa seleccionada o todos
        if (empresaId) {
          sensoresData = await sensorService.getSensores(undefined, empresaId);
        } else {
          sensoresData = await sensorService.getSensores();
        }
      } else {
        // EMPRESA_ADMIN o TECNICO: usar su empresa
        sensoresData = await sensorService.getSensores(undefined, user?.id_empresa);
      }
      
      // Filtrar solo sensores ACTIVOS para el combo
      const sensoresActivos = sensoresData.filter(s => s.estado === 'ACTIVO');
      
      // Cargar el resto de datos
      const [mantenimientosData, programadosData, vencidosData] = await Promise.all([
        mantenimientoService.getMantenimientos(),
        mantenimientoService.getMantenimientosProgramados(),
        mantenimientoService.getMantenimientosVencidos()
      ]);
      
      setMantenimientos(mantenimientosData);
      setProgramados(programadosData);
      setVencidos(vencidosData);
      setSensores(sensoresActivos);
      
    } catch (error) {
      console.error('Error cargando datos:', error);
      showError('Error cargando datos');
    } finally {
      setLoading(false);
    }
  };

  // Abrir el modal para crear o editar un mantenimiento
  const handleOpenModal = (mantenimiento?: MantenimientoProgramado) => {
    if (mantenimiento) {
      // Editar mantenimiento existente
      setEditingMantenimiento(mantenimiento);
      setFormData({
        id_sensor: mantenimiento.id_sensor,
        fecha_programada: mantenimiento.fecha_programada,
        tipo: mantenimiento.tipo as TipoMantenimientoType,
        descripcion: mantenimiento.descripcion,
        prioridad: mantenimiento.prioridad as PrioridadType
      });
    } else {
      // Crear nuevo mantenimiento
      setEditingMantenimiento(null);
      setFormData({
        id_sensor: 0,
        fecha_programada: new Date().toISOString().split('T')[0],
        tipo: 'PREVENTIVO',
        descripcion: '',
        prioridad: 'MEDIA'
      });
    }
    setShowModal(true);
  };

  // Guardar un mantenimiento (crear o actualizar)
  const handleSave = async () => {
    // Validar campos obligatorios
    if (!formData.id_sensor) {
      showError('Seleccione un sensor');
      return;
    }
    if (!formData.fecha_programada) {
      showError('Seleccione una fecha');
      return;
    }
    if (!formData.descripcion) {
      showError('Ingrese una descripción');
      return;
    }

    try {
      if (editingMantenimiento) {
        // Actualizar mantenimiento existente
        await mantenimientoService.actualizarMantenimientoProgramado(editingMantenimiento.id, formData);
        showSuccess('Mantenimiento actualizado');
      } else {
        // Crear nuevo mantenimiento
        await mantenimientoService.crearMantenimientoProgramado(formData);
        showSuccess('Mantenimiento programado');
      }
      setShowModal(false);
      cargarDatos();
    } catch (error) {
      console.error('Error al guardar:', error);
      showError('Error al guardar');
    }
  };

  // Completar un mantenimiento programado (lo mueve al historial)
  const handleCompletarProgramado = async (mantenimiento: MantenimientoProgramado) => {
    if (window.confirm(`¿Confirmar que se realizó el mantenimiento de ${mantenimiento.sensor_nombre}?`)) {
      try {
        await mantenimientoService.completarMantenimientoProgramado(mantenimiento.id);
        showSuccess('Mantenimiento completado y movido al historial');
        cargarDatos();
      } catch (error) {
        console.error('Error al completar:', error);
        showError('Error al completar');
      }
    }
  };

  // Cancelar un mantenimiento programado
  const handleCancelar = async (mantenimiento: MantenimientoProgramado) => {
    if (window.confirm(`¿Cancelar el mantenimiento de ${mantenimiento.sensor_nombre}?`)) {
      try {
        await mantenimientoService.cancelarMantenimiento(mantenimiento.id);
        showSuccess('Mantenimiento cancelado');
        cargarDatos();
      } catch (error) {
        console.error('Error al cancelar:', error);
        showError('Error al cancelar');
      }
    }
  };

  // Eliminar un mantenimiento programado (lo elimina permanentemente)
  const handleEliminarProgramado = async (mantenimiento: MantenimientoProgramado) => {
    if (window.confirm(`¿Eliminar permanentemente el mantenimiento de ${mantenimiento.sensor_nombre}?`)) {
      try {
        await mantenimientoService.eliminarMantenimientoProgramado(mantenimiento.id);
        showSuccess('Mantenimiento eliminado permanentemente');
        cargarDatos();
      } catch (error) {
        console.error('Error al eliminar:', error);
        showError('Error al eliminar');
      }
    }
  };

  // Determinar el estado de una fecha programada
  const getFechaEstado = (fecha: string): { texto: string; variante: string; icono: string } => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const fechaProgramada = new Date(fecha);
    fechaProgramada.setHours(0, 0, 0, 0);
    
    const diffDias = Math.ceil((fechaProgramada.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDias < 0) {
      return { texto: 'VENCIDO', variante: 'danger', icono: 'bi-exclamation-triangle-fill' };
    } else if (diffDias === 0) {
      return { texto: 'HOY', variante: 'warning', icono: 'bi-calendar-day' };
    } else if (diffDias <= 3) {
      return { texto: `PRÓXIMO (${diffDias} días)`, variante: 'info', icono: 'bi-calendar-event' };
    } else {
      return { texto: 'Programado', variante: 'secondary', icono: 'bi-calendar-check' };
    }
  };

  // Obtener el badge de prioridad
  const getPrioridadBadge = (prioridad: string) => {
    const config: any = {
      'ALTA': { bg: 'danger', icon: 'bi-exclamation-triangle-fill' },
      'MEDIA': { bg: 'warning', icon: 'bi-clock-history' },
      'BAJA': { bg: 'success', icon: 'bi-check-circle' }
    };
    const c = config[prioridad] || { bg: 'secondary', icon: 'bi-question-circle' };
    return <Badge bg={c.bg}><i className={`${c.icon} me-1`}></i>{prioridad}</Badge>;
  };

  // Obtener el badge de estado
  const getEstadoBadge = (estado: string) => {
    const config: any = {
      'PENDIENTE': { bg: 'warning', icon: 'bi-clock' },
      'EN_PROGRESO': { bg: 'info', icon: 'bi-arrow-repeat' },
      'COMPLETADO': { bg: 'success', icon: 'bi-check-circle' },
      'CANCELADO': { bg: 'secondary', icon: 'bi-x-circle' }
    };
    const c = config[estado] || { bg: 'secondary', icon: 'bi-question-circle' };
    return <Badge bg={c.bg}><i className={`${c.icon} me-1`}></i>{estado}</Badge>;
  };

  // Obtener el badge de tipo de mantenimiento
  const getTipoBadge = (tipo: string) => {
    const config: any = {
      'PREVENTIVO': { bg: 'info', icon: 'bi-shield-check' },
      'CORRECTIVO': { bg: 'warning', icon: 'bi-tools' },
      'CALIBRACION': { bg: 'success', icon: 'bi-arrow-repeat' }
    };
    const c = config[tipo] || { bg: 'secondary', icon: 'bi-question-circle' };
    return <Badge bg={c.bg}><i className={`${c.icon} me-1`}></i>{tipo}</Badge>;
  };

  // Definición de columnas para la tabla de mantenimientos programados
  // Incluye columna de acciones personalizada con todos los botones
  const programadosColumns = [
    { 
      key: 'fecha_programada', 
      label: 'Fecha',
      sortable: true,
      render: (value: string, item: MantenimientoProgramado) => {
        const estado = getFechaEstado(value);
        return (
          <div>
            <div>{new Date(value).toLocaleDateString()}</div>
            {item.estado === 'PENDIENTE' && (
              <Badge bg={estado.variante} className="mt-1">
                <i className={`${estado.icono} me-1`}></i>
                {estado.texto}
              </Badge>
            )}
          </div>
        );
      }
    },
    { key: 'sensor_nombre', label: 'Sensor', sortable: true },
    { key: 'tipo', label: 'Tipo', render: (value: string) => getTipoBadge(value) },
    { key: 'prioridad', label: 'Prioridad', render: (value: string) => getPrioridadBadge(value) },
    { key: 'estado', label: 'Estado', render: (value: string) => getEstadoBadge(value) },
    { key: 'descripcion', label: 'Descripción', render: (value: string) => <small>{value}</small> },
    { 
      key: 'acciones', 
      label: 'Acciones',
      render: (_: any, item: MantenimientoProgramado) => {
        // Si está pendiente, mostrar todos los botones
        if (item.estado === 'PENDIENTE') {
          return (
            <div className="d-flex gap-1 flex-wrap">
              <Button 
                size="sm" 
                variant="success" 
                onClick={() => handleCompletarProgramado(item)} 
                title="Marcar como completado (pasa al historial)"
              >
                <i className="bi bi-check-lg"></i>
              </Button>
              <Button 
                size="sm" 
                variant="outline-danger" 
                onClick={() => handleCancelar(item)} 
                title="Cancelar"
              >
                <i className="bi bi-x-lg"></i>
              </Button>
              <Button 
                size="sm" 
                variant="outline-primary" 
                onClick={() => handleOpenModal(item)} 
                title="Editar"
              >
                <i className="bi bi-pencil"></i>
              </Button>
              <Button 
                size="sm" 
                variant="outline-secondary" 
                onClick={() => handleEliminarProgramado(item)} 
                title="Eliminar permanentemente"
              >
                <i className="bi bi-trash"></i>
              </Button>
            </div>
          );
        }
        
        // Si está completado, mostrar mensaje
        if (item.estado === 'COMPLETADO') {
          return (
            <span className="text-success">
              <i className="bi bi-check-circle-fill me-1"></i>
              Completado
            </span>
          );
        }
        
        // Si está cancelado, mostrar mensaje
        if (item.estado === 'CANCELADO') {
          return (
            <span className="text-secondary">
              <i className="bi bi-x-circle-fill me-1"></i>
              Cancelado
            </span>
          );
        }
        
        // Si está en progreso, mostrar mensaje
        return (
          <span className="text-info">
            <i className="bi bi-arrow-repeat me-1"></i>
            En progreso
          </span>
        );
      }
    },
  ];

  // Definición de columnas para el historial de mantenimientos (solo lectura)
  const historialColumns = [
    { 
      key: 'fecha', 
      label: 'Fecha',
      sortable: true,
      render: (value: string) => new Date(value).toLocaleDateString()
    },
    { key: 'sensor_nombre', label: 'Sensor', sortable: true },
    { key: 'tipo', label: 'Tipo', render: (value: string) => getTipoBadge(value) },
    { key: 'tecnico', label: 'Técnico' },
    { key: 'observaciones', label: 'Observaciones', render: (value: string) => <small>{value}</small> },
    { 
      key: 'completado', 
      label: 'Estado',
      render: (value: boolean) => value ? (
        <Badge bg="success"><i className="bi bi-check-circle me-1"></i>Completado</Badge>
      ) : (
        <Badge bg="warning"><i className="bi bi-clock me-1"></i>Pendiente</Badge>
      )
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

  // Verificar si hay mantenimientos vencidos
  const hayVencidos = programados.some(p => {
    const hoy = new Date().toISOString().split('T')[0];
    return p.fecha_programada < hoy && p.estado === 'PENDIENTE';
  });

  // Verificar si hay mantenimientos para hoy
  const hayHoy = programados.some(p => {
    const hoy = new Date().toISOString().split('T')[0];
    return p.fecha_programada === hoy && p.estado === 'PENDIENTE';
  });

  // Verificar si hay sensores activos disponibles
  const sensoresActivos = sensores.filter(s => s.estado === 'ACTIVO');

  return (
    <>
      {/* Cabecera de la página */}
      <div className="mb-4">
        <Breadcrumbs />
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <h3 className="fw-bold mb-1">
              <i className="bi bi-calendar-check me-2 text-primary"></i>
              Mantenimiento Programado
            </h3>
            <p className="text-muted">Gestionar mantenimientos y calibraciones de sensores</p>
          </div>
          <Button variant="primary" onClick={() => handleOpenModal()}>
            <i className="bi bi-plus-lg me-1"></i>Programar Mantenimiento
          </Button>
        </div>
      </div>

      {/* Alerta de mantenimientos vencidos */}
      {vencidos.length > 0 && (
        <Alert variant="danger" className="mb-4">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          <strong>Atención!</strong> Hay {vencidos.length} mantenimiento(s) vencido(s) que requieren atención.
        </Alert>
      )}

      {/* Alerta si no hay sensores activos */}
      {sensoresActivos.length === 0 && (
        <Alert variant="warning" className="mb-4">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          <strong>Sin sensores activos</strong> No hay sensores activos disponibles en su empresa para programar mantenimientos.
          {esSuperAdmin && !empresaId && (
            <span> Seleccione una empresa para ver sus sensores.</span>
          )}
        </Alert>
      )}

      {/* Tabla de mantenimientos programados */}
      <Card className="border-0 shadow-sm mb-4">
        <Card.Header className="bg-white border-0 pt-3">
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0">
              <i className="bi bi-calendar-event me-2 text-warning"></i>
              Mantenimientos Programados
              <Badge bg="secondary" className="ms-2">{programados.length}</Badge>
            </h5>
            {hayVencidos && (
              <Badge bg="danger" className="p-2">
                <i className="bi bi-exclamation-triangle-fill me-1"></i>
                Hay vencidos
              </Badge>
            )}
            {hayHoy && !hayVencidos && (
              <Badge bg="warning" className="p-2">
                <i className="bi bi-calendar-day me-1"></i>
                Hay para hoy
              </Badge>
            )}
          </div>
        </Card.Header>
        <PaginatedTable
          columns={programadosColumns}
          data={programados}
          pageSize={10}
          searchable
          searchPlaceholder="Buscar por sensor..."
          showActions={false}
        />
      </Card>

      {/* Tabla de historial de mantenimientos */}
      <Card className="border-0 shadow-sm">
        <Card.Header className="bg-white border-0 pt-3">
          <h5 className="mb-0">
            <i className="bi bi-clock-history me-2 text-info"></i>
            Historial de Mantenimientos
            <Badge bg="secondary" className="ms-2">{mantenimientos.length}</Badge>
          </h5>
        </Card.Header>
        <PaginatedTable
          columns={historialColumns}
          data={mantenimientos}
          pageSize={10}
          searchable
          searchPlaceholder="Buscar por sensor, técnico..."
          showActions={false}
        />
      </Card>

      {/* Modal para crear o editar un mantenimiento */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-calendar-plus me-2"></i>
            {editingMantenimiento ? 'Editar Mantenimiento' : 'Programar Mantenimiento'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Sensor *</Form.Label>
              <Form.Select
                value={formData.id_sensor}
                onChange={(e) => setFormData({ ...formData, id_sensor: Number(e.target.value) })}
                disabled={sensoresActivos.length === 0}
              >
                <option value="">Seleccione un sensor</option>
                {sensoresActivos.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.nombre} {s.planta_nombre ? `(${s.planta_nombre})` : ''}
                  </option>
                ))}
              </Form.Select>
              {sensoresActivos.length === 0 && (
                <Form.Text className="text-warning">
                  <i className="bi bi-exclamation-triangle me-1"></i>
                  No hay sensores activos disponibles para programar mantenimiento
                </Form.Text>
              )}
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Fecha Programada *</Form.Label>
              <Form.Control
                type="date"
                value={formData.fecha_programada}
                onChange={(e) => setFormData({ ...formData, fecha_programada: e.target.value })}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Tipo de Mantenimiento *</Form.Label>
              <Form.Select
                value={formData.tipo}
                onChange={(e) => setFormData({ ...formData, tipo: e.target.value as TipoMantenimientoType })}
              >
                <option value="PREVENTIVO">Preventivo</option>
                <option value="CORRECTIVO">Correctivo</option>
                <option value="CALIBRACION">Calibración</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Prioridad *</Form.Label>
              <Form.Select
                value={formData.prioridad}
                onChange={(e) => setFormData({ ...formData, prioridad: e.target.value as PrioridadType })}
              >
                <option value="BAJA">Baja</option>
                <option value="MEDIA">Media</option>
                <option value="ALTA">Alta</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Descripción *</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                placeholder="Describa las tareas a realizar..."
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>Cancelar</Button>
          <Button variant="primary" onClick={handleSave}>Guardar</Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}