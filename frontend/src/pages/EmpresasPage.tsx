// frontend/src/pages/EmpresasPage.tsx
import { useState, useEffect } from 'react';
import {
  Card, Button, Spinner, Row, Col, Badge,
  Modal, Form
} from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { empresaService, Empresa } from '../services/empresa.service';
import { useAuth } from '../context/AuthContext';
import { showSuccess, showError } from '../services/toast.service';
import Breadcrumbs from '../components/ui/Breadcrumbs';
import PaginatedTable from '../components/ui/PaginatedTable';

export default function EmpresasPage() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingEmpresa, setEditingEmpresa] = useState<Empresa | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    nombre: '',
    cif: '',
    direccion_social: '',
    telefono: '',
    email: ''
  });

  useEffect(() => {
    if (user?.rol !== 'SUPER_ADMIN') {
      navigate('/dashboard');
      return;
    }
    cargarEmpresas();
  }, [user]);

  const cargarEmpresas = async () => {
    setLoading(true);
    try {
      const data = await empresaService.getEmpresas(false);
      setEmpresas(data);
    } catch (error) {
      showError('Error cargando empresas');
    } finally {
      setLoading(false);
    }
  };

  const seleccionarEmpresa = (empresa: Empresa) => {
    console.log(' === SELECCIONANDO EMPRESA ===');
    console.log(' Empresa:', empresa);
    console.log(' ID:', empresa.id);
    console.log(' Activo:', empresa.activo);

    if (empresa.activo === 0) {
      showError('Esta empresa está inactiva y no se puede acceder');
      return;
    }
    localStorage.setItem('empresa_seleccionada_id', String(empresa.id));
    localStorage.setItem('empresa_seleccionada', JSON.stringify(empresa));

   console.log(' Guardado en localStorage:');
   console.log('  - empresa_seleccionada_id:', localStorage.getItem('empresa_seleccionada_id'));
   console.log('  - empresa_seleccionada:', localStorage.getItem('empresa_seleccionada'));
    navigate('/dashboard');
  };

  const handleOpenModal = (empresa?: Empresa) => {
    if (empresa) {
      setEditingEmpresa(empresa);
      setFormData({
        nombre: empresa.nombre,
        cif: empresa.cif,
        direccion_social: empresa.direccion_social || '',
        telefono: empresa.telefono || '',
        email: empresa.email || ''
      });
    } else {
      setEditingEmpresa(null);
      setFormData({
        nombre: '',
        cif: '',
        direccion_social: '',
        telefono: '',
        email: ''
      });
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.nombre || !formData.cif) {
      showError('Nombre y CIF son obligatorios');
      return;
    }

    try {
      if (editingEmpresa) {
        await empresaService.updateEmpresa(editingEmpresa.id, formData);
        showSuccess('Empresa actualizada');
      } else {
        await empresaService.createEmpresa(formData);
        showSuccess('Empresa creada');
      }
      setShowModal(false);
      cargarEmpresas();
    } catch (error) {
      showError('Error al guardar');
    }
  };

  const handleToggleActivo = async (empresa: Empresa) => {
    const mensaje = empresa.activo === 1 
      ? `¿Estás seguro de que quieres DESACTIVAR la empresa "${empresa.nombre}"?`
      : `¿Estás seguro de que quieres ACTIVAR la empresa "${empresa.nombre}"?`;
    
    if (!window.confirm(mensaje)) {
      return;
    }

    try {
      await empresaService.patchEmpresa(empresa.id, { 
        activo: empresa.activo === 1 ? 0 : 1 
      });
      showSuccess(empresa.activo === 1 ? 'Empresa desactivada' : 'Empresa activada');
      cargarEmpresas();
    } catch (error) {
      showError('Error al cambiar estado');
      console.error('Error al cambiar estado:', error);
    }
  };

  const columns = [
    { key: 'id', label: 'ID', width: '60px', sortable: true },
    { key: 'nombre', label: 'Nombre', sortable: true },
    { key: 'cif', label: 'CIF', sortable: true },
    { key: 'email', label: 'Email' },
    { key: 'telefono', label: 'Teléfono' },
    { 
      key: 'activo', 
      label: 'Estado',
      render: (value: number, item: Empresa) => (
        <Badge 
          bg={value === 1 ? 'success' : 'secondary'}
          style={{ cursor: 'pointer' }}
          onClick={() => handleToggleActivo(item)}
        >
          <i className={`bi ${value === 1 ? 'bi-check-circle-fill' : 'bi-x-circle-fill'} me-1`}></i>
          {value === 1 ? 'Activa' : 'Inactiva'}
        </Badge>
      )
    },
    {
      key: 'acciones',
      label: 'Acciones',
      render: (_: any, item: Empresa) => (
        <Button 
          size="sm" 
          variant={item.activo === 1 ? 'primary' : 'secondary'}
          onClick={() => seleccionarEmpresa(item)}
          disabled={item.activo === 0}
          title={item.activo === 0 ? 'Empresa inactiva' : 'Acceder a la empresa'}
        >
          <i className="bi bi-eye me-1"></i>
          {item.activo === 1 ? 'Ver' : 'Inactiva'}
        </Button>
      )
    }
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
        <h3 className="fw-bold mb-1">
          <i className="bi bi-building me-2 text-primary"></i>
          Gestión de Empresas
        </h3>
        <p className="text-muted">Administración de empresas del sistema</p>
      </div>

      <PaginatedTable
        title="Lista de Empresas"
        columns={columns}
        data={empresas}
        onEdit={handleOpenModal}
        onDelete={() => {}}  // ← Vacío, sin acción de eliminar
        addButtonText="Nueva Empresa"
        onAdd={() => handleOpenModal()}
        pageSize={10}
        searchable
        searchPlaceholder="Buscar por nombre, CIF, email..."
        showActions={false}  // ← Ocultar acciones de eliminar
      />

      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-building me-2"></i>
            {editingEmpresa ? 'Editar Empresa' : 'Nueva Empresa'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Nombre *</Form.Label>
              <Form.Control
                type="text"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                placeholder="Ej: Industrias del Sur S.A."
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>CIF *</Form.Label>
              <Form.Control
                type="text"
                value={formData.cif}
                onChange={(e) => setFormData({ ...formData, cif: e.target.value })}
                placeholder="Ej: B12345678"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Dirección Social</Form.Label>
              <Form.Control
                type="text"
                value={formData.direccion_social}
                onChange={(e) => setFormData({ ...formData, direccion_social: e.target.value })}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Teléfono</Form.Label>
              <Form.Control
                type="text"
                value={formData.telefono}
                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>Cancelar</Button>
          <Button variant="primary" onClick={handleSave}>
            {editingEmpresa ? 'Actualizar' : 'Crear'}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}