// frontend/src/pages/MiEmpresaPage.tsx
import { useState, useEffect } from 'react';
import {
  Card, Form, Button, Spinner, Badge,
  Row, Col, Modal, Tab, Tabs
} from 'react-bootstrap';
import PaginatedTable from '../components/ui/PaginatedTable';
import { empresaService, Empresa } from '../services/empresa.service';
import { plantaService, Planta } from '../services/planta.service';
import { ubicacionService, Ubicacion } from '../services/ubicacion.service';
import { useEmpresaId } from '../hooks/useEmpresaId';
import toast from 'react-hot-toast';
import Breadcrumbs from '../components/ui/Breadcrumbs';

export default function MiEmpresaPage() {
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [plantas, setPlantas] = useState<Planta[]>([]);
  const [ubicaciones, setUbicaciones] = useState<Ubicacion[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modales
  const [showEmpresaModal, setShowEmpresaModal] = useState(false);
  const [showPlantaModal, setShowPlantaModal] = useState(false);
  const [showUbicacionModal, setShowUbicacionModal] = useState(false);
  const [editingPlanta, setEditingPlanta] = useState<Planta | null>(null);
  const [editingUbicacion, setEditingUbicacion] = useState<Ubicacion | null>(null);
  
  // Formularios
  const [empresaForm, setEmpresaForm] = useState({
    nombre: '',
    cif: '',
    direccion_social: '',
    telefono: '',
    email: ''
  });
  
  //  Formulario de planta con campos de ubicación integrados
  const [plantaForm, setPlantaForm] = useState({
    nombre: '',
    direccion: '',
    actividad: '',
    // Campos de ubicación
    provincia: '',
    municipio: '',
    distrito: '',
    codigo_postal: '',
    latitud: '',
    longitud: ''
  });
  
  const [ubicacionForm, setUbicacionForm] = useState({
    provincia: '',
    municipio: '',
    distrito: '',
    codigo_postal: '',
    latitud: '',
    longitud: ''
  });

  const empresaId = useEmpresaId();

  useEffect(() => {
    cargarDatos();
  }, [empresaId]);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      console.log('📌 empresaId desde hook:', empresaId);
      
      if (empresaId) {
        const empresaData = await empresaService.getEmpresa(empresaId);
        if (empresaData) {
          setEmpresa(empresaData);
          setEmpresaForm({
            nombre: empresaData.nombre,
            cif: empresaData.cif,
            direccion_social: empresaData.direccion_social,
            telefono: empresaData.telefono,
            email: empresaData.email
          });
        }
        
        const [plantasData, ubicacionesData] = await Promise.all([
          plantaService.getPlantas(empresaId),
          ubicacionService.getUbicaciones(empresaId)
        ]);
        setPlantas(plantasData);
        setUbicaciones(ubicacionesData);
      } else {
        toast.error('No se encontró empresa seleccionada');
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
      toast.error('Error cargando datos');
    } finally {
      setLoading(false);
    }
  };

  // ============ EMPRESA ============
  const handleUpdateEmpresa = async () => {
    if (!empresa) return;
    try {
      await empresaService.updateEmpresa(empresa.id, empresaForm);
      toast.success('Empresa actualizada');
      setShowEmpresaModal(false);
      cargarDatos();
    } catch (error) {
      toast.error('Error al guardar');
    }
  };

  // ============ PLANTAS ============
  const handleTogglePlanta = async (planta: Planta) => {
    const nuevaAccion = planta.activo === 1 ? 'desactivar' : 'reactivar';
    if (window.confirm(`¿${nuevaAccion === 'desactivar' ? 'Desactivar' : 'Reactivar'} la planta "${planta.nombre}"?`)) {
      try {
        const data = { 
          activo: planta.activo === 1 ? 0 : 1
        };
        console.log('📌 Enviando a updatePlanta:', data); 
        
        await plantaService.updatePlanta(planta.id, data);
        toast.success(`Planta ${nuevaAccion === 'desactivar' ? 'desactivada' : 'reactivada'}`);
        cargarDatos();
      } catch (error) {
        console.error('Error:', error);  
        toast.error('Error al cambiar estado');
      }
    }
  };

  //  Al abrir el modal de edición, cargar los datos de la ubicación
  const handleOpenPlantaModal = async (planta?: Planta) => {
    if (planta) {
      setEditingPlanta(planta);
      
      //  Buscar la ubicación de la planta
      let ubicacionData = { provincia: '', municipio: '', distrito: '', codigo_postal: '', latitud: '', longitud: '' };
      
      if (planta.id_ubicacion) {
        const ubicacion = ubicaciones.find(u => u.id === planta.id_ubicacion);
        if (ubicacion) {
          ubicacionData = {
            provincia: ubicacion.provincia,
            municipio: ubicacion.municipio,
            distrito: ubicacion.distrito || '',
            codigo_postal: ubicacion.codigo_postal || '',
            latitud: ubicacion.latitud?.toString() || '',
            longitud: ubicacion.longitud?.toString() || ''
          };
        }
      }
      
      setPlantaForm({
        nombre: planta.nombre,
        direccion: planta.direccion || '',
        actividad: planta.actividad || '',
        provincia: ubicacionData.provincia,
        municipio: ubicacionData.municipio,
        distrito: ubicacionData.distrito,
        codigo_postal: ubicacionData.codigo_postal,
        latitud: ubicacionData.latitud,
        longitud: ubicacionData.longitud
      });
    } else {
      setEditingPlanta(null);
      setPlantaForm({
        nombre: '',
        direccion: '',
        actividad: '',
        provincia: '',
        municipio: '',
        distrito: '',
        codigo_postal: '',
        latitud: '',
        longitud: ''
      });
    }
    setShowPlantaModal(true);
  };

  //  Guardar planta (crea o actualiza ubicación)
  const handleSavePlanta = async () => {
    if (!empresa) return;
    if (!plantaForm.nombre) {
      toast.error('El nombre de la planta es obligatorio');
      return;
    }
    if (!plantaForm.provincia || !plantaForm.municipio) {
      toast.error('Provincia y Municipio son obligatorios');
      return;
    }

    try {
      let ubicacionId = editingPlanta?.id_ubicacion || null;
      
      //  Si estamos editando y tiene ubicación, actualizarla
      if (ubicacionId) {
        // Buscar la ubicación existente
        const ubicacionExistente = ubicaciones.find(u => u.id === ubicacionId);
        if (ubicacionExistente) {
          // Actualizar ubicación existente
          const ubicacionData = {
            provincia: plantaForm.provincia,
            municipio: plantaForm.municipio,
            distrito: plantaForm.distrito || '',
            codigo_postal: plantaForm.codigo_postal || '',
            latitud: plantaForm.latitud ? parseFloat(plantaForm.latitud) : undefined,
            longitud: plantaForm.longitud ? parseFloat(plantaForm.longitud) : undefined
          };
          await ubicacionService.updateUbicacion(ubicacionId, ubicacionData);
        }
      } else {
        //  Crear nueva ubicación
        const ubicacionData = {
          provincia: plantaForm.provincia,
          municipio: plantaForm.municipio,
          distrito: plantaForm.distrito || '',
          codigo_postal: plantaForm.codigo_postal || '',
          latitud: plantaForm.latitud ? parseFloat(plantaForm.latitud) : undefined,
          longitud: plantaForm.longitud ? parseFloat(plantaForm.longitud) : undefined
        };
        const nuevaUbicacion = await ubicacionService.createUbicacion(ubicacionData);
        ubicacionId = nuevaUbicacion.id;
      }
      
      //  Crear o actualizar planta
      const plantaData = {
        nombre: plantaForm.nombre,
        direccion: plantaForm.direccion || '',
        actividad: plantaForm.actividad || '',
        id_empresa: empresa.id,
        id_ubicacion: ubicacionId
      };

      if (editingPlanta) {
        await plantaService.updatePlanta(editingPlanta.id, plantaData);
        toast.success('Planta actualizada');
      } else {
        await plantaService.createPlanta(plantaData);
        toast.success('Planta creada');
      }
      setShowPlantaModal(false);
      cargarDatos();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al guardar planta');
    }
  };

  const handleDeletePlanta = async (planta: Planta) => {
    if (window.confirm(`¿Eliminar la planta "${planta.nombre}"?`)) {
      try {
        await plantaService.deletePlanta(planta.id);
        toast.success('Planta desactivada');
        cargarDatos();
      } catch (error) {
        toast.error('Error al eliminar');
      }
    }
  };

  // ============ UBICACIONES ============
  const handleOpenUbicacionModal = (ubicacion?: Ubicacion) => {
    if (ubicacion) {
      setEditingUbicacion(ubicacion);
      setUbicacionForm({
        provincia: ubicacion.provincia,
        municipio: ubicacion.municipio,
        distrito: ubicacion.distrito || '',
        codigo_postal: ubicacion.codigo_postal || '',
        latitud: ubicacion.latitud?.toString() || '',
        longitud: ubicacion.longitud?.toString() || ''
      });
    } else {
      setEditingUbicacion(null);
      setUbicacionForm({
        provincia: '',
        municipio: '',
        distrito: '',
        codigo_postal: '',
        latitud: '',
        longitud: ''
      });
    }
    setShowUbicacionModal(true);
  };

  const handleSaveUbicacion = async () => {
    if (!empresa || !ubicacionForm.provincia || !ubicacionForm.municipio) {
      toast.error('Provincia y Municipio son obligatorios');
      return;
    }

    try {
      const data = {
        provincia: ubicacionForm.provincia,
        municipio: ubicacionForm.municipio,
        distrito: ubicacionForm.distrito,
        codigo_postal: ubicacionForm.codigo_postal,
        latitud: ubicacionForm.latitud ? parseFloat(ubicacionForm.latitud) : undefined,
        longitud: ubicacionForm.longitud ? parseFloat(ubicacionForm.longitud) : undefined
      };

      if (editingUbicacion) {
        await ubicacionService.updateUbicacion(editingUbicacion.id, data);
        toast.success('Ubicación actualizada');
      } else {
        await ubicacionService.createUbicacion(data);
        toast.success('Ubicación creada');
      }
      setShowUbicacionModal(false);
      cargarDatos();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al guardar ubicación');
    }
  };


  // ============ COLUMNAS ============
  const columnsPlantas = [
    { key: 'id', label: 'ID', width: '60px', sortable: true },
    { key: 'nombre', label: 'Nombre', sortable: true },
    { key: 'direccion', label: 'Dirección', render: (value: string) => value || '-' },
    { key: 'actividad', label: 'Actividad', render: (value: string) => value || '-' },
    {
      key: 'ubicacion',
      label: 'Ubicación',
      render: (_: any, item: Planta) => {
        const ubicacion = ubicaciones.find(u => u.id === item.id_ubicacion);
        return ubicacion ? `${ubicacion.municipio}, ${ubicacion.provincia}` : '-';
      }
    },
    { 
      key: 'fecha_alta', 
      label: 'Fecha Alta',
      sortable: true,
      render: (value: string) => new Date(value).toLocaleDateString()
    },
    { 
      key: 'activo', 
      label: 'Estado',
      sortable: true,
      render: (value: number, item: Planta) => (
        <Badge 
          bg={value === 1 ? 'success' : 'secondary'}
          style={{ cursor: 'pointer' }}
          onClick={() => handleTogglePlanta(item)}
        >
          <i className={`bi ${value === 1 ? 'bi-check-circle-fill' : 'bi-x-circle-fill'} me-1`}></i>
          {value === 1 ? 'Activa' : 'Inactiva'}
        </Badge>
      )
    },
  ];

  const columnsUbicaciones = [
    { key: 'id', label: 'ID', width: '60px' },
    { key: 'provincia', label: 'Provincia', sortable: true },
    { key: 'municipio', label: 'Municipio', sortable: true },
    { key: 'distrito', label: 'Distrito' },
    { key: 'codigo_postal', label: 'Código Postal' },
    { key: 'latitud', label: 'Latitud' },
    { key: 'longitud', label: 'Longitud' },
  ];

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '400px' }}>
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  if (!empresa) {
    return (
      <div className="text-center py-5">
        <i className="bi bi-building fs-1 text-muted"></i>
        <h5 className="mt-3">No hay datos de empresa</h5>
        <p className="text-muted">Contacte con el administrador</p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-4">
        <Breadcrumbs />
        <h3 className="fw-bold mb-1">
          <i className="bi bi-building me-2 text-primary"></i>
          Mi Empresa
        </h3>
        <p className="text-muted">Información de la empresa y gestión de plantas y ubicaciones</p>
      </div>

      {/* Datos de la empresa */}
      <Card className="border-0 shadow-sm mb-4">
        <Card.Header className="bg-white border-0 pt-3">
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0">
              <i className="bi bi-info-circle me-2"></i>
              Datos de la Empresa
            </h5>
            <Button size="sm" variant="outline-primary" onClick={() => setShowEmpresaModal(true)}>
              <i className="bi bi-pencil me-1"></i>Editar
            </Button>
          </div>
        </Card.Header>
        <Card.Body>
          <Row>
            <Col md={6}>
              <p className="mb-2"><strong>Nombre:</strong> {empresa.nombre}</p>
              <p className="mb-2"><strong>CIF:</strong> {empresa.cif}</p>
              <p className="mb-2"><strong>Dirección:</strong> {empresa.direccion_social || '-'}</p>
            </Col>
            <Col md={6}>
              <p className="mb-2"><strong>Teléfono:</strong> {empresa.telefono || '-'}</p>
              <p className="mb-2"><strong>Email:</strong> {empresa.email || '-'}</p>
              <p className="mb-2"><strong>Registro:</strong> {new Date(empresa.fecha_registro).toLocaleDateString()}</p>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Tabs para Plantas y Ubicaciones */}
      <Card className="border-0 shadow-sm">
        <Tabs defaultActiveKey="plantas" className="mb-3">
          <Tab eventKey="plantas" title="Plantas Industriales">
            <PaginatedTable
              title=""
              columns={columnsPlantas}
              data={plantas}
              onEdit={handleOpenPlantaModal}
              onDelete={handleDeletePlanta}
              addButtonText="Nueva Planta"
              onAdd={() => handleOpenPlantaModal()}
              pageSize={10}
              searchable
              searchPlaceholder="Buscar por nombre, dirección..."
            />
          </Tab>
          <Tab eventKey="ubicaciones" title="Ubicaciones">
            <PaginatedTable
              title=""
              columns={columnsUbicaciones}
              data={ubicaciones}
              onEdit={handleOpenUbicacionModal}
              addButtonText="Nueva Ubicación"
              onAdd={() => handleOpenUbicacionModal()}
              pageSize={10}
              searchable
              searchPlaceholder="Buscar por provincia, municipio..."
            />
          </Tab>
        </Tabs>
      </Card>

      {/* Modal Editar Empresa (sin cambios) */}
      <Modal show={showEmpresaModal} onHide={() => setShowEmpresaModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title><i className="bi bi-building me-2"></i>Editar Empresa</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Nombre *</Form.Label>
              <Form.Control type="text" value={empresaForm.nombre} onChange={(e) => setEmpresaForm({ ...empresaForm, nombre: e.target.value })} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>CIF *</Form.Label>
              <Form.Control type="text" value={empresaForm.cif} onChange={(e) => setEmpresaForm({ ...empresaForm, cif: e.target.value })} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Dirección Social</Form.Label>
              <Form.Control type="text" value={empresaForm.direccion_social} onChange={(e) => setEmpresaForm({ ...empresaForm, direccion_social: e.target.value })} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Teléfono</Form.Label>
              <Form.Control type="text" value={empresaForm.telefono} onChange={(e) => setEmpresaForm({ ...empresaForm, telefono: e.target.value })} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Email</Form.Label>
              <Form.Control type="email" value={empresaForm.email} onChange={(e) => setEmpresaForm({ ...empresaForm, email: e.target.value })} />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEmpresaModal(false)}>Cancelar</Button>
          <Button variant="primary" onClick={handleUpdateEmpresa}>Guardar</Button>
        </Modal.Footer>
      </Modal>

      {/*  Modal Planta CON CAMPOS DE UBICACIÓN INTEGRADOS */}
      <Modal show={showPlantaModal} onHide={() => setShowPlantaModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-tree me-2"></i>
            {editingPlanta ? 'Editar Planta' : 'Nueva Planta'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <h6 className="mb-3"><i className="bi bi-building me-2"></i>Datos de la Planta</h6>
            <Form.Group className="mb-3">
              <Form.Label>Nombre de la Planta *</Form.Label>
              <Form.Control
                type="text"
                value={plantaForm.nombre}
                onChange={(e) => setPlantaForm({ ...plantaForm, nombre: e.target.value })}
                placeholder="Ej: Planta Madrid"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Dirección</Form.Label>
              <Form.Control
                type="text"
                value={plantaForm.direccion}
                onChange={(e) => setPlantaForm({ ...plantaForm, direccion: e.target.value })}
                placeholder="Calle, número, etc."
              />
              <Form.Text className="text-muted">Dirección física de la planta</Form.Text>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Actividad</Form.Label>
              <Form.Control
                type="text"
                value={plantaForm.actividad}
                onChange={(e) => setPlantaForm({ ...plantaForm, actividad: e.target.value })}
                placeholder="Fabricación, Almacenamiento, etc."
              />
            </Form.Group>

            <hr />
            <h6 className="mb-3"><i className="bi bi-geo-alt me-2"></i>Ubicación de la Planta</h6>
            <Form.Text className="text-muted mb-3 d-block">
              {editingPlanta ? 'Modifica los datos de ubicación de la planta' : 'La ubicación se creará automáticamente al guardar la planta'}
            </Form.Text>

            <Form.Group className="mb-3">
              <Form.Label>Provincia *</Form.Label>
              <Form.Control
                type="text"
                value={plantaForm.provincia}
                onChange={(e) => setPlantaForm({ ...plantaForm, provincia: e.target.value })}
                placeholder="Ej: Madrid"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Municipio *</Form.Label>
              <Form.Control
                type="text"
                value={plantaForm.municipio}
                onChange={(e) => setPlantaForm({ ...plantaForm, municipio: e.target.value })}
                placeholder="Ej: Getafe"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Distrito</Form.Label>
              <Form.Control
                type="text"
                value={plantaForm.distrito}
                onChange={(e) => setPlantaForm({ ...plantaForm, distrito: e.target.value })}
                placeholder="Ej: Polígono Industrial"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Código Postal</Form.Label>
              <Form.Control
                type="text"
                value={plantaForm.codigo_postal}
                onChange={(e) => setPlantaForm({ ...plantaForm, codigo_postal: e.target.value })}
                placeholder="Ej: 28901"
              />
            </Form.Group>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Latitud</Form.Label>
                  <Form.Control
                    type="number"
                    step="0.0001"
                    value={plantaForm.latitud}
                    onChange={(e) => setPlantaForm({ ...plantaForm, latitud: e.target.value })}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Longitud</Form.Label>
                  <Form.Control
                    type="number"
                    step="0.0001"
                    value={plantaForm.longitud}
                    onChange={(e) => setPlantaForm({ ...plantaForm, longitud: e.target.value })}
                  />
                </Form.Group>
              </Col>
            </Row>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowPlantaModal(false)}>Cancelar</Button>
          <Button variant="primary" onClick={handleSavePlanta}>Guardar</Button>
        </Modal.Footer>
      </Modal>

      {/* Modal Ubicación (independiente) */}
      <Modal show={showUbicacionModal} onHide={() => setShowUbicacionModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-geo-alt me-2"></i>
            {editingUbicacion ? 'Editar Ubicación' : 'Nueva Ubicación'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Provincia *</Form.Label>
              <Form.Control type="text" value={ubicacionForm.provincia} onChange={(e) => setUbicacionForm({ ...ubicacionForm, provincia: e.target.value })} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Municipio *</Form.Label>
              <Form.Control type="text" value={ubicacionForm.municipio} onChange={(e) => setUbicacionForm({ ...ubicacionForm, municipio: e.target.value })} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Distrito</Form.Label>
              <Form.Control type="text" value={ubicacionForm.distrito} onChange={(e) => setUbicacionForm({ ...ubicacionForm, distrito: e.target.value })} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Código Postal</Form.Label>
              <Form.Control type="text" value={ubicacionForm.codigo_postal} onChange={(e) => setUbicacionForm({ ...ubicacionForm, codigo_postal: e.target.value })} />
            </Form.Group>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3"><Form.Label>Latitud</Form.Label><Form.Control type="number" step="0.0001" value={ubicacionForm.latitud} onChange={(e) => setUbicacionForm({ ...ubicacionForm, latitud: e.target.value })} /></Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3"><Form.Label>Longitud</Form.Label><Form.Control type="number" step="0.0001" value={ubicacionForm.longitud} onChange={(e) => setUbicacionForm({ ...ubicacionForm, longitud: e.target.value })} /></Form.Group>
              </Col>
            </Row>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowUbicacionModal(false)}>Cancelar</Button>
          <Button variant="primary" onClick={handleSaveUbicacion}>Guardar</Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}