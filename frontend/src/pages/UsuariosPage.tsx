// frontend/src/pages/UsuariosPage.tsx
import { useState, useEffect } from 'react';
import { Badge, Spinner, Modal, Form, Button } from 'react-bootstrap';
import PaginatedTable from '../components/ui/PaginatedTable';
import { usuarioService, Usuario } from '../services/usuario.service';
import { empresaService, Empresa } from '../services/empresa.service';
import { showSuccess, showError, showConfirm } from '../services/toast.service';
import Breadcrumbs from '../components/ui/Breadcrumbs';
import { useEmpresaId, useEmpresaNombre } from '../hooks/useEmpresaId';
import { useAuth } from '../context/AuthContext';

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<Usuario | null>(null);
  
  const empresaId = useEmpresaId();
  const empresaNombre = useEmpresaNombre();
  const { user } = useAuth();
  
  //  Determinar permisos
  const esSuperAdmin = user?.rol === 'SUPER_ADMIN';
  const esEmpresaAdmin = user?.rol === 'EMPRESA_ADMIN';
  const puedeCrearUsuario = esSuperAdmin || esEmpresaAdmin;
  const puedeEliminarUsuario = esSuperAdmin; // Solo SUPER_ADMIN puede eliminar
  const puedeActivarDesactivar = esSuperAdmin || esEmpresaAdmin; // Ambos pueden activar/desactivar
  
  //  Roles permitidos según el tipo de usuario
  const getRolesPermitidos = () => {
    if (esSuperAdmin) {
      return [
        { value: 'SUPER_ADMIN', label: 'Super Admin' },
        { value: 'EMPRESA_ADMIN', label: 'Admin Empresa' },
        { value: 'TECNICO', label: 'Técnico' },
        { value: 'CONSULTOR', label: 'Consultor' }
      ];
    }
    if (esEmpresaAdmin) {
      return [
        { value: 'TECNICO', label: 'Técnico' },
        { value: 'CONSULTOR', label: 'Consultor' }
      ];
    }
    return [];
  };

  //  Estado del formulario
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    rol: 'TECNICO',
    password: '',
    telefono: '',
    id_empresa: ''
  });

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const [usuariosData, empresasData] = await Promise.all([
        usuarioService.getUsuarios(),
        empresaService.getEmpresas(true)
      ]);
      setUsuarios(usuariosData);
      setEmpresas(empresasData);
    } catch (error) {
      showError('Error cargando datos');
    } finally {
      setLoading(false);
    }
  };

  //  Función para activar/desactivar usuario
  const handleToggleActivo = async (usuario: Usuario) => {
    // Verificar permisos
    if (!puedeActivarDesactivar) {
      showError('No tienes permisos para activar/desactivar usuarios');
      return;
    }

    // EMPRESA_ADMIN solo puede modificar usuarios de su empresa
    if (esEmpresaAdmin && usuario.id_empresa !== empresaId) {
      showError('No puedes modificar usuarios de otra empresa');
      return;
    }

    // No puedes desactivarte a ti mismo
    if (usuario.id === user?.id) {
      showError('No puedes desactivarte a ti mismo');
      return;
    }

    const nuevoEstado = usuario.activo === 1 ? 0 : 1;
    const mensaje = usuario.activo === 1 
      ? `¿Estás seguro de que quieres DESACTIVAR al usuario "${usuario.nombre}"?`
      : `¿Estás seguro de que quieres ACTIVAR al usuario "${usuario.nombre}"?`;
    
    const confirmado = await showConfirm(mensaje, 'Esta acción cambiará el estado del usuario');
    if (!confirmado) return;

    try {
      await usuarioService.toggleActivo(usuario.id, nuevoEstado === 1);
      showSuccess(usuario.activo === 1 ? 'Usuario desactivado' : 'Usuario activado');
      cargarDatos();
    } catch (error) {
      showError('Error al cambiar estado del usuario');
      console.error('Error al cambiar estado:', error);
    }
  };

  const handleOpenModal = (usuario?: Usuario) => {
    //  Verificar permisos antes de abrir modal
    if (!puedeCrearUsuario) {
      showError('No tienes permisos para crear o editar usuarios');
      return;
    }

    if (usuario) {
      //  EMPRESA_ADMIN solo puede editar usuarios de su empresa
      if (esEmpresaAdmin && usuario.id_empresa !== empresaId) {
        showError('No puedes editar usuarios de otra empresa');
        return;
      }
      
      setEditingUser(usuario);
      setFormData({
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
        password: '',
        telefono: usuario.telefono || '',
        id_empresa: usuario.id_empresa?.toString() || ''
      });
    } else {
      setEditingUser(null);
      const rolesPermitidos = getRolesPermitidos();
      
      //  Determinar empresa por defecto
      let empresaPorDefecto = '';
      
      if (esEmpresaAdmin) {
        // EMPRESA_ADMIN: su propia empresa
        empresaPorDefecto = empresaId ? String(empresaId) : '';
      } else if (esSuperAdmin && empresaId) {
        // SUPER_ADMIN con empresa seleccionada: usa esa empresa
        empresaPorDefecto = String(empresaId);
      }

      setFormData({
        nombre: '',
        email: '',
        rol: rolesPermitidos[0]?.value || 'TECNICO',
        password: '',
        telefono: '',
        id_empresa: empresaPorDefecto
      });
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      //  Validar según el rol del usuario logueado
      if (esEmpresaAdmin) {
        // EMPRESA_ADMIN: forzar su empresa
        formData.id_empresa = String(empresaId);
        
        // EMPRESA_ADMIN solo puede crear TECNICO o CONSULTOR
        if (formData.rol !== 'TECNICO' && formData.rol !== 'CONSULTOR') {
          showError('EMPRESA_ADMIN solo puede crear usuarios con roles TÉCNICO o CONSULTOR');
          return;
        }
      }

      //  SUPER_ADMIN con empresa seleccionada: usar esa empresa por defecto
      if (esSuperAdmin && empresaId && !formData.id_empresa) {
        formData.id_empresa = String(empresaId);
      }

      //  Validar que EMPRESA_ADMIN tenga empresa
      if (formData.rol === 'EMPRESA_ADMIN' && !formData.id_empresa) {
        showError('EMPRESA_ADMIN debe tener una empresa asignada');
        return;
      }

      const userData = {
        nombre: formData.nombre,
        email: formData.email,
        rol: formData.rol,
        telefono: formData.telefono,
        id_empresa: formData.id_empresa ? Number(formData.id_empresa) : undefined
      };

      if (editingUser) {
        await usuarioService.updateUsuario(editingUser.id, userData);
        showSuccess('Usuario actualizado');
      } else {
        if (!formData.password) {
          showError('La contraseña es requerida');
          return;
        }
        await usuarioService.createUsuario({
          ...userData,
          password: formData.password
        });
        showSuccess('Usuario creado');
      }
      setShowModal(false);
      cargarDatos();
    } catch (error: any) {
      showError(error.response?.data?.detail || 'Error al guardar');
    }
  };

  //  Eliminar usuario (solo SUPER_ADMIN)
  const handleDelete = async (usuario: Usuario) => {
    // Solo SUPER_ADMIN puede eliminar usuarios
    if (!puedeEliminarUsuario) {
      showError('Solo SUPER_ADMIN puede eliminar usuarios');
      return;
    }

    if (usuario.id === user?.id) {
      showError('No puedes eliminarte a ti mismo');
      return;
    }

    const confirmado = await showConfirm(
      `¿Eliminar a ${usuario.nombre}?`,
      'Esta acción eliminará permanentemente al usuario y no se puede deshacer'
    );
    
    if (!confirmado) return;

    try {
      await usuarioService.deleteUsuario(usuario.id);
      showSuccess('Usuario eliminado');
      cargarDatos();
    } catch (error) {
      showError('Error al eliminar');
    }
  };

  const getRolColor = (rol: string) => {
    const colors: any = {
      'SUPER_ADMIN': 'danger',
      'EMPRESA_ADMIN': 'warning',
      'TECNICO': 'info',
      'CONSULTOR': 'secondary'
    };
    return colors[rol] || 'secondary';
  };

  //  Columnas con acciones
  const columns = [
    { key: 'id', label: 'ID', width: '60px', sortable: true },
    { key: 'nombre', label: 'Nombre', sortable: true },
    { key: 'email', label: 'Email', sortable: true },
    { 
      key: 'rol', 
      label: 'Rol',
      sortable: true,
      render: (value: string) => (
        <Badge bg={getRolColor(value)}>
          <i className={`bi ${
            value === 'SUPER_ADMIN' ? 'bi-star-fill' : 
            value === 'EMPRESA_ADMIN' ? 'bi-building' : 
            value === 'TECNICO' ? 'bi-wrench' : 'bi-person-badge'
          } me-1`}></i>
          {value}
        </Badge>
      )
    },
    { 
      key: 'activo', 
      label: 'Estado',
      sortable: true,
      render: (value: number, item: Usuario) => (
        <Badge 
          bg={value === 1 ? 'success' : 'secondary'}
          style={{ cursor: puedeActivarDesactivar ? 'pointer' : 'default' }}
          onClick={() => puedeActivarDesactivar && handleToggleActivo(item)}
          title={puedeActivarDesactivar ? 'Click para cambiar estado' : 'Sin permisos para cambiar estado'}
        >
          <i className={`bi ${value === 1 ? 'bi-check-circle-fill' : 'bi-x-circle-fill'} me-1`}></i>
          {value === 1 ? 'Activo' : 'Inactivo'}
        </Badge>
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
        <h3 className="fw-bold mb-1">
          <i className="bi bi-people-fill me-2 text-primary"></i>
          Usuarios
        </h3>
        <p className="text-muted">
          Gestión de usuarios del sistema
          {esSuperAdmin && (
            <span className="ms-2 text-danger">
              <i className="bi bi-shield-lock me-1"></i>
              SUPER_ADMIN
            </span>
          )}
          {esEmpresaAdmin && (
            <span className="ms-2 text-warning">
              <i className="bi bi-building me-1"></i>
              EMPRESA_ADMIN
            </span>
          )}
          {!puedeCrearUsuario && (
            <span className="ms-2 text-secondary">
              <i className="bi bi-eye me-1"></i>
              Solo lectura
            </span>
          )}
        </p>
        {empresaNombre && (
          <Badge bg="info" className="mt-2">
            <i className="bi bi-building me-1"></i>
            Empresa: {empresaNombre}
          </Badge>
        )}
      </div>

      <PaginatedTable
        title="Lista de Usuarios"
        columns={columns}
        data={usuarios}
        onEdit={puedeCrearUsuario ? handleOpenModal : undefined}
        onDelete={puedeEliminarUsuario ? handleDelete : undefined}
        addButtonText={puedeCrearUsuario ? "Nuevo Usuario" : undefined}
        onAdd={puedeCrearUsuario ? () => handleOpenModal() : undefined}
        pageSize={10}
        searchable
        searchPlaceholder="Buscar por nombre, email..."
        showActions={puedeCrearUsuario || puedeEliminarUsuario}
      />

      {/* Modal Crear/Editar */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-person me-2"></i>
            {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
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
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Email *</Form.Label>
              <Form.Control
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </Form.Group>
            {!editingUser && (
              <Form.Group className="mb-3">
                <Form.Label>Contraseña *</Form.Label>
                <Form.Control
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </Form.Group>
            )}
            <Form.Group className="mb-3">
              <Form.Label>Rol</Form.Label>
              <Form.Select
                value={formData.rol}
                onChange={(e) => setFormData({ ...formData, rol: e.target.value })}
                disabled={esEmpresaAdmin}
              >
                {getRolesPermitidos().map(rol => (
                  <option key={rol.value} value={rol.value}>
                    {rol.label}
                  </option>
                ))}
              </Form.Select>
              {esEmpresaAdmin && (
                <Form.Text className="text-muted">
                  EMPRESA_ADMIN solo puede crear TÉCNICO o CONSULTOR
                </Form.Text>
              )}
            </Form.Group>
            
            {/* SUPER_ADMIN sin empresa: selector de empresas */}
            {esSuperAdmin && !empresaId && (
              <Form.Group className="mb-3">
                <Form.Label>Empresa *</Form.Label>
                <Form.Select
                  value={formData.id_empresa}
                  onChange={(e) => setFormData({ ...formData, id_empresa: e.target.value })}
                  required
                >
                  <option value="">Seleccionar empresa...</option>
                  {empresas.map(e => (
                    <option key={e.id} value={e.id}>{e.nombre}</option>
                  ))}
                </Form.Select>
                <Form.Text className="text-muted">
                  Debes seleccionar una empresa para el usuario
                </Form.Text>
              </Form.Group>
            )}

            {/* SUPER_ADMIN con empresa: campo informativo */}
            {esSuperAdmin && empresaId && (
              <Form.Group className="mb-3">
                <Form.Label>Empresa</Form.Label>
                <Form.Control
                  type="text"
                  value={empresaNombre || 'Cargando...'}
                  disabled
                  className="bg-light"
                />
                <Form.Text className="text-muted">
                  Usuario asignado automáticamente a la empresa seleccionada
                </Form.Text>
              </Form.Group>
            )}

            {/* EMPRESA_ADMIN: empresa fija */}
            {esEmpresaAdmin && (
              <Form.Group className="mb-3">
                <Form.Label>Empresa</Form.Label>
                <Form.Control
                  type="text"
                  value={empresaNombre || 'Cargando...'}
                  disabled
                  className="bg-light"
                />
                <Form.Text className="text-muted">
                  Usuario asignado automáticamente a tu empresa
                </Form.Text>
              </Form.Group>
            )}

            <Form.Group className="mb-3">
              <Form.Label>Teléfono</Form.Label>
              <Form.Control
                type="text"
                value={formData.telefono}
                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
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